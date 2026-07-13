"use client";

import { useEffect, useRef, useState } from "react";
import { useChatsStore } from "@/stores/chats-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/impulse/avatar";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Pencil,
  Play,
  Pause,
  Reply,
  Trash2,
  Copy,
  Phone,
  Video,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import type { Message, MessageType } from "@/types/db";
import { cn, formatTime, formatDuration, formatFileSize } from "@/lib/format";
import { editMessage, deleteMessage } from "@/lib/impulse";
import { decryptText, encryptText, isEncrypted } from "@/lib/crypto";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface Props {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  isFirstOfGroup: boolean;
  peerName?: string;
  memberIds?: string[];
}

export function MessageBubble({
  message,
  isMine,
  showAvatar,
  isFirstOfGroup,
  peerName,
  memberIds = [],
}: Props) {
  const updateMessage = useChatsStore((s) => s.updateMessage);
  const removeMessage = useChatsStore((s) => s.removeMessage);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [decrypted, setDecrypted] = useState<string>(message.content || "");

  useEffect(() => {
    let active = true;
    if (message.content && isEncrypted(message.content) && memberIds.length) {
      decryptText(message.content, message.chat_id, memberIds).then((text) => {
        if (active) {
          setDecrypted(text);
        }
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecrypted(message.content || "");
    }
    return () => {
      active = false;
    };
  }, [message.content, message.chat_id, memberIds]);

  const replyToMessage = useChatsStore((s) =>
    message.reply_to
      ? s.messages[message.chat_id]?.find((m) => m.id === message.reply_to)
      : null
  );

  if (message.type === "system") {
    return (
      <div className="mx-auto my-2 max-w-md">
        <div className="rounded-full bg-card/80 px-3 py-1 text-center text-[11px] text-muted-foreground backdrop-blur">
          {decrypted}
        </div>
      </div>
    );
  }

  if (message.type === "call") {
    return <CallMessage message={message} isMine={isMine} />;
  }

  const startEdit = () => {
    setEditText(decrypted);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      const encrypted = memberIds.length
        ? await encryptText(editText.trim(), message.chat_id, memberIds)
        : editText.trim();
      const updated = await editMessage(message.id, encrypted);
      updateMessage(message.chat_id, message.id, updated);
      setEditing(false);
    } catch {
      toast.error("Не удалось изменить");
    }
  };

  const onDelete = async () => {
    if (!confirm("Удалить сообщение?")) return;
    try {
      await deleteMessage(message.id);
      removeMessage(message.chat_id, message.id);
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  const onCopy = () => {
    if (decrypted) navigator.clipboard.writeText(decrypted);
  };

  const onReply = () => {
    window.dispatchEvent(
      new CustomEvent("impulse:reply", { detail: message })
    );
  };

  const deleted = !!message.deleted_at;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "flex items-end gap-2 px-1",
            isMine ? "flex-row-reverse" : "flex-row",
            isFirstOfGroup ? "mt-2" : "mt-0.5"
          )}
        >
          {!isMine && (
            <div className="w-8 shrink-0">
              {showAvatar && <Avatar name={peerName} seed={message.sender_id} size="xs" />}
            </div>
          )}

          <div
            className={cn(
              "group relative max-w-[78%] sm:max-w-[68%]",
              isMine ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "relative rounded-2xl px-3 py-2 text-sm shadow-sm transition-colors",
                isMine
                  ? "rounded-br-md bg-[var(--chat-bubble-out)] text-[var(--chat-bubble-out-foreground)]"
                  : "rounded-bl-md bg-[var(--chat-bubble-in)] text-[var(--chat-bubble-in-foreground)]",
                deleted && "italic opacity-70"
              )}
            >
              {replyToMessage && !deleted && (
                <div
                  className={cn(
                    "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs",
                    isMine
                      ? "border-white/40 bg-white/10"
                      : "border-primary bg-primary/5"
                  )}
                >
                  <div className={cn("font-medium opacity-80")}>
                    {replyToMessage.sender_id === message.sender_id
                      ? isMine
                        ? "Вы"
                        : peerName || "Пользователь"
                      : peerName || "Пользователь"}
                  </div>
                  <div className="truncate opacity-70">
                    {replyToMessage.deleted_at
                      ? "Сообщение удалено"
                      : replyToMessage.content ||
                        previewType(replyToMessage.type)}
                  </div>
                </div>
              )}

              {deleted ? (
                <span className="flex items-center gap-1.5 italic">
                  <Trash2 className="h-3.5 w-3.5" />
                  Сообщение удалено
                </span>
              ) : (
                <MessageContent message={message} isMine={isMine} decrypted={decrypted} />
              )}

              {!deleted && editing && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full resize-none rounded-lg bg-background/20 p-2 text-sm outline-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-lg bg-background/30 px-3 py-1 text-xs"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "mt-0.5 flex items-center gap-1 text-[10px] opacity-70",
                  isMine ? "justify-end" : "justify-start"
                )}
              >
                {message.edited_at && !deleted && (
                  <Pencil className="h-2.5 w-2.5" />
                )}
                <span>{formatTime(message.created_at)}</span>
                {isMine && !deleted && <StatusTicks status={message.status} />}
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      {!deleted && (
        <ContextMenuContent className="w-44">
          <ContextMenuItem onClick={onReply}>
            <Reply className="mr-2 h-4 w-4" /> Ответить
          </ContextMenuItem>
          {message.type === "text" && decrypted && (
            <ContextMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" /> Копировать
            </ContextMenuItem>
          )}
          {isMine && message.type === "text" && (
            <ContextMenuItem onClick={startEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Изменить
            </ContextMenuItem>
          )}
          {(isMine || true) && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Удалить
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
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

function StatusTicks({ status }: { status: string }) {
  if (status === "sending") return <Clock className="h-3 w-3" />;
  if (status === "sent") return <Check className="h-3 w-3" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3" />;
  if (status === "read")
    return <CheckCheck className="h-3 w-3 text-sky-300" />;
  return null;
}

async function downloadAttachment(url: string, filename?: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "file";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function MessageContent({
  message,
  isMine,
  decrypted,
}: {
  message: Message;
  isMine: boolean;
  decrypted: string;
}) {
  switch (message.type) {
    case "image":
      return message.attachment_url ? (
        <div className="-mx-1 -my-1 overflow-hidden rounded-xl">
          <img
            src={message.attachment_url}
            alt={message.attachment_name || "Фото"}
            className="max-h-80 w-full cursor-pointer object-cover transition-transform hover:scale-[1.02]"
            onClick={() => downloadAttachment(message.attachment_url!, message.attachment_name || "photo.jpg")}
          />
          {decrypted && <div className="px-1 py-1.5">{decrypted}</div>}
        </div>
      ) : null;

    case "video":
      return message.attachment_url ? (
        <div className="-mx-1 -my-1 overflow-hidden rounded-xl">
          <video
            src={message.attachment_url}
            controls
            className="max-h-80 w-full"
            preload="metadata"
          />
          {decrypted && <div className="px-1 py-1.5">{decrypted}</div>}
        </div>
      ) : null;

    case "voice":
      return <VoicePlayer url={message.attachment_url!} duration={message.duration || 0} isMine={isMine} />;

    case "audio":
      return (
        <div className="-mx-1 -my-1">
          <audio src={message.attachment_url!} controls className="w-full" preload="metadata" />
          {decrypted && <div className="px-1 py-1.5">{decrypted}</div>}
        </div>
      );

    case "file":
      return (
        <button
          onClick={() => downloadAttachment(message.attachment_url!, message.attachment_name)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl p-2 transition-colors",
            isMine ? "hover:bg-white/10" : "hover:bg-foreground/5"
          )}
        >
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg",
              isMine ? "bg-white/15" : "bg-primary/10 text-primary"
            )}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-medium">
              {message.attachment_name || "Файл"}
            </div>
            <div className="text-xs opacity-70">
              {message.attachment_size ? formatFileSize(message.attachment_size) : ""}
            </div>
          </div>
          <Download className="h-4 w-4 opacity-70" />
        </button>
      );

    default:
      return (
        <div className="whitespace-pre-wrap break-words">
          {decrypted}
        </div>
      );
  }
}

function VoicePlayer({
  url,
  duration,
  isMine,
}: {
  url: string;
  duration: number;
  isMine: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setTotal(a.duration || duration);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [duration]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const progress = total ? (current / total) * 100 : 0;
  const bars = 28;

  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
          isMine ? "bg-white/20" : "bg-primary text-primary-foreground"
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <div className="flex h-8 items-center gap-0.5">
        {Array.from({ length: bars }).map((_, i) => {
          const active = (i / bars) * 100 <= progress;
          const h = 4 + ((i * 7) % 18);
          return (
            <span
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-colors",
                active
                  ? isMine
                    ? "bg-white"
                    : "bg-primary"
                  : isMine
                    ? "bg-white/30"
                    : "bg-muted-foreground/40"
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
      <span className="text-[11px] tabular-nums opacity-70">
        {formatDuration(playing || current ? current : total)}
      </span>
    </div>
  );
}

function CallMessage({ message, isMine }: { message: Message; isMine: boolean }) {
  const content = message.content || "";
  const isIncoming = content.includes("incoming");
  const missed = content.includes("missed");

  const Icon = missed ? PhoneMissed : isIncoming ? PhoneIncoming : PhoneOutgoing;
  const VideoIcon = message.attachment_mime === "video";

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm",
          missed
            ? "bg-destructive/10 text-destructive"
            : isMine
              ? "bg-[var(--chat-bubble-out)] text-[var(--chat-bubble-out-foreground)]"
              : "bg-[var(--chat-bubble-in)] text-[var(--chat-bubble-in-foreground)]"
        )}
      >
        {VideoIcon ? <Video className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        <span>
          {missed
            ? "Пропущенный звонок"
            : isIncoming
              ? "Входящий звонок"
              : "Исходящий звонок"}
          {message.duration ? ` · ${formatDuration(message.duration)}` : ""}
        </span>
        <span className="ml-1 text-[10px] opacity-70">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
