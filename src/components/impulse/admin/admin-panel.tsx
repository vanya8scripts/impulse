"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/impulse/avatar";
import {
  fetchAllProfiles,
  fetchAllChats,
  fetchReports,
  resolveReport,
  adminBlockUser,
  adminUnblockUser,
  adminMuteUser,
  adminUnmuteUser,
  adminSetVerified,
  adminSetChatVerified,
  adminSetChatOfficial,
  adminDeleteChat,
  adminBroadcast,
  adminPromoteAdmin,
  adminDemoteAdmin,
  adminDeleteUserMessages,
  adminSetScam,
} from "@/lib/impulse";
import type { Chat, Profile, Report, ReportReason } from "@/types/db";
import {
  Search,
  Shield,
  Ban,
  CheckCircle2,
  VolumeX,
  Volume2,
  Loader2,
  AlertTriangle,
  Megaphone,
  Users,
  Trash2,
  Radio,
  Crown,
  MessageSquare,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatLastSeen, cn } from "@/lib/format";

type Tab = "users" | "chats" | "reports" | "broadcast";

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Спам",
  scam: "Мошенничество",
  harassment: "Оскорбления",
  fake: "Фейк",
  violence: "Насилие",
  pornography: "Запрещённый контент",
  other: "Другое",
};

export function AdminPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [actionUser, setActionUser] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"block" | "mute" | "scam" | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);

  const [broadcastText, setBroadcastText] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open]);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, c, r] = await Promise.all([fetchAllProfiles(), fetchAllChats(), fetchReports()]);
      setUsers(u);
      setChats(c);
      setReports(r);
    } catch {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(query.toLowerCase()) ||
      u.display_name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredChats = chats.filter(
    (c) => c.type !== "direct" && (c.title || "").toLowerCase().includes(query.toLowerCase())
  );
  const pendingReports = reports.filter((r) => r.status === "pending");
  const filteredReports = reports.filter(
    (r) =>
      !query ||
      r.reported?.username.toLowerCase().includes(query.toLowerCase()) ||
      r.reporter?.username.toLowerCase().includes(query.toLowerCase())
  );

  const doAction = async () => {
    if (!actionUser || !actionType) return;
    if ((actionType === "block" || actionType === "scam") && !reason.trim()) {
      toast.error("Укажите причину");
      return;
    }
    if (actionType === "mute" && !reason.trim()) {
      toast.error("Укажите причину");
      return;
    }
    setBusy(true);
    try {
      if (actionType === "block") {
        await adminBlockUser(actionUser.id, reason.trim());
        toast.success(`${actionUser.username} заблокирован`);
      } else if (actionType === "scam") {
        await adminSetScam(actionUser.id, true, reason.trim());
        toast.success(`${actionUser.username} помечен как СКАМ`);
      } else {
        await adminMuteUser(actionUser.id, reason.trim(), parseInt(hours) || 0);
        toast.success(`${actionUser.username} замьючен`);
      }
      setActionUser(null);
      setActionType(null);
      setReason("");
      setHours("24");
      await loadAll();
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
        await loadAll();
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
        await loadAll();
      } catch {
        toast.error("Ошибка");
      }
    } else {
      setActionUser(user);
      setActionType("mute");
    }
  };

  const toggleScam = async (user: Profile) => {
    if (user.is_scam) {
      try {
        await adminSetScam(user.id, false);
        toast.success("Метка СКАМ снята");
        await loadAll();
      } catch {
        toast.error("Ошибка");
      }
    } else {
      setActionUser(user);
      setActionType("scam");
    }
  };

  const toggleVerified = async (user: Profile) => {
    try {
      await adminSetVerified(user.id, !user.is_verified);
      toast.success(user.is_verified ? "Галочка снята" : "Галочка выдана");
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  const toggleAdmin = async (user: Profile) => {
    try {
      if (user.is_admin) {
        await adminDemoteAdmin(user.id);
        toast.success("Админ снят");
      } else {
        await adminPromoteAdmin(user.id);
        toast.success("Админ выдан");
      }
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  const deleteUserMessages = async (user: Profile) => {
    if (!confirm(`Удалить все сообщения пользователя @${user.username}?`)) return;
    try {
      await adminDeleteUserMessages(user.id);
      toast.success("Сообщения удалены");
    } catch {
      toast.error("Ошибка");
    }
  };

  const toggleChatVerified = async (chat: Chat) => {
    try {
      await adminSetChatVerified(chat.id, !chat.is_verified);
      toast.success(chat.is_verified ? "Галочка снята" : "Галочка выдана");
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  const toggleChatOfficial = async (chat: Chat) => {
    try {
      await adminSetChatOfficial(chat.id, !chat.is_official);
      toast.success(chat.is_official ? "Официальность снята" : "Отмечен официальным");
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  const deleteChat = async (chat: Chat) => {
    if (!confirm(`Удалить чат «${chat.title}»?`)) return;
    try {
      await adminDeleteChat(chat.id);
      toast.success("Чат удалён");
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast.error("Введите текст");
      return;
    }
    setBroadcasting(true);
    try {
      await adminBroadcast(broadcastText.trim());
      toast.success("Пост опубликован в официальный канал");
      setBroadcastText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleResolve = async (reportId: string, status: "resolved" | "dismissed") => {
    try {
      await resolveReport(reportId, status);
      toast.success(status === "resolved" ? "Жалоба удовлетворена" : "Жалоба отклонена");
      await loadAll();
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0 max-h-[90vh]">
        <DialogTitle className="sr-only">Админ-панель</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Админ-панель</h2>
        </div>

        <div className="grid grid-cols-4 gap-1 border-b border-border bg-muted p-1 m-3 rounded-xl">
          <button
            onClick={() => setTab("users")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
              tab === "users" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Люди
          </button>
          <button
            onClick={() => setTab("chats")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
              tab === "chats" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Чаты
          </button>
          <button
            onClick={() => setTab("reports")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
              tab === "reports" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Flag className="h-3.5 w-3.5" />
            Жалобы
            {pendingReports.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {pendingReports.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("broadcast")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
              tab === "broadcast" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            Пост
          </button>
        </div>

        <div className="px-3 pb-3">
          {tab !== "broadcast" && (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск…"
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin px-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка…
            </div>
          ) : tab === "users" ? (
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-2 py-3">
                  <Avatar profile={user} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{user.display_name}</span>
                      {user.is_admin && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">ADMIN</span>
                      )}
                      {user.is_blocked && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">BLOCKED</span>
                      )}
                      {user.is_muted && (
                        <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">MUTED</span>
                      )}
                      {user.is_scam && (
                        <span className="rounded bg-orange-600/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">СКАМ</span>
                      )}
                      {user.reports_count > 0 && (
                        <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                          {user.reports_count} жалоб
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      @{user.username} · {formatLastSeen(user.last_seen_at)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => toggleVerified(user)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", user.is_verified ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-primary")}
                      title="Галочка"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleScam(user)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", user.is_scam ? "text-orange-700 hover:bg-orange-600/10" : "text-muted-foreground hover:bg-accent hover:text-orange-700")}
                      title="СКАМ"
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleAdmin(user)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", user.is_admin ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-primary")}
                      title="Админ"
                    >
                      <Crown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteUserMessages(user)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      title="Удалить сообщения"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleMute(user)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", user.is_muted ? "text-orange-600 hover:bg-orange-500/10" : "text-muted-foreground hover:bg-accent hover:text-orange-600")}
                      title="Мьют"
                    >
                      {user.is_muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => toggleBlock(user)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", user.is_blocked ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-accent hover:text-destructive")}
                      title="Блок"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "chats" ? (
            <div className="divide-y divide-border">
              {filteredChats.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Каналов и групп пока нет
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div key={chat.id} className="flex items-center gap-3 px-2 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      {chat.type === "channel" ? <Megaphone className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{chat.title}</span>
                        {chat.is_official && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">OFFICIAL</span>
                        )}
                        {chat.is_verified && <CheckCircle2 className="h-3.5 w-3.5 fill-primary text-primary-foreground" />}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {chat.type === "channel" ? "Канал" : "Группа"} · {chat.subscriber_count || 0} подп.
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleChatVerified(chat)}
                        className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", chat.is_verified ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-primary")}
                        title="Галочка"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleChatOfficial(chat)}
                        className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors", chat.is_official ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-primary")}
                        title="Официальный"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteChat(chat)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : tab === "reports" ? (
            <div className="divide-y divide-border">
              {filteredReports.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Жалоб пока нет
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div key={report.id} className="px-2 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        report.status === "pending" ? "bg-yellow-500/10 text-yellow-700" :
                        report.status === "resolved" ? "bg-emerald-500/10 text-emerald-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {report.status === "pending" ? "Ожидает" : report.status === "resolved" ? "Удовлетворена" : "Отклонена"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(report.created_at).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar profile={report.reported} size="xs" />
                      <span className="text-sm font-medium">
                        {report.reported?.display_name || "Пользователь"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{report.reported?.username}
                      </span>
                      {report.reported?.is_scam && (
                        <span className="rounded bg-orange-600/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">СКАМ</span>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Причина:</span> {REASON_LABELS[report.reason]}
                    </div>
                    {report.comment && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {report.comment}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      От: @{report.reporter?.username}
                    </div>
                    {report.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleResolve(report.id, "resolved")}
                          className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20"
                        >
                          Удовлетворить
                        </button>
                        <button
                          onClick={() => handleResolve(report.id, "dismissed")}
                          className="rounded-lg bg-muted px-3 py-1 text-xs font-medium hover:bg-accent"
                        >
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3 p-2">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
                  <Radio className="h-4 w-4" />
                  Пост в официальный канал
                </div>
                <p className="text-xs text-muted-foreground">
                  Сообщение будет опубликовано в канал «Импульс» и увидят все подписчики.
                </p>
              </div>
              <textarea
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Текст объявления…"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <div className="text-right text-xs text-muted-foreground">{broadcastText.length}/500</div>
              <button
                onClick={sendBroadcast}
                disabled={broadcasting || !broadcastText.trim()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {broadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                Опубликовать
              </button>
            </div>
          )}
        </div>

        {actionUser && actionType && (
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4", actionType === "scam" ? "text-orange-700" : "text-destructive")} />
              <span className="text-sm font-medium">
                {actionType === "block" ? "Блокировка" : actionType === "scam" ? "Метка СКАМ" : "Мьют"} пользователя @{actionUser.username}
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
              {actionType === "scam" && (
                <p className="text-xs text-orange-700">
                  Пользователь будет помечен как мошенник. Ему заблокируется отправка сообщений и звонков.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={doAction}
                  disabled={busy || !reason.trim()}
                  className={cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white disabled:opacity-50", actionType === "scam" ? "bg-orange-600" : "bg-destructive")}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {actionType === "block" ? "Заблокировать" : actionType === "scam" ? "Пометить СКАМ" : "Замьютить"}
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
