// ============================================================
// OFFER LIST COMPONENT
// Purpose: Controls the Promotional Offers & Discounts screen.
// UI: Displays and manages discount campaigns, validity dates, and offer codes.
// Flow: Component -> OfferService -> Backend Offer API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * OFFER LIST COMPONENT - MARKETING CAMPAIGNS & SHOWCASE CMS
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Restricted to managerial personnel (ADMIN, MANAGER). Functions as an internal
 * Content Management System (CMS) for configuring promotional product cards,
 * seasonal discounts, and banners displayed across the customer store.
 * 
 * DESIGN HIGHLIGHTS:
 * 1. Curated Aesthetic Themes: Supports 5 premium themes (`dark`, `light`, `eco`,
 *    `blue`, `purple`) matching modern design sensibilities.
 * 2. Deep Linking: Configurable `service_query` params automatically pre-select
 *    specific print products when the customer clicks 'Order Now'.
 * 3. Reactive State: Utilizes Angular Signals (`showModal`, `isEditing`) and
 *    dynamic form control validation.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OfferService, Offer, OfferTheme } from '../../../core/services/offer.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-offer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './offer-list.html',
  styleUrl: './offer-list.scss',
})
/**
 * Promotional showcase CMS component coordinating card creation,
 * theme customization, activation toggling, and customer deep links.
 */
export class OfferList implements OnInit {
  offers: Offer[] = [];
  isLoading = true;
  showModal = signal(false);
  isEditing = signal(false);
  editingId: string | null = null;
  isSubmitting = false;

  offerForm: FormGroup;

  themeOptions: { value: OfferTheme; label: string; desc: string; previewClass: string }[] = [
    { value: 'dark', label: 'Dark Luxury', desc: 'Midnight gradient with gold foil accents', previewClass: 'theme-opt-dark' },
    { value: 'light', label: 'Crisp Light', desc: 'Minimalist Apple silver & clean white', previewClass: 'theme-opt-light' },
    { value: 'eco', label: 'Eco Kraft', desc: 'Natural emerald & warm organic tones', previewClass: 'theme-opt-eco' },
    { value: 'blue', label: 'Azure Blue', desc: 'Vibrant oceanic tech gradient', previewClass: 'theme-opt-blue' },
    { value: 'purple', label: 'Royal Purple', desc: 'Deep violet with luminous shine', previewClass: 'theme-opt-purple' },
  ];

  constructor(
    private offerService: OfferService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.offerForm = this.fb.group({
      eyebrow: ['', [Validators.required, Validators.minLength(2)]],
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      theme: ['dark', Validators.required],
      button_text: ['Order Now', Validators.required],
      button_link: ['/customer/orders/new', Validators.required],
      service_query: [''],
      badge_text: [''],
      badge_icon: ['auto_awesome'],
      sort_order: [1, [Validators.required, Validators.min(0)]],
      is_active: [true],
    });
  }

  get activeCount(): number {
    return this.offers.filter((o) => o.is_active).length;
  }

  get inactiveCount(): number {
    return this.offers.filter((o) => !o.is_active).length;
  }

  ngOnInit() {
    this.loadOffers();
  }

  loadOffers() {
    this.isLoading = true;
    this.cdr.markForCheck();

    // Pass all=true to fetch both active and inactive offers for management
    this.offerService.getAll(true).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.offers = res.data;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to load offers');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingId = null;
    const nextOrder = (this.offers.length > 0 ? Math.max(...this.offers.map((o) => o.sort_order || 0)) + 1 : 1);
    this.offerForm.reset({
      eyebrow: 'EXCLUSIVE OFFER',
      title: 'New Promotional Card',
      description: 'Highlight your latest print services, bundle discounts, or seasonal materials here.',
      theme: 'dark',
      button_text: 'Order Now',
      button_link: '/customer/orders/new',
      service_query: 'business_cards',
      badge_text: 'Limited Time Deal',
      badge_icon: 'auto_awesome',
      sort_order: nextOrder,
      is_active: true,
    });
    this.showModal.set(true);
  }

  openEditModal(offer: Offer) {
    this.isEditing.set(true);
    this.editingId = offer.id;
    this.offerForm.patchValue({
      eyebrow: offer.eyebrow,
      title: offer.title,
      description: offer.description,
      theme: offer.theme || 'dark',
      button_text: offer.button_text || 'Order Now',
      button_link: offer.button_link || '/customer/orders/new',
      service_query: offer.service_query || '',
      badge_text: offer.badge_text || '',
      badge_icon: offer.badge_icon || 'auto_awesome',
      sort_order: offer.sort_order ?? 1,
      is_active: offer.is_active,
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId = null;
  }

  onSubmit() {
    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.offerForm.value;

    if (this.isEditing() && this.editingId) {
      this.offerService.update(this.editingId, val).subscribe({
        next: () => {
          this.toast.success('Offer updated successfully!');
          this.isSubmitting = false;
          this.closeModal();
          this.loadOffers();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to update offer');
          this.isSubmitting = false;
        },
      });
    } else {
      this.offerService.create(val).subscribe({
        next: () => {
          this.toast.success('Offer created successfully!');
          this.isSubmitting = false;
          this.closeModal();
          this.loadOffers();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to create offer');
          this.isSubmitting = false;
        },
      });
    }
  }

  toggleActive(offer: Offer) {
    const newState = !offer.is_active;
    this.offerService.update(offer.id, { is_active: newState }).subscribe({
      next: () => {
        this.toast.success(`Offer ${newState ? 'activated' : 'deactivated'} successfully!`);
        this.loadOffers();
      },
      error: () => {
        this.toast.error('Failed to change offer status');
      },
    });
  }

  deleteOffer(offer: Offer) {
    if (!confirm(`Are you sure you want to permanently delete "${offer.title}"?`)) {
      return;
    }

    this.offerService.delete(offer.id).subscribe({
      next: () => {
        this.toast.success('Offer deleted successfully!');
        this.loadOffers();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete offer');
      },
    });
  }
}
