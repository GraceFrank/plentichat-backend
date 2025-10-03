import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_API_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseInstance;
}
