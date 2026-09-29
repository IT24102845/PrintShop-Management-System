// =============================================================================
// Model: Customer
// Table: customers
// =============================================================================

/** Full database row — matches the customers table exactly */
export interface Customer {
  id:         string;         // UUID
  user_id:    string;         // FK → users.id
  name?:      string | null;
  phone:      string | null;
  address:    string | null;
  company:    string | null;
  notes:      string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerDto {
  user_id: string;
  name?:   string;
  phone?:  string;
  address?: string;
  company?: string;
  notes?:  string;
}

export type UpdateCustomerDto = Partial<Omit<CreateCustomerDto, 'user_id'>>;

/** Customer joined with user info — used in list/detail views */
export interface CustomerWithUser extends Customer {
  full_name: string;
  email:     string;
}
