// =============================================================================
// PrintShop Management System — Database Connection & Health Verification
// =============================================================================
// Provides database ping and connectivity lifecycle functions.
// Performs a lightweight HEAD query against PostgreSQL via PostgREST to
// calculate network round-trip latency without transferring table data.
//
// Used during:
//   - Server bootstrapping (in server.ts to verify database availability)
//   - System health checks (in health.service.ts for monitoring uptime)
// =============================================================================

import { supabase } from './supabase';
import { DatabaseStatus } from '../types';

/**
 * Pings the Supabase API to verify connectivity.
 * Returns connection status and round-trip latency.
 */
export const pingDatabase = async (): Promise<DatabaseStatus> => {
  const start = Date.now();
  try {
    // Lightweight check: head count on users table verifies true PostgreSQL connectivity
    const { error } = await supabase
      .from('users')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
      };
    }

    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      connected: false,
      latencyMs: Date.now() - start,
    };
  }
};

/**
 * Asserts the database is reachable at startup.
 * Logs a warning (not an error) if unreachable — the app still starts.
 */
export const initDatabase = async (): Promise<void> => {
  const status = await pingDatabase();
  if (status.connected) {
    console.log(`✅ Supabase connected (latency: ${status.latencyMs}ms)`);
  } else {
    console.warn('⚠️  Could not reach Supabase — check SUPABASE_URL and keys in .env');
  }
};

export { supabase } from './supabase';
export { supabaseAdmin } from './supabase';
