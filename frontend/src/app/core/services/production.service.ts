// ============================================================
// PRODUCTION API SERVICE - FRONTEND
// Purpose: Connects Angular UI with production queue backend APIs.
// Flow: UI Component -> HTTP Request -> Backend API
// This service handles frontend-backend communication.
// Communicates with backend production APIs.
// ============================================================

// =============================================================================
// PrintShop Management System — Angular Production Service
// =============================================================================
// Handles communication with the production REST API (/api/v1/production):
//   - Production task queue retrieval (getProductionTasks)
//   - Shop floor status progression (updateProductionStatus: WAITING -> PRINTING -> etc.)
//   - Manager dashboard statistics (getDashboardStats)
// =============================================================================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ProductionTaskStatus =
  | 'WAITING'
  | 'PRINTING'
  | 'QUALITY_CHECK'
  | 'READY_FOR_DELIVERY'
  | 'COMPLETED'
  | 'FAILED';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ProductionTask {
  id: string;
  order_id: string;
  assigned_employee: string | null;
  status: ProductionTaskStatus;
  priority: TaskPriority;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  updated_at: string;
  // Optional joined
  orders?: any;
  employees?: any;
}

export interface ProductionQueueItem {
  task_id: string;
  task_status: ProductionTaskStatus;
  priority: TaskPriority;
  notes: string | null;
  started_at: string | null;
  estimated_hours: number | null;
  order_id: string;
  service_type: string;
  quantity: number;
  deadline_date: string | null;
  employee_name: string | null;
  employee_role: string | null;
  customer_name: string;
}

export interface TaskListResponse {
  success: boolean;
  data: ProductionTask[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export interface DashboardResponse {
  success: boolean;
  data: {
    pendingTasks?: number;
    activeProduction?: number;
    qualityCheck?: number;
    readyForDelivery?: number;
    completedJobs?: number;
    failedJobs?: number;
    activeTasks?: number;
    completedTasks?: number;
    queuedTasks?: number;
    urgentTasks?: number;
  };
}

export interface CreateTaskDto {
  order_id: string;
  assigned_employee?: string;
  priority?: TaskPriority;
  notes?: string;
  estimated_hours?: number;
}

// Status values accepted by the backend route
export const VALID_PRODUCTION_STATUSES = [
  'WAITING', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'COMPLETED', 'FAILED'
] as const;

export type ProductionStatusUpdate = typeof VALID_PRODUCTION_STATUSES[number];

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly baseUrl = '/api/v1/production';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.baseUrl}/dashboard`);
  }

  getTasks(page = 1, limit = 20): Observable<TaskListResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<TaskListResponse>(`${this.baseUrl}/tasks`, { params });
  }

  createTask(dto: CreateTaskDto): Observable<{ success: boolean; data: ProductionTask }> {
    return this.http.post<{ success: boolean; data: ProductionTask }>(`${this.baseUrl}/tasks`, dto);
  }

  updateTaskStatus(id: string, status: ProductionStatusUpdate): Observable<{ success: boolean; data: ProductionTask }> {
    return this.http.patch<{ success: boolean; data: ProductionTask }>(
      `${this.baseUrl}/tasks/${id}/status`,
      { status }
    );
  }

  /** Update task metadata: employee, priority, notes, estimated_hours, actual_hours */
  updateTask(id: string, dto: {
    assigned_employee?: string | null;
    priority?: TaskPriority;
    notes?: string;
    estimated_hours?: number;
    actual_hours?: number;
  }): Observable<{ success: boolean; data: ProductionTask }> {
    return this.http.patch<{ success: boolean; data: ProductionTask }>(
      `${this.baseUrl}/tasks/${id}`,
      dto
    );
  }

  /** Delete a WAITING production task (hard delete) */
  deleteTask(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/tasks/${id}`);
  }

  /** Get orders eligible for a new production task (approved design + no active task) */
  getEligibleOrders(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/eligible-orders`);
  }

  /** Get all employees for the assignment dropdown */
  getAvailableEmployees(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/available-employees`);
  }
}
