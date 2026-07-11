"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/impulse/avatar";
import { searchProfilesByUsername, findOrCreateDirectChat } from "@/lib/impulse";
import { useAuthStore } from "@/stores/auth-store";
import { useChatsStore } from "@/stores/chats-store";
import { Search, UserPlus, Loader2, AtSign } from "lucide-react";
import type { Profile } from "@/types/db";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function NewChatModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const handler = (e: Event) => {
      const user = (e as CustomEvent<Profile>).detail;
      setQuery(user.username);
      setResults([user]);
    };
    window.addEventListener("impulse:new-chat-user", handler);
    return () => window.removeEventListener("impulse:new-chat-user", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !profile) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchProfilesByUsername(q, profile.id);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, profile]);

  const startChat = async (user: Profile) => {
    if (!profile) return;
    setStarting(user.id);
    try {
      const chatId = await findOrCreateDirectChat(profile.id, user.id);
      const { data: chatData } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();
      const { data: members } = await supabase
        .from("chat_members")
        .select("chat_id, user_id, role, joined_at, muted, pinned")
        .eq("chat_id", chatId);
      if (chatData && members) {
        useChatsStore.getState().upsertChat({
          ...chatData,
          members: members as never,
          last_message: null,
          unread_count: 0,
          peer: user,
        });
        useChatsStore.getState().setPeer(user.id, user);
      }
      setActiveChat(chatId);
      onOpenChange(false);
    } catch {
      toast.error("Не удалось создать чат");
    } finally {
      setStarting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogTitle className="sr-only">Новый чат</DialogTitle>
        <div className="border-b border-border p-4">
          <h2 className="mb-3 text-lg font-semibold">Новый чат</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите юзернейм"
              className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
          {query.trim().length < 2 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <AtSign className="h-7 w-7" />
              </div>
              <div>
                <div className="text-sm font-medium">Найди по юзернейму</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Введи минимум 2 символа, чтобы найти человека
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Поиск…
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <UserPlus className="h-7 w-7" />
              </div>
              <div>
                <div className="text-sm font-medium">Никого не найдено</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Проверь написание юзернейма
                </div>
              </div>
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                onClick={() => startChat(user)}
                disabled={starting === user.id}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
              >
                <Avatar profile={user} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{user.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                </div>
                {starting === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
