"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { db } from "@/lib/backend";
import { fetchProfile, updateLastSeen } from "@/lib/impulse";

export function useAuthBootstrap() {
  const setProfile = useAuthStore((s) => s.setProfile);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const profile = useAuthStore((s) => s.profile);
  const initialized = useAuthStore((s) => s.initialized);
  const lastSeenRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await db.auth.getSession();
      if (!active) return;
      const session = data.session;
      if (session?.user) {
        try {
          const p = await fetchProfile(session.user.id);
          if (active) setProfile(p);
        } catch {
          if (active) setProfile(null);
        }
      }
      setInitialized(true);
    }

    init();

    const { data: sub } = db.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    const tick = () => {
      const now = Date.now();
      if (now - lastSeenRef.current > 30_000) {
        lastSeenRef.current = now;
        updateLastSeen(profile.id).catch(() => {});
      }
    };
    tick();
    const interval = setInterval(tick, 45_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [profile]);

  return { profile, initialized };
}
