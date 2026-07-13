"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatsStore } from "@/stores/chats-store";
import { sendMessage, uploadAttachment } from "@/lib/impulse";
import { db } from "@/lib/backend";
import { encryptText, isEncrypted } from "@/lib/crypto";
import { EmojiPicker } from "@/components/impulse/chat/emoji-picker";
import {
  Paperclip,
  Send,
  X,
  Mic,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Check,
  Lock,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/format";
import { toast } from "sonner";
import type { Message, MessageType } from "@/types/db";

export function MessageComposer({
  chatId,
  canWrite = true,
  isChannel = false,
  isOfficial = false,
}: {
  chatId: string;
  canWrite?: boolean;
  isChannel?: boolean;
  isOfficial?: boolean;
}) {
  const profile = useAuthStore((s) => s.profile);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<Message>).detail;
      if (msg.chat_id === chatId) {
        setReply(msg);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    };
    window.addEventListener("impulse:reply", handler);
    return () => window.removeEventListener("impulse:reply", handler);
  }, [chatId]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && reply) setReply(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reply]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [text]);

  const broadcastTyping = (typing: boolean) => {
    if (!profile) return;
    const chat = useChatsStore.getState().chats.find((c) => c.id === chatId);
    if (!chat?.peer) return;
    const channel = db.channel(`impulse:${chat.peer.id}`);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { chatId, userId: profile.id, typing },
        });
        setTimeout(() => db.removeChannel(channel), 500);
      }
    });
  };

  const onTextChange = (v: string) => {
    setText(v);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    broadcastTyping(true);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const insertEmoji = (e: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText((t) => t + e);
      return;
    }
    const start = ta.selectionStart || text.length;
    const end = ta.selectionEnd || text.length;
    const next = text.slice(0, start) + e + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + e.length;
    });
  };

  const handleSend = async () => {
    if (!profile || busy) return;
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      const chat = useChatsStore.getState().chats.find((c) => c.id === chatId);
      const memberIds = chat?.members.map((m) => m.user_id) || [profile.id];
      const encrypted = await encryptText(content, chatId, memberIds);
      await sendMessage({
        chatId,
        senderId: profile.id,
        content: encrypted,
        type: "text",
        replyTo: reply?.id || null,
      });
      setText("");
      setReply(null);
      broadcastTyping(false);
    } catch {
      toast.error("Не удалось отправить");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!profile || !files.length) return;
    for (const file of files) {
      await sendFile(file);
    }
  };

  const sendFile = async (file: File) => {
    if (!profile) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name}: максимум 50 МБ`);
      return;
    }
    setBusy(true);
    try {
      const { url } = await uploadAttachment(profile.id, file, "media");
      let type: MessageType = "file";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "audio";

      await sendMessage({
        chatId,
        senderId: profile.id,
        content: null,
        type,
        attachmentUrl: url,
        attachmentName: file.name,
        attachmentSize: file.size,
        attachmentMime: file.type,
        replyTo: reply?.id || null,
      });
      setReply(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "storage-not-configured") {
        toast.error("Файл больше 600 КБ. Создайте storage bucket в базе данных для больших файлов.");
      } else {
        toast.error(`Не удалось отправить ${file.name}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) {
          setRecording(false);
          setRecordSeconds(0);
          return;
        }
        await sendVoice(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Нет доступа к микрофону");
    }
  };

  const stopRecording = (send: boolean) => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (!send) {
      mr.ondataavailable = null;
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
      };
    }
    if (mr.state !== "inactive") mr.stop();
    setRecording(false);
    if (!send) setRecordSeconds(0);
  };

  const sendVoice = async (blob: Blob) => {
    if (!profile) return;
    setBusy(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      const { url } = await uploadAttachment(profile.id, file, "voice");
      await sendMessage({
        chatId,
        senderId: profile.id,
        content: null,
        type: "voice",
        attachmentUrl: url,
        attachmentName: file.name,
        attachmentSize: file.size,
        attachmentMime: "audio/webm",
        duration: recordSeconds,
      });
      setRecordSeconds(0);
    } catch {
      toast.error("Не удалось отправить голосовое");
    } finally {
      setBusy(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="glass border-t border-border px-4 py-4">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          {isOfficial
            ? "Только администратор может публиковать в официальном канале"
            : "Писать в этот чат запрещено"}
        </div>
      </div>
    );
  }

  return (
    <div className="glass border-t border-border px-2 py-2.5 sm:px-4">
      {reply && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-l-2 border-primary bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-primary">
              {reply.sender_id === profile?.id ? "Ответ себе" : "Ответ"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {reply.deleted_at
                ? "Сообщение удалено"
                : isEncrypted(reply.content)
                  ? previewType(reply.type)
                  : reply.content || previewType(reply.type)}
            </div>
          </div>
          <button
            onClick={() => setReply(null)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-destructive" />
          <span className="flex-1 text-sm text-muted-foreground">
            Запись… {formatDuration(recordSeconds)}
          </span>
          <button
            onClick={() => stopRecording(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive transition-transform hover:scale-105"
            title="Отменить"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => stopRecording(true)}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
            title="Отправить"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.zip,.rar,.7z"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:opacity-50"
            title="Прикрепить файл"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>

          <EmojiPicker onPick={insertEmoji} />

          <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-input bg-card px-3 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Сообщение"
              rows={1}
              className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {text.trim() && (
              <button
                onClick={() => fileRef.current?.click()}
                className="mb-0.5 ml-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
                title="Фото"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {text.trim() ? (
            <button
              onClick={handleSend}
              disabled={busy}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-all hover:opacity-95 active:scale-95 disabled:opacity-60"
              )}
              title="Отправить"
            >
              <Send className="h-[18px] w-[18px] -translate-x-0.5" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={busy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary disabled:opacity-50"
              title="Голосовое сообщение"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function previewType(type: MessageType) {
  switch (type) {
    case "image":
      return "Фото";
    case "video":
      return "Видео";
    case "audio":
      return "Аудио";
    case "voice":
      return "Голосовое";
    case "file":
      return "Файл";
    case "call":
      return "Звонок";
    default:
      return "Сообщение";
  }
}
