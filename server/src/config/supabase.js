import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabaseAdmin = null;

/**
 * Lazily initializes the server-side Supabase client for Storage bucket operations.
 * Returns null if Supabase storage env vars are not configured (e.g., local-only dev).
 */
export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}
