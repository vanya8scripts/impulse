"use client";

import { create } from "zustand";
import type { Profile } from "@/types/db";
import { db } from "@/lib/backend";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  setProfile: (p: Profile | null) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setInitialized: (b: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  loading: false,
  initialized: false,
  error: null,
  setProfile: (p) => set({ profile: p }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setInitialized: (initialized) => set({ initialized }),
  signOut: async () => {
    await db.auth.signOut();
    set({ profile: null });
  },
  refreshProfile: async () => {
    const current = get().profile;
    if (!current) return;
    const { data } = await db
      .from("profiles")
      .select("*")
      .eq("id", current.id)
      .single();
    if (data) set({ profile: data as Profile });
  },
}));
