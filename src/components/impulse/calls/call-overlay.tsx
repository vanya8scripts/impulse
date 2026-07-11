"use client";

import { useEffect, useRef, useState } from "react";
import { useCallStore } from "@/stores/call-store";
import { useAuthStore } from "@/stores/auth-store";
import { useChatsStore } from "@/stores/chats-store";
import { CallEngine } from "@/lib/call-engine";
import { supabase } from "@/lib/supabase";
import { updateCallStatus, sendMessage } from "@/lib/impulse";
import { Avatar } from "@/components/impulse/avatar";
import { formatDuration } from "@/lib/format";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneIncoming,
  PhoneOutgoing,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

export function CallOverlay() {
  const {
    view,
    type,
    chatId,
    peerId,
    callId,
    micEnabled,
    camEnabled,
    speakerEnabled,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    setView,
    close,
  } = useCallStore();

  const profile = useAuthStore((s) => s.profile);
  const peers = useChatsStore((s) => s.peers);
  const chats = useChatsStore((s) => s.chats);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState(0);
  const engineRef = useRef<CallEngine | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callEndedRef = useRef(false);
  const endCallRef = useRef<(s?: "ended" | "missed") => void>(() => {});

  const peer = peerId ? peers[peerId] : undefined;
  const chat = chats.find((c) => c.id === chatId);
  const visible = view !== "ended";

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (view !== "active") return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [view]);

  useEffect(() => {
    if (view !== "outgoing" || !profile || !callId || !peerId) return;
    callEndedRef.current = false;
    let timeout: ReturnType<typeof setTimeout>;
    const engine = new CallEngine({
      callId,
      meId: profile.id,
      peerId,
      isCaller: true,
      type,
      callbacks: {
        onLocalStream: (s) => {
          setLocalStream(s);
          if (!micEnabled) engine.toggleMute(true);
          if (type === "video" && !camEnabled) engine.toggleCam(false);
        },
        onRemoteStream: (s) => {
          setRemoteStream(s);
          if (!callEndedRef.current) {
            setView("active");
            setDuration(0);
            updateCallStatus(callId, "accepted").catch(() => {});
          }
        },
        onStateChange: (state) => {
          if (state === "disconnected" || state === "failed") {
            // мягко — ждём переподключения
          }
        },
        onError: (err) => toast.error(err),
        onPeerLeft: () => {
          if (!callEndedRef.current) endCallRef.current?.("ended");
        },
      },
    });
    engineRef.current = engine;
    engine.start().catch(() => {
      if (!callEndedRef.current) endCallRef.current?.("ended");
    });

    timeout = setTimeout(() => {
      if (!callEndedRef.current && useCallStore.getState().view === "outgoing") {
        endCallRef.current?.("missed");
      }
    }, 45_000);

    return () => {
      clearTimeout(timeout);
    };
  }, [view, callId, peerId, profile?.id, type]);

  const acceptIncoming = async () => {
    if (!profile || !callId || !peerId) return;
    callEndedRef.current = false;
    const engine = new CallEngine({
      callId,
      meId: profile.id,
      peerId,
      isCaller: false,
      type,
      callbacks: {
        onLocalStream: (s) => {
          setLocalStream(s);
          if (!micEnabled) engine.toggleMute(true);
          if (type === "video" && !camEnabled) engine.toggleCam(false);
        },
        onRemoteStream: (s) => {
          setRemoteStream(s);
          if (!callEndedRef.current) {
            setView("active");
            setDuration(0);
            updateCallStatus(callId, "accepted").catch(() => {});
          }
        },
        onStateChange: () => {},
        onError: (err) => toast.error(err),
        onPeerLeft: () => {
          if (!callEndedRef.current) endCallRef.current?.("ended");
        },
      },
    });
    engineRef.current = engine;
    try {
      await engine.start();
    } catch {
      endCallRef.current?.("ended");
    }
  };

  const endCall = async (status: "ended" | "missed" = "ended") => {
    if (callEndedRef.current) {
      engineRef.current?.cleanup();
      engineRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      close();
      return;
    }
    callEndedRef.current = true;
    const cid = callId;
    engineRef.current?.end();
    engineRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    if (cid) {
      try {
        await updateCallStatus(cid, status);
      } catch {
        /* noop */
      }
      if (chatId && profile) {
        try {
          const secs = duration;
          await sendMessage({
            chatId,
            senderId: profile.id,
            type: "call",
            content: status === "missed" ? "missed" : "ended",
            attachmentMime: type,
            duration: status === "missed" ? null : secs || null,
          });
        } catch {
          /* noop */
        }
      }
    }
    close();
  };
  useEffect(() => {
    endCallRef.current = endCall;
  });

  const declineCall = async () => {
    callEndedRef.current = true;
    const cid = callId;
    engineRef.current?.decline();
    engineRef.current = null;
    if (cid) {
      try {
        await updateCallStatus(cid, "declined");
      } catch {
        /* noop */
      }
      if (chatId && profile) {
        try {
          await sendMessage({
            chatId,
            senderId: profile.id,
            type: "call",
            content: "declined",
            attachmentMime: type,
          });
        } catch {
          /* noop */
        }
      }
    }
    close();
  };

  const onToggleMic = () => {
    toggleMic();
    engineRef.current?.toggleMute(micEnabled);
  };
  const onToggleCam = () => {
    toggleCam();
    engineRef.current?.toggleCam(!camEnabled);
  };

  useEffect(() => {
    return () => {
      engineRef.current?.cleanup();
      engineRef.current = null;
    };
  }, []);

  if (!visible) return null;

  const isVideoActive = type === "video" && view === "active" && remoteStream;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-fade">
      {isVideoActive && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-6 p-6 ${
          isVideoActive ? "bg-black/40" : ""
        }`}
      >
        {!isVideoActive && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <Avatar
                profile={peer}
                name={peer?.display_name}
                seed={peerId}
                size="xl"
                className={view === "outgoing" || view === "incoming" ? "animate-pulse-ring" : ""}
              />
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-foreground">
                {peer?.display_name || "Пользователь"}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                {view === "outgoing" && (
                  <>
                    <PhoneOutgoing className="h-3.5 w-3.5" />
                    Вызов…
                  </>
                )}
                {view === "incoming" && (
                  <>
                    <PhoneIncoming className="h-3.5 w-3.5" />
                    {type === "video" ? "Видеозвонок" : "Звонок"}
                  </>
                )}
                {view === "active" && (
                  <span className="tabular-nums">{formatDuration(duration)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {isVideoActive && (
          <div className="relative z-10 flex w-full items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur">
              <span className="font-medium">{peer?.display_name}</span>
              <span className="text-white/70">·</span>
              <span className="tabular-nums text-white/80">{formatDuration(duration)}</span>
            </div>
          </div>
        )}
      </div>

      {type === "video" && view === "active" && localStream && (
        <div className="absolute bottom-28 right-4 z-20 h-44 w-32 overflow-hidden rounded-2xl border border-white/20 bg-black shadow-xl sm:h-56 sm:w-40">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
          />
        </div>
      )}

      <div className="relative z-20 flex items-center justify-center gap-3 p-6 pb-10">
        {view === "incoming" && (
          <>
            <CallButton
              onClick={declineCall}
              variant="danger"
              icon={<PhoneOff className="h-6 w-6" />}
              label="Отклонить"
            />
            <CallButton
              onClick={acceptIncoming}
              variant="success"
              icon={<Phone className="h-6 w-6" />}
              label="Принять"
            />
          </>
        )}

        {view === "outgoing" && (
          <CallButton
            onClick={() => endCall("ended")}
            variant="danger"
            icon={<PhoneOff className="h-6 w-6" />}
            label="Отмена"
          />
        )}

        {view === "active" && (
          <>
            <CallButton
              onClick={onToggleMic}
              variant={micEnabled ? "neutral" : "active"}
              icon={micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            />
            {type === "video" && (
              <CallButton
                onClick={onToggleCam}
                variant={camEnabled ? "neutral" : "active"}
                icon={camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              />
            )}
            <CallButton
              onClick={toggleSpeaker}
              variant={speakerEnabled ? "neutral" : "active"}
              icon={speakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            />
            <CallButton
              onClick={() => endCall("ended")}
              variant="danger"
              icon={<PhoneOff className="h-6 w-6" />}
              label="Завершить"
            />
          </>
        )}
      </div>
    </div>
  );
}

function CallButton({
  onClick,
  icon,
  label,
  variant = "neutral",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  variant?: "neutral" | "danger" | "success" | "active";
}) {
  const styles = {
    neutral: "bg-white/15 text-white hover:bg-white/25",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    active: "bg-white text-black hover:bg-white/90",
  };
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${styles[variant]}`}
      >
        {icon}
      </span>
      {label && <span className="text-xs text-white/80">{label}</span>}
    </button>
  );
}
