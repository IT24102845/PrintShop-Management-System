// =============================================================================
// Model: Supplier
// Table: suppliers
// =============================================================================

/** Full database row */
export interface Supplier {
  id:             string;         // UUID
  supplier_name:  string;
  phone:          string | null;
  email:          string | null;
  address:        string | null;
  contact_person: string | null;
  website:        string | null;
  payment_terms:  string | null;
  is_active:      boolean;
  notes:          string | null;
  created_at:     string;
  updated_at:     string;
}

export interface CreateSupplierDto {
  supplier_name:  string;
  phone?:         string;
  email?:         string;
  address?:       string;
  contact_person?: string;
  website?:       string;
  payment_terms?: string;
  notes?:         string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto> & {
  is_active?: boolean;
};
