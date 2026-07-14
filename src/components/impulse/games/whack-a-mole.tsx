"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/format";
import { RotateCcw, Timer, Zap } from "lucide-react";

export function WhackAMole() {
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false));
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [best, setBest] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setScore(0);
    setTime(30);
    setPlaying(true);
    setMoles(Array(9).fill(false));
  };

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          setPlaying(false);
          if (moleRef.current) clearInterval(moleRef.current);
          setBest((b) => Math.max(b, score));
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    moleRef.current = setInterval(() => {
      setMoles((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * 9);
        next[idx] = !next[idx];
        if (Math.random() > 0.6) {
          const idx2 = Math.floor(Math.random() * 9);
          next[idx2] = true;
        }
        return next;
      });
    }, 700);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (moleRef.current) clearInterval(moleRef.current);
    };
  }, [playing]);

  useEffect(() => {
    if (!playing && time === 0) {
      
      setBest((b) => Math.max(b, score));
    }
  }, [playing, time, score]);

  const hit = (i: number) => {
    if (!playing || !moles[i]) return;
    setMoles((prev) => {
      const next = [...prev];
      next[i] = false;
      return next;
    });
    setScore((s) => s + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 text-sm">
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-bold">{score}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
          <Timer className="h-4 w-4" />
          <span className="font-bold tabular-nums">{time}с</span>
        </div>
        <div className="rounded-lg bg-yellow-500/10 px-3 py-1.5">
          <span className="text-yellow-600">Рекорд: </span>
          <span className="font-bold text-yellow-600">{best}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {moles.map((active, i) => (
          <button
            key={i}
            onClick={() => hit(i)}
            disabled={!playing}
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-4xl transition-all sm:h-24 sm:w-24",
              active
                ? "border-primary bg-gradient-to-br from-violet-500 to-fuchsia-500 scale-105"
                : "border-border bg-muted/50",
              !playing && "cursor-default"
            )}
          >
            {active ? "🐹" : ""}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {!playing ? (
          <button
            onClick={start}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            {time === 0 ? <RotateCcw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {time === 0 ? "Ещё раз" : "Старт"}
          </button>
        ) : (
          <div className="text-sm text-muted-foreground">Лупи кротов!</div>
        )}
      </div>
    </div>
  );
}
