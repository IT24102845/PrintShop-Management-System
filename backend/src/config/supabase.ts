// =============================================================================
// PrintShop Management System — Supabase Client Configuration
// =============================================================================
// Architecture & Security Design:
// Exports two distinct Supabase clients to enforce the Principle of Least Privilege:
//   1. supabase      → Uses the public anon key.
//                      Enforces Row Level Security (RLS) policies at the PostgreSQL layer.
//                      Used for scoped queries where table access rules apply.
//   2. supabaseAdmin → Uses the elevated service_role key.
//                      Bypasses RLS policies completely.
//                      Used strictly for trusted server-side background tasks,
//                      administrative operations, and user provisioning.
//
// Both clients are configured with `persistSession: false` because the Express
// backend is stateless and handles authentication using independent JWTs.
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL         = process.env.SUPABASE_URL         ?? '';
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY    ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env',
  );
}

if (!SUPABASE_SERVICE_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in production environment');
  } else {
    console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Privileged server operations may fail.');
  }
}

// ─── Public Client (anon key — respects RLS) ──────────────────────────────────
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,    // Server-side: no session persistence
  },
});

// ─── Admin Client (service role — bypasses RLS) ───────────────────────────────
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

export default supabase;
