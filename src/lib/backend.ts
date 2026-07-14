import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

const dbUrl = process.env.NEXT_PUBLIC_DB_URL || "";
const dbKey = process.env.NEXT_PUBLIC_DB_KEY || "";

const PLACEHOLDER_MARKERS = [
  "your-project-ref",
  "your-anon-key",
  "твой-проект",
  "ваш-проект",
  "ваш-anon",
];

export const isBackendConfigured = (() => {
  if (!dbUrl || !dbKey) return false;
  if (!dbUrl.startsWith("https://")) return false;
  if (dbKey.length < 40) return false;
  return !PLACEHOLDER_MARKERS.some((m) => dbUrl.includes(m) || dbKey.includes(m));
})();

let _client: SupabaseClient<Database> | null = null;

export const db = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient<Database>(dbUrl || "https://placeholder.supabase.co", dbKey || "placeholder", {
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
    }
    const val = (_client as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(_client) : val;
  },
});
