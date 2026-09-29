// ============================================================
// ORDER DETAIL COMPONENT
// Purpose: Controls the Order Detail view screen.
// UI: Displays and manages individual order specifications, linked quotes, and tasks.
// Flow: Component -> OrderService -> Backend Order API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * ORDER DETAIL COMPONENT - CROSS-PORTAL LIFECYCLE COMMAND NEXUS
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * The most comprehensive operational view in the application. Serves as the
 * single-pane-of-glass for an order across both Customer and Staff portals.
 * 
 * CROSS-DOMAIN INTEGRATIONS & LIFECYCLE CAPABILITIES:
 * 1. Role-Adaptive UI:
 *    - Customers: View status, review & accept quotes, inspect artwork proofs,
 *      request revisions, view receipts.
 *    - Staff (Admin / Manager / Operator): Issue quotations, upload artwork proofs,
 *      dispatch jobs to the production queue, record payments, and force lifecycle
 *      status transitions.
 * 2. Multi-Modal Workflows:
 *    - `showQuoteModal`: Staff submits price estimates.
 *    - `showProofModal`: Designers upload new artwork revisions.
 *    - `showRevisionModal`: Customers submit revision feedback notes.
 *    - `showPaymentModal`: Staff records financial settlements.
 *    - `showProductionModal`: Supervisors dispatch approved orders to print technicians.
 * ============================================================================
 */

import { Component, OnInit, computed, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, Order, OrderStatus } from '../../../core/services/order.service';
import { QuotationService, Quotation } from '../../../core/services/quotation.service';
import { DesignService, Design } from '../../../core/services/design.service';
import { ProductionService, ProductionTask, ProductionTaskStatus, TaskPriority } from '../../../core/services/production.service';
import { PaymentService, PaymentRecord, PaymentMethod, PaymentStatus } from '../../../core/services/payment.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { FileUpload } from '../../../shared/components/file-upload/file-upload';

const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'quoted', 'confirmed', 'design_review',
  'in_production', 'quality_check', 'ready', 'delivered', 'cancelled', 'COMPLETED'
];

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StatusBadge, FileUpload],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
/**
 * Master order detail and orchestration component coordinating quotations,
 * artwork approvals, production dispatches, and payment records.
 */
export class OrderDetail implements OnInit {
  order: Order | null = null;
  isLoading = true;
  isUpdating = false;
  selectedStatus = '';

  // Active user roles
  isStaff = computed(() => this.authService.isStaff());
  isCustomer = computed(() => this.authService.isCustomer());
  isAdminOrManager = computed(() => {
    const r = this.authService.currentUser()?.role;
    return r === 'admin' || r === 'manager';
  });
  canManageProduction = computed(() => {
    const r = this.authService.currentUser()?.role;
    return r === 'admin' || r === 'manager' || r === 'production_staff';
  });
  canManageDesigns = computed(() => {
    const r = this.authService.currentUser()?.role;
    return r === 'admin' || r === 'manager' || r === 'design_staff';
  });

  readonly orderStatuses = ORDER_STATUSES;

  // Dialog State Signals
  showQuoteModal = signal(false);
  quoteForm = { amount: 0, valid_until: '', notes: '' };
  isSubmittingQuote = false;

  showProofModal = signal(false);
  proofForm = { file_url: '', remarks: '' };
  isSubmittingProof = false;

  showRevisionModal = signal(false);
  revisionRemarks = '';
  isSubmittingRevision = false;

  showPaymentModal = signal(false);
  paymentForm: {
    amount: number;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    transaction_ref: string;
    notes: string;
  } = {
    amount: 0,
    payment_method: 'cash',
    payment_status: 'completed',
    transaction_ref: '',
    notes: '',
  };
  isSubmittingPayment = false;

  showProductionModal = signal(false);
  productionForm: { priority: TaskPriority; notes: string; estimated_hours: number } = {
    priority: 'normal',
    notes: '',
    estimated_hours: 4,
  };
  isSubmittingProduction = false;

  previewImageUrl = signal<string | null>(null);

  // Artwork upload state
  isUploadingArtwork = false;
  artworkUploadProgress = 0;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private quotationService: QuotationService,
    private designService: DesignService,
    private productionService: ProductionService,
    private paymentService: PaymentService,
    private storageService: StorageService,
    public authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadOrder();
  }

  /**
   * Purpose: Upload and attach initial artwork to an existing order.
   * Process: Validates and uploads file to Supabase Storage, then links URL to the order.
   */
  onUploadArtwork(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingArtwork = true;
    this.artworkUploadProgress = 0;
    this.cdr.markForCheck();

    this.storageService.uploadFile(file, 'orders').subscribe({
      next: progress => {
        this.artworkUploadProgress = progress.percent;
        this.cdr.markForCheck();

        if (progress.done && progress.result) {
          const fileUrl = progress.result.url;
          this.orderService.updateOrderArtwork(this.order!.id, fileUrl).subscribe({
            next: () => {
              this.order!.design_file_url = fileUrl;
              this.isUploadingArtwork = false;
              this.toast.success('Artwork uploaded and attached to order successfully!');
              this.cdr.markForCheck();
            },
            error: err => {
              this.isUploadingArtwork = false;
              this.toast.error(err?.error?.message || 'Failed to link artwork to order.');
              this.cdr.markForCheck();
            }
          });
        }
      },
      error: err => {
        this.isUploadingArtwork = false;
        this.toast.error(err?.message || 'Failed to upload artwork file.');
        this.cdr.markForCheck();
      }
    });

    input.value = '';
  }


  loadOrder() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.isLoading = true;
    this.orderService.getOrderById(id).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.order = res.data;
          this.selectedStatus = res.data.status;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to load order details.');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Computations ──────────────────────────────────────────────────────────

  get latestQuotation(): Quotation | null {
    if (!this.order?.quotations?.length) return null;
    return [...this.order.quotations].sort((a, b) => (b.revision || 0) - (a.revision || 0))[0];
  }

  get acceptedQuotation(): Quotation | null {
    if (!this.order?.quotations?.length) return null;
    return this.order.quotations.find(q => q.status === 'accepted') || null;
  }

  get quotedAmount(): number {
    if (this.acceptedQuotation) return Number(this.acceptedQuotation.amount) || 0;
    if (this.latestQuotation) return Number(this.latestQuotation.amount) || 0;
    return 0;
  }

  get totalPaid(): number {
    if (!this.order?.payments?.length) return 0;
    return this.order.payments
      .filter(p => p.payment_status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  get balanceDue(): number {
    const quoted = this.quotedAmount;
    if (!quoted) return 0;
    return Math.max(0, quoted - this.totalPaid);
  }

  get paymentOverallStatus(): 'PAID' | 'PARTIAL' | 'UNPAID' {
    if (this.quotedAmount === 0) return 'UNPAID';
    if (this.totalPaid >= this.quotedAmount) return 'PAID';
    if (this.totalPaid > 0) return 'PARTIAL';
    return 'UNPAID';
  }

  get latestDesign(): Design | null {
    if (!this.order?.designs?.length) return null;
    return [...this.order.designs].sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  }

  get isDesignApproved(): boolean {
    const hasApprovedProof = this.order?.designs?.some(d => d.approval_status === 'approved') || false;
    const hasClientArtwork = Boolean(this.order?.design_file_url);
    const isOrderConfirmed = this.order?.status === 'confirmed' || this.order?.status === 'in_production';
    return hasApprovedProof || (hasClientArtwork && isOrderConfirmed);
  }

  get activeProductionTask(): ProductionTask | null {
    if (!this.order?.production_tasks?.length) return null;
    const tasks = [...this.order.production_tasks];
    // Look for active in-progress task first
    const active = tasks.find(t => t.status !== 'COMPLETED' && t.status !== 'FAILED');
    return active || tasks[tasks.length - 1];
  }

  get productionStepIndex(): number {
    const t = this.activeProductionTask;
    if (!t) return 0;
    switch (t.status) {
      case 'WAITING': return 1;
      case 'PRINTING': return 2;
      case 'QUALITY_CHECK': return 3;
      case 'READY_FOR_DELIVERY': return 4;
      case 'COMPLETED': return 5;
      case 'FAILED': return -1;
      default: return 0;
    }
  }

  get isArtworkImage(): boolean {
    if (!this.order?.design_file_url) return false;
    const url = this.order.design_file_url.toLowerCase();
    return url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.svg') || url.includes('.webp');
  }

  get artworkFileName(): string {
    if (!this.order?.design_file_url) return 'Artwork';
    const parts = this.order.design_file_url.split('/');
    return parts[parts.length - 1].split('?')[0] || 'Artwork File';
  }

  get isDeadlineOverdue(): boolean {
    if (!this.order?.deadline_date) return false;
    if (['COMPLETED', 'delivered', 'cancelled'].includes(this.order.status)) return false;
    const deadline = new Date(this.order.deadline_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  }

  get daysUntilDeadline(): number {
    if (!this.order?.deadline_date) return 0;
    const deadline = new Date(this.order.deadline_date).getTime();
    const today = new Date().getTime();
    return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  }

  get backRoute(): string {
    return this.authService.isCustomer() ? '/customer/orders' : '/app/orders';
  }

  // ─── Status Update ─────────────────────────────────────────────────────────

  updateStatus() {
    if (!this.order || this.selectedStatus === this.order.status) return;
    this.isUpdating = true;
    this.orderService.updateOrderStatus(this.order.id, this.selectedStatus).subscribe({
      next: res => {
        if (res.success) {
          this.order!.status = this.selectedStatus;
          this.toast.success(`Order status updated to ${this.selectedStatus.replaceAll('_', ' ')}.`);
        }
        this.isUpdating = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to update order status.');
        this.isUpdating = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Quotations ────────────────────────────────────────────────────────────

  openCreateQuoteModal() {
    const defaultValid = new Date();
    defaultValid.setDate(defaultValid.getDate() + 14);
    this.quoteForm = {
      amount: this.quotedAmount || 5000,
      valid_until: defaultValid.toISOString().split('T')[0],
      notes: '',
    };
    this.showQuoteModal.set(true);
  }

  submitQuotation() {
    if (!this.order || this.quoteForm.amount <= 0) {
      this.toast.error('Please enter a valid quotation amount.');
      return;
    }
    this.isSubmittingQuote = true;
    this.quotationService.create({
      order_id: this.order.id,
      amount: Number(this.quoteForm.amount),
      valid_until: this.quoteForm.valid_until ? new Date(this.quoteForm.valid_until).toISOString() : undefined,
      notes: this.quoteForm.notes || undefined,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Quotation sent to customer successfully!');
          this.showQuoteModal.set(false);
          this.loadOrder();
        }
        this.isSubmittingQuote = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to create quotation.');
        this.isSubmittingQuote = false;
      },
    });
  }

  acceptQuotation(quoteId: string) {
    if (!confirm('Are you sure you want to accept this quotation?')) return;
    this.quotationService.respond(quoteId, 'accepted').subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Quotation accepted! Order confirmed.');
          this.loadOrder();
        }
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to accept quotation.');
      },
    });
  }

  rejectQuotation(quoteId: string) {
    if (!confirm('Are you sure you want to reject this quotation?')) return;
    this.quotationService.respond(quoteId, 'rejected').subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Quotation declined.');
          this.loadOrder();
        }
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to reject quotation.');
      },
    });
  }

  // ─── Designs ───────────────────────────────────────────────────────────────

  openUploadProofModal() {
    this.proofForm = { file_url: '', remarks: '' };
    this.showProofModal.set(true);
  }

  onProofFileUploaded(url: string) {
    this.proofForm.file_url = url;
  }

  submitProof() {
    if (!this.order || !this.proofForm.file_url) {
      this.toast.error('Please upload a proof file or provide a valid URL.');
      return;
    }
    this.isSubmittingProof = true;
    this.designService.uploadDesign({
      order_id: this.order.id,
      file_url: this.proofForm.file_url,
      remarks: this.proofForm.remarks || undefined,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success(`Design proof v${res.data?.version || ''} uploaded for customer review!`);
          this.showProofModal.set(false);
          this.loadOrder();
        }
        this.isSubmittingProof = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to upload proof.');
        this.isSubmittingProof = false;
      },
    });
  }

  approveProof(designId: string) {
    if (!confirm('Are you satisfied with this proof and ready to approve it for production?')) return;
    this.designService.updateDesignStatus(designId, 'approved').subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Design approved! Production is now enabled.');
          this.loadOrder();
        }
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to approve design.');
      },
    });
  }

  openRevisionModal() {
    this.revisionRemarks = '';
    this.showRevisionModal.set(true);
  }

  submitRevision() {
    if (!this.latestDesign) return;
    if (!this.revisionRemarks.trim()) {
      this.toast.error('Please describe what changes are requested.');
      return;
    }
    this.isSubmittingRevision = true;
    this.designService.updateDesignStatus(this.latestDesign.id, 'revision_requested', this.revisionRemarks).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Revision request sent to the design team.');
          this.showRevisionModal.set(false);
          this.loadOrder();
        }
        this.isSubmittingRevision = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to submit revision request.');
        this.isSubmittingRevision = false;
      },
    });
  }

  // ─── Production ────────────────────────────────────────────────────────────

  openCreateTaskModal() {
    this.productionForm = { priority: 'normal', notes: '', estimated_hours: 4 };
    this.showProductionModal.set(true);
  }

  submitCreateTask() {
    if (!this.order) return;
    this.isSubmittingProduction = true;
    this.productionService.createTask({
      order_id: this.order.id,
      priority: this.productionForm.priority,
      notes: this.productionForm.notes || undefined,
      estimated_hours: Number(this.productionForm.estimated_hours) || undefined,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success('Production job queued successfully!');
          this.showProductionModal.set(false);
          this.loadOrder();
        }
        this.isSubmittingProduction = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to create production task.');
        this.isSubmittingProduction = false;
      },
    });
  }

  advanceProduction() {
    const task = this.activeProductionTask;
    if (!task) return;

    let nextStatus: ProductionTaskStatus | null = null;
    if (task.status === 'WAITING') nextStatus = 'PRINTING';
    else if (task.status === 'PRINTING') nextStatus = 'QUALITY_CHECK';
    else if (task.status === 'QUALITY_CHECK') nextStatus = 'READY_FOR_DELIVERY';
    else if (task.status === 'READY_FOR_DELIVERY') nextStatus = 'COMPLETED';

    if (!nextStatus) return;

    this.isUpdating = true;
    this.productionService.updateTaskStatus(task.id, nextStatus).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success(`Production advanced to ${nextStatus.replace(/_/g, ' ')}!`);
          this.loadOrder();
        }
        this.isUpdating = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to advance production.');
        this.isUpdating = false;
      },
    });
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  openRecordPaymentModal() {
    this.paymentForm = {
      amount: this.balanceDue > 0 ? this.balanceDue : (this.quotedAmount || 1000),
      payment_method: 'cash',
      payment_status: 'completed',
      transaction_ref: '',
      notes: '',
    };
    this.showPaymentModal.set(true);
  }

  submitPayment() {
    if (!this.order || this.paymentForm.amount <= 0) {
      this.toast.error('Payment amount must be greater than 0.');
      return;
    }
    this.isSubmittingPayment = true;
    this.paymentService.recordPayment({
      order_id: this.order.id,
      amount: Number(this.paymentForm.amount),
      payment_method: this.paymentForm.payment_method,
      payment_status: this.paymentForm.payment_status,
      transaction_ref: this.paymentForm.transaction_ref || undefined,
      notes: this.paymentForm.notes || undefined,
    }).subscribe({
      next: res => {
        if (res.success) {
          this.toast.success(`Payment of LKR ${this.paymentForm.amount.toLocaleString()} recorded!`);
          this.showPaymentModal.set(false);
          this.loadOrder();
        }
        this.isSubmittingPayment = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to record payment.');
        this.isSubmittingPayment = false;
      },
    });
  }

  // ─── Utils ─────────────────────────────────────────────────────────────────

  copyOrderId() {
    if (!this.order) return;
    navigator.clipboard.writeText(this.order.id);
    this.toast.success('Order ID copied to clipboard!');
  }

  openImagePreview(url: string) {
    this.previewImageUrl.set(url);
  }

  closeImagePreview() {
    this.previewImageUrl.set(null);
  }

  printOrder() {
    window.print();
  }
}
