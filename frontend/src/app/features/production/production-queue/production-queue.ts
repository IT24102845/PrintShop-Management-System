// ============================================================
// PRODUCTION QUEUE COMPONENT
// Purpose: Controls the Print Production Queue screen.
// UI: Displays and manages job stages (Pre-Press, Printing, Cutting, QC, Ready).
// Flow: Component -> ProductionService -> Backend Production API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductionService, ProductionTask, ProductionStatusUpdate, VALID_PRODUCTION_STATUSES } from '../../../core/services/production.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-production-queue',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-left">
          <h1>Production Queue</h1>
          <p>Live shopfloor workflow tracking and job scheduling</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-icons-outlined">add</span> Create Production Task
          </button>
          <div class="view-toggle">
            <button class="btn btn-sm" [class.btn-primary]="activeView === 'kanban'" [class.btn-secondary]="activeView !== 'kanban'" (click)="activeView = 'kanban'">
              <span class="material-icons-outlined">view_kanban</span> Kanban
            </button>
            <button class="btn btn-sm" [class.btn-primary]="activeView === 'table'" [class.btn-secondary]="activeView !== 'table'" (click)="activeView = 'table'">
              <span class="material-icons-outlined">table_rows</span> Table
            </button>
          </div>
          <button class="btn btn-secondary" (click)="load()">
            <span class="material-icons-outlined">refresh</span> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Bar -->
      <div class="metrics-grid">
        <div class="card metric-card">
          <div class="metric-icon bg-info-light text-info"><span class="material-icons-outlined">hourglass_empty</span></div>
          <div class="metric-content"><p class="metric-title">Waiting</p><p class="metric-value">{{ countWaiting }}</p></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon bg-primary-light text-primary"><span class="material-icons-outlined">print</span></div>
          <div class="metric-content"><p class="metric-title">Printing</p><p class="metric-value">{{ countPrinting }}</p></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon bg-warning-light text-warning"><span class="material-icons-outlined">verified</span></div>
          <div class="metric-content"><p class="metric-title">Quality Check</p><p class="metric-value">{{ countQualityCheck }}</p></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon bg-portal-light text-portal"><span class="material-icons-outlined">local_shipping</span></div>
          <div class="metric-content"><p class="metric-title">Ready for Delivery</p><p class="metric-value">{{ countReady }}</p></div>
        </div>
        <div class="card metric-card">
          <div class="metric-icon bg-success-light text-success"><span class="material-icons-outlined">task_alt</span></div>
          <div class="metric-content"><p class="metric-title">Completed</p><p class="metric-value">{{ countCompleted }}</p></div>
        </div>
      </div>

      <!-- Failed Alert -->
      @if (failedTasks.length > 0) {
        <div class="failed-alert-banner">
          <div class="failed-alert-icon"><span class="material-icons-outlined">error_outline</span></div>
          <div class="failed-alert-info">
            <h4>Attention: {{ failedTasks.length }} Task(s) require intervention</h4>
            <p>Jobs marked as FAILED require printer recalibration or material replacement before restarting.</p>
          </div>
          <div class="failed-alert-actions">
            @for (ft of failedTasks; track ft.id) {
              <button class="btn btn-sm btn-danger" (click)="transition(ft.id, 'WAITING')">
                <span class="material-icons-outlined">replay</span> Retry #{{ ft.order_id.substring(0,6) }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Search and Filter Bar -->
      <div class="filter-card card">
        <div class="search-box">
          <span class="material-icons-outlined">search</span>
          <input type="text" placeholder="Filter by order #, customer, or service..." [(ngModel)]="searchTerm" (input)="filterTasks()">
        </div>
        <div class="filter-actions">
          <label class="filter-label">Priority:</label>
          <select class="form-select" [(ngModel)]="selectedPriority" (change)="filterTasks()">
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      @if (activeView === 'kanban') {
        @if (isLoading) {
          <div class="kanban-loading">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="kanban-col skeleton-col"></div>
            }
          </div>
        } @else {
          <div class="kanban-board">
            <!-- 1. WAITING -->
            <div class="kanban-col">
              <div class="kanban-header border-waiting">
                <div class="col-title"><span class="material-icons-outlined">schedule</span> Waiting</div>
                <span class="col-count">{{ getColumnTasks('WAITING').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('WAITING'); track task.id) {
                  <div class="kanban-card">
                    <div class="card-top">
                      <span class="order-ref" [routerLink]="['/app/orders', task.order_id]">#{{ task.order_id.substring(0,8) }}</span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>
                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>
                    <div class="card-meta">
                      @if (task.orders?.deadline_date) {
                        <span class="meta-item"><span class="material-icons-outlined">event</span> {{ task.orders.deadline_date }}</span>
                      }
                      <span class="meta-item"><span class="material-icons-outlined">person</span> {{ getEmployeeName(task) }}</span>
                    </div>
                    @if (task.notes) {
                      <div class="card-notes">{{ task.notes }}</div>
                    }
                    <div class="card-actions">
                      <button class="btn btn-primary btn-block btn-sm" (click)="transition(task.id, 'PRINTING')">
                        <span class="material-icons-outlined">play_arrow</span> Start Printing
                      </button>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('WAITING').length === 0) {
                  <div class="empty-column">No jobs waiting</div>
                }
              </div>
            </div>

            <!-- 2. PRINTING -->
            <div class="kanban-col">
              <div class="kanban-header border-printing">
                <div class="col-title"><span class="material-icons-outlined">print</span> Printing</div>
                <span class="col-count">{{ getColumnTasks('PRINTING').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('PRINTING'); track task.id) {
                  <div class="kanban-card">
                    <div class="card-top">
                      <span class="order-ref" [routerLink]="['/app/orders', task.order_id]">#{{ task.order_id.substring(0,8) }}</span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>
                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>
                    <div class="card-meta">
                      @if (task.started_at) {
                        <span class="meta-item"><span class="material-icons-outlined">timer</span> Started</span>
                      }
                      <span class="meta-item"><span class="material-icons-outlined">person</span> {{ getEmployeeName(task) }}</span>
                    </div>
                    <div class="card-actions">
                      <button class="btn btn-warning btn-block btn-sm" (click)="transition(task.id, 'QUALITY_CHECK')">
                        <span class="material-icons-outlined">verified</span> Send to QC
                      </button>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('PRINTING').length === 0) {
                  <div class="empty-column">No jobs on press</div>
                }
              </div>
            </div>

            <!-- 3. QUALITY CHECK -->
            <div class="kanban-col">
              <div class="kanban-header border-qc">
                <div class="col-title"><span class="material-icons-outlined">fact_check</span> Quality Check</div>
                <span class="col-count">{{ getColumnTasks('QUALITY_CHECK').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('QUALITY_CHECK'); track task.id) {
                  <div class="kanban-card">
                    <div class="card-top">
                      <span class="order-ref" [routerLink]="['/app/orders', task.order_id]">#{{ task.order_id.substring(0,8) }}</span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>
                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>
                    <div class="card-actions dual-actions">
                      <button class="btn btn-success btn-sm flex-1" (click)="transition(task.id, 'READY_FOR_DELIVERY')">
                        <span class="material-icons-outlined">check</span> Pass
                      </button>
                      <button class="btn btn-secondary btn-sm" (click)="transition(task.id, 'PRINTING')" title="Rework in Print">
                        <span class="material-icons-outlined">replay</span>
                      </button>
                      <button class="btn btn-sm btn-secondary" (click)="openEditModal(task)" title="Edit task">
                        <span class="material-icons-outlined">edit</span>
                      </button>
                    </div>
                  </div>
                }
                @if (getColumnTasks('QUALITY_CHECK').length === 0) {
                  <div class="empty-column">No jobs in inspection</div>
                }
              </div>
            </div>

            <!-- 4. READY FOR DELIVERY -->
            <div class="kanban-col">
              <div class="kanban-header border-ready">
                <div class="col-title"><span class="material-icons-outlined">local_shipping</span> Ready for Delivery</div>
                <span class="col-count">{{ getColumnTasks('READY_FOR_DELIVERY').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('READY_FOR_DELIVERY'); track task.id) {
                  <div class="kanban-card">
                    <div class="card-top">
                      <span class="order-ref" [routerLink]="['/app/orders', task.order_id]">#{{ task.order_id.substring(0,8) }}</span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>
                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>
                    <div class="card-actions">
                      <button class="btn btn-primary btn-block btn-sm" (click)="transition(task.id, 'COMPLETED')">
                        <span class="material-icons-outlined">check_circle</span> Mark Delivered
                      </button>
                    </div>
                  </div>
                }
                @if (getColumnTasks('READY_FOR_DELIVERY').length === 0) {
                  <div class="empty-column">No jobs ready for dispatch</div>
                }
              </div>
            </div>

            <!-- 5. COMPLETED -->
            <div class="kanban-col">
              <div class="kanban-header border-completed">
                <div class="col-title"><span class="material-icons-outlined">task_alt</span> Completed</div>
                <span class="col-count">{{ getColumnTasks('COMPLETED').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('COMPLETED'); track task.id) {
                  <div class="kanban-card completed-card">
                    <div class="card-top">
                      <span class="order-ref" [routerLink]="['/app/orders', task.order_id]">#{{ task.order_id.substring(0,8) }}</span>
                      <app-status-badge status="COMPLETED"></app-status-badge>
                    </div>
                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>
                    @if (task.completed_at) {
                      <div class="card-meta">
                        <span class="meta-item"><span class="material-icons-outlined">done_all</span> {{ task.completed_at | date:'shortDate' }}</span>
                      </div>
                    }
                  </div>
                }
                @if (getColumnTasks('COMPLETED').length === 0) {
                  <div class="empty-column">No completed jobs</div>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- TABLE VIEW -->
      @if (activeView === 'table') {
        <div class="table-wrapper">
          @if (isLoading) {
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton skeleton-row"></div> }
          } @else if (filteredTasks.length === 0) {
            <div class="empty-state">
              <div class="empty-icon"><span class="material-icons-outlined">precision_manufacturing</span></div>
              <h3>No production tasks match criteria</h3>
              <p>Tasks are automatically created from approved orders.</p>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Service / Specs</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Workflow</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (task of filteredTasks; track task.id) {
                  <tr>
                    <td class="font-mono text-xs">{{ task.id.substring(0,8) }}…</td>
                    <td>
                      <a [routerLink]="['/app/orders', task.order_id]" class="font-mono font-bold text-primary">
                        #{{ task.order_id.substring(0,8) }}
                      </a>
                    </td>
                    <td><strong>{{ getCustomerName(task) }}</strong></td>
                    <td>{{ getServiceDesc(task) }}</td>
                    <td><app-status-badge [status]="task.priority"></app-status-badge></td>
                    <td><app-status-badge [status]="task.status"></app-status-badge></td>
                    <td>{{ getEmployeeName(task) }}</td>
                    <td>
                      <div class="action-cell">
                        @if (task.status === 'WAITING') {
                          <button class="btn btn-sm btn-primary" (click)="transition(task.id, 'PRINTING')">
                            <span class="material-icons-outlined text-xs">play_arrow</span> Start
                          </button>
                        } @else if (task.status === 'PRINTING') {
                          <button class="btn btn-sm btn-warning" (click)="transition(task.id, 'QUALITY_CHECK')">
                            <span class="material-icons-outlined text-xs">verified</span> QC
                          </button>
                        } @else if (task.status === 'QUALITY_CHECK') {
                          <button class="btn btn-sm btn-success" (click)="transition(task.id, 'READY_FOR_DELIVERY')">
                            <span class="material-icons-outlined text-xs">check</span> Ready
                          </button>
                        } @else if (task.status === 'READY_FOR_DELIVERY') {
                          <button class="btn btn-sm btn-primary" (click)="transition(task.id, 'COMPLETED')">
                            <span class="material-icons-outlined text-xs">done_all</span> Complete
                          </button>
                        } @else if (task.status === 'COMPLETED') {
                          <span class="text-success text-xs font-semibold">Done ✓</span>
                        } @else if (task.status === 'FAILED') {
                          <button class="btn btn-sm btn-danger" (click)="transition(task.id, 'WAITING')">
                            <span class="material-icons-outlined text-xs">replay</span> Retry
                          </button>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="action-cell">
                        <button class="btn btn-sm btn-secondary" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        @if (task.status === 'WAITING') {
                          <button class="btn btn-sm btn-danger" (click)="openDeleteConfirm(task)" title="Delete task">
                            <span class="material-icons-outlined">delete</span>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>

    <!-- ─── CREATE PRODUCTION TASK MODAL ──────────────────────────────────── -->
    @if (showCreateModal) {
      <div class="modal-overlay" (click)="closeCreateModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="material-icons-outlined">add_task</span>
              Create Production Task
            </h3>
            <button class="modal-close" (click)="closeCreateModal()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Order <span class="required">*</span></label>
              @if (isLoadingEligible) {
                <p class="text-muted text-sm">Loading eligible orders…</p>
              } @else if (eligibleOrders.length === 0) {
                <p class="text-muted text-sm" style="color:#f59e0b">No eligible orders. An order needs an approved design and no active production task.</p>
              } @else {
                <select class="form-control" [(ngModel)]="createDto.order_id">
                  <option value="">-- Select an Order --</option>
                  @for (o of eligibleOrders; track o.id) {
                    <option [value]="o.id">
                      #{{ o.id.substring(0,8) }} — {{ (o.service_type || '').replace('_',' ') }} ({{ o.quantity }} pcs) · {{ getOrderCustomer(o) }}
                    </option>
                  }
                </select>
              }
            </div>

            <div class="form-group">
              <label>Assigned Employee</label>
              <select class="form-control" [(ngModel)]="createDto.assigned_employee">
                <option value="">-- Unassigned --</option>
                @for (emp of availableEmployees; track emp.id) {
                  <option [value]="emp.id">{{ getEmpName(emp) }} ({{ emp.role }})</option>
                }
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Priority</label>
                <select class="form-control" [(ngModel)]="createDto.priority">
                  <option value="low">Low</option>
                  <option value="normal" selected>Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div class="form-group">
                <label>Estimated Hours</label>
                <input type="number" class="form-control" [(ngModel)]="createDto.estimated_hours" min="0.5" step="0.5" placeholder="4.0" />
              </div>
            </div>

            <div class="form-group">
              <label>Production Notes</label>
              <textarea class="form-control" rows="3" [(ngModel)]="createDto.notes" placeholder="Special instructions for the print floor…"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button class="btn btn-primary" (click)="submitCreate()" [disabled]="isCreating || !createDto.order_id">
              <span class="material-icons-outlined">add</span>
              {{ isCreating ? 'Creating…' : 'Create Task' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── EDIT PRODUCTION TASK MODAL ────────────────────────────────────── -->
    @if (editingTask) {
      <div class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="material-icons-outlined">edit</span>
              Edit Production Task
            </h3>
            <button class="modal-close" (click)="closeEditModal()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-meta-row" style="margin-bottom:1rem">
              <span class="meta-pill">Order: #{{ editingTask.order_id.substring(0,8) }}</span>
              <app-status-badge [status]="editingTask.status"></app-status-badge>
            </div>

            <div class="form-group">
              <label>Assigned Employee</label>
              <select class="form-control" [(ngModel)]="editDto.assigned_employee">
                <option value="">-- Unassigned --</option>
                @for (emp of availableEmployees; track emp.id) {
                  <option [value]="emp.id">{{ getEmpName(emp) }} ({{ emp.role }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label>Priority</label>
              <select class="form-control" [(ngModel)]="editDto.priority">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Estimated Hours</label>
                <input type="number" class="form-control" [(ngModel)]="editDto.estimated_hours" min="0.5" step="0.5" />
              </div>
              <div class="form-group">
                <label>Actual Hours</label>
                <input type="number" class="form-control" [(ngModel)]="editDto.actual_hours" min="0" step="0.5" />
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea class="form-control" rows="3" [(ngModel)]="editDto.notes"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveEdit()" [disabled]="isSavingEdit">
              <span class="material-icons-outlined">save</span>
              {{ isSavingEdit ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── DELETE CONFIRM MODAL ──────────────────────────────────────────── -->
    @if (deletingTask) {
      <div class="modal-overlay" (click)="closeDeleteConfirm()">
        <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title danger-title">
              <span class="material-icons-outlined">delete_forever</span>
              Delete Production Task?
            </h3>
          </div>
          <div class="modal-body">
            <p style="color:#475569; margin-bottom:0.75rem">
              This task has not started printing yet.
            </p>
            <div class="modal-meta-row">
              <span class="meta-pill">Order: #{{ deletingTask.order_id.substring(0,8) }}</span>
              <app-status-badge [status]="deletingTask.status"></app-status-badge>
            </div>
            <p style="margin-top:0.75rem; font-size:0.8125rem; color:#64748b;">
              The order and approved design will remain. The order will be returned to <strong>confirmed</strong> status.
            </p>
            <p style="color:#ef4444; font-size:0.8125rem; margin-top:0.5rem; font-weight:500">
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteConfirm()">Cancel</button>
            <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="isDeleting">
              <span class="material-icons-outlined">delete</span>
              {{ isDeleting ? 'Deleting…' : 'Delete Task' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .view-toggle {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
      margin-right: 0.5rem;
    }
    .filter-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 240px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      .material-icons-outlined { color: #94a3b8; font-size: 1.25rem; }
      input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.875rem; }
    }
    .filter-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      .filter-label { font-size: 0.8125rem; color: #64748b; font-weight: 500; }
      select { min-width: 140px; }
    }
    .failed-alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.875rem 1.25rem;
      margin-bottom: 1.25rem;
      .failed-alert-icon { color: #ef4444; .material-icons-outlined { font-size: 2rem; } }
      .failed-alert-info {
        flex: 1;
        h4 { font-size: 0.9375rem; color: #991b1b; margin-bottom: 0.2rem; }
        p { font-size: 0.8125rem; color: #b91c1c; margin: 0; }
      }
      .failed-alert-actions { display: flex; gap: 0.5rem; }
    }
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, minmax(240px, 1fr));
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 1.5rem;
      align-items: start;
    }
    .kanban-col {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      min-height: 500px;
    }
    .kanban-header {
      padding: 0.875rem 1rem;
      background: #ffffff;
      border-top-left-radius: 9px;
      border-top-right-radius: 9px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 3px solid transparent;
      .col-title {
        font-weight: 600;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #1e293b;
        .material-icons-outlined { font-size: 1.125rem; color: #64748b; }
      }
      .col-count {
        background: #f1f5f9;
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
      }
    }
    .border-waiting { border-top-color: #f59e0b; }
    .border-printing { border-top-color: #3b82f6; }
    .border-qc { border-top-color: #ea580c; }
    .border-ready { border-top-color: #0ea5e9; }
    .border-completed { border-top-color: #10b981; }
    .kanban-cards {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }
    .kanban-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.875rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        .order-ref {
          font-family: monospace;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #4f46e5;
          cursor: pointer;
          &:hover { text-decoration: underline; }
        }
      }
      .card-customer { font-size: 0.875rem; font-weight: 600; color: #0f172a; margin-bottom: 0.25rem; }
      .card-service { font-size: 0.8125rem; color: #475569; margin-bottom: 0.6rem; }
      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.75rem;
        .meta-item { display: inline-flex; align-items: center; gap: 0.25rem; .material-icons-outlined { font-size: 0.875rem; } }
      }
      .card-notes {
        background: #f8fafc;
        border-left: 2px solid #94a3b8;
        padding: 0.35rem 0.5rem;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.75rem;
        border-radius: 0 4px 4px 0;
      }
      .card-actions {
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        .btn-block { width: 100%; display: flex; justify-content: center; }
      }
      .card-secondary-actions {
        display: flex;
        gap: 0.4rem;
        justify-content: flex-end;
      }
      .dual-actions { display: flex; gap: 0.4rem; .flex-1 { flex: 1; } }
    }
    .completed-card { opacity: 0.9; background: #fcfdfc; }
    .empty-column {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      color: #94a3b8;
      font-size: 0.8125rem;
      font-style: italic;
      text-align: center;
    }
    .kanban-loading {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      .skeleton-col { background: #e2e8f0; border-radius: 10px; min-height: 400px; animation: pulse 1.5s infinite; }
    }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

    .action-cell { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.5);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-box {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      animation: slideUp 0.2s ease;
    }
    .modal-sm { max-width: 420px; }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title {
      font-size: 1.0625rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      .material-icons-outlined { color: #4f46e5; font-size: 1.25rem; }
    }
    .danger-title .material-icons-outlined { color: #ef4444; }
    .modal-close {
      background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; border-radius: 4px; display: flex;
      &:hover { color: #475569; background: #f1f5f9; }
    }
    .modal-body { padding: 1.25rem 1.5rem; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid #f1f5f9;
    }
    .modal-meta-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .meta-pill {
      background: #f1f5f9;
      border-radius: 9999px;
      padding: 0.2rem 0.65rem;
      font-size: 0.78125rem;
      font-weight: 600;
      color: #475569;
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .required { color: #ef4444; }
  `],
})
export class ProductionQueue implements OnInit {
  tasks: ProductionTask[] = [];
  filteredTasks: ProductionTask[] = [];
  isLoading = true;
  activeView: 'kanban' | 'table' = 'kanban';
  searchTerm = '';
  selectedPriority = '';

  readonly productionStatuses = VALID_PRODUCTION_STATUSES;

  get countWaiting()      { return this.tasks.filter(t => t.status === 'WAITING').length; }
  get countPrinting()     { return this.tasks.filter(t => t.status === 'PRINTING').length; }
  get countQualityCheck() { return this.tasks.filter(t => t.status === 'QUALITY_CHECK').length; }
  get countReady()        { return this.tasks.filter(t => t.status === 'READY_FOR_DELIVERY').length; }
  get countCompleted()    { return this.tasks.filter(t => t.status === 'COMPLETED').length; }
  get failedTasks()       { return this.tasks.filter(t => t.status === 'FAILED'); }

  // Create modal state
  showCreateModal = false;
  isLoadingEligible = false;
  eligibleOrders: any[] = [];
  availableEmployees: any[] = [];
  isCreating = false;
  createDto: any = { order_id: '', assigned_employee: '', priority: 'normal', estimated_hours: null, notes: '' };

  // Edit modal state
  editingTask: ProductionTask | null = null;
  editDto: any = {};
  isSavingEdit = false;

  // Delete modal state
  deletingTask: ProductionTask | null = null;
  isDeleting = false;

  constructor(
    private productionService: ProductionService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.productionService.getTasks(1, 100).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          this.tasks = Array.isArray(d) ? d : (d?.items ?? []);
          this.filterTasks();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  filterTasks() {
    this.filteredTasks = this.tasks.filter(t => {
      const q = this.searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        t.order_id.toLowerCase().includes(q) ||
        this.getCustomerName(t).toLowerCase().includes(q) ||
        this.getServiceDesc(t).toLowerCase().includes(q);
      const matchesPriority = !this.selectedPriority || t.priority === this.selectedPriority;
      return matchesSearch && matchesPriority;
    });
  }

  getColumnTasks(status: string): ProductionTask[] {
    return this.filteredTasks.filter(t => t.status === status);
  }

  getCustomerName(task: ProductionTask): string {
    return (task as any).orders?.customers?.users?.full_name || 'Client Order';
  }

  getServiceDesc(task: ProductionTask): string {
    const qty = (task as any).orders?.quantity ? `${(task as any).orders.quantity}x ` : '';
    const srv = ((task as any).orders?.service_type || 'Print Job').replace(/_/g, ' ');
    return `${qty}${srv}`;
  }

  getEmployeeName(task: ProductionTask): string {
    return (task as any).employees?.users?.full_name || 'Operator';
  }

  getOrderCustomer(order: any): string {
    return order?.customers?.users?.full_name || '';
  }

  getEmpName(emp: any): string {
    return emp?.users?.full_name || emp?.users?.email || 'Employee';
  }

  transition(taskId: string, newStatus: ProductionStatusUpdate) {
    this.productionService.updateTaskStatus(taskId, newStatus).subscribe({
      next: () => {
        this.toast.success(`Task moved to ${newStatus.replace(/_/g, ' ')}`);
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update status.');
      },
    });
  }

  // ─── Create Modal ──────────────────────────────────────────────────────────

  openCreateModal() {
    this.showCreateModal = true;
    this.createDto = { order_id: '', assigned_employee: '', priority: 'normal', estimated_hours: null, notes: '' };
    this.isLoadingEligible = true;
    this.cdr.markForCheck();

    this.productionService.getEligibleOrders().subscribe({
      next: res => {
        this.eligibleOrders = res.data ?? [];
        this.isLoadingEligible = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoadingEligible = false; this.cdr.markForCheck(); },
    });

    this.productionService.getAvailableEmployees().subscribe({
      next: res => { this.availableEmployees = res.data ?? []; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.markForCheck();
  }

  submitCreate() {
    if (!this.createDto.order_id) return;
    this.isCreating = true;
    this.cdr.markForCheck();

    const dto: any = {
      order_id: this.createDto.order_id,
      priority: this.createDto.priority || 'normal',
    };
    if (this.createDto.assigned_employee) dto.assigned_employee = this.createDto.assigned_employee;
    if (this.createDto.estimated_hours) dto.estimated_hours = Number(this.createDto.estimated_hours);
    if (this.createDto.notes?.trim()) dto.notes = this.createDto.notes.trim();

    this.productionService.createTask(dto).subscribe({
      next: () => {
        this.toast.success('Production task created!');
        this.closeCreateModal();
        this.load();
        this.isCreating = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to create task.');
        this.isCreating = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Edit Modal ────────────────────────────────────────────────────────────

  openEditModal(task: ProductionTask) {
    this.editingTask = task;
    this.editDto = {
      assigned_employee: (task as any).assigned_employee ?? '',
      priority: task.priority,
      notes: task.notes ?? '',
      estimated_hours: task.estimated_hours ?? null,
      actual_hours: task.actual_hours ?? null,
    };
    this.isSavingEdit = false;

    if (this.availableEmployees.length === 0) {
      this.productionService.getAvailableEmployees().subscribe({
        next: res => { this.availableEmployees = res.data ?? []; this.cdr.markForCheck(); },
        error: () => {},
      });
    }
    this.cdr.markForCheck();
  }

  closeEditModal() {
    this.editingTask = null;
    this.editDto = {};
    this.cdr.markForCheck();
  }

  saveEdit() {
    if (!this.editingTask) return;
    this.isSavingEdit = true;
    this.cdr.markForCheck();

    const dto: any = {};
    if (this.editDto.assigned_employee !== undefined)
      dto.assigned_employee = this.editDto.assigned_employee || null;
    if (this.editDto.priority) dto.priority = this.editDto.priority;
    if (this.editDto.notes !== undefined) dto.notes = this.editDto.notes;
    if (this.editDto.estimated_hours !== null && this.editDto.estimated_hours !== undefined)
      dto.estimated_hours = Number(this.editDto.estimated_hours);
    if (this.editDto.actual_hours !== null && this.editDto.actual_hours !== undefined)
      dto.actual_hours = Number(this.editDto.actual_hours);

    this.productionService.updateTask(this.editingTask.id, dto).subscribe({
      next: () => {
        this.toast.success('Task updated successfully.');
        this.closeEditModal();
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update task.');
        this.isSavingEdit = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Delete Modal ──────────────────────────────────────────────────────────

  openDeleteConfirm(task: ProductionTask) {
    this.deletingTask = task;
    this.isDeleting = false;
    this.cdr.markForCheck();
  }

  closeDeleteConfirm() {
    this.deletingTask = null;
    this.cdr.markForCheck();
  }

  confirmDelete() {
    if (!this.deletingTask) return;
    this.isDeleting = true;
    this.cdr.markForCheck();

    this.productionService.deleteTask(this.deletingTask.id).subscribe({
      next: () => {
        this.toast.success('Production task deleted. Order returned to confirmed.');
        this.closeDeleteConfirm();
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to delete task.');
        this.isDeleting = false;
        this.cdr.markForCheck();
      },
    });
  }
}
