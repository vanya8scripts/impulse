"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/backend";
import { useChatsStore } from "@/stores/chats-store";
import { useCallStore } from "@/stores/call-store";
import { useAuthStore } from "@/stores/auth-store";
import { fetchChatsForUser, fetchMessages, fetchProfilesByIds, markChatRead } from "@/lib/impulse";
import type { Message, Profile } from "@/types/db";

export function useRealtime() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setChats = useChatsStore((s) => s.setChats);
  const upsertChat = useChatsStore((s) => s.upsertChat);
  const setMessages = useChatsStore((s) => s.setMessages);
  const addMessage = useChatsStore((s) => s.addMessage);
  const updateMessage = useChatsStore((s) => s.updateMessage);
  const removeMessage = useChatsStore((s) => s.removeMessage);
  const setTyping = useChatsStore((s) => s.setTyping);
  const setPresence = useChatsStore((s) => s.setPresence);
  const setPeer = useChatsStore((s) => s.setPeer);
  const openIncoming = useCallStore((s) => s.openIncoming);
  const chatsRef = useRef<Set<string>>(new Set());
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = useChatsStore.getState().activeChatId;
  });

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function bootstrap() {
      const chats = await fetchChatsForUser(profile!.id);
      if (cancelled) return;
      setChats(chats);
      chatsRef.current = new Set(chats.map((c) => c.id));

      const peerIds = Array.from(
        new Set(
          chats
            .flatMap((c) => c.members.map((m) => m.user_id))
            .filter((id) => id !== profile!.id)
        )
      );
      if (peerIds.length) {
        const peers = await fetchProfilesByIds(peerIds);
        if (cancelled) return;
        peers.forEach((p) => setPeer(p.id, p));
        chats.forEach((c) => {
          if (c.peer) setPeer(c.peer.id, c.peer);
        });
      }
    }

    bootstrap();

    const channel = db.channel(`impulse:${profile.id}`, {
      config: { presence: { key: profile.id } },
    });

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const msg = payload.new as Message;
        if (!chatsRef.current.has(msg.chat_id)) {
          const refreshed = await fetchChatsForUser(profile!.id);
          if (cancelled) return;
          setChats(refreshed);
          chatsRef.current = new Set(refreshed.map((c) => c.id));
          refreshed.forEach((c) => c.peer && setPeer(c.peer.id, c.peer));
          return;
        }
        addMessage(msg.chat_id, msg);

        const store = useChatsStore.getState();
        const chat = store.chats.find((c) => c.id === msg.chat_id);
        if (chat) {
          const isActive = store.activeChatId === msg.chat_id;
          const isMine = msg.sender_id === profile!.id;
          store.upsertChat({
            ...chat,
            last_message: msg,
            last_message_at: msg.created_at,
            unread_count: isActive || isMine ? 0 : (chat.unread_count || 0) + 1,
          });
        }

        if (msg.sender_id && msg.sender_id !== profile!.id) {
          const activeId = useChatsStore.getState().activeChatId;
          if (activeId === msg.chat_id) {
            markChatRead(msg.chat_id, profile!.id).catch(() => {});
          } else {
            db.from("messages")
              .update({ status: "delivered" })
              .eq("id", msg.id)
              .neq("sender_id", profile!.id)
              .then(() => {});
          }
        }
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new as Message;
        updateMessage(msg.chat_id, msg.id, msg);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages" },
      (payload) => {
        const old = payload.old as { id: string; chat_id: string };
        removeMessage(old.chat_id, old.id);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chats" },
      async () => {
        const refreshed = await fetchChatsForUser(profile!.id);
        if (cancelled) return;
        setChats(refreshed);
        chatsRef.current = new Set(refreshed.map((c) => c.id));
      }
    );

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_members" },
      async () => {
        const refreshed = await fetchChatsForUser(profile!.id);
        if (cancelled) return;
        setChats(refreshed);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles" },
      (payload) => {
        const updated = payload.new as Profile;
        if (!updated) return;
        setPeer(updated.id, updated);
        if (updated.id === profile!.id) {
          setProfile(updated);
        }
      }
    );

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const data = payload.payload as { chatId: string; userId: string; typing: boolean };
      if (data.userId === profile!.id) return;
      setTyping(data.chatId, data.typing);
      if (data.typing) {
        setTimeout(() => setTyping(data.chatId, false), 4000);
      }
    });

    channel.on("broadcast", { event: "call-offer" }, (payload) => {
      const data = payload.payload as {
        callId: string;
        chatId: string;
        callerId: string;
        type: "audio" | "video";
      };
      if (data.callerId === profile!.id) return;
      const callState = useCallStore.getState();
      if (callState.callId === data.callId) return;
      if (callState.view !== "ended" && callState.view !== "incoming") return;
      openIncoming(data.chatId, data.callerId, data.type, data.callId);
    });

    channel.on("broadcast", { event: "call-end" }, (payload) => {
      const data = payload.payload as { callId: string };
      const callState = useCallStore.getState();
      if (callState.callId === data.callId || !callState.callId) {
        callState.close();
      }
    });

    channel.on("broadcast", { event: "call-decline" }, (payload) => {
      const data = payload.payload as { callId: string };
      const callState = useCallStore.getState();
      if (callState.callId === data.callId || !callState.callId) {
        callState.close();
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ userId: string }>();
      const online = new Set<string>();
      Object.values(state).forEach((entries) => {
        entries.forEach((e) => online.add(e.userId));
      });
      useChatsStore.setState((s) => {
        const next = { ...s.presence };
        Object.keys(next).forEach((id) => {
          next[id] = online.has(id);
        });
        online.forEach((id) => {
          next[id] = true;
        });
        return { presence: next };
      });
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId: profile!.id });
      }
    });

    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [profile?.id]);

  return { profile };
}

export function useChatMessages(chatId: string | null) {
  const setMessages = useChatsStore((s) => s.setMessages);

  useEffect(() => {
    if (!chatId) return;
    let active = true;
    fetchMessages(chatId, 200).then((msgs) => {
      if (active && msgs) setMessages(chatId, msgs);
    });
    return () => {
      active = false;
    };
  }, [chatId]);
}
