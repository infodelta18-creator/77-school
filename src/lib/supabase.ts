import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

const isClient = typeof window !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isClient,
    autoRefreshToken: isClient,
    detectSessionInUrl: isClient,
  },
});

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://example.supabase.co" &&
      supabaseAnonKey !== "placeholder-anon-key",
  );
}

export async function verifySupabaseConnection() {
  try {
    const { error } = await supabase.auth.getSession();
    return { ok: !error, error: error?.message ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown connection error",
    };
  }
}
