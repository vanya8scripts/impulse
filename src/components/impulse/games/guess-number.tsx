"use client";

import { useState } from "react";
import { RotateCcw, Dice5, Trophy } from "lucide-react";
import { cn } from "@/lib/format";

export function GuessNumber() {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<{ val: number; result: string }[]>([]);
  const [won, setWon] = useState(false);

  const submit = () => {
    const n = parseInt(guess);
    if (isNaN(n) || n < 1 || n > 100) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    let result = "";
    if (n === target) {
      result = "Верно!";
      setWon(true);
    } else if (n < target) {
      result = "Больше";
    } else {
      result = "Меньше";
    }
    setHistory((h) => [{ val: n, result }, ...h]);
    setGuess("");
  };

  const reset = () => {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setGuess("");
    setAttempts(0);
    setHistory([]);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 py-4 text-white text-center">
        <Dice5 className="mx-auto mb-1 h-6 w-6" />
        <div className="text-sm">Угадай число от 1 до 100</div>
      </div>

      {won ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Trophy className="h-5 w-5" />
            Победа за {attempts} попыток!
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Новая игра
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="1-100"
              className="h-12 w-28 rounded-xl border border-input bg-background px-3 text-center text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              autoFocus
            />
            <button
              onClick={submit}
              disabled={!guess}
              className="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Проверить
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            Попыток: {attempts}
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="w-full max-w-xs space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">История</div>
          {history.map((h, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm",
                h.result === "Верно!" ? "bg-primary/10 text-primary font-medium" : "bg-muted"
              )}
            >
              <span>{h.val}</span>
              <span>{h.result}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
