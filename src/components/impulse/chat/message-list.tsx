"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { MessageBubble } from "@/components/impulse/chat/message-bubble";
import { formatDateDivider } from "@/lib/format";
import { TypingIndicator } from "@/components/impulse/chat/typing-indicator";
import type { Message, Profile } from "@/types/db";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_MEMBERS: string[] = [];

interface Group {
  date: string;
  messages: Message[];
}

export function MessageList({ chatId }: { chatId: string }) {
  const messages = useChatsStore((s) => s.messages[chatId] || EMPTY_MESSAGES);
  const typing = useChatsStore((s) => s.typing[chatId]);
  const chat = useChatsStore((s) => s.chats.find((c) => c.id === chatId) || null);
  const peerId = chat?.peer?.id || null;
  const peerFromPeers = useChatsStore((s) =>
    peerId ? s.peers[peerId] : undefined
  );
  const peer: Profile | null = peerFromPeers || chat?.peer || null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLenRef = useRef(0);

  // Стабильный массив memberIds — пересчитывается только при смене chat
  const memberIds = useMemo(() => {
    if (!chat?.members) return EMPTY_MEMBERS;
    return chat.members.map((m) => m.user_id);
  }, [chat]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Message[]>();
    for (const m of messages) {
      const day = new Date(m.created_at).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    }
    return Array.from(map.entries()).map(([date, msgs]) => ({ date, messages: msgs }));
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const len = messages.length;
    const wasNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (wasNearBottom || len > lastLenRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: len > lastLenRef.current + 1 ? "smooth" : "auto" });
    }
    lastLenRef.current = len;
  }, [messages.length, typing]);

  return (
    <div
      ref={scrollRef}
      className="chat-wallpaper min-h-0 flex-1 overflow-y-auto scrollbar-thin px-2 py-4 sm:px-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-1">
        {groups.length === 0 && (
          <div className="mx-auto mt-10 max-w-xs rounded-2xl bg-card/70 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur">
            Сообщений пока нет. Напиши первым!
          </div>
        )}
        {groups.map((group) => (
          <div key={group.date} className="flex flex-col gap-1">
            <div className="sticky top-1 z-10 mx-auto my-2">
              <span className="rounded-full bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
                {formatDateDivider(group.date)}
              </span>
            </div>
            {group.messages.map((msg, idx) => {
              const prev = group.messages[idx - 1];
              const next = group.messages[idx + 1];
              const isMine = msg.sender_id === useAuthStore.getState().profile?.id;
              const showAvatar =
                !isMine &&
                (!next || next.sender_id !== msg.sender_id);
              const isFirstOfGroup = !prev || prev.sender_id !== msg.sender_id;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  isFirstOfGroup={isFirstOfGroup}
                  peerName={peer?.display_name}
                  memberIds={memberIds}
                />
              );
            })}
          </div>
        ))}
        {typing && <TypingIndicator name={peer?.display_name} />}
      </div>
    </div>
  );
}
