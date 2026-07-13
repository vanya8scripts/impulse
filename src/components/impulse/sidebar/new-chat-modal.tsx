"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/impulse/avatar";
import {
  searchProfilesByUsername,
  findOrCreateDirectChat,
  createChannel,
  createGroup,
} from "@/lib/impulse";
import { useAuthStore } from "@/stores/auth-store";
import { useChatsStore } from "@/stores/chats-store";
import {
  Search,
  UserPlus,
  Loader2,
  AtSign,
  Megaphone,
  Users,
  Radio,
} from "lucide-react";
import type { Profile } from "@/types/db";
import { toast } from "sonner";
import { db } from "@/lib/backend";
import { cn } from "@/lib/format";

type Tab = "direct" | "channel" | "group";

export function NewChatModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const profile = useAuthStore((s) => s.profile);
  const setActiveChat = useChatsStore((s) => s.setActiveChat);
  const [tab, setTab] = useState<Tab>("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setChannelName("");
      setChannelDesc("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !profile || tab !== "direct") return;
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
  }, [query, open, profile, tab]);

  const startChat = async (user: Profile) => {
    if (!profile) return;
    setStarting(user.id);
    try {
      const chatId = await findOrCreateDirectChat(profile.id, user.id);
      const { data: chatData } = await db
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();
      const { data: members } = await db
        .from("chat_members")
        .select("*")
        .eq("chat_id", chatId);
      if (chatData && members) {
        useChatsStore.getState().upsertChat({
          ...chatData,
          members: members as never,
          last_message: null,
          unread_count: 0,
          peer: user,
        } as never);
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

  const handleCreate = async () => {
    if (!profile) return;
    if (tab === "channel" && !channelName.trim()) {
      toast.error("Введите название канала");
      return;
    }
    if (tab === "group" && !channelName.trim()) {
      toast.error("Введите название группы");
      return;
    }
    setCreating(true);
    try {
      const id =
        tab === "channel"
          ? await createChannel(channelName.trim(), channelDesc.trim() || undefined)
          : await createGroup(channelName.trim(), channelDesc.trim() || undefined);

      if (!id) throw new Error("Не удалось получить ID чата");

      // даём БД время на коммит
      await new Promise((r) => setTimeout(r, 300));

      const { data: chatData, error: chatErr } = await db
        .from("chats")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const { data: members } = await db
        .from("chat_members")
        .select("*")
        .eq("chat_id", id);

      if (chatData && members) {
        useChatsStore.getState().upsertChat({
          ...chatData,
          members: members as never,
          last_message: null,
          unread_count: 0,
        } as never);
      } else {
        // обновим список чатов с сервера
        const { fetchChatsForUser } = await import("@/lib/impulse");
        const chats = await fetchChatsForUser(profile.id);
        useChatsStore.getState().setChats(chats);
      }
      setActiveChat(id);
      onOpenChange(false);
      toast.success(tab === "channel" ? "Канал создан" : "Группа создана");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось создать";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogTitle className="sr-only">Новый чат</DialogTitle>
        <div className="border-b border-border p-4">
          <h2 className="mb-3 text-lg font-semibold">Новый чат</h2>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            <button
              onClick={() => setTab("direct")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
                tab === "direct" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <AtSign className="h-3.5 w-3.5" />
              Личный
            </button>
            <button
              onClick={() => setTab("channel")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
                tab === "channel" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Megaphone className="h-3.5 w-3.5" />
              Канал
            </button>
            <button
              onClick={() => setTab("group")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
                tab === "group" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Группа
            </button>
          </div>
        </div>

        {tab === "direct" && (
          <>
            <div className="border-b border-border p-3">
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
                      Введи минимум 2 символа
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
          </>
        )}

        {(tab === "channel" || tab === "group") && (
          <div className="space-y-4 p-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl text-white",
                  tab === "channel"
                    ? "bg-gradient-to-br from-violet-600 to-fuchsia-600"
                    : "bg-gradient-to-br from-purple-600 to-indigo-600"
                )}
              >
                {tab === "channel" ? <Megaphone className="h-8 w-8" /> : <Users className="h-8 w-8" />}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {tab === "channel"
                  ? "Канал для публикации постов подписчикам"
                  : "Группа для общения нескольких участников"}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {tab === "channel" ? "Название канала" : "Название группы"}
              </label>
              <input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                maxLength={50}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder={tab === "channel" ? "Мой канал" : "Моя группа"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Описание</label>
              <textarea
                value={channelDesc}
                onChange={(e) => setChannelDesc(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder="О чём этот канал"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !channelName.trim()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Создать
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
