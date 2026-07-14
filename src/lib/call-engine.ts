"use client";

import { db } from "@/lib/backend";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

type Signal =
  | { kind: "ready"; from: string }
  | { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { kind: "end"; from: string }
  | { kind: "decline"; from: string };

export interface CallEngineCallbacks {
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onStateChange: (state: RTCPeerConnectionState) => void;
  onError: (err: string) => void;
  onPeerLeft: () => void;
}

export class CallEngine {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callId: string;
  private channel: ReturnType<typeof db.channel> | null = null;
  private meId: string;
  private peerId: string;
  private isCaller: boolean;
  private type: "audio" | "video";
  private callbacks: CallEngineCallbacks;
  private offerCreated = false;
  private disposed = false;
  private readyTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: {
    callId: string;
    meId: string;
    peerId: string;
    isCaller: boolean;
    type: "audio" | "video";
    callbacks: CallEngineCallbacks;
  }) {
    this.callId = opts.callId;
    this.meId = opts.meId;
    this.peerId = opts.peerId;
    this.isCaller = opts.isCaller;
    this.type = opts.type;
    this.callbacks = opts.callbacks;
  }

  async start() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video:
          this.type === "video"
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : false,
      });
      this.callbacks.onLocalStream(this.localStream);
    } catch {
      this.callbacks.onError("Нет доступа к камере или микрофону");
      throw new Error("media-denied");
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc.onconnectionstatechange = () => {
      if (this.pc) this.callbacks.onStateChange(this.pc.connectionState);
    };
    this.pc.ontrack = (e) => {
      const stream = e.streams[0];
      this.callbacks.onRemoteStream(stream);
    };
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.send({ kind: "ice", from: this.meId, to: this.peerId, candidate: e.candidate.toJSON() });
      }
    };

    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    this.channel = db.channel(`impulse-call:${this.callId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, (payload) => {
      const data = payload.payload as Signal;
      if (data.from === this.meId) return;
      this.handleSignal(data);
    });

    return new Promise<void>((resolve) => {
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.send({ kind: "ready", from: this.meId });
          if (this.isCaller) {
            this.readyTimer = setInterval(() => {
              if (this.offerCreated || this.disposed) {
                if (this.readyTimer) {
                  clearInterval(this.readyTimer);
                  this.readyTimer = null;
                }
                return;
              }
              this.send({ kind: "ready", from: this.meId });
            }, 2000);
          }
          resolve();
        }
      });
    });
  }

  private async handleSignal(data: Signal) {
    if (!this.pc) return;
    try {
      if (data.kind === "ready") {
        if (this.isCaller && !this.offerCreated) {
          await this.createAndSendOffer();
        }
      } else if (data.kind === "offer") {
        if (data.to !== this.meId) return;
        await this.pc.setRemoteDescription(data.sdp);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.send({
          kind: "answer",
          from: this.meId,
          to: this.peerId,
          sdp: answer,
        });
      } else if (data.kind === "answer") {
        if (data.to !== this.meId) return;
        if (this.pc.signalingState === "stable") return;
        await this.pc.setRemoteDescription(data.sdp);
      } else if (data.kind === "ice") {
        if (data.to !== this.meId) return;
        if (this.pc.remoteDescription) {
          await this.pc.addIceCandidate(data.candidate);
        }
      } else if (data.kind === "end" || data.kind === "decline") {
        this.callbacks.onPeerLeft();
      }
    } catch {
      
    }
  }

  private async createAndSendOffer() {
    if (!this.pc || this.offerCreated) return;
    this.offerCreated = true;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({
      kind: "offer",
      from: this.meId,
      to: this.peerId,
      sdp: offer,
    });
  }

  private send(signal: Signal) {
    if (!this.channel || this.disposed) return;
    this.channel.send({ type: "broadcast", event: "signal", payload: signal });
  }

  toggleMute(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  toggleCam(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  end() {
    if (this.disposed) return;
    this.send({ kind: "end", from: this.meId });
    this.cleanup();
  }

  decline() {
    if (this.disposed) return;
    this.send({ kind: "decline", from: this.meId });
    this.cleanup();
  }

  cleanup() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.readyTimer) {
      clearInterval(this.readyTimer);
      this.readyTimer = null;
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    if (this.channel) {
      try {
        db.removeChannel(this.channel);
      } catch {
        
      }
      this.channel = null;
    }
  }
}
