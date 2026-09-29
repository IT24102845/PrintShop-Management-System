// =============================================================================
// Model: Design
// Table: designs
// =============================================================================

export type DesignApprovalStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

/** Full database row */
export interface Design {
  id:               string;   // UUID
  order_id:         string;   // FK → orders.id
  file_url:         string;
  approval_status:  DesignApprovalStatus;
  remarks:          string | null;
  version:          number;
  uploaded_by:      string | null;   // FK → users.id
  approved_by:      string | null;   // FK → users.id
  approved_at:      string | null;   // ISO timestamptz
  created_at:       string;
  updated_at:       string;
}

export interface CreateDesignDto {
  order_id:    string;
  file_url:    string;
  uploaded_by?: string;
  version?:    number;
}

export interface UpdateDesignDto {
  approval_status?: DesignApprovalStatus;
  remarks?:         string;
  approved_by?:     string;
  approved_at?:     string;
}
