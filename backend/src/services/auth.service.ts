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

/** Payload required to register a new user */
export interface RegisterDto {
  full_name: string;
  email:     string;
  password:  string;
  phone?:    string;
  address?:  string;
  company?:  string;
  role?:     UserRole;
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
   * Creates a new user account.
   * Supports customer and staff member registration based on requested role.
   * - Validates email uniqueness
   * - Hashes password with bcrypt (cost 12)
   * - Inserts into users table with specified role (defaults to 'customer')
   * - Auto-creates customer or employee profile
   * - Returns JWT + safe user object
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const allowedRoles: UserRole[] = [
      'customer',
      'manager',
      'customer_service',
      'design_staff',
      'production_staff',
      'inventory_staff',
      'admin',
    ];
    const role: UserRole = (dto.role && allowedRoles.includes(dto.role)) ? dto.role : 'customer';

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
