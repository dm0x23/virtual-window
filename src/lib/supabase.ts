import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (
  (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined) ||
  (import.meta.env.SUPABASE_URL as string | undefined) ||
  ''
).trim();

const supabaseAnonKey = (
  (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_KEY as string | undefined) ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
