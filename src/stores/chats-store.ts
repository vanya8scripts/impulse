"use client";

import { create } from "zustand";
import type { ChatWithDetails, Message, Profile } from "@/types/db";

interface ChatsState {
  chats: ChatWithDetails[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  peers: Record<string, Profile>;
  typing: Record<string, boolean>;
  presence: Record<string, boolean>;
  searchResults: Profile[];
  searching: boolean;

  setChats: (c: ChatWithDetails[]) => void;
  upsertChat: (c: ChatWithDetails) => void;
  removeChat: (id: string) => void;
  setActiveChat: (id: string | null) => void;
  setMessages: (chatId: string, msgs: Message[]) => void;
  addMessage: (chatId: string, msg: Message) => void;
  updateMessage: (chatId: string, id: string, patch: Partial<Message>) => void;
  removeMessage: (chatId: string, id: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  setPresence: (userId: string, online: boolean) => void;
  setPeer: (id: string, p: Profile) => void;
  setSearchResults: (r: Profile[]) => void;
  setSearching: (b: boolean) => void;
  reset: () => void;
}

export const useChatsStore = create<ChatsState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  peers: {},
  typing: {},
  presence: {},
  searchResults: [],
  searching: false,

  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((s) => {
      const exists = s.chats.some((c) => c.id === chat.id);
      const next = exists
        ? s.chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c))
        : [chat, ...s.chats];
      next.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const aTime = a.last_message_at || a.created_at;
        const bTime = b.last_message_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      return { chats: next };
    }),
  removeChat: (id) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== id),
      messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== id)),
      activeChatId: s.activeChatId === id ? null : s.activeChatId,
    })),
  setActiveChat: (id) => set({ activeChatId: id }),
  setMessages: (chatId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: msgs } })),
  addMessage: (chatId, msg) =>
    set((s) => {
      const list = s.messages[chatId] || [];
      if (list.some((m) => m.id === msg.id)) return s;
      return { messages: { ...s.messages, [chatId]: [...list, msg] } };
    }),
  updateMessage: (chatId, id, patch) =>
    set((s) => {
      const list = s.messages[chatId] || [];
      return {
        messages: {
          ...s.messages,
          [chatId]: list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        },
      };
    }),
  removeMessage: (chatId, id) =>
    set((s) => {
      const list = s.messages[chatId] || [];
      return {
        messages: { ...s.messages, [chatId]: list.filter((m) => m.id !== id) },
      };
    }),
  setTyping: (chatId, isTyping) =>
    set((s) => ({ typing: { ...s.typing, [chatId]: isTyping } })),
  setPresence: (userId, online) =>
    set((s) => ({ presence: { ...s.presence, [userId]: online } })),
  setPeer: (id, p) => set((s) => ({ peers: { ...s.peers, [id]: p } })),
  setSearchResults: (r) => set({ searchResults: r }),
  setSearching: (b) => set({ searching: b }),
  reset: () =>
    set({
      chats: [],
      activeChatId: null,
      messages: {},
      peers: {},
      typing: {},
      presence: {},
      searchResults: [],
    }),
}));
