import { createClient } from "@supabase/supabase-js";
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

export const db = createClient<Database>(
  dbUrl || "https://placeholder.supabase.co",
  dbKey || "placeholder-key-placeholder-key-placeholder-key",
  {
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
  }
);
