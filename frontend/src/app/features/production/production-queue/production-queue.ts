// ============================================================
// PRODUCTION QUEUE COMPONENT
// Purpose: Controls the Print Production Queue screen.
// UI: Displays and manages job stages (Pre-Press, Printing, Cutting, QC, Ready).
// Flow: Component -> ProductionService -> Backend Production API
// Full Practical CRUD: Create, Read (Job Ticket), Update (Stages & Meta), Delete
// ============================================================

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ProductionService,
  ProductionTask,
  ProductionStatusUpdate,
  ProductionTaskStatus,
  TaskPriority,
  VALID_PRODUCTION_STATUSES
} from '../../../core/services/production.service';
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
          <p>Live shopfloor workflow tracking, job scheduling, and work order management</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" (click)="openCreateModal()">
            <span class="material-icons-outlined">add_task</span> Create Production Task
          </button>
          <div class="view-toggle">
            <button
              class="btn btn-sm"
              [class.btn-primary]="activeView === 'kanban'"
              [class.btn-secondary]="activeView !== 'kanban'"
              (click)="activeView = 'kanban'"
            >
              <span class="material-icons-outlined">view_kanban</span> Kanban
            </button>
            <button
              class="btn btn-sm"
              [class.btn-primary]="activeView === 'table'"
              [class.btn-secondary]="activeView !== 'table'"
              (click)="activeView = 'table'"
            >
              <span class="material-icons-outlined">table_rows</span> Table
            </button>
          </div>
          <button class="btn btn-secondary" (click)="load()" [disabled]="isLoading">
            <span class="material-icons-outlined" [class.spin]="isLoading">refresh</span> Refresh
          </button>
        </div>
      </div>

      <!-- KPI Metrics Bar -->
      <div class="metrics-grid">
        <div class="card metric-card" (click)="filterByStatus('WAITING')" [class.active-metric]="selectedStatus === 'WAITING'">
          <div class="metric-icon bg-warning-light text-warning">
            <span class="material-icons-outlined">hourglass_empty</span>
          </div>
          <div class="metric-content">
            <p class="metric-title">Waiting</p>
            <p class="metric-value">{{ countWaiting }}</p>
          </div>
        </div>

        <div class="card metric-card" (click)="filterByStatus('PRINTING')" [class.active-metric]="selectedStatus === 'PRINTING'">
          <div class="metric-icon bg-primary-light text-primary">
            <span class="material-icons-outlined">print</span>
          </div>
          <div class="metric-content">
            <p class="metric-title">Printing</p>
            <p class="metric-value">{{ countPrinting }}</p>
          </div>
        </div>

        <div class="card metric-card" (click)="filterByStatus('QUALITY_CHECK')" [class.active-metric]="selectedStatus === 'QUALITY_CHECK'">
          <div class="metric-icon bg-purple-light text-purple">
            <span class="material-icons-outlined">fact_check</span>
          </div>
          <div class="metric-content">
            <p class="metric-title">Quality Check</p>
            <p class="metric-value">{{ countQualityCheck }}</p>
          </div>
        </div>

        <div class="card metric-card" (click)="filterByStatus('READY_FOR_DELIVERY')" [class.active-metric]="selectedStatus === 'READY_FOR_DELIVERY'">
          <div class="metric-icon bg-info-light text-info">
            <span class="material-icons-outlined">local_shipping</span>
          </div>
          <div class="metric-content">
            <p class="metric-title">Ready for Delivery</p>
            <p class="metric-value">{{ countReady }}</p>
          </div>
        </div>

        <div class="card metric-card" (click)="filterByStatus('COMPLETED')" [class.active-metric]="selectedStatus === 'COMPLETED'">
          <div class="metric-icon bg-success-light text-success">
            <span class="material-icons-outlined">task_alt</span>
          </div>
          <div class="metric-content">
            <p class="metric-title">Completed</p>
            <p class="metric-value">{{ countCompleted }}</p>
          </div>
        </div>
      </div>

      <!-- Failed Task Alert Banner -->
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
          <input
            type="text"
            placeholder="Search by order #, customer, service, notes, or operator..."
            [(ngModel)]="searchTerm"
            (input)="filterTasks()"
          />
          @if (searchTerm) {
            <button class="clear-search-btn" (click)="searchTerm = ''; filterTasks()">
              <span class="material-icons-outlined">close</span>
            </button>
          }
        </div>

        <div class="filter-actions">
          <div class="filter-item">
            <label class="filter-label">Priority:</label>
            <select class="form-select" [(ngModel)]="selectedPriority" (change)="filterTasks()">
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Status:</label>
            <select class="form-select" [(ngModel)]="selectedStatus" (change)="filterTasks()">
              <option value="">All Stages</option>
              <option value="WAITING">Waiting</option>
              <option value="PRINTING">Printing</option>
              <option value="QUALITY_CHECK">Quality Check</option>
              <option value="READY_FOR_DELIVERY">Ready for Delivery</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          @if (selectedPriority || selectedStatus || searchTerm) {
            <button class="btn btn-sm btn-secondary reset-filters-btn" (click)="resetFilters()">
              <span class="material-icons-outlined">filter_alt_off</span> Clear
            </button>
          }
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
            <div class="kanban-col" [class.filtered-hidden]="selectedStatus && selectedStatus !== 'WAITING'">
              <div class="kanban-header border-waiting">
                <div class="col-title">
                  <span class="material-icons-outlined text-warning">schedule</span>
                  <span>Waiting</span>
                </div>
                <span class="col-count">{{ getColumnTasks('WAITING').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('WAITING'); track task.id) {
                  <div class="kanban-card" (click)="openViewModal(task)">
                    <div class="card-top">
                      <span class="order-ref" (click)="$event.stopPropagation()" [routerLink]="['/app/orders', task.order_id]">
                        #{{ task.order_id.substring(0,8) }}
                      </span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>

                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>

                    @if (getOrderSpecs(task)) {
                      <div class="card-specs-pill">
                        <span class="material-icons-outlined">layers</span>
                        <span>{{ getOrderSpecs(task) }}</span>
                      </div>
                    }

                    <div class="card-meta">
                      @if (task.orders?.deadline_date) {
                        <span class="meta-item" [class.deadline-warning]="isDeadlineNear(task.orders.deadline_date)">
                          <span class="material-icons-outlined">event</span>
                          {{ task.orders.deadline_date }}
                        </span>
                      }
                      <span class="meta-item">
                        <span class="material-icons-outlined">person</span>
                        {{ getEmployeeName(task) }}
                      </span>
                    </div>

                    @if (task.notes) {
                      <div class="card-notes" title="{{ task.notes }}">{{ task.notes }}</div>
                    }

                    <div class="card-actions" (click)="$event.stopPropagation()">
                      <button class="btn btn-primary btn-block btn-sm" (click)="transition(task.id, 'PRINTING')">
                        <span class="material-icons-outlined">play_arrow</span> Start Printing
                      </button>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View job details">
                          <span class="material-icons-outlined">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('WAITING').length === 0) {
                  <div class="empty-column">
                    <span class="material-icons-outlined">inbox</span>
                    <span>No jobs waiting</span>
                  </div>
                }
              </div>
            </div>

            <!-- 2. PRINTING -->
            <div class="kanban-col" [class.filtered-hidden]="selectedStatus && selectedStatus !== 'PRINTING'">
              <div class="kanban-header border-printing">
                <div class="col-title">
                  <span class="material-icons-outlined text-primary">print</span>
                  <span>Printing</span>
                </div>
                <span class="col-count">{{ getColumnTasks('PRINTING').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('PRINTING'); track task.id) {
                  <div class="kanban-card card-printing" (click)="openViewModal(task)">
                    <div class="card-top">
                      <span class="order-ref" (click)="$event.stopPropagation()" [routerLink]="['/app/orders', task.order_id]">
                        #{{ task.order_id.substring(0,8) }}
                      </span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>

                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>

                    @if (getOrderSpecs(task)) {
                      <div class="card-specs-pill">
                        <span class="material-icons-outlined">layers</span>
                        <span>{{ getOrderSpecs(task) }}</span>
                      </div>
                    }

                    <div class="card-meta">
                      @if (task.started_at) {
                        <span class="meta-item text-primary font-medium">
                          <span class="material-icons-outlined">timer</span> Started
                        </span>
                      }
                      <span class="meta-item">
                        <span class="material-icons-outlined">person</span>
                        {{ getEmployeeName(task) }}
                      </span>
                    </div>

                    @if (task.notes) {
                      <div class="card-notes" title="{{ task.notes }}">{{ task.notes }}</div>
                    }

                    <div class="card-actions" (click)="$event.stopPropagation()">
                      <button class="btn btn-warning btn-block btn-sm" (click)="transition(task.id, 'QUALITY_CHECK')">
                        <span class="material-icons-outlined">verified</span> Send to QC
                      </button>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="transition(task.id, 'WAITING')" title="Return to Waiting">
                          <span class="material-icons-outlined">undo</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View job details">
                          <span class="material-icons-outlined">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('PRINTING').length === 0) {
                  <div class="empty-column">
                    <span class="material-icons-outlined">precision_manufacturing</span>
                    <span>No jobs on press</span>
                  </div>
                }
              </div>
            </div>

            <!-- 3. QUALITY CHECK -->
            <div class="kanban-col" [class.filtered-hidden]="selectedStatus && selectedStatus !== 'QUALITY_CHECK'">
              <div class="kanban-header border-qc">
                <div class="col-title">
                  <span class="material-icons-outlined text-purple">fact_check</span>
                  <span>Quality Check</span>
                </div>
                <span class="col-count">{{ getColumnTasks('QUALITY_CHECK').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('QUALITY_CHECK'); track task.id) {
                  <div class="kanban-card" (click)="openViewModal(task)">
                    <div class="card-top">
                      <span class="order-ref" (click)="$event.stopPropagation()" [routerLink]="['/app/orders', task.order_id]">
                        #{{ task.order_id.substring(0,8) }}
                      </span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>

                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>

                    @if (getOrderSpecs(task)) {
                      <div class="card-specs-pill">
                        <span class="material-icons-outlined">layers</span>
                        <span>{{ getOrderSpecs(task) }}</span>
                      </div>
                    }

                    <div class="card-meta">
                      <span class="meta-item">
                        <span class="material-icons-outlined">person</span>
                        {{ getEmployeeName(task) }}
                      </span>
                      @if (task.estimated_hours) {
                        <span class="meta-item">
                          <span class="material-icons-outlined">hourglass_top</span>
                          {{ task.estimated_hours }}h est.
                        </span>
                      }
                    </div>

                    @if (task.notes) {
                      <div class="card-notes" title="{{ task.notes }}">{{ task.notes }}</div>
                    }

                    <div class="card-actions" (click)="$event.stopPropagation()">
                      <div class="dual-actions">
                        <button class="btn btn-success btn-sm flex-1" (click)="transition(task.id, 'READY_FOR_DELIVERY')">
                          <span class="material-icons-outlined">check</span> Pass
                        </button>
                        <button class="btn btn-secondary btn-sm" (click)="transition(task.id, 'PRINTING')" title="Rework in Print">
                          <span class="material-icons-outlined">replay</span>
                        </button>
                      </div>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View job details">
                          <span class="material-icons-outlined">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('QUALITY_CHECK').length === 0) {
                  <div class="empty-column">
                    <span class="material-icons-outlined">check_box</span>
                    <span>No jobs in inspection</span>
                  </div>
                }
              </div>
            </div>

            <!-- 4. READY FOR DELIVERY -->
            <div class="kanban-col" [class.filtered-hidden]="selectedStatus && selectedStatus !== 'READY_FOR_DELIVERY'">
              <div class="kanban-header border-ready">
                <div class="col-title">
                  <span class="material-icons-outlined text-info">local_shipping</span>
                  <span>Ready for Delivery</span>
                </div>
                <span class="col-count">{{ getColumnTasks('READY_FOR_DELIVERY').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('READY_FOR_DELIVERY'); track task.id) {
                  <div class="kanban-card" (click)="openViewModal(task)">
                    <div class="card-top">
                      <span class="order-ref" (click)="$event.stopPropagation()" [routerLink]="['/app/orders', task.order_id]">
                        #{{ task.order_id.substring(0,8) }}
                      </span>
                      <app-status-badge [status]="task.priority"></app-status-badge>
                    </div>

                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>

                    @if (getOrderSpecs(task)) {
                      <div class="card-specs-pill">
                        <span class="material-icons-outlined">layers</span>
                        <span>{{ getOrderSpecs(task) }}</span>
                      </div>
                    }

                    <div class="card-meta">
                      <span class="meta-item">
                        <span class="material-icons-outlined">person</span>
                        {{ getEmployeeName(task) }}
                      </span>
                      <span class="meta-item text-success font-medium">
                        <span class="material-icons-outlined">verified</span> QC Passed
                      </span>
                    </div>

                    <div class="card-actions" (click)="$event.stopPropagation()">
                      <button class="btn btn-primary btn-block btn-sm" (click)="transition(task.id, 'COMPLETED')">
                        <span class="material-icons-outlined">check_circle</span> Mark Delivered
                      </button>
                      <div class="card-secondary-actions">
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="transition(task.id, 'QUALITY_CHECK')" title="Back to QC">
                          <span class="material-icons-outlined">undo</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View job details">
                          <span class="material-icons-outlined">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('READY_FOR_DELIVERY').length === 0) {
                  <div class="empty-column">
                    <span class="material-icons-outlined">inventory_2</span>
                    <span>No jobs ready for dispatch</span>
                  </div>
                }
              </div>
            </div>

            <!-- 5. COMPLETED -->
            <div class="kanban-col" [class.filtered-hidden]="selectedStatus && selectedStatus !== 'COMPLETED'">
              <div class="kanban-header border-completed">
                <div class="col-title">
                  <span class="material-icons-outlined text-success">task_alt</span>
                  <span>Completed</span>
                </div>
                <span class="col-count">{{ getColumnTasks('COMPLETED').length }}</span>
              </div>
              <div class="kanban-cards">
                @for (task of getColumnTasks('COMPLETED'); track task.id) {
                  <div class="kanban-card completed-card" (click)="openViewModal(task)">
                    <div class="card-top">
                      <span class="order-ref" (click)="$event.stopPropagation()" [routerLink]="['/app/orders', task.order_id]">
                        #{{ task.order_id.substring(0,8) }}
                      </span>
                      <app-status-badge status="COMPLETED"></app-status-badge>
                    </div>

                    <h4 class="card-customer">{{ getCustomerName(task) }}</h4>
                    <p class="card-service">{{ getServiceDesc(task) }}</p>

                    @if (task.completed_at) {
                      <div class="card-meta">
                        <span class="meta-item text-success">
                          <span class="material-icons-outlined">done_all</span>
                          {{ task.completed_at | date:'shortDate' }}
                        </span>
                        @if (task.actual_hours) {
                          <span class="meta-item">
                            <span class="material-icons-outlined">schedule</span>
                            {{ task.actual_hours }} hrs
                          </span>
                        }
                      </div>
                    }

                    <div class="card-actions" (click)="$event.stopPropagation()">
                      <div class="card-secondary-actions" style="width:100%; justify-content:space-between">
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="transition(task.id, 'QUALITY_CHECK')" title="Reopen / Back to QC">
                          <span class="material-icons-outlined">replay</span> Reopen
                        </button>
                        <div style="display:flex; gap:0.35rem">
                          <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View details">
                            <span class="material-icons-outlined">visibility</span>
                          </button>
                          <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                            <span class="material-icons-outlined">edit</span>
                          </button>
                          <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                            <span class="material-icons-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                @if (getColumnTasks('COMPLETED').length === 0) {
                  <div class="empty-column">
                    <span class="material-icons-outlined">check_circle_outline</span>
                    <span>No completed jobs</span>
                  </div>
                }
              </div>
            </div>

          </div>
        }
      }

      <!-- TABLE VIEW -->
      @if (activeView === 'table') {
        <div class="table-wrapper card">
          @if (isLoading) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="skeleton skeleton-row"></div>
            }
          } @else if (filteredTasks.length === 0) {
            <div class="empty-state">
              <div class="empty-icon"><span class="material-icons-outlined">precision_manufacturing</span></div>
              <h3>No production tasks match criteria</h3>
              <p>Tasks are automatically created from approved orders or can be added manually.</p>
              <button class="btn btn-primary btn-sm" style="margin-top:0.75rem" (click)="openCreateModal()">
                <span class="material-icons-outlined">add</span> Create Task
              </button>
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
                  <th>Workflow Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (task of filteredTasks; track task.id) {
                  <tr>
                    <td class="font-mono text-xs text-muted">{{ task.id.substring(0,8) }}…</td>
                    <td>
                      <a [routerLink]="['/app/orders', task.order_id]" class="font-mono font-bold text-primary">
                        #{{ task.order_id.substring(0,8) }}
                      </a>
                    </td>
                    <td>
                      <div class="customer-cell">
                        <strong>{{ getCustomerName(task) }}</strong>
                        @if (getCustomerPhone(task)) {
                          <span class="text-xs text-muted">{{ getCustomerPhone(task) }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div>
                        <span>{{ getServiceDesc(task) }}</span>
                        @if (getOrderSpecs(task)) {
                          <div class="text-xs text-muted">{{ getOrderSpecs(task) }}</div>
                        }
                      </div>
                    </td>
                    <td><app-status-badge [status]="task.priority"></app-status-badge></td>
                    <td><app-status-badge [status]="task.status"></app-status-badge></td>
                    <td>
                      <span class="operator-pill">
                        <span class="material-icons-outlined text-xs">person</span>
                        {{ getEmployeeName(task) }}
                      </span>
                    </td>
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
                            <span class="material-icons-outlined text-xs">check</span> Pass
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
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openViewModal(task)" title="View job details">
                          <span class="material-icons-outlined">visibility</span>
                        </button>
                        <button class="btn btn-sm btn-secondary icon-btn" (click)="openEditModal(task)" title="Edit task">
                          <span class="material-icons-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger icon-btn" (click)="openDeleteConfirm(task)" title="Delete task">
                          <span class="material-icons-outlined">delete</span>
                        </button>
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

    <!-- ─── 1. VIEW TASK DETAILS / JOB TICKET MODAL (READ) ────────────────────── -->
    @if (viewingTask) {
      <div class="modal-overlay" (click)="closeViewModal()">
        <div class="modal-box modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-header-info">
              <span class="job-ticket-badge">WORK ORDER #{{ viewingTask.id.substring(0,8) }}</span>
              <h3 class="modal-title">
                <span class="material-icons-outlined text-primary">receipt_long</span>
                Job Ticket: Order #{{ viewingTask.order_id.substring(0,8) }}
              </h3>
            </div>
            <button class="modal-close" (click)="closeViewModal()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Stage Pipeline Stepper -->
            <div class="workflow-stepper">
              <div class="step-node" [class.step-active]="viewingTask.status === 'WAITING'" [class.step-done]="isStepDone(viewingTask.status, 'WAITING')">
                <div class="step-circle"><span class="material-icons-outlined">schedule</span></div>
                <span class="step-label">Waiting</span>
              </div>
              <div class="step-line" [class.line-done]="isStepDone(viewingTask.status, 'WAITING')"></div>

              <div class="step-node" [class.step-active]="viewingTask.status === 'PRINTING'" [class.step-done]="isStepDone(viewingTask.status, 'PRINTING')">
                <div class="step-circle"><span class="material-icons-outlined">print</span></div>
                <span class="step-label">Printing</span>
              </div>
              <div class="step-line" [class.line-done]="isStepDone(viewingTask.status, 'PRINTING')"></div>

              <div class="step-node" [class.step-active]="viewingTask.status === 'QUALITY_CHECK'" [class.step-done]="isStepDone(viewingTask.status, 'QUALITY_CHECK')">
                <div class="step-circle"><span class="material-icons-outlined">fact_check</span></div>
                <span class="step-label">QC Inspection</span>
              </div>
              <div class="step-line" [class.line-done]="isStepDone(viewingTask.status, 'QUALITY_CHECK')"></div>

              <div class="step-node" [class.step-active]="viewingTask.status === 'READY_FOR_DELIVERY'" [class.step-done]="isStepDone(viewingTask.status, 'READY_FOR_DELIVERY')">
                <div class="step-circle"><span class="material-icons-outlined">local_shipping</span></div>
                <span class="step-label">Ready</span>
              </div>
              <div class="step-line" [class.line-done]="isStepDone(viewingTask.status, 'READY_FOR_DELIVERY')"></div>

              <div class="step-node" [class.step-active]="viewingTask.status === 'COMPLETED'" [class.step-done]="isStepDone(viewingTask.status, 'COMPLETED')">
                <div class="step-circle"><span class="material-icons-outlined">task_alt</span></div>
                <span class="step-label">Completed</span>
              </div>
            </div>

            <!-- Two Column Details Grid -->
            <div class="details-grid">
              <!-- Left: Order & Material Specifications -->
              <div class="details-section">
                <h4 class="section-title">
                  <span class="material-icons-outlined">inventory_2</span>
                  Print Specifications
                </h4>

                <div class="spec-list">
                  <div class="spec-row">
                    <span class="spec-label">Customer</span>
                    <span class="spec-value font-bold">{{ getCustomerName(viewingTask) }}</span>
                  </div>
                  @if (getCustomerPhone(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Phone</span>
                      <span class="spec-value">{{ getCustomerPhone(viewingTask) }}</span>
                    </div>
                  }
                  @if (getCustomerEmail(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Email</span>
                      <span class="spec-value text-muted">{{ getCustomerEmail(viewingTask) }}</span>
                    </div>
                  }
                  <div class="spec-row">
                    <span class="spec-label">Service</span>
                    <span class="spec-value font-medium">{{ getServiceDesc(viewingTask) }}</span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Quantity</span>
                    <span class="spec-value badge-qty">{{ getOrderQty(viewingTask) }} units</span>
                  </div>
                  @if (getOrderMaterial(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Paper / Material</span>
                      <span class="spec-value">{{ getOrderMaterial(viewingTask) }}</span>
                    </div>
                  }
                  @if (getOrderSize(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Size / Dimension</span>
                      <span class="spec-value">{{ getOrderSize(viewingTask) }}</span>
                    </div>
                  }
                  @if (getOrderColour(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Color / Finish</span>
                      <span class="spec-value">{{ getOrderColour(viewingTask) }}</span>
                    </div>
                  }
                  @if (getOrderArtwork(viewingTask)) {
                    <div class="spec-row">
                      <span class="spec-label">Artwork</span>
                      <span class="spec-value">
                        <a [href]="getOrderArtwork(viewingTask)" target="_blank" class="artwork-link">
                          <span class="material-icons-outlined">attach_file</span> View Design Proof
                        </a>
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Right: Workflow & Production Tracking -->
              <div class="details-section">
                <h4 class="section-title">
                  <span class="material-icons-outlined">engineering</span>
                  Production & Shop Floor
                </h4>

                <div class="spec-list">
                  <div class="spec-row">
                    <span class="spec-label">Current Stage</span>
                    <span class="spec-value"><app-status-badge [status]="viewingTask.status"></app-status-badge></span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Job Priority</span>
                    <span class="spec-value"><app-status-badge [status]="viewingTask.priority"></app-status-badge></span>
                  </div>
                  <div class="spec-row">
                    <span class="spec-label">Assigned Operator</span>
                    <span class="spec-value font-medium">{{ getEmployeeName(viewingTask) }}</span>
                  </div>
                  @if (viewingTask.orders?.deadline_date) {
                    <div class="spec-row">
                      <span class="spec-label">Order Deadline</span>
                      <span class="spec-value" [class.text-danger]="isDeadlineNear(viewingTask.orders.deadline_date)">
                        📅 {{ viewingTask.orders.deadline_date }}
                      </span>
                    </div>
                  }
                  @if (viewingTask.started_at) {
                    <div class="spec-row">
                      <span class="spec-label">Started Printing</span>
                      <span class="spec-value">{{ viewingTask.started_at | date:'medium' }}</span>
                    </div>
                  }
                  @if (viewingTask.completed_at) {
                    <div class="spec-row">
                      <span class="spec-label">Completed At</span>
                      <span class="spec-value">{{ viewingTask.completed_at | date:'medium' }}</span>
                    </div>
                  }
                  <div class="spec-row">
                    <span class="spec-label">Hours (Est / Act)</span>
                    <span class="spec-value">
                      {{ viewingTask.estimated_hours || '—' }} hrs est. / {{ viewingTask.actual_hours || '0' }} hrs actual
                    </span>
                  </div>
                </div>

                @if (viewingTask.notes || getOrderNotes(viewingTask)) {
                  <div class="floor-notes-box">
                    <div class="notes-header">
                      <span class="material-icons-outlined">sticky_note_2</span> Floor Notes
                    </div>
                    <p class="notes-content">{{ viewingTask.notes || getOrderNotes(viewingTask) }}</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="modal-footer" style="justify-content:space-between">
            <div style="display:flex; gap:0.5rem">
              <button class="btn btn-secondary btn-sm" (click)="openEditModal(viewingTask); closeViewModal()">
                <span class="material-icons-outlined">edit</span> Edit Details
              </button>
              <button class="btn btn-danger btn-sm" (click)="openDeleteConfirm(viewingTask)">
                <span class="material-icons-outlined">delete</span> Delete Task
              </button>
            </div>

            <div style="display:flex; gap:0.5rem">
              @if (viewingTask.status === 'WAITING') {
                <button class="btn btn-primary" (click)="transition(viewingTask.id, 'PRINTING'); closeViewModal()">
                  <span class="material-icons-outlined">play_arrow</span> Start Printing
                </button>
              } @else if (viewingTask.status === 'PRINTING') {
                <button class="btn btn-warning" (click)="transition(viewingTask.id, 'QUALITY_CHECK'); closeViewModal()">
                  <span class="material-icons-outlined">verified</span> Send to QC
                </button>
              } @else if (viewingTask.status === 'QUALITY_CHECK') {
                <button class="btn btn-success" (click)="transition(viewingTask.id, 'READY_FOR_DELIVERY'); closeViewModal()">
                  <span class="material-icons-outlined">check</span> Pass Inspection
                </button>
              } @else if (viewingTask.status === 'READY_FOR_DELIVERY') {
                <button class="btn btn-primary" (click)="transition(viewingTask.id, 'COMPLETED'); closeViewModal()">
                  <span class="material-icons-outlined">check_circle</span> Mark Delivered
                </button>
              }
              <button class="btn btn-secondary" (click)="closeViewModal()">Close</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ─── 2. CREATE PRODUCTION TASK MODAL (CREATE) ──────────────────────── -->
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
              <label>Select Order to Queue <span class="required">*</span></label>
              @if (isLoadingEligible) {
                <div class="loading-inline">
                  <span class="material-icons-outlined spin">refresh</span> Loading eligible orders…
                </div>
              } @else if (eligibleOrders.length === 0) {
                <div class="empty-select-box">
                  <p class="text-muted text-sm">No unscheduled orders found right now.</p>
                  <button class="btn btn-sm btn-secondary" style="margin-top:0.4rem" (click)="openCreateModal()">
                    <span class="material-icons-outlined">refresh</span> Refresh List
                  </button>
                </div>
              } @else {
                <select class="form-control" [(ngModel)]="createDto.order_id">
                  <option value="">-- Choose an Order ({{ eligibleOrders.length }} available) --</option>
                  @for (o of eligibleOrders; track o.id) {
                    <option [value]="o.id">
                      #{{ o.id.substring(0,8) }} — {{ (o.service_type || '').replace('_',' ') }} ({{ o.quantity }} pcs) · {{ getOrderCustomer(o) }} [{{ o.status }}]
                    </option>
                  }
                </select>
              }
            </div>

            <div class="form-group">
              <label>Assigned Operator / Employee</label>
              <select class="form-control" [(ngModel)]="createDto.assigned_employee">
                <option value="">-- Unassigned (Floor Pool) --</option>
                @for (emp of availableEmployees; track emp.id) {
                  <option [value]="emp.id">{{ getEmpName(emp) }} ({{ emp.employee_role || 'Staff' }})</option>
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
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="createDto.estimated_hours"
                  min="0.5"
                  step="0.5"
                  placeholder="e.g. 3.5"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Shop Floor Instructions / Notes</label>
              <textarea
                class="form-control"
                rows="3"
                [(ngModel)]="createDto.notes"
                placeholder="Specific instructions for printing, material prep, or finishing…"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button class="btn btn-primary" (click)="submitCreate()" [disabled]="isCreating || !createDto.order_id">
              <span class="material-icons-outlined">add</span>
              {{ isCreating ? 'Creating…' : 'Queue Production Task' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── 3. EDIT PRODUCTION TASK MODAL (UPDATE) ────────────────────────── -->
    @if (editingTask) {
      <div class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="material-icons-outlined">edit</span>
              Edit Production Task #{{ editingTask.id.substring(0,8) }}
            </h3>
            <button class="modal-close" (click)="closeEditModal()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="modal-meta-row" style="margin-bottom:1.25rem">
              <span class="meta-pill">Order: #{{ editingTask.order_id.substring(0,8) }}</span>
              <span class="meta-pill">{{ getCustomerName(editingTask) }}</span>
              <app-status-badge [status]="editingTask.status"></app-status-badge>
            </div>

            <div class="form-group">
              <label>Change Stage / Status</label>
              <select class="form-control" [(ngModel)]="editDto.status">
                <option value="WAITING">WAITING — Pending shop floor press</option>
                <option value="PRINTING">PRINTING — Currently on press / cutting</option>
                <option value="QUALITY_CHECK">QUALITY_CHECK — Inspection & finishing</option>
                <option value="READY_FOR_DELIVERY">READY_FOR_DELIVERY — Packaged & ready</option>
                <option value="COMPLETED">COMPLETED — Delivered / Finished</option>
                <option value="FAILED">FAILED — Error / Needs Attention</option>
              </select>
            </div>

            <div class="form-group">
              <label>Assigned Operator</label>
              <select class="form-control" [(ngModel)]="editDto.assigned_employee">
                <option value="">-- Unassigned (Floor Pool) --</option>
                @for (emp of availableEmployees; track emp.id) {
                  <option [value]="emp.id">{{ getEmpName(emp) }} ({{ emp.employee_role || 'Staff' }})</option>
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
                <label>Actual Hours Spent</label>
                <input type="number" class="form-control" [(ngModel)]="editDto.actual_hours" min="0" step="0.5" />
              </div>
            </div>

            <div class="form-group">
              <label>Floor Notes</label>
              <textarea class="form-control" rows="3" [(ngModel)]="editDto.notes" placeholder="Notes for operators…"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
            <button class="btn btn-primary" (click)="saveEdit()" [disabled]="isSavingEdit">
              <span class="material-icons-outlined">save</span>
              {{ isSavingEdit ? 'Saving Changes…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── 4. DELETE CONFIRMATION MODAL (DELETE) ─────────────────────────── -->
    @if (deletingTask) {
      <div class="modal-overlay" (click)="closeDeleteConfirm()">
        <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title danger-title">
              <span class="material-icons-outlined">delete_forever</span>
              Delete Production Task?
            </h3>
            <button class="modal-close" (click)="closeDeleteConfirm()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <p style="color:#334155; margin-bottom:0.75rem; font-size:0.9375rem">
              Are you sure you want to remove the production task for:
            </p>
            <div class="delete-target-card">
              <div class="font-mono font-bold text-primary">Order #{{ deletingTask.order_id.substring(0,8) }}</div>
              <div style="font-weight:600; color:#0f172a">{{ getCustomerName(deletingTask) }}</div>
              <div style="font-size:0.8125rem; color:#64748b">{{ getServiceDesc(deletingTask) }}</div>
              <div style="margin-top:0.4rem"><app-status-badge [status]="deletingTask.status"></app-status-badge></div>
            </div>

            <p style="margin-top:0.875rem; font-size:0.8125rem; color:#64748b; line-height:1.4">
              The order and customer records will remain safe. The order status will be reverted to <strong>pending</strong> so it will not auto-recreate, and can be rescheduled whenever ready.
            </p>
            <p style="color:#ef4444; font-size:0.8125rem; margin-top:0.5rem; font-weight:600">
              This task deletion cannot be undone.
            </p>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteConfirm()">Cancel</button>
            <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="isDeleting">
              <span class="material-icons-outlined">delete</span>
              {{ isDeleting ? 'Deleting…' : 'Yes, Delete Task' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-container {
      padding: 1.5rem;
      max-width: 1600px;
      margin: 0 auto;
    }

    .view-toggle {
      display: inline-flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
      margin-right: 0.5rem;
    }

    /* KPI Metrics Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      cursor: pointer;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        border-color: #cbd5e1;
      }
    }

    .active-metric {
      border-color: #4f46e5 !important;
      background: #f5f3ff !important;
      box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
    }

    .metric-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      .material-icons-outlined { font-size: 1.5rem; }
    }

    .bg-purple-light { background: #f3e8ff; }
    .text-purple { color: #9333ea; }

    .metric-content {
      .metric-title { font-size: 0.8125rem; color: #64748b; font-weight: 500; margin: 0; }
      .metric-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0.2rem 0 0; }
    }

    /* Filters */
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
      min-width: 260px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      .material-icons-outlined { color: #94a3b8; font-size: 1.25rem; }
      input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.875rem; }
      .clear-search-btn {
        background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0; display: flex;
        &:hover { color: #475569; }
      }
    }

    .filter-actions {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      .filter-label { font-size: 0.8125rem; color: #64748b; font-weight: 600; white-space: nowrap; }
      select { min-width: 140px; padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8125rem; }
    }

    .reset-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
    }

    /* Alerts */
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

    /* KANBAN BOARD */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, minmax(260px, 1fr));
      gap: 1.125rem;
      overflow-x: auto;
      padding-bottom: 1.5rem;
      align-items: start;
    }

    .kanban-col {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      min-height: 520px;
      transition: all 0.2s ease;
    }

    .filtered-hidden {
      display: none !important;
    }

    .kanban-header {
      padding: 0.875rem 1rem;
      background: #ffffff;
      border-top-left-radius: 11px;
      border-top-right-radius: 11px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 4px solid transparent;
      .col-title {
        font-weight: 700;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: #1e293b;
        .material-icons-outlined { font-size: 1.2rem; }
      }
      .col-count {
        background: #f1f5f9;
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
      }
    }

    .border-waiting { border-top-color: #f59e0b; }
    .border-printing { border-top-color: #3b82f6; }
    .border-qc { border-top-color: #9333ea; }
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
      border-radius: 10px;
      padding: 0.875rem 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 14px rgba(0,0,0,0.07);
        border-color: #cbd5e1;
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.4rem;
        .order-ref {
          font-family: monospace;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #4f46e5;
          &:hover { text-decoration: underline; }
        }
      }

      .card-customer {
        font-size: 0.9375rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-service {
        font-size: 0.8125rem;
        color: #475569;
        margin: 0 0 0.5rem;
        font-weight: 500;
      }

      .card-specs-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: #f1f5f9;
        color: #475569;
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        margin-bottom: 0.6rem;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        .material-icons-outlined { font-size: 0.875rem; color: #64748b; }
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.75rem;
        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          .material-icons-outlined { font-size: 0.875rem; }
        }
      }

      .deadline-warning {
        color: #e11d48 !important;
        font-weight: 600;
      }

      .card-notes {
        background: #f8fafc;
        border-left: 3px solid #cbd5e1;
        padding: 0.35rem 0.6rem;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 0.75rem;
        border-radius: 0 6px 6px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-actions {
        margin-top: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        .btn-block { width: 100%; display: flex; justify-content: center; gap: 0.35rem; }
      }

      .card-secondary-actions {
        display: flex;
        gap: 0.35rem;
        justify-content: flex-end;
      }

      .dual-actions {
        display: flex;
        gap: 0.4rem;
        .flex-1 { flex: 1; }
      }
    }

    .card-printing {
      border-left: 3px solid #3b82f6;
    }

    .completed-card {
      background: #fcfdfc;
      border-left: 3px solid #10b981;
    }

    .icon-btn {
      padding: 0.3rem 0.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      .material-icons-outlined { font-size: 1.05rem; }
    }

    .empty-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: #94a3b8;
      font-size: 0.8125rem;
      text-align: center;
      gap: 0.5rem;
      .material-icons-outlined { font-size: 2rem; color: #cbd5e1; }
    }

    .kanban-loading {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1rem;
      .skeleton-col { background: #e2e8f0; border-radius: 10px; min-height: 440px; animation: pulse 1.5s infinite; }
    }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.3; } }

    /* Table styles */
    .table-wrapper {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
      th {
        background: #f8fafc;
        padding: 0.75rem 1rem;
        color: #475569;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
      }
      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      tbody tr:hover {
        background: #f8fafc;
      }
    }

    .customer-cell {
      display: flex;
      flex-direction: column;
    }

    .operator-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #f1f5f9;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
    }

    .action-cell {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Modal Layouts */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.22);
      width: 100%;
      max-width: 540px;
      overflow: hidden;
      animation: modalSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .modal-lg { max-width: 780px; }
    .modal-sm { max-width: 440px; }

    @keyframes modalSlide {
      from { transform: translateY(20px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .modal-header-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .job-ticket-badge {
      font-family: monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.5px;
    }

    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .danger-title .material-icons-outlined { color: #ef4444; }

    .modal-close {
      background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.35rem; border-radius: 6px; display: flex;
      &:hover { color: #334155; background: #f1f5f9; }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    /* Workflow Stepper in Details Modal */
    .workflow-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      background: #f8fafc;
      padding: 1rem 1.25rem;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      text-align: center;
      .step-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        .material-icons-outlined { font-size: 1.125rem; }
      }
      .step-label {
        font-size: 0.71875rem;
        font-weight: 600;
        color: #64748b;
      }
    }

    .step-active {
      .step-circle {
        background: #4f46e5 !important;
        color: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(79,70,229,0.25);
      }
      .step-label { color: #4f46e5 !important; font-weight: 700; }
    }

    .step-done {
      .step-circle {
        background: #10b981;
        color: #ffffff;
      }
      .step-label { color: #10b981; }
    }

    .step-line {
      flex: 1;
      height: 3px;
      background: #e2e8f0;
      margin: 0 0.5rem -1rem;
    }

    .line-done {
      background: #10b981;
    }

    /* Two Column Details in Job Ticket */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 680px) {
      .details-grid { grid-template-columns: 1fr; }
    }

    .details-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1.125rem;
    }

    .section-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.875rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
      .material-icons-outlined { font-size: 1.125rem; color: #6366f1; }
    }

    .spec-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      .spec-label { color: #64748b; }
      .spec-value { color: #0f172a; text-align: right; }
    }

    .badge-qty {
      background: #e0e7ff;
      color: #4338ca;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }

    .artwork-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #4f46e5;
      font-weight: 600;
      text-decoration: underline;
      .material-icons-outlined { font-size: 1rem; }
    }

    .floor-notes-box {
      margin-top: 1rem;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.75rem;
      .notes-header {
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        margin-bottom: 0.35rem;
        .material-icons-outlined { font-size: 0.875rem; color: #eab308; }
      }
      .notes-content {
        margin: 0;
        font-size: 0.8125rem;
        color: #334155;
        line-height: 1.4;
      }
    }

    .delete-target-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.875rem;
      margin: 0.5rem 0;
    }

    .empty-select-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #64748b;
      font-size: 0.875rem;
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

    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
})
export class ProductionQueue implements OnInit {
  tasks: ProductionTask[] = [];
  filteredTasks: ProductionTask[] = [];
  isLoading = true;
  activeView: 'kanban' | 'table' = 'kanban';
  searchTerm = '';
  selectedPriority = '';
  selectedStatus = '';

  readonly productionStatuses = VALID_PRODUCTION_STATUSES;

  get countWaiting()      { return this.tasks.filter(t => t.status === 'WAITING').length; }
  get countPrinting()     { return this.tasks.filter(t => t.status === 'PRINTING').length; }
  get countQualityCheck() { return this.tasks.filter(t => t.status === 'QUALITY_CHECK').length; }
  get countReady()        { return this.tasks.filter(t => t.status === 'READY_FOR_DELIVERY').length; }
  get countCompleted()    { return this.tasks.filter(t => t.status === 'COMPLETED').length; }
  get failedTasks()       { return this.tasks.filter(t => t.status === 'FAILED'); }

  // 1. View / Job Ticket Modal State (Read)
  viewingTask: ProductionTask | null = null;

  // 2. Create Modal State (Create)
  showCreateModal = false;
  isLoadingEligible = false;
  eligibleOrders: any[] = [];
  availableEmployees: any[] = [];
  isCreating = false;
  createDto: any = { order_id: '', assigned_employee: '', priority: 'normal', estimated_hours: null, notes: '' };

  // 3. Edit Modal State (Update)
  editingTask: ProductionTask | null = null;
  editDto: any = {};
  isSavingEdit = false;

  // 4. Delete Modal State (Delete)
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
        this.getServiceDesc(t).toLowerCase().includes(q) ||
        this.getEmployeeName(t).toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q);

      const matchesPriority = !this.selectedPriority || t.priority === this.selectedPriority;
      const matchesStatus = !this.selectedStatus || t.status === this.selectedStatus;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }

  filterByStatus(status: string) {
    if (this.selectedStatus === status) {
      this.selectedStatus = '';
    } else {
      this.selectedStatus = status;
    }
    this.filterTasks();
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedPriority = '';
    this.selectedStatus = '';
    this.filterTasks();
  }

  getColumnTasks(status: string): ProductionTask[] {
    return this.filteredTasks.filter(t => t.status === status);
  }

  // ─── Data Extraction Helpers ────────────────────────────────────────────────

  getCustomerName(task: ProductionTask): string {
    return (task as any).orders?.customers?.users?.full_name || 'Walk-in Client';
  }

  getCustomerEmail(task: ProductionTask): string {
    return (task as any).orders?.customers?.users?.email || '';
  }

  getCustomerPhone(task: ProductionTask): string {
    return (task as any).orders?.customers?.phone || '';
  }

  getServiceDesc(task: ProductionTask): string {
    const qty = (task as any).orders?.quantity ? `${(task as any).orders.quantity}x ` : '';
    const srv = ((task as any).orders?.service_type || 'Print Job').replace(/_/g, ' ');
    return `${qty}${srv}`;
  }

  getOrderQty(task: ProductionTask): number {
    return (task as any).orders?.quantity || 1;
  }

  getOrderMaterial(task: ProductionTask): string {
    return (task as any).orders?.material || '';
  }

  getOrderSize(task: ProductionTask): string {
    return (task as any).orders?.size || '';
  }

  getOrderColour(task: ProductionTask): string {
    return (task as any).orders?.colour || '';
  }

  getOrderNotes(task: ProductionTask): string {
    return (task as any).orders?.special_notes || '';
  }

  getOrderArtwork(task: ProductionTask): string | null {
    return (task as any).orders?.design_file_url || null;
  }

  getOrderSpecs(task: ProductionTask): string {
    const parts: string[] = [];
    const mat = this.getOrderMaterial(task);
    const size = this.getOrderSize(task);
    if (mat) parts.push(mat);
    if (size) parts.push(size);
    return parts.join(' · ');
  }

  getEmployeeName(task: ProductionTask): string {
    return (task as any).employees?.users?.full_name || 'Floor Pool';
  }

  getOrderCustomer(order: any): string {
    return order?.customers?.users?.full_name || 'Walk-in Client';
  }

  getEmpName(emp: any): string {
    return emp?.users?.full_name || emp?.users?.email || 'Employee';
  }

  isDeadlineNear(deadlineDateStr: string | null): boolean {
    if (!deadlineDateStr) return false;
    try {
      const deadline = new Date(deadlineDateStr);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 1; // Due today, overdue, or due tomorrow
    } catch {
      return false;
    }
  }

  isStepDone(currentStatus: string, step: string): boolean {
    const sequence = ['WAITING', 'PRINTING', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'COMPLETED'];
    const currentIndex = sequence.indexOf(currentStatus);
    const stepIndex = sequence.indexOf(step);
    return currentIndex > stepIndex;
  }

  // ─── Status Workflow Transitions ───────────────────────────────────────────

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

  // ─── 1. View / Job Ticket Modal (Read) ──────────────────────────────────────

  openViewModal(task: ProductionTask) {
    this.viewingTask = task;
    this.cdr.markForCheck();
  }

  closeViewModal() {
    this.viewingTask = null;
    this.cdr.markForCheck();
  }

  // ─── 2. Create Modal (Create) ──────────────────────────────────────────────

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
      error: () => {
        this.isLoadingEligible = false;
        this.cdr.markForCheck();
      },
    });

    this.productionService.getAvailableEmployees().subscribe({
      next: res => {
        this.availableEmployees = res.data ?? [];
        this.cdr.markForCheck();
      },
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
        this.toast.success('Production task created and queued!');
        this.closeCreateModal();
        this.load();
        this.isCreating = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to create production task.');
        this.isCreating = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── 3. Edit Modal (Update) ────────────────────────────────────────────────

  openEditModal(task: ProductionTask) {
    this.editingTask = task;
    this.editDto = {
      status: task.status,
      assigned_employee: (task as any).assigned_employee ?? '',
      priority: task.priority,
      notes: task.notes ?? '',
      estimated_hours: task.estimated_hours ?? null,
      actual_hours: task.actual_hours ?? null,
    };
    this.isSavingEdit = false;

    if (this.availableEmployees.length === 0) {
      this.productionService.getAvailableEmployees().subscribe({
        next: res => {
          this.availableEmployees = res.data ?? [];
          this.cdr.markForCheck();
        },
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
    if (this.editDto.status) dto.status = this.editDto.status;
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
        this.toast.success('Production task updated successfully.');
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

  // ─── 4. Delete Modal (Delete) ──────────────────────────────────────────────

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

    const taskId = this.deletingTask.id;
    this.productionService.deleteTask(taskId).subscribe({
      next: () => {
        this.toast.success('Production task deleted. Order returned to pending.');
        this.closeDeleteConfirm();
        if (this.viewingTask?.id === taskId) {
          this.closeViewModal();
        }
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
