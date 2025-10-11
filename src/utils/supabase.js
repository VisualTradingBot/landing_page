/**
 * Shared Supabase Client
 * Single instance to avoid multiple client warnings
 */

let supabase = null;

/**
 * Get or create Supabase client instance
 */
export async function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseKey);
      return supabase;
    } catch (error) {
      console.warn('[Supabase] Client initialization failed:', error);
      return null;
    }
  }

  return null;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export default { getSupabaseClient, isSupabaseConfigured };




