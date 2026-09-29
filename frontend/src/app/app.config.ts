/**
 * ============================================================================
 * ROOT APPLICATION CONFIGURATION (ANGULAR 22 STANDALONE)
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Demonstrates Angular's modern standalone bootstrapping architecture
 * (replacing legacy `AppModule` with `ApplicationConfig` and `bootstrapApplication`).
 * 
 * CONFIGURED PROVIDERS:
 * 1. `provideZoneChangeDetection`: Optimizes change detection execution by coalescing
 *    microtask events, reducing superfluous CD ticks and enhancing UI FPS.
 * 2. `provideRouter`: Initializes client-side routing with the dual-shell routing table.
 * 3. `provideHttpClient(withInterceptors([authInterceptor]))`: Configures Angular's modern
 *    functional HTTP client pipeline, automatically injecting JWT Bearer tokens
 *    into outbound requests and handling session expiration globally.
 * ============================================================================
 */

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Coalesce events to reduce unnecessary change detection cycles
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Register standalone route tree
    provideRouter(routes),
    // Functional HTTP pipeline with global authentication interceptor
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
