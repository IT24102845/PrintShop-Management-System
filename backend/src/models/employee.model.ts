// =============================================================================
// Model: Employee
// Table: employees
// =============================================================================

export type EmployeeRole = 'manager' | 'designer' | 'printer' | 'operator' | 'delivery' | 'sales';

/** Full database row — matches the employees table exactly */
export interface Employee {
  id:            string;      // UUID
  user_id:       string;      // FK → users.id
  employee_role: EmployeeRole;
  hire_date:     string | null;  // ISO date string YYYY-MM-DD
  is_available:  boolean;
  created_at:    string;
  updated_at:    string;
}

export interface CreateEmployeeDto {
  user_id:       string;
  employee_role?: EmployeeRole;
  hire_date?:    string;
  is_available?: boolean;
}

export type UpdateEmployeeDto = Partial<Omit<CreateEmployeeDto, 'user_id'>>;

/** Employee joined with user info */
export interface EmployeeWithUser extends Employee {
  full_name: string;
  email:     string;
}
