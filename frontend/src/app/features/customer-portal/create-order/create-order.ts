// ============================================================
// CUSTOMER CREATE ORDER COMPONENT
// Purpose: Controls the Customer Self-Service Order Request screen.
// UI: Displays and manages order request form with file upload and live price estimate.
// Flow: Component -> OrderService / StorageService -> Backend Order API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * CREATE ORDER COMPONENT - CUSTOMER PRINT INTAKE WIZARD
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Entry point of the print production lifecycle initiated by the client.
 * Implements a modern reactive form interface allowing customers to
 * configure custom print specifications and attach high-resolution artwork.
 * 
 * LIFECYCLE INITIALIZATION:
 * 1. Customer configures job parameters (service type, quantity, material, colors).
 * 2. Artwork File Upload: Direct-to-Supabase Storage upload via `FileUpload` component.
 * 3. Submission: Dispatches POST `/api/v1/orders` creating a `PENDING` order.
 * 4. Post-Submission: Redirects customer to `OrderDetail` to await quotation review.
 * ============================================================================
 */

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { FileUpload } from '../../../shared/components/file-upload/file-upload';

interface ServiceOption {
  value: string;
  label: string;
  icon: string;
  desc: string;
}

const SERVICES: ServiceOption[] = [
  { value: 'brochures', label: 'Digital Printing', icon: 'print', desc: 'Multi-page booklets, manuals, documents & catalogs' },
  { value: 'banners', label: 'Banner Printing', icon: 'view_carousel', desc: 'Roll-up, PVC, vinyl & mesh event banners' },
  { value: 'business_cards', label: 'Business Card Printing', icon: 'badge', desc: 'Standard, matte, gloss, spot UV & metallic foil' },
  { value: 'flyers', label: 'Flyer Printing', icon: 'description', desc: 'A4, A5, leaflets & tri-fold corporate flyers' },
  { value: 'posters', label: 'Poster Printing', icon: 'image', desc: 'High-resolution glossy, matte & architectural plans' },
  { value: 'tshirts', label: 'Customized Products', icon: 'checkroom', desc: 'T-shirts, apparel, mugs, caps & branded merchandise' },
  { value: 'custom', label: 'Invitation Printing', icon: 'mark_email_read', desc: 'Weddings, celebrations & event stationery' },
  { value: 'stickers', label: 'Promotional Materials', icon: 'loyalty', desc: 'Die-cut vinyl, labels, decals, badges & stickers' },
  { value: 'packaging', label: 'Packaging & Boxes', icon: 'inventory_2', desc: 'Custom corrugated mailer boxes & bags' },
  { value: 'signage', label: 'Signage & Acrylic', icon: 'storefront', desc: 'Office & storefront displays, acrylic signage' },
];

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FileUpload],
  template: `
    <div class="page-container" style="max-width: 900px">
      <div class="page-header">
        <div class="page-header-left">
          <h1>{{ isQuoteMode ? 'Request Price Quotation' : 'Place New Order' }}</h1>
          <p>{{ isQuoteMode ? 'Submit your job specifications to receive a formal price estimate' : 'Configure your print specifications and upload artwork' }}</p>
        </div>
        <div class="page-header-actions">
          @if (isQuoteMode) {
            <a routerLink="/customer/quotations" class="btn btn-secondary">
              <span class="material-icons-outlined">arrow_back</span> Back to Quotations
            </a>
          } @else {
            <a routerLink="/customer/orders" class="btn btn-secondary">
              <span class="material-icons-outlined">arrow_back</span> Back to Orders
            </a>
          }
        </div>
      </div>

      <div class="card p-4">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <!-- 1. Service Selection -->
          <div class="form-section mb-5">
            <div class="section-title">
              <span class="section-step">1</span>
              <div>
                <h3>Select Service</h3>
                <p class="text-muted text-sm">Choose what type of print job you need</p>
              </div>
            </div>

            <div class="service-cards-grid mt-3">
              @for (svc of services; track svc.value) {
                <div
                  class="service-card"
                  [class.selected]="form.get('service_type')?.value === svc.value"
                  (click)="selectService(svc.value)"
                >
                  <div class="service-card-icon">
                    <span class="material-icons-outlined">{{ svc.icon }}</span>
                  </div>
                  <div class="service-card-info">
                    <h4>{{ svc.label }}</h4>
                    <p>{{ svc.desc }}</p>
                  </div>
                  @if (form.get('service_type')?.value === svc.value) {
                    <span class="material-icons-outlined service-check">check_circle</span>
                  }
                </div>
              }
            </div>
            @if (f['service_type'].touched && f['service_type'].invalid) {
              <p class="error-text mt-2">Please select a service type.</p>
            }
          </div>

          <!-- 2. Specifications -->
          <div class="form-section mb-5">
            <div class="section-title">
              <span class="section-step">2</span>
              <div>
                <h3>Order Details & Specs</h3>
                <p class="text-muted text-sm">Describe your print specifications</p>
              </div>
            </div>

            <div class="form-grid mt-3">
              <!-- Description -->
              <div class="form-group full-width">
                <label class="form-label required">Description / Job Title</label>
                <textarea
                  class="form-control"
                  rows="3"
                  formControlName="description"
                  placeholder="e.g. 500 Gold foil business cards, double-sided with matte finish"
                  [class.is-invalid]="f['description'].touched && f['description'].invalid"
                ></textarea>
                @if (f['description'].touched && f['description'].invalid) {
                  <p class="error-text">Description is required (at least 10 characters).</p>
                }
              </div>

              <!-- Quantity -->
              <div class="form-group">
                <label class="form-label required">Quantity</label>
                <input
                  type="number"
                  class="form-control"
                  min="1"
                  formControlName="quantity"
                  [class.is-invalid]="f['quantity'].touched && f['quantity'].invalid"
                />
                @if (f['quantity'].touched && f['quantity'].invalid) {
                  <p class="error-text">Quantity must be at least 1.</p>
                }
              </div>

              <!-- Size -->
              <div class="form-group">
                <label class="form-label">Dimensions / Size</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="size"
                  placeholder="e.g. 3.5 x 2 inches, A4, 2x3 meters"
                />
              </div>

              <!-- Colour -->
              <div class="form-group">
                <label class="form-label">Colour Mode / Finish</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="colour"
                  placeholder="e.g. Full Colour (CMYK), Black & White, Pantone 185C"
                />
              </div>

              <!-- Material -->
              <div class="form-group">
                <label class="form-label">Material / Paper Stock</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="material"
                  placeholder="e.g. 350gsm Silk Card, Vinyl 440gsm, 100% Cotton"
                />
              </div>

              <!-- Deadline Date -->
              <div class="form-group">
                <label class="form-label">Required By (Deadline)</label>
                <input
                  type="date"
                  class="form-control"
                  formControlName="deadline_date"
                  [min]="minDate"
                />
              </div>

              <!-- Special Notes -->
              <div class="form-group full-width">
                <label class="form-label">Special Instructions</label>
                <textarea
                  class="form-control"
                  rows="2"
                  formControlName="special_notes"
                  placeholder="Any lamination, folding, die-cutting, or packaging instructions..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 3. Artwork Upload -->
          <div class="form-section mb-5">
            <div class="section-title">
              <span class="section-step">3</span>
              <div>
                <h3>Upload Artwork File</h3>
                <p class="text-muted text-sm">Upload your ready-to-print file or design mockup</p>
              </div>
            </div>

            <div class="mt-3">
              <app-file-upload
                folder="orders"
                [maxSizeMb]="20"
                (fileUploaded)="onFileUploaded($event)"
              ></app-file-upload>
            </div>
          </div>

          <!-- Submit Button -->
          @if (errorMessage) {
            <div class="alert alert-danger mb-4">
              <span class="material-icons-outlined">error_outline</span>
              <span>{{ errorMessage }}</span>
            </div>
          }

          <div class="form-actions">
            @if (isQuoteMode) {
              <a routerLink="/customer/quotations" class="btn btn-secondary">Cancel</a>
            } @else {
              <a routerLink="/customer/orders" class="btn btn-secondary">Cancel</a>
            }
            <button
              type="submit"
              class="btn btn-portal btn-lg"
              [disabled]="isLoading || form.invalid"
            >
              @if (isLoading) {
                <span class="spinner"></span> {{ isQuoteMode ? 'Submitting Quote Request...' : 'Submitting Order...' }}
              } @else {
                <span class="material-icons-outlined">{{ isQuoteMode ? 'request_quote' : 'send' }}</span> {{ isQuoteMode ? 'Submit Quotation Request' : 'Place Order' }}
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .form-section {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 2rem;
    }
    .form-section:last-of-type {
      border-bottom: none;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      h3 { margin: 0; font-size: 1.125rem; font-weight: 700; color: var(--text-main); }
    }
    .section-step {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--portal-color);
      color: #fff;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .service-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.875rem;
    }
    .service-card {
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1rem;
      cursor: pointer;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      position: relative;
      background: #fff;
      transition: all 0.2s ease;
      &:hover {
        border-color: var(--portal-color);
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }
      &.selected {
        border-color: var(--portal-color);
        background: rgba(14, 165, 233, 0.04);
        box-shadow: 0 0 0 1px var(--portal-color);
      }
    }
    .service-card-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: rgba(14, 165, 233, 0.1);
      color: var(--portal-color);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .service-card-info {
      h4 { margin: 0 0 0.25rem; font-size: 0.875rem; font-weight: 600; color: var(--text-main); }
      p { margin: 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.3; }
    }
    .service-check {
      position: absolute;
      top: 0.625rem;
      right: 0.625rem;
      color: var(--portal-color);
      font-size: 1.125rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }
    .error-text {
      color: var(--danger-color);
      font-size: 0.8125rem;
      margin-top: 0.375rem;
    }
    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid #fff;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin-right: 0.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
})
/**
 * Customer self-service order placement component managing reactive form validation,
 * service type selection cards, artwork asset attachments, and submission lifecycle.
 */
export class CreateOrder {
  form: FormGroup;
  isLoading = false;
  errorMessage = '';
  designFileUrl = '';
  private _isQuoteExplicit = false;
  minDate: string;

  get isQuoteMode(): boolean {
    const fromRouteData = this.route.snapshot?.data?.['isQuote'] === true;
    const fromQueryParams = this.route.snapshot?.queryParams?.['mode'] === 'quote';
    const fromRouterUrl = !!(this.router.url && this.router.url.includes('/quotation'));
    const fromWindow = typeof window !== 'undefined' && !!(window.location?.pathname?.includes('/quotation'));
    return fromRouteData || fromQueryParams || fromRouterUrl || fromWindow || this._isQuoteExplicit;
  }
  set isQuoteMode(val: boolean) {
    this._isQuoteExplicit = val;
  }

  readonly services = SERVICES;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.form = this.fb.group({
      service_type: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      size: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      colour: [''],
      material: [''],
      deadline_date: [''],
      special_notes: [''],
    });

    this.route.queryParams.subscribe(params => {
      if (params['service']) {
        this.selectService(params['service']);
      }
      if (params['mode'] === 'quote') {
        this._isQuoteExplicit = true;
      }
      this.cdr.markForCheck();
    });
  }

  get f() {
    return this.form.controls;
  }

  selectService(val: string) {
    this.form.patchValue({ service_type: val });
  }

  onFileUploaded(url: string) {
    this.designFileUrl = url;
    this.toast.success('Artwork file uploaded and attached to order.');
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please complete all required fields before submitting.');
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const payload: any = {
      ...this.form.value,
      quantity: Number(this.form.value.quantity),
    };

    if (this.designFileUrl) {
      payload.design_file_url = this.designFileUrl;
    }

    // Clean empty optional fields
    Object.keys(payload).forEach(k => {
      if (payload[k] === '' || payload[k] === null || payload[k] === undefined) {
        delete payload[k];
      }
    });

    this.orderService.createOrder(payload).subscribe({
      next: (res: any) => {
        if (this.isQuoteMode) {
          this.toast.success('Your quotation request has been submitted! Staff will issue a price quote.');
          this.router.navigate(['/customer/quotations']);
        } else {
          this.toast.success('Your order has been submitted successfully!');
          const orderId = res.data?.id;
          if (orderId) {
            this.router.navigate(['/customer/orders', orderId]);
          } else {
            this.router.navigate(['/customer/orders']);
          }
        }
      },
      error: err => {
        this.errorMessage = err.error?.message || err.message || 'Failed to submit order. Please try again.';
        this.isLoading = false;
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}
