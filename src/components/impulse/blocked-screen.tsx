"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { Profile } from "@/types/db";
import { Ban, LogOut, ShieldAlert } from "lucide-react";

export function BlockedScreen({ profile }: { profile: Profile }) {
  const signOut = useAuthStore((s) => s.signOut);
  const isScam = profile.is_scam;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-destructive/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-2xl text-center">
        <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${isScam ? "bg-orange-500/15 text-orange-600" : "bg-destructive/10 text-destructive"}`}>
          {isScam ? <ShieldAlert className="h-10 w-10" /> : <Ban className="h-10 w-10" />}
        </div>

        <h1 className="text-2xl font-semibold mb-2">
          {isScam ? "Аккаунт помечен как СКАМ" : "Аккаунт заблокирован"}
        </h1>

        <p className="text-sm text-muted-foreground mb-4">
          {isScam
            ? "Ваш аккаунт был помечен как мошеннический (СКАЗ) администрацией Импульса. Отправка сообщений и звонков заблокирована."
            : "Ваш аккаунт был заблокирован администрацией Импульса за нарушение правил сообщества."}
        </p>

        {(profile.block_reason || profile.scam_reason) && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 mb-5 text-left">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Причина
            </div>
            <div className="text-sm">
              {profile.scam_reason || profile.block_reason}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-muted/30 p-4 mb-5 text-left text-sm text-muted-foreground">
          Если вы считаете, что это ошибка, свяжитесь с администрацией через
          другие каналы связи. Укажите свой юзернейм: <span className="font-mono font-medium text-foreground">@{profile.username}</span>
        </div>

        <button
          onClick={() => signOut()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}
