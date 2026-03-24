import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(url && key);

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, key!, { realtime: { params: { eventsPerSecond: 10 } } })
  : (null as unknown as SupabaseClient);
