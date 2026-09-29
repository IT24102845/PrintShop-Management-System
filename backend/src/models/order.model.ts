// =============================================================================
// Model: Order
// Table: orders
// =============================================================================

export type OrderStatus =
  | 'pending'
  | 'quoted'
  | 'confirmed'
  | 'design_review'
  | 'in_production'
  | 'quality_check'
  | 'ready'
  | 'delivered'
  | 'cancelled'
  | 'COMPLETED';

export type ServiceType =
  | 'business_cards'
  | 'flyers'
  | 'banners'
  | 'posters'
  | 'brochures'
  | 'stickers'
  | 'tshirts'
  | 'signage'
  | 'packaging'
  | 'custom';

/** Full database row — matches the orders table exactly */
export interface Order {
  id:               string;          // UUID
  customer_id:      string;          // FK → customers.id
  service_type:     ServiceType;
  description:      string | null;
  size:             string | null;
  quantity:         number;
  colour:           string | null;
  material:         string | null;
  design_file_url:  string | null;
  status:           OrderStatus;
  deadline_date:    string | null;   // ISO date YYYY-MM-DD
  special_notes:    string | null;
  created_at:       string;
  updated_at:       string;
}

export interface CreateOrderDto {
  customer_id:      string;
  service_type:     ServiceType;
  description?:    string;
  size?:           string;
  quantity:        number;
  colour?:         string;
  material?:       string;
  design_file_url?: string;
  deadline_date?:  string;
  special_notes?:  string;
}

export interface UpdateOrderDto extends Partial<Omit<CreateOrderDto, 'customer_id'>> {
  status?: OrderStatus;
}

/** Order summary joined with customer and payment data — from view_order_summary */
export interface OrderSummary {
  order_id:          string;
  order_status:      OrderStatus;
  service_type:      ServiceType;
  quantity:          number;
  size:              string | null;
  colour:            string | null;
  material:          string | null;
  deadline_date:     string | null;
  order_date:        string;
  customer_id:       string;
  customer_name:     string;
  customer_email:    string;
  customer_phone:    string | null;
  quoted_amount:     number | null;
  quotation_status:  string | null;
  total_paid:        number;
  balance_due:       number | null;
}
