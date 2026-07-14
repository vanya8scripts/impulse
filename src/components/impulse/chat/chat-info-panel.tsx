"use client";

import { useEffect, useMemo, useState } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/impulse/avatar";
import { ReportModal } from "@/components/impulse/report-modal";
import { db } from "@/lib/backend";
import { formatLastSeen } from "@/lib/format";
import {
  X, Bell, BellOff, Pin, PinOff, Trash2, AtSign, Calendar, Info, Flag,
  UserPlus, Megaphone, Users, Crown,
} from "lucide-react";
import {
  toggleChatMuted, toggleChatPinned, fetchChatMembers, addChatMember,
  searchProfilesByUsername, removeChatMember,
} from "@/lib/impulse";
import { toast } from "sonner";
import type { Profile } from "@/types/db";

export function ChatInfoPanel({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const chat = useChatsStore((s) => s.chats.find((c) => c.id === chatId) || null);
  const peers = useChatsStore((s) => s.peers);
  const presence = useChatsStore((s) => s.presence);
  const upsertChat = useChatsStore((s) => s.upsertChat);
  const removeChat = useChatsStore((s) => s.removeChat);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const profile = useAuthStore((s) => s.profile);
  const [reportOpen, setReportOpen] = useState(false);
  const [members, setMembers] = useState<(Profile & { role: string })[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  const peer = useMemo(() => {
    if (chat?.peer) return peers[chat.peer.id] || chat.peer;
    return undefined;
  }, [chat, peers]);

  useEffect(() => {
    if (!chat || chat.type === "direct") return;
    fetchChatMembers(chat.id).then((m) => setMembers(m)).catch(() => {});
  }, [chat?.id, chat?.type]);

  useEffect(() => {
    if (!showAdd || !profile) return;
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await searchProfilesByUsername(q, profile.id);
        const existing = new Set(members.map((m) => m.id));
        setSearchResults(r.filter((u) => !existing.has(u.id)));
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, showAdd, profile, members]);

  if (!chat || !profile) return null;

  const isDirect = chat.type === "direct";
  const isGroup = chat.type === "group";
  const isChannel = chat.type === "channel";
  const online = peer ? presence[peer.id] : false;
  const isOwner = chat.created_by === profile.id;

  const toggleMute = async () => {
    try {
      await toggleChatMuted(chat.id, profile.id, !chat.muted);
      upsertChat({ ...chat, muted: !chat.muted });
    } catch {
      toast.error("Не удалось изменить");
    }
  };

  const togglePin = async () => {
    try {
      await toggleChatPinned(chat.id, profile.id, !chat.pinned);
      upsertChat({ ...chat, pinned: !chat.pinned });
    } catch {
      toast.error("Не удалось изменить");
    }
  };

  const deleteChat = async () => {
    if (!confirm("Удалить чат?")) return;
    try {
      await db.from("chat_members").delete().eq("chat_id", chat.id).eq("user_id", profile.id);
      removeChat(chat.id);
      setActiveChat(null);
      onClose();
      toast.success("Чат удалён");
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const onAddMember = async (user: Profile) => {
    setAdding(user.id);
    try {
      await addChatMember(chat.id, user.id);
      const m = await fetchChatMembers(chat.id);
      setMembers(m);
      setSearchQ("");
      setSearchResults([]);
      toast.success(`${user.display_name} добавлен(а)`);
    } catch {
      toast.error("Не удалось добавить");
    } finally {
      setAdding(null);
    }
  };

  const onRemoveMember = async (userId: string) => {
    if (!confirm("Удалить участника из чата?")) return;
    try {
      await removeChatMember(chat.id, userId);
      const m = await fetchChatMembers(chat.id);
      setMembers(m);
      toast.success("Участник удалён");
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const name = isDirect ? (peer?.display_name || "Пользователь") : (chat.title || (isChannel ? "Канал" : "Группа"));
  const username = peer?.username;
  const bio = isDirect ? peer?.bio : chat.description;
  const avatarUrl = isDirect ? peer?.avatar_url : chat.avatar_url;
  const createdAt = isDirect ? peer?.created_at : chat.created_at;
  const ChatIcon = isChannel ? Megaphone : isGroup ? Users : null;

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-l border-border bg-sidebar lg:flex xl:w-[360px]">
      <div className="glass flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-medium">Информация</span>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
          {isDirect ? (
            <Avatar profile={peer} size="xl" online={online} />
          ) : (
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <ChatIcon className="h-9 w-9" />
              )}
              {(chat.is_official || chat.is_verified) && (
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="0" />
                    <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6L5.7 21l2.3-7.2-6-4.4h7.6z" fill="currentColor" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{name}</div>
            {isDirect && (
              <div className={online ? "text-sm text-[var(--online)]" : "text-sm text-muted-foreground"}>
                {peer?.status_text
                  ? `${peer.status_emoji || ""} ${peer.status_text}`
                  : online ? "в сети" : formatLastSeen(peer?.last_seen_at || null)}
              </div>
            )}
            {!isDirect && (
              <div className="text-sm text-muted-foreground">
                {isChannel ? `${chat.subscriber_count || members.length} подписчиков` : `${members.length} участников`}
              </div>
            )}
            {username && (
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <AtSign className="h-3 w-3" />
                {username}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 px-4">
          {bio && <InfoRow icon={<Info className="h-4 w-4" />} label={isDirect ? "О себе" : "Описание"} value={bio} />}
          {createdAt && (
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label={isDirect ? "В Импульсе с" : "Создан"}
              value={new Date(createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            />
          )}
        </div>

        {!isDirect && (
          <div className="mt-4 px-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isChannel ? "Подписчики" : "Участники"}
              </span>
              {isGroup && isOwner && (
                <button
                  onClick={() => setShowAdd((s) => !s)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Добавить
                </button>
              )}
            </div>

            {showAdd && (
              <div className="mb-3 space-y-2">
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Поиск по юзернейму"
                  autoFocus
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => onAddMember(u)}
                        disabled={adding === u.id}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent disabled:opacity-60"
                      >
                        <Avatar profile={u} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{u.display_name}</div>
                          <div className="truncate text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                        <UserPlus className="h-4 w-4 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <Avatar profile={m} size="sm" online={presence[m.id]} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.display_name}</div>
                    <div className="truncate text-xs text-muted-foreground">@{m.username}</div>
                  </div>
                  {m.role === "owner" && <Crown className="h-4 w-4 text-primary" />}
                  {isGroup && isOwner && m.id !== profile.id && (
                    <button
                      onClick={() => onRemoveMember(m.id)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-1 px-4 pb-4">
          <button
            onClick={togglePin}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
          >
            {chat.pinned ? <PinOff className="h-4 w-4 text-muted-foreground" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
            {chat.pinned ? "Открепить чат" : "Закрепить чат"}
          </button>
          <button
            onClick={toggleMute}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
          >
            {chat.muted ? <Bell className="h-4 w-4 text-muted-foreground" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            {chat.muted ? "Включить уведомления" : "Отключить уведомления"}
          </button>
          <button
            onClick={deleteChat}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Удалить чат
          </button>
          {isDirect && peer && !peer.is_blocked && !peer.is_scam && (
            <button
              onClick={() => setReportOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Flag className="h-4 w-4" />
              Пожаловаться
            </button>
          )}
        </div>

        <ReportModal user={peer || null} open={reportOpen} onOpenChange={setReportOpen} />
      </div>
    </aside>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-sidebar-accent/50 px-3 py-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="break-words text-sm">{value}</div>
      </div>
    </div>
  );
}
