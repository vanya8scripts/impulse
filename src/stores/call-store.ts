"use client";

import { create } from "zustand";
import type { CallType } from "@/types/db";

export type CallView = "incoming" | "outgoing" | "active" | "ended";

interface CallState {
  callId: string | null;
  chatId: string | null;
  peerId: string | null;
  type: CallType;
  view: CallView;
  micEnabled: boolean;
  camEnabled: boolean;
  speakerEnabled: boolean;
  startedAt: number | null;
  error: string | null;

  openOutgoing: (chatId: string, peerId: string, type: CallType, callId: string) => void;
  openIncoming: (chatId: string, peerId: string, type: CallType, callId: string) => void;
  setView: (v: CallView) => void;
  setCallId: (id: string | null) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleSpeaker: () => void;
  setError: (e: string | null) => void;
  close: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  callId: null,
  chatId: null,
  peerId: null,
  type: "audio",
  view: "ended",
  micEnabled: true,
  camEnabled: false,
  speakerEnabled: true,
  startedAt: null,
  error: null,

  openOutgoing: (chatId, peerId, type, callId) =>
    set({
      chatId,
      peerId,
      type,
      callId,
      view: "outgoing",
      micEnabled: true,
      camEnabled: type === "video",
      speakerEnabled: true,
      startedAt: null,
      error: null,
    }),
  openIncoming: (chatId, peerId, type, callId) =>
    set({
      chatId,
      peerId,
      type,
      callId,
      view: "incoming",
      micEnabled: true,
      camEnabled: type === "video",
      speakerEnabled: true,
      startedAt: null,
      error: null,
    }),
  setView: (view) =>
    set((s) => ({
      view,
      startedAt: view === "active" && !s.startedAt ? Date.now() : s.startedAt,
    })),
  setCallId: (callId) => set({ callId }),
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  toggleCam: () => set((s) => ({ camEnabled: !s.camEnabled })),
  toggleSpeaker: () => set((s) => ({ speakerEnabled: !s.speakerEnabled })),
  setError: (error) => set({ error }),
  close: () =>
    set({
      callId: null,
      chatId: null,
      peerId: null,
      view: "ended",
      startedAt: null,
      error: null,
    }),
}));
