"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { db } from "@/lib/backend";
import { sendMessage, encryptText } from "@/lib/impulse";
import type { Message } from "@/types/db";

export const QUEUE_KEY = "impulse-outbox";

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function getQueueLength(): number {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw).length : 0;
  } catch {
    return 0;
  }
}

export function addToQueue(msg: {
  chatId: string;
  senderId: string;
  content: string;
  encrypted: string;
  replyTo?: string | null;
}): string {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const queue = loadQueue();
  queue.push({ ...msg, id, timestamp: Date.now() });
  saveQueue(queue);
  return id;
}
const CACHE_KEY = "impulse-msg-cache";

interface QueuedMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  encrypted: string;
  replyTo?: string | null;
  timestamp: number;
}

interface CachedMessage {
  chatId: string;
  messages: Message[];
}

function loadQueue(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMessage[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

function loadCache(): Record<string, Message[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, Message[]>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function useOfflineMode() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const profile = useAuthStore((s) => s.profile);
  const addMessage = useChatsStore((s) => s.addMessage);
  const updateMessage = useChatsStore((s) => s.updateMessage);
  const removeMessage = useChatsStore((s) => s.removeMessage);
  const processingRef = useRef(false);
  const processQueueRef = useRef<() => void>(() => {});

  const processQueue = useCallback(async () => {
    if (processingRef.current || !navigator.onLine) return;
    processingRef.current = true;

    const queue = loadQueue();
    if (queue.length === 0) {
      processingRef.current = false;
      return;
    }

    const me = useAuthStore.getState().profile;
    if (!me) {
      processingRef.current = false;
      return;
    }

    const remaining: QueuedMessage[] = [];
    for (const qm of queue) {
      try {
        const msg = await sendMessage({
          chatId: qm.chatId,
          senderId: qm.senderId,
          content: qm.encrypted,
          type: "text",
          replyTo: qm.replyTo || null,
        });
        removeMessage(qm.chatId, qm.id);
        addMessage(qm.chatId, msg);
      } catch {
        remaining.push(qm);
      }
    }
    saveQueue(remaining);
    setQueueCount(remaining.length);
    processingRef.current = false;
  }, [addMessage, removeMessage]);

  processQueueRef.current = processQueue;

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueueCount(loadQueue().length);

    const onOnline = () => {
      setOnline(true);
      processQueueRef.current();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const cacheMessages = useCallback((chatId: string, messages: Message[]) => {
    const cache = loadCache();
    cache[chatId] = messages.slice(-100);
    saveCache(cache);
  }, []);

  const getCachedMessages = useCallback((chatId: string): Message[] => {
    const cache = loadCache();
    return cache[chatId] || [];
  }, []);

  const queueMessage = useCallback(
    (msg: Omit<QueuedMessage, "id" | "timestamp">): string => {
      const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const queued: QueuedMessage = {
        ...msg,
        id,
        timestamp: Date.now(),
      };
      const queue = loadQueue();
      queue.push(queued);
      saveQueue(queue);
      setQueueCount(queue.length);
      return id;
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
    const queue = loadQueue().filter((q) => q.id !== id);
    saveQueue(queue);
    setQueueCount(queue.length);
  }, []);

  useEffect(() => {
    if (online && profile) {
      processQueueRef.current();
    }
  }, [online, profile]);

  return {
    online,
    queueCount,
    queueMessage,
    removeFromQueue,
    cacheMessages,
    getCachedMessages,
    processQueue,
  };
}
