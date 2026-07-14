"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TicTacToe } from "@/components/impulse/games/tic-tac-toe";
import { MemoryGame } from "@/components/impulse/games/memory";
import { GuessNumber } from "@/components/impulse/games/guess-number";
import { Gamepad2, Grid3x3, Brain, Hash } from "lucide-react";
import { cn } from "@/lib/format";

type GameId = "tictactoe" | "memory" | "guess";

const GAMES: { id: GameId; name: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: "tictactoe", name: "Крестики-нолики", desc: "Сразись с ИИ", icon: Grid3x3, color: "from-violet-500 to-fuchsia-500" },
  { id: "memory", name: "Найди пару", desc: "Тренируй память", icon: Brain, color: "from-blue-500 to-cyan-500" },
  { id: "guess", name: "Угадай число", desc: "1 до 100", icon: Hash, color: "from-emerald-500 to-teal-500" },
];

export function GamesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [active, setActive] = useState<GameId | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 max-h-[90vh]">
        <DialogTitle className="sr-only">Игры</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Игровой уголок</h2>
        </div>

        <div className="p-4 overflow-y-auto scrollbar-thin">
          {!active ? (
            <div className="grid grid-cols-1 gap-2">
              {GAMES.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActive(g.id)}
                    className="flex items-center gap-3 rounded-2xl border-2 border-border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/50"
                  >
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white", g.color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">{g.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setActive(null)}
                className="mb-4 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ← Назад к играм
              </button>
              {active === "tictactoe" && <TicTacToe />}
              {active === "memory" && <MemoryGame />}
              {active === "guess" && <GuessNumber />}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
