import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const PLACEHOLDER_MARKERS = [
  "your-project-ref",
  "your-anon-key",
  "твой-проект",
  "ваш-проект",
  "ваш-anon",
];

export const isSupabaseConfigured = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (!supabaseUrl.startsWith("https://")) return false;
  if (supabaseAnonKey.length < 40) return false;
  return !PLACEHOLDER_MARKERS.some((m) => supabaseUrl.includes(m) || supabaseAnonKey.includes(m));
})();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "impulse-auth",
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
