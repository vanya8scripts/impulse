"use client";

import { Menu, Lock, MessageCircle, Phone, Image as ImageIcon, Mic, ShieldCheck } from "lucide-react";

export function EmptyChatState({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center chat-wallpaper">
      <button
        onClick={onOpenSidebar}
        className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card/80 text-foreground shadow-sm backdrop-blur md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div>
          <h2 className="text-2xl font-semibold">Добро пожаловать в Импульс</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Выбери чат слева или найди друга по юзернейму, чтобы начать общение
          </p>
        </div>

        <div className="mt-2 grid w-full max-w-md grid-cols-2 gap-3">
          <Feature icon={MessageCircle} title="Мгновенно" text="Сообщения в реальном времени" />
          <Feature icon={Phone} title="Звонки" text="Аудио и видео в HD" />
          <Feature icon={ImageIcon} title="Файлы" text="Фото, видео, документы" />
          <Feature icon={Mic} title="Голосовые" text="Записывай и отправляй" />
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Сообщения шифруются и защищены RLS
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 text-left backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}
