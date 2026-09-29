// =============================================================================
// Model: ProductionTask
// Table: production_tasks
// =============================================================================

export type ProductionTaskStatus =
  | 'WAITING'
  | 'PRINTING'
  | 'QUALITY_CHECK'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'FAILED';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Full database row */
export interface ProductionTask {
  id:                 string;          // UUID
  order_id:           string;          // FK → orders.id
  assigned_employee:  string | null;   // FK → employees.id
  status:             ProductionTaskStatus;
  priority:           TaskPriority;
  notes:              string | null;
  started_at:         string | null;
  completed_at:       string | null;
  estimated_hours:    number | null;
  actual_hours:       number | null;
  created_at:         string;
  updated_at:         string;
}

export interface CreateProductionTaskDto {
  order_id:           string;
  assigned_employee?: string;
  priority?:          TaskPriority;
  notes?:             string;
  estimated_hours?:   number;
}

export interface UpdateProductionTaskDto {
  assigned_employee?: string | null;
  status?:            ProductionTaskStatus;
  priority?:          TaskPriority;
  notes?:             string;
  started_at?:        string;
  completed_at?:      string;
  actual_hours?:      number;
}

/** Production task joined with order and employee details — from view_production_queue */
export interface ProductionQueueItem {
  task_id:        string;
  task_status:    ProductionTaskStatus;
  priority:       TaskPriority;
  notes:          string | null;
  started_at:     string | null;
  estimated_hours: number | null;
  order_id:       string;
  service_type:   string;
  quantity:       number;
  deadline_date:  string | null;
  employee_name:  string | null;
  employee_role:  string | null;
  customer_name:  string;
}
