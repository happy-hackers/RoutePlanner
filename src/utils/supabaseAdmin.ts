import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ SECURITY WARNING ⚠️
 *
 * This admin client uses the Supabase SERVICE ROLE KEY which has full database access.
 * This key bypasses all Row Level Security (RLS) policies.
 *
 * ONLY use this client for admin operations like:
 * - Resetting user passwords
 * - Admin-level database operations
 *
 * DO NOT expose this in production unless this is an internal admin tool with proper access controls.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase admin credentials in environment variables');
}

// Create admin client with service role key (full database access)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
