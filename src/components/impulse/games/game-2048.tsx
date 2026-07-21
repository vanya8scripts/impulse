"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/format";
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

type Grid = number[][];

function emptyGrid(): Grid {
  return Array(4).fill(null).map(() => Array(4).fill(0));
}

function addRandom(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(row: number[]): [number[], number] {
  const filtered = row.filter((n) => n !== 0);
  let gained = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2;
      gained += filtered[i];
      filtered.splice(i + 1, 1);
    }
  }
  while (filtered.length < 4) filtered.push(0);
  return [filtered, gained];
}

function rotate(grid: Grid): Grid {
  const n = 4;
  const result = emptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = grid[r][c];
    }
  }
  return result;
}

function move(grid: Grid, dir: "left" | "right" | "up" | "down"): [Grid, number, boolean] {
  let g = grid.map((row) => [...row]);
  const rotations = { left: 0, up: 1, right: 2, down: 3 }[dir];
  for (let i = 0; i < rotations; i++) g = rotate(g);
  let gained = 0;
  for (let r = 0; r < 4; r++) {
    const [newRow, points] = slide(g[r]);
    g[r] = newRow;
    gained += points;
  }
  for (let i = 0; i < (4 - rotations) % 4; i++) g = rotate(g);
  const changed = JSON.stringify(g) !== JSON.stringify(grid);
  return [g, gained, changed];
}

const TILE_COLORS: Record<number, string> = {
  0: "bg-muted/30",
  2: "bg-violet-100 text-violet-900",
  4: "bg-violet-200 text-violet-900",
  8: "bg-violet-300 text-white",
  16: "bg-violet-400 text-white",
  32: "bg-violet-500 text-white",
  64: "bg-violet-600 text-white",
  128: "bg-fuchsia-500 text-white",
  256: "bg-fuchsia-600 text-white",
  512: "bg-fuchsia-700 text-white",
  1024: "bg-fuchsia-800 text-white",
  2048: "bg-yellow-500 text-white",
};

export function Game2048() {
  const [grid, setGrid] = useState<Grid>(() => addRandom(addRandom(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (over) return;
    setGrid((prev) => {
      const [next, gained, changed] = move(prev, dir);
      if (!changed) return prev;
      const withRandom = addRandom(next);
      setScore((s) => {
        const ns = s + gained;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
      if (!won && withRandom.some((row) => row.includes(2048))) setWon(true);
      const canMove = ["left", "right", "up", "down"].some((d) => {
        const [, , c] = move(withRandom, d as "left");
        return c;
      });
      if (!canMove) setOver(true);
      return withRandom;
    });
  }, [over, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        doMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  const reset = () => {
    setGrid(addRandom(addRandom(emptyGrid())));
    setScore(0);
    setOver(false);
    setWon(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) doMove(dx > 0 ? "right" : "left");
    } else {
      if (Math.abs(dy) > 30) doMove(dy > 0 ? "down" : "up");
    }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3 text-sm">
        <div className="rounded-lg bg-muted px-3 py-1.5">
          <span className="text-muted-foreground">Счёт: </span>
          <span className="font-bold">{score}</span>
        </div>
        <div className="rounded-lg bg-primary/10 px-3 py-1.5">
          <span className="text-primary">Рекорд: </span>
          <span className="font-bold text-primary">{best}</span>
        </div>
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative grid grid-cols-4 gap-2 rounded-2xl bg-muted/50 p-2"
      >
        {grid.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-xl text-lg font-bold transition-all sm:h-18 sm:w-18",
                TILE_COLORS[val] || "bg-violet-900 text-white"
              )}
            >
              {val !== 0 && val}
            </div>
          ))
        )}
        {(over || won) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/80 backdrop-blur">
            <div className="text-xl font-bold">
              {won ? "Победа! 2048!" : "Игра окончена"}
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Заново
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 sm:hidden">
        <button onClick={() => doMove("up")} className="rounded-lg bg-muted p-2"><ArrowUp className="h-5 w-5" /></button>
        <div className="flex gap-1">
          <button onClick={() => doMove("left")} className="rounded-lg bg-muted p-2"><ArrowLeft className="h-5 w-5" /></button>
          <button onClick={() => doMove("down")} className="rounded-lg bg-muted p-2"><ArrowDown className="h-5 w-5" /></button>
          <button onClick={() => doMove("right")} className="rounded-lg bg-muted p-2"><ArrowRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-muted-foreground">Стрелки или свайпы</div>
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
