"use client";

import { useState } from "react";
import { Copy, Check, Database, KeyRound, Rocket, Terminal } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "1. Создай бэкенд",
    body: "Перейди на сайт платформы баз данных, залогинься и создай новый проект. Подожди 1–2 минуты, пока подготовится база.",
  },
  {
    icon: KeyRound,
    title: "2. Отключи подтверждение email",
    body: "В настройках аутентификации (Authentication → Providers → Email) выключи тумблер Confirm email. Импульс использует локальные юзернеймы, письмо не нужно.",
  },
  {
    icon: Terminal,
    title: "3. Выполни SQL-схему",
    body: "Открой SQL Editor, вставь содержимое файла sql/setup.sql из репозитория и нажми Run. Создадутся таблицы, политики безопасности и хранилище.",
  },
  {
    icon: KeyRound,
    title: "4. Впиши ключи в проект",
    body: "Скопируй Project URL и anon public key (Project Settings → API). Создай файл .env.local и впиши переменные NEXT_PUBLIC_DB_URL и NEXT_PUBLIC_DB_KEY.",
  },
  {
    icon: Rocket,
    title: "5. Перезапусти и пользуйся",
    body: "После сохранения .env.local обнови страницу — откроется экран регистрации. Готово к деплою на GitHub Pages (см. README).",
  },
];

export function SetupScreen() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Добро пожаловать в Импульс</h1>
          <p className="mt-2 text-muted-foreground">
            Чтобы запустить мессенджер, подключи бесплатный бэкенд. Это займёт ~5 минут.
          </p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Шаблон .env.local</h3>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-xl bg-muted/70 p-4 text-xs leading-relaxed">
                <code>{`NEXT_PUBLIC_DB_URL=https://ваш-проект.db.co
NEXT_PUBLIC_DB_KEY=ваш-anon-public-key`}</code>
              </pre>
              <button
                onClick={() =>
                  copy(
                    `NEXT_PUBLIC_DB_URL=https://ваш-проект.db.co\nNEXT_PUBLIC_DB_KEY=ваш-anon-public-key`,
                    "env"
                  )
                }
                className="absolute right-2 top-2 rounded-lg bg-background/80 p-2 text-muted-foreground hover:text-foreground"
              >
                {copied === "env" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ключи берём в Dashboard → Project Settings → API.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <h3 className="font-medium text-foreground">После настройки</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Сохрани <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code> и
              перезагрузи страницу. Появится экран регистрации.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
