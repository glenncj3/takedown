import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// Lazy singleton so the env vars only need to exist when multiplayer is
// actually engaged — single-player and hot-seat work without Supabase
// configured. Throws on first access if VITE_SUPABASE_URL or
// VITE_SUPABASE_ANON_KEY is missing.
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env vars are missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
    );
  }
  client = createClient(url, key);
  return client;
}

// Test hook: replace the singleton with a mock client.
export function _setSupabaseForTests(mock: SupabaseClient | null): void {
  client = mock;
}
