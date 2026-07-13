"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/impulse/avatar";
import { submitReport } from "@/lib/impulse";
import type { Profile, ReportReason } from "@/types/db";
import { Loader2, Flag, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/format";

const REASONS: { value: ReportReason; label: string; desc: string }[] = [
  { value: "spam", label: "Спам", desc: "Массовая рассылка, реклама" },
  { value: "scam", label: "Мошенничество", desc: "Обман, вымогательство" },
  { value: "harassment", label: "Оскорбления", desc: "Угрозы, преследование" },
  { value: "fake", label: "Фейковый аккаунт", desc: "Выдаёт себя за другого" },
  { value: "violence", label: "Насилие", desc: "Призывы к насилию" },
  { value: "pornography", label: "Запрещённый контент", desc: "Порнография, наркотики" },
  { value: "other", label: "Другое", desc: "Иное нарушение правил" },
];

export function ReportModal({
  user,
  open,
  onOpenChange,
}: {
  user: Profile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !reason) {
      toast.error("Выберите причину");
      return;
    }
    setBusy(true);
    try {
      await submitReport(user.id, reason, comment.trim() || undefined);
      toast.success("Жалоба отправлена. Администрация рассмотрит её.");
      setReason(null);
      setComment("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogTitle className="sr-only">Жалоба на пользователя</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Flag className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Жалоба на пользователя</h2>
        </div>

        {user && (
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar profile={user} size="md" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.display_name}</div>
              <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-2">
          <label className="text-sm font-medium">Причина жалобы</label>
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                reason === r.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.desc}</div>
              </div>
              {reason === r.value && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
                  </svg>
                </div>
              )}
            </button>
          ))}

          <div className="pt-2">
            <label className="text-sm font-medium">Комментарий (необязательно)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Опишите подробно, что произошло…"
              className="mt-1.5 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <button
            onClick={submit}
            disabled={busy || !reason}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Отправить жалобу
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
