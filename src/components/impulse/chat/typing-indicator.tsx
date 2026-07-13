"use client";

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-[var(--chat-bubble-in)] px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground" />
        <span
          className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-muted-foreground"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
      {name && <span className="text-xs text-muted-foreground">{name} печатает</span>}
    </div>
  );
}
