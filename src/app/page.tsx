"use client";

import { useAuthBootstrap } from "@/hooks/impulse/use-auth-bootstrap";
import { AuthScreen } from "@/components/impulse/auth/auth-screen";
import { Messenger } from "@/components/impulse/messenger";
import { SetupScreen } from "@/components/impulse/setup-screen";
import { isBackendConfigured } from "@/lib/backend";
import { Loader2 } from "lucide-react";

export default function Page() {
  const { profile, initialized } = useAuthBootstrap();

  if (!isBackendConfigured) {
    return <SetupScreen />;
  }

  if (!initialized) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-sm">Загрузка Импульса…</span>
        </div>
      </div>
    );
  }

  if (!profile) return <AuthScreen />;
  return <Messenger />;
}
