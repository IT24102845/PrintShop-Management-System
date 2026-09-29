// =============================================================================
// Model: Payment
// Table: payments
// =============================================================================

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card'
  | 'online'
  | 'cheque'
  | 'mobile_money';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

/** Full database row */
export interface Payment {
  id:               string;          // UUID
  order_id:         string;          // FK → orders.id
  amount:           number;
  payment_method:   PaymentMethod;
  payment_status:   PaymentStatus;
  transaction_ref:  string | null;
  receipt_url:      string | null;
  paid_at:          string | null;   // ISO timestamptz
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

export interface CreatePaymentDto {
  order_id:        string;
  amount:          number;
  payment_method:  PaymentMethod;
  transaction_ref?: string;
  notes?:          string;
}

export interface UpdatePaymentDto {
  payment_status?: PaymentStatus;
  transaction_ref?: string;
  receipt_url?:    string;
  paid_at?:        string;
  notes?:          string;
}
