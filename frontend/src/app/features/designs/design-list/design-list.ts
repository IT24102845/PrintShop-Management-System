// ============================================================
// DESIGN LIST COMPONENT
// Purpose: Controls the Artwork & Design Proofs screen.
// UI: Displays and manages graphic design proofs, status approvals, and upload reviews.
// Flow: Component -> DesignService -> Backend Design API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * DESIGN LIST COMPONENT - PREPRESS ARTWORK & PROOF REPOSITORY
 * ============================================================================
 *
 * ARCHITECTURAL CONTEXT:
 * Central directory for graphic designers and prepress technicians.
 * Manages artwork versions, design remarks, customer approval statuses,
 * and direct file uploads to cloud storage.
 *
 * CORE RESPONSIBILITIES:
 * 1. Prepress Repository: Lists design files attached across orders with status
 *    badges (under_review, approved, revision_requested).
 * 2. Artwork Upload Pipeline: Integrates `FileUpload` component with reactive
 *    form binding (`uploadForm`), posting to POST `/api/v1/designs`.
 * 3. Client Sign-Off Link: Uploaded proofs become visible in the customer's
 *    `MyDesigns` portal for mandatory approval before print production.
 * 4. Edit (Update): Staff may update remarks on non-approved designs.
 * 5. Delete: Staff may delete non-approved designs with no active production task.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DesignService, Design } from '../../../core/services/design.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { FileUpload } from '../../../shared/components/file-upload/file-upload';

@Component({
  selector: 'app-design-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, StatusBadge, FileUpload],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-left"><h1>Designs</h1><p>Manage design files for orders</p></div>
        <div class="page-header-actions">
          <button class="btn btn-primary" (click)="toggleUploadForm()">
            <span class="material-icons-outlined">upload</span> Upload Design
          </button>
        </div>
      </div>

      <!-- Upload Form -->
      @if (showUploadForm) {
        <div class="card card-body mb-6">
          <h2 class="section-label">Upload Design</h2>
          <form [formGroup]="uploadForm" (ngSubmit)="onUpload()">
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem">
                <label style="margin-bottom:0; font-weight:600">Order ID (UUID) *</label>
                <button type="button" (click)="setManualOrderMode(!manualOrderMode)" style="font-size:0.78125rem; color:var(--primary-color, #0071e3); background:none; border:none; cursor:pointer; text-decoration:underline; padding:0;">
                  {{ manualOrderMode ? '← Choose from Order suggestions' : 'Or type UUID manually' }}
                </button>
              </div>

              @if (!manualOrderMode) {
                <select class="form-control" formControlName="order_id" (change)="onOrderSelect($event)">
                  <option value="">
                    {{ isLoadingOrders ? 'Loading available orders…' : '-- Select an Order (' + orders.length + ' available) --' }}
                  </option>
                  @if (pendingDesignOrders.length > 0) {
                    <optgroup label="🎨 Orders Awaiting Artwork / Proof (Design Review / Pending)">
                      @for (o of pendingDesignOrders; track o.id) {
                        <option [value]="o.id">
                          #{{ o.id.substring(0,8) }} — {{ (o.service_type || '').replace('_',' ') | titlecase }} ({{ o.quantity }} pcs) • [{{ (o.status || '').toUpperCase() }}] — {{ (o.description || o.special_notes || 'Print Job') | slice:0:45 }}
                        </option>
                      }
                    </optgroup>
                  }
                  @if (otherOrders.length > 0) {
                    <optgroup label="📦 Other Active Orders">
                      @for (o of otherOrders; track o.id) {
                        <option [value]="o.id">
                          #{{ o.id.substring(0,8) }} — {{ (o.service_type || '').replace('_',' ') | titlecase }} ({{ o.quantity }} pcs) • [{{ (o.status || '').toUpperCase() }}] — {{ (o.description || o.special_notes || 'Print Job') | slice:0:45 }}
                        </option>
                      }
                    </optgroup>
                  }
                </select>
              } @else {
                <input class="form-control" formControlName="order_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                <small class="text-muted" style="font-size:0.75rem; display:block; margin-top:0.25rem;">Enter or paste the 36-character order UUID</small>
              }

              @if (selectedOrder) {
                <div class="selected-order-card" style="margin-top:0.5rem; padding:0.75rem 1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:0.8125rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem">
                    <span style="font-weight:600; color:#1e293b;">
                      Order #{{ selectedOrder.id.substring(0,8) }} — {{ (selectedOrder.service_type || '').replace('_',' ') | titlecase }}
                    </span>
                    <span style="padding:0.15rem 0.5rem; border-radius:9999px; font-size:0.7rem; font-weight:700; text-transform:uppercase; background:#f3e8ff; color:#7e22ce;">
                      {{ (selectedOrder.status || '').toUpperCase() }}
                    </span>
                  </div>
                  <div style="color:#64748b; font-size:0.8125rem; display:flex; gap:1rem; flex-wrap:wrap;">
                    <span><strong>Qty:</strong> {{ selectedOrder.quantity }} pcs</span>
                    @if (selectedOrder.material) { <span><strong>Material:</strong> {{ selectedOrder.material }}</span> }
                    @if (selectedOrder.size) { <span><strong>Size:</strong> {{ selectedOrder.size }}</span> }
                    @if (selectedOrder.deadline_date) { <span><strong>Deadline:</strong> {{ selectedOrder.deadline_date | date:'MMM d, y' }}</span> }
                  </div>
                  @if (selectedOrder.description || selectedOrder.special_notes) {
                    <div style="color:#334155; font-size:0.8125rem; margin-top:0.25rem; font-style:italic;">
                      "{{ selectedOrder.description || selectedOrder.special_notes }}"
                    </div>
                  }
                  <div style="color:#94a3b8; font-family:monospace; font-size:0.7rem; margin-top:0.25rem;">
                    UUID: {{ selectedOrder.id }}
                  </div>
                </div>
              }
            </div>

            <div class="form-group">
              <label>Design File *</label>
              <app-file-upload folder="designs" (fileUploaded)="onFileUploaded($event)"></app-file-upload>
              @if (!uploadedUrl && uploadSubmitted) { <span class="error-msg">Please upload a file first</span> }
            </div>
            <div class="form-group">
              <label>Remarks</label>
              <input class="form-control" formControlName="remarks" placeholder="Optional designer notes" />
            </div>
            <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem">
              <button type="button" class="btn btn-secondary" (click)="toggleUploadForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="isUploading">
                {{ isUploading ? 'Saving…' : 'Save Design' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Design Table -->
      <div class="table-wrapper">
        @if (isLoading) {
          @for (i of [1,2,3,4]; track i) { <div class="skeleton skeleton-row"></div> }
        } @else if (designs.length === 0) {
          <div class="empty-state">
            <div class="empty-icon"><span class="material-icons-outlined">draw</span></div>
            <h3>No designs uploaded yet</h3>
            <p>Upload artwork and proofs for customer review.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Order ID</th><th>Customer</th><th>Service</th><th>Version</th><th>Status</th><th>File</th><th>Remarks</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (d of designs; track d.id) {
                <tr>
                  <td style="font-family:monospace;font-size:0.8rem">{{ d.id.substring(0,8) }}…</td>
                  <td style="font-family:monospace;font-size:0.8rem">{{ d.order_id.substring(0,8) }}…</td>
                  <td>{{ d.orders?.customers?.users?.full_name || '—' }}</td>
                  <td>{{ (d.orders?.service_type || '—').replace('_', ' ') | titlecase }}</td>
                  <td><strong>v{{ d.version }}</strong></td>
                  <td><app-status-badge [status]="d.approval_status"></app-status-badge></td>
                  <td>
                    <a [href]="d.file_url" target="_blank" rel="noopener" class="file-link">
                      <span class="material-icons-outlined" style="font-size:1rem">open_in_new</span> View
                    </a>
                  </td>
                  <td>{{ d.remarks || '—' }}</td>
                  <td class="text-muted text-sm">{{ d.created_at | date:'MMM d, y' }}</td>
                  <td>
                    <div class="action-cell">
                      @if (d.approval_status === 'approved') {
                        <span class="approved-lock-badge">
                          <span class="material-icons-outlined">lock</span> Locked
                        </span>
                      } @else {
                        <button class="btn btn-sm btn-secondary" (click)="openEditModal(d)" title="Edit remarks">
                          <span class="material-icons-outlined">edit</span> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" (click)="openDeleteConfirm(d)" title="Delete design">
                          <span class="material-icons-outlined">delete</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (totalPages > 1) {
            <div class="pagination">
              <span class="pagination-info">Page {{ page }} of {{ totalPages }}</span>
              <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" (click)="prevPage()" [disabled]="page===1">
                  <span class="material-icons-outlined">chevron_left</span>
                </button>
                <button class="btn btn-secondary btn-sm" (click)="nextPage()" [disabled]="page===totalPages">
                  <span class="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- ─── EDIT DESIGN MODAL ─────────────────────────────────────────────── -->
    @if (editingDesign) {
      <div class="modal-overlay" (click)="closeEditModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="material-icons-outlined">edit_note</span>
              Edit Design Proof
            </h3>
            <button class="modal-close" (click)="closeEditModal()">
              <span class="material-icons-outlined">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-meta-row">
              <span class="meta-pill">Order: #{{ editingDesign.order_id.substring(0,8) }}</span>
              <span class="meta-pill">Version: v{{ editingDesign.version }}</span>
              <app-status-badge [status]="editingDesign.approval_status"></app-status-badge>
            </div>
            <div class="form-group" style="margin-top:1rem">
              <label style="font-weight:600">Remarks</label>
              <textarea
                class="form-control"
                rows="4"
                placeholder="Enter designer notes or revision instructions…"
                [(ngModel)]="editRemarks"
                style="resize:vertical"
              ></textarea>
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

    <!-- ─── DELETE CONFIRM MODAL ─────────────────────────────────────────── -->
    @if (deletingDesign) {
      <div class="modal-overlay" (click)="closeDeleteConfirm()">
        <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title danger-title">
              <span class="material-icons-outlined">delete_forever</span>
              Delete Design Proof?
            </h3>
          </div>
          <div class="modal-body">
            <p style="color:#475569; margin-bottom:0.5rem">
              This will permanently remove this unapproved design proof.
            </p>
            <div class="modal-meta-row">
              <span class="meta-pill">Order: #{{ deletingDesign.order_id.substring(0,8) }}</span>
              <span class="meta-pill">Version: v{{ deletingDesign.version }}</span>
              <app-status-badge [status]="deletingDesign.approval_status"></app-status-badge>
            </div>
            <p style="color:#ef4444; font-size:0.8125rem; margin-top:0.75rem; font-weight:500">
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteConfirm()">Cancel</button>
            <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="isDeleting">
              <span class="material-icons-outlined">delete</span>
              {{ isDeleting ? 'Deleting…' : 'Delete Design' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .section-label { font-size:.9375rem; font-weight:700; margin-bottom:1.25rem; }
    .file-link { display:flex; align-items:center; gap:.25rem; font-size:.875rem; }
    .mb-6 { margin-bottom:1.5rem; }

    .action-cell { display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap; }

    .approved-lock-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 9999px;
      padding: 0.2rem 0.6rem;
      white-space: nowrap;
      .material-icons-outlined { font-size: 0.9rem; }
    }

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
      max-width: 480px;
      overflow: hidden;
      animation: slideUp 0.2s ease;
    }
    .modal-sm { max-width: 420px; }
    @keyframes slideUp {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
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
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 0.25rem;
      border-radius: 4px;
      display: flex;
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
    .modal-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .meta-pill {
      background: #f1f5f9;
      border-radius: 9999px;
      padding: 0.2rem 0.65rem;
      font-size: 0.78125rem;
      font-weight: 600;
      color: #475569;
    }
    :host-context([data-theme="dark"]) {
      .approved-lock-badge {
        background: rgba(52,199,89,0.10) !important;
        border-color: rgba(52,199,89,0.25) !important;
        color: #34c759 !important;
      }
      .modal-box {
        background: var(--bg-card) !important;
        border: 1px solid var(--border-color) !important;
      }
      .modal-header {
        border-bottom-color: var(--border-color) !important;
        .modal-title { color: var(--text-main) !important; }
      }
      .modal-footer {
        background: var(--bg-card-subtle) !important;
        border-top-color: var(--border-color) !important;
      }
      .modal-close {
        color: var(--text-muted) !important;
        &:hover { background: var(--bg-card-subtle) !important; }
      }
      .meta-pill {
        background: rgba(255,255,255,0.07) !important;
        color: var(--text-secondary) !important;
      }
    }
  `],
})
/**
 * Staff design directory and upload coordinator managing prepress proofs,
 * designer remarks, and customer sign-off readiness.
 */
export class DesignList implements OnInit {
  designs: Design[] = [];
  orders: any[] = [];
  pendingDesignOrders: any[] = [];
  otherOrders: any[] = [];
  isLoadingOrders = false;
  manualOrderMode = false;
  selectedOrder: any = null;

  isLoading = true;
  showUploadForm = false;
  isUploading = false;
  uploadedUrl = '';
  uploadSubmitted = false;
  page = 1;
  totalPages = 1;
  uploadForm: FormGroup;

  // Edit modal state
  editingDesign: Design | null = null;
  editRemarks = '';
  isSavingEdit = false;

  // Delete modal state
  deletingDesign: Design | null = null;
  isDeleting = false;

  constructor(
    private designService: DesignService,
    private orderService: OrderService,
    private toast: ToastService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {
    this.uploadForm = this.fb.group({ order_id: ['', Validators.required], remarks: [''] });
  }

  ngOnInit() {
    this.load();
    this.loadAvailableOrders();
    this.route.queryParams.subscribe(params => {
      if (params['order_id']) {
        this.showUploadForm = true;
        this.uploadForm.patchValue({ order_id: params['order_id'] });
        if (this.orders.length > 0) {
          this.selectedOrder = this.orders.find(o => o.id === params['order_id']) || null;
        }
      }
    });
  }

  loadAvailableOrders() {
    this.isLoadingOrders = true;
    this.orderService.getAllOrders({ limit: 100 }).subscribe({
      next: res => {
        if (res.success) {
          const items: any[] = (res as any).data?.items ?? (res as any).data ?? [];
          this.orders = items;
          this.pendingDesignOrders = items.filter(o => ['design_review', 'pending', 'quoted'].includes((o.status || '').toLowerCase()));
          this.otherOrders = items.filter(o => !['design_review', 'pending', 'quoted'].includes((o.status || '').toLowerCase()));

          const currentId = this.uploadForm.get('order_id')?.value;
          if (currentId) {
            this.selectedOrder = this.orders.find(o => o.id === currentId) || null;
          }
        }
        this.isLoadingOrders = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingOrders = false;
        this.cdr.markForCheck();
      },
    });
  }

  onOrderSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const orderId = select.value;
    this.selectedOrder = this.orders.find(o => o.id === orderId) || null;
    this.uploadForm.patchValue({ order_id: orderId });
  }

  setManualOrderMode(val: boolean) {
    this.manualOrderMode = val;
    this.cdr.markForCheck();
  }

  toggleUploadForm() {
    this.showUploadForm = !this.showUploadForm;
    if (this.showUploadForm) {
      this.loadAvailableOrders();
    }
    this.cdr.markForCheck();
  }

  load() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.designService.getAllDesigns(this.page).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          this.designs = Array.isArray(d) ? d : (d?.items ?? []);
          this.totalPages = d?.totalPages ?? (res as any).meta?.totalPages ?? 1;
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

  onFileUploaded(url: string) {
    this.uploadedUrl = url;
    this.cdr.markForCheck();
  }

  onUpload() {
    this.uploadSubmitted = true;
    if (this.uploadForm.invalid || !this.uploadedUrl) return;
    this.isUploading = true;
    this.cdr.markForCheck();
    const dto = { order_id: this.uploadForm.value.order_id, file_url: this.uploadedUrl, remarks: this.uploadForm.value.remarks };
    this.designService.uploadDesign(dto).subscribe({
      next: () => {
        this.toast.success('Design uploaded!');
        this.showUploadForm = false;
        this.selectedOrder = null;
        this.manualOrderMode = false;
        this.uploadedUrl = '';
        this.uploadSubmitted = false;
        this.uploadForm.reset();
        this.isUploading = false;
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to upload design.');
        this.isUploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Edit Modal ────────────────────────────────────────────────────────────

  openEditModal(design: Design) {
    this.editingDesign = design;
    this.editRemarks = design.remarks ?? '';
    this.isSavingEdit = false;
    this.cdr.markForCheck();
  }

  closeEditModal() {
    this.editingDesign = null;
    this.editRemarks = '';
    this.cdr.markForCheck();
  }

  saveEdit() {
    if (!this.editingDesign) return;
    this.isSavingEdit = true;
    this.cdr.markForCheck();

    this.designService.updateDesign(this.editingDesign.id, this.editRemarks).subscribe({
      next: () => {
        this.toast.success('Design remarks updated.');
        this.closeEditModal();
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update design.');
        this.isSavingEdit = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Delete Modal ──────────────────────────────────────────────────────────

  openDeleteConfirm(design: Design) {
    this.deletingDesign = design;
    this.isDeleting = false;
    this.cdr.markForCheck();
  }

  closeDeleteConfirm() {
    this.deletingDesign = null;
    this.cdr.markForCheck();
  }

  confirmDelete() {
    if (!this.deletingDesign) return;
    this.isDeleting = true;
    this.cdr.markForCheck();

    this.designService.deleteDesign(this.deletingDesign.id).subscribe({
      next: () => {
        this.toast.success('Design deleted.');
        this.closeDeleteConfirm();
        this.load();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to delete design.');
        this.isDeleting = false;
        this.cdr.markForCheck();
      },
    });
  }

  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }
}

