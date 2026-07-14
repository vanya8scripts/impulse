"use client";

import { useMemo, useState } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/impulse/avatar";
import { ReportModal } from "@/components/impulse/report-modal";
import { db } from "@/lib/backend";
import { formatLastSeen } from "@/lib/format";
import { X, Bell, BellOff, Pin, PinOff, Trash2, AtSign, Calendar, Info, Flag } from "lucide-react";
import { toggleChatMuted, toggleChatPinned } from "@/lib/impulse";
import { toast } from "sonner";

export function ChatInfoPanel({
  chatId,
  onClose,
}: {
  chatId: string;
  onClose: () => void;
}) {
  const chat = useChatsStore((s) => s.chats.find((c) => c.id === chatId));
  const peers = useChatsStore((s) => s.peers);
  const presence = useChatsStore((s) => s.presence);
  const upsertChat = useChatsStore((s) => s.upsertChat);
  const removeChat = useChatsStore((s) => s.removeChat);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const profile = useAuthStore((s) => s.profile);
  const [reportOpen, setReportOpen] = useState(false);

  const peer = useMemo(() => {
    if (chat?.peer) return peers[chat.peer.id] || chat.peer;
    return undefined;
  }, [chat, peers]);

  if (!chat || !profile) return null;

  const isDirect = chat.type === "direct";
  const online = peer ? presence[peer.id] : false;

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

  const name = isDirect ? peer?.display_name || "Пользователь" : chat.title || "Группа";
  const username = peer?.username;
  const bio = peer?.bio;
  const avatarUrl = isDirect ? peer?.avatar_url : chat.avatar_url;
  const createdAt = isDirect ? peer?.created_at : chat.created_at;

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
          <Avatar
            profile={peer}
            name={name}
            src={avatarUrl}
            size="xl"
            online={isDirect ? online : undefined}
          />
          <div>
            <div className="text-lg font-semibold">{name}</div>
            {isDirect && (
              <div
                className={
                  online ? "text-sm text-[var(--online)]" : "text-sm text-muted-foreground"
                }
              >
                {online ? "в сети" : formatLastSeen(peer?.last_seen_at || null)}
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
          {bio && (
            <InfoRow icon={<Info className="h-4 w-4" />} label="О себе" value={bio} />
          )}
          {createdAt && (
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="В Импульсе с"
              value={new Date(createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}
        </div>

        <div className="mt-4 space-y-1 px-4">
          <button
            onClick={togglePin}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
          >
            {chat.pinned ? (
              <PinOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Pin className="h-4 w-4 text-muted-foreground" />
            )}
            {chat.pinned ? "Открепить чат" : "Закрепить чат"}
          </button>
          <button
            onClick={toggleMute}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
          >
            {chat.muted ? (
              <Bell className="h-4 w-4 text-muted-foreground" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
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
