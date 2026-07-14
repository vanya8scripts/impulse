"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMOJI_CATEGORIES, loadRecent, saveRecent } from "@/components/impulse/chat/emoji-data";
import { Smile } from "lucide-react";
import { cn } from "@/lib/format";

export function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState("smileys");
  const [recent, setRecent] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    
    setRecent(loadRecent());
  }, [open]);

  const list = useMemo(() => {
    if (search.trim()) {
      const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
      return Array.from(new Set(all));
    }
    if (activeCat === "recent") return recent;
    return EMOJI_CATEGORIES.find((c) => c.id === activeCat)?.emojis || [];
  }, [activeCat, recent, search]);

  const pick = (e: string) => {
    onPick(e);
    saveRecent(e);
    setRecent(loadRecent());
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          title="Эмодзи"
        >
          <Smile className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[340px] gap-0 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-emoji-btn]")) {
            e.preventDefault();
          }
        }}
      >
        <div className="border-b border-border p-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск эмодзи"
            className="h-9 w-full rounded-lg bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex">
          <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2">
            {recent.length > 0 && (
              <button
                onClick={() => setActiveCat("recent")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-lg",
                  activeCat === "recent" ? "bg-primary/15" : "hover:bg-accent"
                )}
                title="Недавние"
              >
                ⏱️
              </button>
            )}
            {EMOJI_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-lg",
                  activeCat === c.id ? "bg-primary/15" : "hover:bg-accent"
                )}
                title={c.name}
              >
                {c.emojis[0]}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <div className="grid max-h-[260px] grid-cols-7 gap-0.5 overflow-y-auto scrollbar-thin p-2">
              {list.length === 0 ? (
                <div className="col-span-7 py-8 text-center text-xs text-muted-foreground">
                  {search ? "Ничего не найдено" : "Пусто"}
                </div>
              ) : (
                list.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    data-emoji-btn
                    onPointerDown={(ev) => ev.preventDefault()}
                    onClick={() => pick(e)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-accent"
                  >
                    {e}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
