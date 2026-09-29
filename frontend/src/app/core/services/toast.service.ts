// ============================================================
// TOAST NOTIFICATION SERVICE - FRONTEND
// Purpose: Provides reactive application-wide feedback notifications (success, error, warning, info).
// Flow: Any Component/Service -> ToastService -> Toast UI Overlay
// This service handles frontend user notification events.
// ============================================================

/**
 * ============================================================================
 * TOAST NOTIFICATION SERVICE - REACTIVE UI FEEDBACK
 * ============================================================================
 * 
 * ROLE IN ARCHITECTURE:
 * Global, transient UI notification coordinator built on Angular 22 Signals.
 * Provides a lightweight, non-blocking toast messaging system accessible
 * across components, guards, and HTTP interceptors.
 * 
 * DESIGN DECISIONS:
 * - Angular 22 Signals: Uses `signal<Toast[]>` instead of legacy RxJS BehaviorSubject
 *   for fine-grained, synchronous, zone-less-friendly reactive UI rendering.
 * - Auto-Dismiss Timer: Automatically clears notifications after their duration
 *   elapses to prevent visual clutter while preserving user awareness.
 * - Severity Levels: Supports success, error, warning, and info variants with
 *   standardized duration timeouts.
 * ============================================================================
 */

import { Injectable, signal } from '@angular/core';

/** Supported severity levels for visual icon/color styling */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Represents an active transient notification toast in the UI */
export interface Toast {
  /** Unique sequential identifier for tracking and DOM removal */
  id: number;
  /** Visual category determining theme (green, red, yellow, blue) */
  type: ToastType;
  /** Human-readable notification message */
  message: string;
  /** Display duration in milliseconds before automatic dismissal (0 = persistent) */
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Internal auto-increment counter for toast identification */
  private nextId = 0;
  
  /** Reactive signal containing the list of currently active toast notifications */
  public toasts = signal<Toast[]>([]);

  /**
   * Spawns a new toast message and schedules its removal.
   * 
   * @param message Text to display to the user
   * @param type Notification severity category (default: 'info')
   * @param duration Display time in milliseconds before auto-dismiss (default: 4000)
   */
  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = ++this.nextId;
    const toast: Toast = { id, type, message, duration };
    this.toasts.update(t => [...t, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  /** Convenience helper for success notifications (green) */
  success(message: string, duration = 4000) { this.show(message, 'success', duration); }
  
  /** Convenience helper for error/failure alerts (red, longer 5s duration) */
  error(message: string, duration = 5000)   { this.show(message, 'error', duration); }
  
  /** Convenience helper for warning alerts (yellow) */
  warning(message: string, duration = 4000) { this.show(message, 'warning', duration); }
  
  /** Convenience helper for informational updates (blue) */
  info(message: string, duration = 3500)    { this.show(message, 'info', duration); }

  /**
   * Dismisses and removes a specific toast by its unique ID.
   * Invoked either automatically by timeout or manually via the toast close button.
   * 
   * @param id The identifier of the toast to dismiss
   */
  dismiss(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
