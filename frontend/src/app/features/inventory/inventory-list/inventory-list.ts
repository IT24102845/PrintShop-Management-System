// ============================================================
// INVENTORY LIST COMPONENT
// Purpose: Controls the Material & Stock Inventory screen.
// UI: Displays and manages raw materials, stock counts, reorder alerts, and adjustments.
// Flow: Component -> InventoryService -> Backend Inventory API
// This TypeScript file controls the behaviour of the UI.
// ============================================================

/**
 * ============================================================================
 * INVENTORY LIST COMPONENT - RAW MATERIALS & WAREHOUSE MANAGEMENT
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Manages physical print substrates and consumables (paper reams, vinyl rolls,
 * ink cartridges, binding coils, packaging boxes).
 * 
 * KEY SYSTEM OPERATIONS:
 * 1. Low-Stock Alerting: Computes `lowStockCount` and `outOfStockCount` to flag
 *    materials falling below their `reorder_threshold`.
 * 2. Manual Stock Adjustments: Provides an adjustment modal for shop staff to
 *    log material intake (deliveries) or write-offs (wastage, spoilage) with
 *    mandatory audit notes.
 * 3. SKU Registration: Implements `addForm` for creating new inventory entities
 *    with category, unit of measure, unit cost, and reorder levels.
 * ============================================================================
 */

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService, InventoryItem } from '../../../core/services/inventory.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.scss',
})
/**
 * Warehouse inventory directory component coordinating material tracking,
 * category filtering, stock adjustments, and threshold alerts.
 */
export class InventoryList implements OnInit {
  items: InventoryItem[] = [];
  filteredItems: InventoryItem[] = [];
  isLoading = true;
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';
  page = 1;
  total = 0;
  totalPages = 1;
  showAddForm = false;
  isSubmitting = false;
  searchTimeout: any;

  adjustingItem: any = null;
  adjustAction: 'ADD' | 'REMOVE' = 'ADD';
  adjustQty = 0;
  adjustNotes = '';
  isAdjusting = false;

  addForm: FormGroup;

  readonly categories = [
    'paper', 'ink', 'vinyl', 'fabric', 'packaging',
    'binding', 'laminate', 'substrate', 'other'
  ];

  get lowStockCount() {
    return this.items.filter(i => (i as any).stock_status === 'low').length;
  }

  get outOfStockCount() {
    return this.items.filter(i => (i as any).stock_status === 'out').length;
  }

  constructor(
    private inventoryService: InventoryService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.addForm = this.fb.group({
      material_name:       ['', Validators.required],
      category:            ['paper', Validators.required],
      quantity:            [0, [Validators.required, Validators.min(0)]],
      unit:                ['sheets', Validators.required],
      minimum_stock_level: [10, [Validators.required, Validators.min(0)]],
      sku:                 [''],
      unit_cost:           [null],
      location:            [''],
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.inventoryService.getInventory(1, 100, this.searchTerm || undefined).subscribe({
      next: res => {
        if (res.success) {
          const d: any = res.data;
          const rawItems: any[] = Array.isArray(d) ? d : (d?.items ?? []);
          this.items = rawItems.map(item => ({
            ...item,
            stock_status: Number(item.quantity) === 0 ? 'out' : Number(item.quantity) <= Number(item.minimum_stock_level) ? 'low' : 'ok',
          }));
          this.total = this.items.length;
          this.applyFilters();
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

  applyFilters() {
    this.filteredItems = this.items.filter(item => {
      const q = this.searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.material_name || '').toLowerCase().includes(q) ||
        ((item as any).sku || '').toLowerCase().includes(q) ||
        ((item as any).suppliers?.supplier_name || '').toLowerCase().includes(q);

      const matchesCat = !this.selectedCategory || item.category === this.selectedCategory;
      const matchesStatus = !this.selectedStatus || (item as any).stock_status === this.selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
      this.cdr.markForCheck();
    }, 300);
  }

  onAdd() {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    this.isSubmitting = true;
    this.inventoryService.addMaterial(this.addForm.value).subscribe({
      next: () => {
        this.toast.success('Material added successfully.');
        this.showAddForm = false;
        this.addForm.reset({ quantity: 0, minimum_stock_level: 10, category: 'paper', unit: 'sheets' });
        this.load();
        this.isSubmitting = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to add material.');
        this.isSubmitting = false;
      },
    });
  }

  openAdjust(item: any) {
    this.adjustingItem = item;
    this.adjustAction = 'ADD';
    this.adjustQty = 0;
    this.adjustNotes = '';
  }

  submitAdjust() {
    if (!this.adjustingItem || this.adjustQty <= 0) {
      this.toast.warning('Please enter a positive adjustment quantity.');
      return;
    }

    if (this.adjustAction === 'REMOVE' && this.adjustQty > this.adjustingItem.quantity) {
      this.toast.error(`Cannot remove ${this.adjustQty}. Current available stock is only ${this.adjustingItem.quantity}.`);
      return;
    }

    if (this.adjustAction === 'REMOVE' && this.adjustQty > this.adjustingItem.quantity * 0.5) {
      if (!confirm(`Are you sure you want to deduct ${this.adjustQty} ${this.adjustingItem.unit}? This will remove over 50% of current stock.`)) {
        return;
      }
    }

    this.isAdjusting = true;
    this.inventoryService.adjustStock(this.adjustingItem.id, {
      action: this.adjustAction,
      quantity: this.adjustQty,
      notes: this.adjustNotes
    }).subscribe({
      next: () => {
        this.toast.success('Stock adjusted successfully.');
        this.adjustingItem = null;
        this.load();
        this.isAdjusting = false;
      },
      error: err => {
        this.toast.error(err.error?.message || 'Adjustment failed.');
        this.isAdjusting = false;
      },
    });
  }

  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.load(); } }
}
