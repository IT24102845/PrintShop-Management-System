// =============================================================================
// PrintShop Management System — Authentication Service
// =============================================================================
// Handles all authentication business logic:
//   - Registration (with automatic customer/employee profile creation)
//   - Login (with bcrypt password verification)
//   - JWT generation and verification
//
// Does NOT depend on Express — pure TypeScript business logic.
// =============================================================================

import bcrypt from 'bcryptjs';
import jwt, { SignOptions, JwtPayload as JwtLibPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AppError, UserRole } from '../types';
import { User, UserPublic } from '../models/user.model';
import logger from '../utils/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in environment variables');
  return secret;
}

function jwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '7d';
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of data stored inside the JWT */
export interface JwtPayload {
  sub:   string;    // user ID (UUID)
  email: string;
  role:  UserRole;
  iat?:  number;
  exp?:  number;
}

/** Payload required to register a new customer user (public endpoint) */
export interface RegisterDto {
  full_name: string;
  email:     string;
  password:  string;
  phone?:    string;
  address?:  string;
  company?:  string;
  // NOTE: role is intentionally excluded — public registration is always 'customer'.
  // Staff accounts must be created via the protected POST /api/v1/auth/staff endpoint.
}

/** Payload required for admin/manager to create a staff member */
export interface CreateStaffDto {
  full_name: string;
  email:     string;
  password:  string;
  role:      UserRole;
  phone?:    string;
}

/** Payload required to log in */
export interface LoginDto {
  email:    string;
  password: string;
}

/** What every auth endpoint returns on success */
export interface AuthResponse {
  user:      UserPublic;
  token:     string;
  expiresIn: string;
}

// ─── Role → Employee role mapping ─────────────────────────────────────────────

const EMPLOYEE_ROLE_MAP: Partial<Record<UserRole, string>> = {
  manager:          'manager',
  customer_service: 'sales',
  design_staff:     'designer',
  production_staff: 'printer',
  inventory_staff:  'operator',
};

// =============================================================================
// AuthService
// =============================================================================

export class AuthService {

  // ─── Register ──────────────────────────────────────────────────────────────

  /**
   * Creates a new **customer** user account (public registration).
   * - Validates email uniqueness
   * - Hashes password with bcrypt (cost 12)
   * - Inserts into users table with role forced to 'customer'
   * - Auto-creates customer profile
   * - Returns JWT + safe user object
   *
   * SECURITY: The role is always 'customer' regardless of request body content.
   * Staff accounts must be created via createStaff() (POST /api/v1/auth/staff).
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // SECURITY: Force role to 'customer' — ignore any role value in the request body.
    // This prevents privilege-escalation via the public registration endpoint.
    const role: UserRole = 'customer';

    // Log a warning if someone attempted to supply a privileged role
    if ((dto as any).role && (dto as any).role !== 'customer') {
      logger.warn(
        `Blocked privilege-escalation attempt: registration for ${dto.email} ` +
        `tried to set role '${(dto as any).role}' — forced to 'customer'`,
      );
    }

    // 1. Check email uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 3. Insert user
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        full_name:     dto.full_name.trim(),
        email:         dto.email.toLowerCase().trim(),
        password_hash,
        role,
        is_active:     true,
      })
      .select()
      .single();

    if (insertError || !user) {
      logger.error('Failed to insert user', { code: insertError?.code, details: insertError?.details, message: insertError?.message });
      throw new AppError(`Registration failed: ${insertError?.message ?? 'Unknown error'}`, 500);
    }

    // 4. Create role profile (customer or employee)
    await this.createRoleProfile(user.id, role, dto);

    // 5. Generate JWT
    const token = this.generateToken(user as User);

    logger.info(`New user registered: ${user.email} [${role}]`);

    return {
      user:      this.sanitizeUser(user as User),
      token,
      expiresIn: jwtExpiresIn(),
    };
  }

  // ─── Create Staff User (Admin / Manager only) ──────────────────────────────

  /**
   * Protected method for Admin/Manager to provision staff accounts.
   */
  async createStaff(dto: CreateStaffDto): Promise<UserPublic> {
    const allowedStaffRoles: UserRole[] = [
      'manager',
      'customer_service',
      'design_staff',
      'production_staff',
      'inventory_staff',
    ];

    if (!allowedStaffRoles.includes(dto.role)) {
      throw new AppError(
        `Invalid staff role. Must be one of: ${allowedStaffRoles.join(', ')}`,
        400,
      );
    }

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', dto.email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        full_name:     dto.full_name.trim(),
        email:         dto.email.toLowerCase().trim(),
        password_hash,
        role:          dto.role,
        is_active:     true,
      })
      .select()
      .single();

    if (insertError || !user) {
      logger.error('Failed to insert staff user', insertError);
      throw new AppError(`Staff creation failed: ${insertError?.message ?? 'Unknown error'}`, 500);
    }

    await this.createRoleProfile(user.id, dto.role, dto);
    logger.info(`New staff created: ${user.email} [${dto.role}]`);

    return this.sanitizeUser(user as User);
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  /**
   * Authenticates a user with email + password.
   * Informs user if the email is not registered or the password is incorrect.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // 1. Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', dto.email.toLowerCase().trim())
      .single();

    if (error || !user) {
      throw new AppError('This email is not registered. Please check your email or register.', 401);
    }

    // 2. Check account is active
    if (!user.is_active) {
      throw new AppError('Your account has been deactivated. Contact an administrator.', 403);
    }

    // 3. Verify password against bcrypt hash
    const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Incorrect password. Please try again.', 401);
    }

    // 4. Update last login timestamp (fire and forget — don't block the response)
    supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error: updateErr }) => {
        if (updateErr) logger.warn('Failed to update last_login_at', updateErr);
      });

    // 5. Generate JWT
    const token = this.generateToken(user as User);

    logger.info(`User logged in: ${user.email} [${user.role}]`);

    return {
      user:      this.sanitizeUser(user as User),
      token,
      expiresIn: jwtExpiresIn(),
    };
  }

  // ─── Get Current User ──────────────────────────────────────────────────────

  /**
   * Fetches the full profile for an authenticated user by their ID.
   * Used by GET /api/v1/auth/me
   */
  async getCurrentUser(userId: string): Promise<UserPublic> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, last_login_at, created_at, updated_at')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      throw new AppError('User not found', 404);
    }

    return user as UserPublic;
  }

  // ─── Change Password ───────────────────────────────────────────────────────

  /**
   * Allows an authenticated user to change their own password.
   */
  async changePassword(
    userId:      string,
    currentPass: string,
    newPass:     string,
  ): Promise<void> {
    // Fetch user with hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) throw new AppError('User not found', 404);

    // Verify current password
    const match = await bcrypt.compare(currentPass, user.password_hash);
    if (!match) throw new AppError('Current password is incorrect', 401);

    // Hash and save new password
    const newHash = await bcrypt.hash(newPass, SALT_ROUNDS);
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateErr) throw new AppError('Failed to update password', 500);

    logger.info(`Password changed for user: ${userId}`);
  }

  // ─── Password Reset ─────────────────────────────────────────────────────────

  /**
   * Generates a password reset token for the given email.
   * Stores the hashed token and expiry in the users table.
   * Returns the raw token (in production, this would be emailed to the user).
   */
  async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      // Don't reveal whether email exists — return generic message
      return { message: 'If an account with that email exists, a password reset link has been generated.' };
    }

    if (!user.is_active) {
      return { message: 'If an account with that email exists, a password reset link has been generated.' };
    }

    // Generate a crypto-random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store token hash and expiry in the users table
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        reset_token_hash: tokenHash,
        reset_token_expires: expiresAt,
      })
      .eq('id', user.id);

    if (updateErr) {
      logger.error('Failed to store reset token', updateErr);
      throw new AppError('Failed to process password reset', 500);
    }

    logger.info(`Password reset requested for: ${user.email}`);

    // In production, send email with reset link. For demo, return token directly.
    return {
      message: 'If an account with that email exists, a password reset link has been generated.',
      resetToken: rawToken,
    };
  }

  /**
   * Resets password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching, non-expired token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_hash, reset_token_expires')
      .eq('reset_token_hash', tokenHash)
      .single();

    if (error || !user) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    // Check expiry
    if (new Date(user.reset_token_expires) < new Date()) {
      throw new AppError('Password reset token has expired. Please request a new one.', 400);
    }

    // Hash and update password, clear reset token
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        password_hash: newHash,
        reset_token_hash: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (updateErr) {
      throw new AppError('Failed to reset password', 500);
    }

    logger.info(`Password reset completed for user: ${user.id}`);
  }

  // ─── JWT Utilities ─────────────────────────────────────────────────────────

  /** Generates a signed JWT for the given user */
  generateToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload: JwtPayload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };

    const options: SignOptions = {
      expiresIn: jwtExpiresIn() as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, jwtSecret(), options);
  }

  /**
   * Verifies a JWT and returns its decoded payload.
   * Throws AppError (401) for invalid or expired tokens.
   */
  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, jwtSecret()) as JwtLibPayload & JwtPayload;
      return {
        sub:   decoded.sub!,
        email: decoded.email,
        role:  decoded.role,
        iat:   decoded.iat,
        exp:   decoded.exp,
      };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Session expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token', 401);
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Creates a customer or employee profile after user creation.
   * Errors here are non-fatal (logged only) — the user is already registered.
   */
  private async createRoleProfile(
    userId: string,
    role:   UserRole,
    dto:    RegisterDto,
  ): Promise<void> {
    try {
      if (role === 'customer') {
        await supabase.from('customers').insert({
          user_id: userId,
          name:    dto.full_name?.trim() ?? null,
          phone:   dto.phone   ?? null,
          address: dto.address ?? null,
          company: dto.company ?? null,
        });
        return;
      }

      const employeeRole = EMPLOYEE_ROLE_MAP[role];
      if (employeeRole) {
        await supabase.from('employees').insert({
          user_id:       userId,
          employee_role: employeeRole,
        });
      }
      // 'admin' has no profile table — intentional
    } catch (err) {
      logger.warn(`Could not create ${role} profile for user ${userId}`, err);
    }
  }

  /** Returns a user without the password_hash field */
  private sanitizeUser(user: User): UserPublic {
    return {
      id:            user.id,
      full_name:     user.full_name,
      email:         user.email,
      role:          user.role,
      is_active:     user.is_active,
      last_login_at: user.last_login_at,
      created_at:    user.created_at,
      updated_at:    user.updated_at,
    };
  }
}

// Singleton instance shared across the app
export const authService = new AuthService();
