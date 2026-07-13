"use client";

import { useMemo, useState } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/impulse/avatar";
import { formatTime, cn } from "@/lib/format";
import { Search, PenSquare, MessageCircle, Pin, BellOff, Megaphone, Users, BadgeCheck } from "lucide-react";
import { searchProfilesByUsername } from "@/lib/impulse";
import type { ChatWithDetails, Profile } from "@/types/db";

export function Sidebar({ onNewChat }: { onNewChat: () => void }) {
  const chats = useChatsStore((s) => s.chats);
  const activeChatId = useChatsStore((s) => s.activeChatId);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const setPeer = useChatsStore((s) => s.setPeer);
  const searchResults = useChatsStore((s) => s.searchResults);
  const setSearchResults = useChatsStore((s) => s.setSearchResults);
  const setSearching = useChatsStore((s) => s.setSearching);
  const searching = useChatsStore((s) => s.searching);
  const profile = useAuthStore((s) => s.profile);
  const [query, setQuery] = useState("");

  const filteredChats = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.toLowerCase();
    return chats.filter((c) => {
      const name = c.type === "direct" ? c.peer?.display_name : c.title || "Группа";
      const uname = c.peer?.username || "";
      return name?.toLowerCase().includes(q) || uname.toLowerCase().includes(q);
    });
  }, [chats, query]);

  const onSearch = async (v: string) => {
    setQuery(v);
    if (!v.trim() || !profile) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    if (v.trim().length < 2) {
      setSearching(true);
      return;
    }
    setSearching(true);
    try {
      const results = await searchProfilesByUsername(v.trim(), profile.id);
      setSearchResults(results);
      results.forEach((r) => setPeer(r.id, r));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onSelectUser = (user: Profile) => {
    onNewChat();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("impulse:new-chat-user", { detail: user }));
    }, 0);
  };

  const showUsers = query.trim().length >= 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Поиск чатов и людей"
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Чаты
        </span>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <PenSquare className="h-3.5 w-3.5" />
          Новый
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pb-4">
        {showUsers && (searchResults.length > 0 || searching) && (
          <div className="px-2 pb-2">
            <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Люди
            </div>
            {searching && (
              <div className="px-2 py-3 text-sm text-muted-foreground">Поиск…</div>
            )}
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
              >
                <Avatar profile={user} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {filteredChats.length === 0 && !showUsers ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-medium">Пока нет чатов</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Найди друга по юзернейму и начни общение
              </div>
            </div>
            <button
              onClick={onNewChat}
              className="mt-1 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md shadow-primary/30 transition-all hover:opacity-95 active:scale-95"
            >
              <PenSquare className="h-4 w-4" />
              Начать чат
            </button>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {filteredChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onClick={() => setActiveChat(chat.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onClick,
}: {
  chat: ChatWithDetails;
  active: boolean;
  onClick: () => void;
}) {
  const name =
    chat.type === "direct"
      ? chat.peer?.display_name || "Пользователь"
      : chat.title || (chat.type === "channel" ? "Канал" : "Группа");

  const lastMsg = chat.last_message;
  const lastMsgPreview = useMemo(() => {
    if (!lastMsg || lastMsg.deleted_at) return "Нет сообщений";
    const isMine = lastMsg.sender_id === useAuthStore.getState().profile?.id;
    const prefix = isMine ? "Вы: " : "";
    const isEnc = lastMsg.content?.startsWith("enc:v1:");
    switch (lastMsg.type) {
      case "image":
        return `${prefix}Фото`;
      case "video":
        return `${prefix}Видео`;
      case "audio":
        return `${prefix}Аудио`;
      case "voice":
        return `${prefix}Голосовое`;
      case "file":
        return `${prefix}Файл`;
      case "call":
        return `${prefix}Звонок`;
      case "system":
        return isEnc ? "Сообщение" : lastMsg.content || "";
      default:
        return isEnc ? `${prefix}Сообщение` : `${prefix}${lastMsg.content || ""}`;
    }
  }, [lastMsg]);

  const time = lastMsg?.created_at || chat.last_message_at || chat.created_at;

  const ChatIcon = chat.type === "channel" ? Megaphone : chat.type === "group" ? Users : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors",
        active ? "bg-primary/10" : "hover:bg-sidebar-accent"
      )}
    >
      {chat.type === "direct" ? (
        <Avatar
          profile={chat.peer}
          name={name}
          seed={chat.peer?.id}
          size="md"
          online={useChatsStore.getState().presence[chat.peer?.id || ""]}
        />
      ) : (
        <div className="relative">
          <Avatar
            name={name}
            seed={chat.id}
            src={chat.avatar_url}
            size="md"
            showVerified={false}
          />
          <div className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-background">
            <ChatIcon className={cn("h-3 w-3", chat.type === "channel" ? "text-primary" : "text-muted-foreground")} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate text-sm font-medium">{name}</span>
            {(chat.is_official || chat.is_verified || (chat.type === "direct" && chat.peer?.is_verified)) && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-primary text-primary-foreground" />
            )}
            {chat.muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
            {chat.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(time)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{lastMsgPreview}</span>
          {chat.unread_count > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {chat.unread_count > 99 ? "99+" : chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
