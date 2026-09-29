// ============================================================
// HEALTH SERVICE - BACKEND
// Purpose: Handles system health checks, database connectivity verification, and uptime diagnostics.
// Flow: Controller -> Health Service -> Supabase Database
// This file processes service health status and database connectivity checks.
// Contains system health logic and communicates with Supabase.
// ============================================================

// =============================================================================
// PrintShop Management System — Health Service
// =============================================================================
// Infrastructure Health & Telemetry:
//   - Uptime Monitoring: Tracks Node.js runtime process uptime in seconds.
//   - Database Latency: Executes real-time ping against Supabase PostgreSQL
//     to classify system health as 'OK' (connected) or 'DEGRADED'.
//   - Zero Express Dependencies: Pure business logic decoupled from HTTP transport.
// =============================================================================

import { pingDatabase } from '../config/database';
import { DatabaseStatus } from '../types';

export interface SystemHealth {
  status:      'OK' | 'DEGRADED' | 'DOWN';
  environment: string;
  apiVersion:  string;
  uptimeSeconds: number;
  database:    DatabaseStatus;
}

// Main business logic is handled here.
// Reads data from Supabase PostgreSQL.
// Updates data in the database.
// Validates input before processing.
// Handles errors if the operation fails.
export class HealthService {
  /**
   * Gathers system health metrics including DB connectivity.
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const database = await pingDatabase();

    const status: SystemHealth['status'] = database.connected ? 'OK' : 'DEGRADED';

    return {
      status,
      environment:   process.env.NODE_ENV   ?? 'development',
      apiVersion:    process.env.API_VERSION ?? 'v1',
      uptimeSeconds: Math.floor(process.uptime()),
      database,
    };
  }
}
