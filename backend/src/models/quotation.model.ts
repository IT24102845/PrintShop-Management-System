// =============================================================================
// Model: Quotation
// Table: quotations
// =============================================================================

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired';

/** Full database row */
export interface Quotation {
  id:          string;    // UUID
  order_id:    string;    // FK → orders.id
  amount:      number;    // DECIMAL → JS number
  status:      QuotationStatus;
  notes:       string | null;
  valid_until: string | null;  // ISO date YYYY-MM-DD
  revision:    number;
  created_at:  string;
  updated_at:  string;
}

export interface CreateQuotationDto {
  order_id:    string;
  amount:      number;
  notes?:      string;
  valid_until?: string;
  revision?:   number;
}

export type UpdateQuotationDto = Partial<Omit<CreateQuotationDto, 'order_id'>> & {
  status?: QuotationStatus;
};
