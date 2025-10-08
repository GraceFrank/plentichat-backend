import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Service role client - ONLY use for server-side operations that need to bypass RLS
// (e.g., webhooks, background jobs)
let serviceRoleClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
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
  return serviceRoleClient;
}

// Create a Supabase client with user's JWT token - respects RLS
export function createSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY, // Use anon key, not service role
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
