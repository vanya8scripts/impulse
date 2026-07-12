"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/impulse/avatar";
import {
  fetchAllProfiles,
  adminBlockUser,
  adminUnblockUser,
  adminMuteUser,
  adminUnmuteUser,
  adminSetVerified,
} from "@/lib/impulse";
import type { Profile } from "@/types/db";
import {
  Search,
  Shield,
  Ban,
  CheckCircle2,
  VolumeX,
  Volume2,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatLastSeen, cn } from "@/lib/format";

export function AdminPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [actionUser, setActionUser] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"block" | "mute" | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadUsers();
  }, [open]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await fetchAllProfiles();
      setUsers(data);
    } catch {
      toast.error("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.display_name.toLowerCase().includes(query.toLowerCase())
  );

  const doAction = async () => {
    if (!actionUser || !actionType) return;
    if (!reason.trim()) {
      toast.error("Укажите причину");
      return;
    }
    setBusy(true);
    try {
      if (actionType === "block") {
        await adminBlockUser(actionUser.id, reason.trim());
        toast.success(`${actionUser.username} заблокирован`);
      } else {
        await adminMuteUser(actionUser.id, reason.trim(), parseInt(hours) || 0);
        toast.success(`${actionUser.username} замьючен`);
      }
      setActionUser(null);
      setActionType(null);
      setReason("");
      setHours("24");
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async (user: Profile) => {
    if (user.is_blocked) {
      try {
        await adminUnblockUser(user.id);
        toast.success(`${user.username} разблокирован`);
        await loadUsers();
      } catch {
        toast.error("Ошибка");
      }
    } else {
      setActionUser(user);
      setActionType("block");
    }
  };

  const toggleMute = async (user: Profile) => {
    if (user.is_muted) {
      try {
        await adminUnmuteUser(user.id);
        toast.success(`${user.username} размьючен`);
        await loadUsers();
      } catch {
        toast.error("Ошибка");
      }
    } else {
      setActionUser(user);
      setActionType("mute");
    }
  };

  const toggleVerified = async (user: Profile) => {
    try {
      await adminSetVerified(user.id, !user.is_verified);
      toast.success(user.is_verified ? "Галочка снята" : "Галочка выдана");
      await loadUsers();
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 max-h-[90vh]">
        <DialogTitle className="sr-only">Админ-панель</DialogTitle>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Админ-панель</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {users.length} пользователей
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени или юзернейму"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Пользователи не найдены
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar profile={user} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{user.display_name}</span>
                      {user.is_admin && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          ADMIN
                        </span>
                      )}
                      {user.is_blocked && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          BLOCKED
                        </span>
                      )}
                      {user.is_muted && (
                        <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
                          MUTED
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      @{user.username} · {formatLastSeen(user.last_seen_at)}
                    </div>
                    {user.block_reason && (
                      <div className="mt-0.5 truncate text-xs text-destructive">
                        Причина: {user.block_reason}
                      </div>
                    )}
                    {user.mute_reason && (
                      <div className="mt-0.5 truncate text-xs text-orange-600">
                        Причина: {user.mute_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!user.is_admin && (
                      <>
                        <button
                          onClick={() => toggleVerified(user)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            user.is_verified
                              ? "text-primary hover:bg-primary/10"
                              : "text-muted-foreground hover:bg-accent hover:text-primary"
                          )}
                          title={user.is_verified ? "Снять галочку" : "Выдать галочку"}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleMute(user)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            user.is_muted
                              ? "text-orange-600 hover:bg-orange-500/10"
                              : "text-muted-foreground hover:bg-accent hover:text-orange-600"
                          )}
                          title={user.is_muted ? "Размьютить" : "Замьютить"}
                        >
                          {user.is_muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => toggleBlock(user)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            user.is_blocked
                              ? "text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground hover:bg-accent hover:text-destructive"
                          )}
                          title={user.is_blocked ? "Разблокировать" : "Заблокировать"}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {actionUser && actionType && (
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">
                {actionType === "block" ? "Блокировка" : "Мьют"} пользователя @{actionUser.username}
              </span>
            </div>
            <div className="space-y-3">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Причина (обязательно)"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                autoFocus
              />
              {actionType === "mute" && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Часов:</label>
                  <input
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    type="number"
                    min="0"
                    className="h-10 w-24 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-xs text-muted-foreground">0 = навсегда</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={doAction}
                  disabled={busy || !reason.trim()}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-medium text-destructive-foreground disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {actionType === "block" ? "Заблокировать" : "Замьютить"}
                </button>
                <button
                  onClick={() => {
                    setActionUser(null);
                    setActionType(null);
                    setReason("");
                  }}
                  className="h-10 rounded-xl border border-border px-4 text-sm hover:bg-accent"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
