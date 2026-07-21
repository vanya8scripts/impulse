"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { Trophy, RotateCcw, X, Circle } from "lucide-react";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type Cell = "X" | "O" | null;

function calcWinner(squares: Cell[]): Cell | null {
  for (const [a, b, c] of LINES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function minimax(squares: Cell[], depth: number, isMaximizing: boolean): number {
  const winner = calcWinner(squares);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (squares.every(Boolean)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = "O";
        best = Math.max(best, minimax(squares, depth + 1, false));
        squares[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!squares[i]) {
        squares[i] = "X";
        best = Math.min(best, minimax(squares, depth + 1, true));
        squares[i] = null;
      }
    }
    return best;
  }
}

function bestMove(squares: Cell[]): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (!squares[i]) {
      squares[i] = "O";
      const score = minimax(squares, 0, false);
      squares[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export function TicTacToe() {
  const [squares, setSquares] = useState<Cell[]>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [scores, setScores] = useState({ x: 0, o: 0, draw: 0 });
  const [locked, setLocked] = useState(false);

  const winner = calcWinner(squares);
  const isDraw = !winner && squares.every(Boolean);
  const winningLine = winner ? LINES.find(([a, b, c]) => squares[a] === winner && squares[b] === winner && squares[c] === winner) : null;

  const click = (i: number) => {
    if (squares[i] || winner || locked || !xTurn) return;
    const next = [...squares];
    next[i] = "X";
    setSquares(next);
    setXTurn(false);
    setLocked(true);

    const w = calcWinner(next);
    if (w) {
      setScores((s) => ({ ...s, x: s.x + 1 }));
      setLocked(false);
      return;
    }
    if (next.every(Boolean)) {
      setScores((s) => ({ ...s, draw: s.draw + 1 }));
      setLocked(false);
      return;
    }

    setTimeout(() => {
      const move = bestMove([...next]);
      if (move >= 0) {
        const after = [...next];
        after[move] = "O";
        setSquares(after);
        const w2 = calcWinner(after);
        if (w2) {
          setScores((s) => ({ ...s, o: s.o + 1 }));
        } else if (after.every(Boolean)) {
          setScores((s) => ({ ...s, draw: s.draw + 1 }));
        }
      }
      setXTurn(true);
      setLocked(false);
    }, 350);
  };

  const reset = () => {
    setSquares(Array(9).fill(null));
    setXTurn(true);
    setLocked(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 text-sm">
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
          <X className="h-4 w-4 text-primary" />
          <span className="font-semibold">{scores.x}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
          <span>=</span>
          <span className="font-semibold">{scores.draw}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5">
          <Circle className="h-4 w-4 text-destructive" />
          <span className="font-semibold">{scores.o}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {squares.map((sq, i) => {
          const isWinning = winningLine?.includes(i);
          return (
            <button
              key={i}
              onClick={() => click(i)}
              disabled={!!sq || !!winner || locked}
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl border-2 text-3xl font-bold transition-all sm:h-24 sm:w-24",
                sq === "X" && "border-primary/30 bg-primary/5 text-primary",
                sq === "O" && "border-destructive/30 bg-destructive/5 text-destructive",
                !sq && "border-border hover:border-primary/40 hover:bg-accent",
                isWinning && "ring-2 ring-yellow-400 bg-yellow-400/10"
              )}
            >
              {sq === "X" && <X className="h-8 w-8" />}
              {sq === "O" && <Circle className="h-8 w-8" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {winner ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {winner === "X" ? "Вы победили!" : "ИИ победил"}
          </div>
        ) : isDraw ? (
          <div className="text-sm font-medium text-muted-foreground">Ничья!</div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {locked ? "ИИ думает…" : "Ваш ход (X)"}
          </div>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Заново
        </button>
      </div>
    </div>
  );
}
