"use client";

import { useEffect, useMemo, useState } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCallStore } from "@/stores/call-store";
import { useChatMessages } from "@/hooks/impulse/use-realtime";
import { db } from "@/lib/backend";
import { markChatRead, toggleChatMuted, toggleChatPinned, createCallRecord } from "@/lib/impulse";
import { Avatar } from "@/components/impulse/avatar";
import { MessageList } from "@/components/impulse/chat/message-list";
import { MessageComposer } from "@/components/impulse/chat/message-composer";
import { ChatInfoPanel } from "@/components/impulse/chat/chat-info-panel";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Pin,
  PinOff,
  BellOff,
  Bell,
  Info,
  Trash2,
  Megaphone,
  Users,
  BadgeCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLastSeen, cn } from "@/lib/format";
import { toast } from "sonner";
import type { CallType } from "@/types/db";

export function ChatArea() {
  const activeChatId = useChatsStore((s) => s.activeChatId);
  const chats = useChatsStore((s) => s.chats);
  const presence = useChatsStore((s) => s.presence);
  const peers = useChatsStore((s) => s.peers);
  const typing = useChatsStore((s) => s.typing);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const upsertChat = useChatsStore((s) => s.upsertChat);
  const profile = useAuthStore((s) => s.profile);
  const openOutgoing = useCallStore((s) => s.openOutgoing);
  const [infoOpen, setInfoOpen] = useState(false);

  useChatMessages(activeChatId);

  const chat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || null,
    [chats, activeChatId]
  );

  const peer = chat?.peer || (chat?.peer?.id ? peers[chat.peer.id] : undefined);

  useEffect(() => {
    if (!activeChatId || !profile) return;
    markChatRead(activeChatId, profile.id).catch(() => {});
    const store = useChatsStore.getState();
    const updated = store.chats.map((c) =>
      c.id === activeChatId ? { ...c, unread_count: 0 } : c
    );
    store.setChats(updated);
  }, [activeChatId, profile, chat?.last_message?.id]);

  useEffect(() => {
    const handler = () => setMobileSidebar(false);
    window.addEventListener("impulse:open-sidebar", handler);
    return () => window.removeEventListener("impulse:open-sidebar", handler);
  }, []);

  if (!chat || !profile) return null;

  const isDirect = chat.type === "direct";
  const isChannel = chat.type === "channel";
  const isGroup = chat.type === "group";
  const peerOnline = peer ? presence[peer.id] : false;
  const isTyping = activeChatId ? typing[activeChatId] : false;

  const subtitle = isDirect
    ? peer
      ? isTyping
        ? "печатает…"
        : peer.status_text
          ? `${peer.status_emoji || ""} ${peer.status_text}`
          : peerOnline
            ? "в сети"
            : formatLastSeen(peer.last_seen_at)
      : "Пользователь"
    : isChannel
      ? `${chat.subscriber_count || chat.members.length} подписчиков`
      : `${chat.members.length} участников`;

  const ChatIcon = isChannel ? Megaphone : isGroup ? Users : null;
  const showVerified = isDirect
    ? peer?.is_verified || peer?.is_admin
    : chat.is_official || chat.is_verified;
  const peerRestricted = isDirect && (peer?.is_blocked || peer?.is_scam);
  const canCall = isDirect && !peerRestricted;
  const canWrite = !isChannel || !chat.is_official || profile.is_admin || profile.username.toLowerCase() === "vanya";
  const headerName = isDirect
    ? peer?.is_blocked || peer?.is_scam
      ? (peer?.is_scam ? "СКAM · заблокирован" : "Аккаунт заблокирован")
      : peer?.display_name || "Пользователь"
    : chat.title || (isChannel ? "Канал" : "Группа");

  const startCall = async (type: CallType) => {
    if (!peer || !profile) return;
    try {
      const call = await createCallRecord(chat.id, profile.id, type);
      openOutgoing(chat.id, peer.id, type, (call as { id: string }).id);
      const channel = db.channel(`impulse:${peer.id}`);
      await channel.subscribe();
      channel.send({
        type: "broadcast",
        event: "call-offer",
        payload: {
          callId: (call as { id: string }).id,
          chatId: chat.id,
          callerId: profile.id,
          type,
        },
      });
      db.removeChannel(channel);
    } catch {
      toast.error("Не удалось начать звонок");
    }
  };

  const onPin = async () => {
    try {
      await toggleChatPinned(chat.id, profile.id, !chat.pinned);
      upsertChat({ ...chat, pinned: !chat.pinned });
    } catch {
      toast.error("Не удалось изменить");
    }
  };

  const onMute = async () => {
    try {
      await toggleChatMuted(chat.id, profile.id, !chat.muted);
      upsertChat({ ...chat, muted: !chat.muted });
    } catch {
      toast.error("Не удалось изменить");
    }
  };

  const onDeleteChat = async () => {
    if (!confirm("Удалить чат? История сообщений останется у собеседника.")) return;
    try {
      await db.from("chat_members").delete().eq("chat_id", chat.id).eq("user_id", profile.id);
      useChatsStore.getState().removeChat(chat.id);
      setActiveChat(null);
      toast.success("Чат удалён");
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass z-20 flex items-center gap-2 border-b border-border px-3 py-2.5">
          <button
            onClick={() => {
              setActiveChat(null);
              window.dispatchEvent(new CustomEvent("impulse:open-sidebar"));
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <button
            onClick={() => setInfoOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-accent/50"
          >
            {isDirect ? (
              <Avatar profile={peer} size="md" online={peerOnline} />
            ) : (
              <div className="relative">
                <Avatar name={headerName} seed={chat.id} src={chat.avatar_url} size="md" showVerified={false} />
                <div className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-background">
                  <ChatIcon className={cn("h-3 w-3", isChannel ? "text-primary" : "text-muted-foreground")} />
                </div>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold">{headerName}</span>
                {showVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 fill-primary text-primary-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "truncate text-xs",
                  isTyping ? "text-primary" : peerOnline && isDirect
                    ? "text-[var(--online)]"
                    : "text-muted-foreground"
                )}
              >
                {subtitle}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            {canCall && (
              <>
                <button
                  onClick={() => startCall("audio")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  title="Аудиозвонок"
                >
                  <Phone className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={() => startCall("video")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                  title="Видеозвонок"
                >
                  <Video className="h-[18px] w-[18px]" />
                </button>
              </>
            )}
            <button
              onClick={() => setInfoOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              title="Информация"
            >
              <Info className="h-[18px] w-[18px]" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent">
                  <MoreVertical className="h-[18px] w-[18px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={onPin}>
                  {chat.pinned ? (
                    <>
                      <PinOff className="mr-2 h-4 w-4" /> Открепить
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-4 w-4" /> Закрепить
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMute}>
                  {chat.muted ? (
                    <>
                      <Bell className="mr-2 h-4 w-4" /> Включить уведомления
                    </>
                  ) : (
                    <>
                      <BellOff className="mr-2 h-4 w-4" /> Отключить уведомления
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInfoOpen(true)}>
                  <Info className="mr-2 h-4 w-4" /> Информация
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDeleteChat}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Удалить чат
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <MessageList chatId={chat.id} />
        <MessageComposer
          chatId={chat.id}
          canWrite={canWrite && !peerRestricted && !profile.is_blocked && !profile.is_scam}
          isChannel={isChannel}
          isOfficial={chat.is_official}
          peerRestricted={peerRestricted}
        />
      </div>

      {infoOpen && (
        <ChatInfoPanel chatId={chat.id} onClose={() => setInfoOpen(false)} />
      )}

    </div>
  );
}
