import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('TU-PROYECTO') || key.includes('REEMPLAZAR')) throw new Error('Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  if (!client) client = createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
  return client;
}
