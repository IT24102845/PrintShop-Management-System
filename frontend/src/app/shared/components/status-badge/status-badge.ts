/**
 * ============================================================================
 * STATUS BADGE COMPONENT - UNIFIED LIFECYCLE INDICATOR
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Reusable visual indicator providing consistent lifecycle status presentation
 * across orders, quotations, design proofs, production tasks, and payments.
 * 
 * DESIGN PRINCIPLES:
 * 1. Normalized Label Formatting: Converts snake_case status tokens (e.g.
 *    `quality_check`) into readable title strings (`quality check`).
 * 2. Cross-Domain Mapping: Resolves statuses across disparate subsystem enums
 *    to consistent Apple-style color tokens (amber, blue, indigo, purple,
 *    green, red).
 * ============================================================================
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge {{ badgeClass }}">
      <span class="badge-dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.22rem 0.65rem;
      border-radius: 980px;
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-transform: capitalize;
      white-space: nowrap;
      line-height: 1.25;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .badge-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background-color: currentColor;
    }
    /* Pending / Waiting → Amber */
    .badge-pending { background: rgba(255, 149, 0, 0.12); color: #c97700; border-color: rgba(255, 149, 0, 0.2); }
    /* Quoted → Blue */
    .badge-quoted { background: rgba(0, 113, 227, 0.1); color: #0071e3; border-color: rgba(0, 113, 227, 0.2); }
    /* Confirmed → Indigo/Blue */
    .badge-confirmed { background: rgba(88, 86, 214, 0.1); color: #5856d6; border-color: rgba(88, 86, 214, 0.2); }
    /* Design Review → Purple */
    .badge-design-review { background: rgba(175, 82, 222, 0.1); color: #af52de; border-color: rgba(175, 82, 222, 0.2); }
    /* In Production / Printing → Apple Blue */
    .badge-in-production { background: rgba(0, 113, 227, 0.1); color: #0071e3; border-color: rgba(0, 113, 227, 0.2); }
    /* Quality Check → Orange */
    .badge-quality-check { background: rgba(255, 149, 0, 0.12); color: #d97706; border-color: rgba(255, 149, 0, 0.2); }
    /* Ready / Ready for Delivery → Apple Green */
    .badge-ready { background: rgba(52, 199, 89, 0.12); color: #28a745; border-color: rgba(52, 199, 89, 0.25); }
    /* Completed / Delivered → Apple Green */
    .badge-completed { background: rgba(52, 199, 89, 0.14); color: #1e8236; border-color: rgba(52, 199, 89, 0.28); }
    /* Cancelled / Failed / Rejected → Apple Red */
    .badge-danger { background: rgba(255, 59, 48, 0.1); color: #ff3b30; border-color: rgba(255, 59, 48, 0.2); }
    /* Revisions / Warning */
    .badge-warning { background: rgba(255, 149, 0, 0.12); color: #b45309; border-color: rgba(255, 149, 0, 0.2); }
    /* Neutral / Low */
    .badge-neutral { background: rgba(142, 142, 147, 0.12); color: #636366; border-color: rgba(142, 142, 147, 0.2); }
  `],
})
/**
 * Standalone status pill badge component mapping backend entity states
 * to consistent visual colors and labels.
 */
export class StatusBadge {
  @Input() status = '';

  get label(): string {
    return (this.status || 'Unknown').replace(/_/g, ' ');
  }

  get badgeClass(): string {
    const s = (this.status ?? '').toLowerCase().trim();

    // Pending / Waiting
    if (['pending', 'waiting', 'queued', 'draft'].includes(s)) return 'badge-pending';
    
    // Quoted / Sent
    if (['quoted', 'sent'].includes(s)) return 'badge-quoted';
    
    // Confirmed / Accepted
    if (['confirmed', 'accepted'].includes(s)) return 'badge-confirmed';
    
    // Design Review / Under Review / Revision Requested
    if (['design_review', 'under_review'].includes(s)) return 'badge-design-review';
    if (['revision_requested', 'revised'].includes(s)) return 'badge-warning';
    
    // In Production / Printing
    if (['in_production', 'printing'].includes(s)) return 'badge-in-production';
    
    // Quality Check
    if (['quality_check'].includes(s)) return 'badge-quality-check';
    
    // Ready / Ready for delivery
    if (['ready', 'ready_for_delivery'].includes(s)) return 'badge-ready';
    
    // Completed / Delivered / Approved
    if (['completed', 'delivered', 'approved'].includes(s)) return 'badge-completed';
    
    // Cancelled / Failed / Rejected / Expired
    if (['cancelled', 'failed', 'rejected', 'expired'].includes(s)) return 'badge-danger';
    
    // Priorities
    if (['urgent', 'high'].includes(s)) return 'badge-danger';
    if (['normal'].includes(s)) return 'badge-quoted';
    if (['low'].includes(s)) return 'badge-neutral';

    return 'badge-neutral';
  }
}
