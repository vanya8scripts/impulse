"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/format";
import { RotateCcw, Timer } from "lucide-react";

interface Card {
  id: number;
  emoji: string;
  matched: boolean;
}

const EMOJIS = ["🚀", "🎮", "⚡", "🎯", "🔥", "💎", "🌟", "🎨"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);

  const init = () => {
    const pairs = shuffle([...EMOJIS, ...EMOJIS]);
    setCards(pairs.map((emoji, i) => ({ id: i, emoji, matched: false })));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTime(0);
    setStarted(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    init();
  }, []);

  useEffect(() => {
    if (!started || matches === EMOJIS.length) return;
    const t = setInterval(() => setTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, matches]);

  const click = (id: number) => {
    if (!started) setStarted(true);
    if (flipped.length === 2) return;
    if (flipped.includes(id)) return;
    if (cards[id].matched) return;
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          setCards((cs) => cs.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c)));
          setFlipped([]);
          setMatches((m) => m + 1);
        }, 500);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  const won = matches === EMOJIS.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
          <Timer className="h-4 w-4" />
          <span className="font-semibold tabular-nums">{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}</span>
        </div>
        <div className="rounded-lg bg-muted px-3 py-1.5">
          <span className="text-muted-foreground">Ходы: </span>
          <span className="font-semibold">{moves}</span>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-1.5">
          <span className="text-primary">Найдено: </span>
          <span className="font-semibold text-primary">{matches}/{EMOJIS.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id) || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => click(card.id)}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-2xl transition-all sm:h-20 sm:w-20",
                isFlipped
                  ? card.matched
                    ? "border-primary bg-primary/10"
                    : "border-primary/40 bg-card"
                  : "border-border bg-muted hover:border-primary/30"
              )}
            >
              {isFlipped ? card.emoji : ""}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {won && (
          <div className="text-sm font-medium text-primary">
            Победа за {moves} ходов!
          </div>
        )}
        <button
          onClick={init}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Заново
        </button>
      </div>
    </div>
  );
}
