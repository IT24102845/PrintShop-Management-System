// ============================================================
// CUSTOMER MY DESIGNS COMPONENT
// Purpose: Controls the Customer Artwork Proofs screen.
// UI: Displays and manages design proofs, review status, and customer approval notes.
// Flow: Component -> DesignService -> Backend Design API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * MY DESIGNS COMPONENT - ARTWORK PROOF REVIEW & APPROVAL
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Acts as the critical quality-gate and customer sign-off mechanism before
 * any physical printing begins. Prevents costly manufacturing errors.
 * 
 * CORE OPERATIONS & SIDE EFFECTS:
 * 1. Proof Preview: Displays uploaded pre-press proofs, dimensions, and designer notes.
 * 2. Customer Approval (`approveDesign`):
 *    - Updates design approval_status to 'approved'.
 *    - BACKEND TRIGGER: The backend `design.service.ts` automatically dispatches
 *      a new entry into `production_tasks` (status: 'PENDING'), transitioning
 *      the job directly into the shop-floor manufacturing queue!
 * 3. Revision Request (`submitRevision`):
 *    - Updates status to 'revision_requested' with customer remarks, alerting
 *      the design department to generate an updated iteration.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DesignService, Design } from '../../../core/services/design.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-my-designs',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-left">
          <h1>Design Proofs & Approvals</h1>
          <p>Review design drafts submitted by our designers before we start printing</p>
        </div>
      </div>

      <!-- Content -->
      @if (isLoading) {
        <div class="card p-4">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton mb-3" style="height: 120px; border-radius: var(--radius-md)"></div>
          }
        </div>
      } @else if (designs.length === 0) {
        <div class="card empty-card text-center">
          <div class="empty-icon-wrap">
            <span class="material-icons-outlined empty-icon">palette</span>
          </div>
          <h3>No Design Proofs Yet</h3>
          <p class="text-muted mb-4">When our team prepares your print proofs, they will appear here for your review and approval.</p>
          <a routerLink="/customer/orders" class="btn btn-portal">
            <span class="material-icons-outlined">receipt_long</span> View My Orders
          </a>
        </div>
      } @else {
        <div class="designs-grid">
          @for (design of designs; track design.id) {
            <div class="card design-card" [class.needs-action]="isAwaitingCustomer(design.approval_status)">

              <!-- Preview Media Header -->
              <div class="design-preview-box">
                @if (isImage(design.file_url)) {
                  <img [src]="design.file_url" alt="Design Proof v{{ design.version }}" class="design-img" />
                } @else {
                  <div class="file-placeholder">
                    <span class="material-icons-outlined file-doc-icon">picture_as_pdf</span>
                    <span class="file-type-hint">PDF / Vector Proof</span>
                  </div>
                }

                <div class="preview-overlay">
                  <a [href]="design.file_url" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm overlay-btn">
                    <span class="material-icons-outlined">open_in_new</span> Open File
                  </a>
                  <a [href]="design.file_url" download class="btn btn-secondary btn-sm overlay-btn">
                    <span class="material-icons-outlined">download</span> Download
                  </a>
                </div>

                <div class="version-badge">v{{ design.version }}</div>
              </div>

              <!-- Design Info -->
              <div class="design-content">
                <div class="design-header-row">
                  <div>
                    <h3 class="design-title">Proof #{{ design.id.substring(0, 8) }}</h3>
                    <div class="design-order-link">
                      <a [routerLink]="'/customer/orders/' + design.order_id">
                        Order #{{ design.order_id.substring(0, 8) }}…
                      </a>
                    </div>
                  </div>
                  <app-status-badge [status]="design.approval_status"></app-status-badge>
                </div>

                @if (design.remarks) {
                  <div class="designer-notes">
                    <span class="material-icons-outlined notes-icon">chat</span>
                    <div>
                      <strong class="notes-sender">Designer Notes:</strong>
                      <p>{{ design.remarks }}</p>
                    </div>
                  </div>
                }

                <div class="design-meta-dates">
                  <span class="text-muted text-sm">Submitted: {{ design.created_at | date:'medium' }}</span>
                  @if (design.approved_at) {
                    <span class="text-success text-sm">Approved: {{ design.approved_at | date:'medium' }}</span>
                  }
                </div>

                <!-- Revision Feedback Area (collapsible when requested) -->
                @if (activeRevisionId === design.id) {
                  <div class="revision-box mt-3">
                    <label class="form-label required">What changes are needed?</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      [(ngModel)]="revisionRemarks"
                      placeholder="Please be specific about colours, alignment, text corrections, etc..."
                    ></textarea>
                    <div class="revision-actions mt-2">
                      <button class="btn btn-ghost btn-sm" (click)="cancelRevision()">Cancel</button>
                      <button
                        class="btn btn-warning btn-sm"
                        [disabled]="isSubmitting || !revisionRemarks.trim()"
                        (click)="submitRevision(design)"
                      >
                        Submit Revision Request
                      </button>
                    </div>
                  </div>
                }

              </div>

              <!-- Customer Action Bar -->
              @if (isAwaitingCustomer(design.approval_status) && activeRevisionId !== design.id) {
                <div class="design-card-footer">
                  <button
                    class="btn btn-secondary btn-sm"
                    [disabled]="isSubmitting"
                    (click)="startRevision(design)"
                  >
                    <span class="material-icons-outlined">edit_note</span> Request Changes
                  </button>
                  <button
                    class="btn btn-success btn-sm"
                    [disabled]="isSubmitting"
                    (click)="approveDesign(design)"
                  >
                    <span class="material-icons-outlined">check_circle</span> Approve Proof
                  </button>
                </div>
              } @else if (design.approval_status === 'approved') {
                <div class="design-card-footer approved-footer">
                  <span class="material-icons-outlined">verified</span> Proof Approved — Ready for Production
                </div>
              } @else if (design.approval_status === 'revision_requested') {
                <div class="design-card-footer revision-footer">
                  <span class="material-icons-outlined">pending_actions</span> Changes Requested — Designer Working on Update
                </div>
              }

            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .designs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }
    .design-card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      overflow: hidden;
      &.needs-action {
        border-color: var(--portal-color);
        box-shadow: 0 4px 16px rgba(14, 165, 233, 0.12);
      }
    }
    .design-preview-box {
      position: relative;
      height: 220px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      &:hover .preview-overlay { opacity: 1; }
    }
    .design-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #fff;
    }
    .file-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
    }
    .file-doc-icon { font-size: 3.5rem; color: #ef4444; }
    .file-type-hint { font-size: 0.8125rem; font-weight: 600; }
    .preview-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .overlay-btn {
      background: #fff;
      color: #0f172a;
      border: none;
      font-weight: 600;
      &:hover { background: #f8fafc; color: #0f172a; }
    }
    .version-badge {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      background: rgba(15, 23, 42, 0.75);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .design-content {
      padding: 1.25rem;
      flex: 1;
    }
    .design-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .design-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
    }
    .design-order-link a {
      font-size: 0.8125rem;
      color: var(--portal-color);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .designer-notes {
      display: flex;
      gap: 0.5rem;
      background: #f8fafc;
      border-radius: var(--radius-md);
      padding: 0.75rem;
      margin: 0.75rem 0;
      font-size: 0.8125rem;
      .notes-icon { color: var(--portal-color); font-size: 1.125rem; }
      .notes-sender { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.125rem; }
      p { margin: 0; color: var(--text-main); }
    }
    .design-meta-dates {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 0.75rem;
    }
    .revision-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: var(--radius-md);
      padding: 1rem;
    }
    .revision-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .design-card-footer {
      padding: 0.875rem 1.25rem;
      background: #fafbfc;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      &.approved-footer {
        color: var(--success-color);
        font-weight: 600;
        font-size: 0.8125rem;
        justify-content: center;
        background: rgba(16, 185, 129, 0.06);
        gap: 0.375rem;
      }
      &.revision-footer {
        color: var(--warning-color);
        font-weight: 600;
        font-size: 0.8125rem;
        justify-content: center;
        background: rgba(245, 158, 11, 0.06);
        gap: 0.375rem;
      }
    }
    .empty-card { padding: 4rem 2rem; }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(14, 165, 233, 0.1);
      color: var(--portal-color);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .empty-icon { font-size: 2.25rem; }
  `],
})
/**
 * Customer design proof review component handling visual inspection,
 * production dispatch sign-off, and revision feedback submission.
 */
export class MyDesigns implements OnInit {
  designs: Design[] = [];
  isLoading = true;
  isSubmitting = false;

  activeRevisionId: string | null = null;
  revisionRemarks = '';

  constructor(
    private designService: DesignService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadDesigns();
  }

  loadDesigns() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.designService.getMyDesigns().subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          this.designs = Array.isArray(d) ? d : (d?.items ?? []);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to load design proofs.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }


  isAwaitingCustomer(status: string): boolean {
    return status === 'pending' || status === 'under_review';
  }

  isImage(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg');
  }

  approveDesign(design: Design) {
    this.isSubmitting = true;
    this.cdr.markForCheck();
    this.designService.updateDesignStatus(design.id, 'approved').subscribe({
      next: res => {
        design.approval_status = 'approved';
        design.approved_at = new Date().toISOString();
        this.isSubmitting = false;
        this.toast.success('Proof approved! Production will now begin.');
        this.cdr.markForCheck();
      },
      error: err => {
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Failed to approve design proof.');
        this.cdr.markForCheck();
      },
    });
  }

  startRevision(design: Design) {
    this.activeRevisionId = design.id;
    this.revisionRemarks = '';
    this.cdr.markForCheck();
  }

  cancelRevision() {
    this.activeRevisionId = null;
    this.revisionRemarks = '';
    this.cdr.markForCheck();
  }

  submitRevision(design: Design) {
    if (!this.revisionRemarks.trim()) return;
    this.isSubmitting = true;
    this.cdr.markForCheck();
    this.designService.updateDesignStatus(design.id, 'revision_requested', this.revisionRemarks).subscribe({
      next: res => {
        design.approval_status = 'revision_requested';
        this.activeRevisionId = null;
        this.revisionRemarks = '';
        this.isSubmitting = false;
        this.toast.info('Revision requested. Our designer has been notified.');
        this.cdr.markForCheck();
      },
      error: err => {
        this.isSubmitting = false;
        this.toast.error(err.error?.message || 'Failed to request revision.');
        this.cdr.markForCheck();
      },
    });
  }
}
