// =============================================================================
// Model: User
// Table: users
// =============================================================================

// UserRole is defined in src/types/index.ts — import from there to avoid
// circular dependencies.
import type { UserRole } from '../types';

export type { UserRole };

/** Full database row — matches the users table exactly */
export interface User {
  id:             string;         // UUID
  full_name:      string;
  email:          string;
  password_hash:  string;
  role:           UserRole;
  is_active:      boolean;
  last_login_at:  string | null;  // ISO 8601 timestamptz
  created_at:     string;
  updated_at:     string;
}

/** Fields required to register a new user */
export interface CreateUserDto {
  full_name:      string;
  email:          string;
  password_hash:  string;
  role?:          UserRole;
  is_active?:     boolean;
}

/** Fields that can be updated — all optional */
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'email'>>;

/** Safe user without password_hash — returned to API clients */
export type UserPublic = Omit<User, 'password_hash'>;
