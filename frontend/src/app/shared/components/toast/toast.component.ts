/**
 * ============================================================================
 * TOAST NOTIFICATION CONTAINER COMPONENT
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Global container mounted at the root application shell to project active
 * notification toasts into the viewport.
 * 
 * REACTIVE ARCHITECTURE:
 * - Powered by Angular 22 Signals: Consumes `toastService.toasts()` directly in
 *   the template with `@for (toast of toastService.toasts(); track toast.id)`.
 * - Zero Boilerplate: No explicit subscriptions or manual unsubscriptions needed.
 * - Accessible: Employs `role="alert"` and clear dismiss buttons.
 * ============================================================================
 */

import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast-{{ toast.type }}" role="alert">
          <span class="material-icons-outlined toast-icon">{{ iconFor(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
      }
    </div>
  `,
})
/**
 * Global toast notification viewport container component rendering
 * transient feedback alerts reactively via Angular 22 Signals.
 */
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  iconFor(type: string): string {
    const icons: Record<string, string> = {
      success: 'check_circle',
      error:   'error',
      warning: 'warning',
      info:    'info',
    };
    return icons[type] ?? 'info';
  }
}
