"use client";

import { useState } from "react";
import { Copy, Check, Database, KeyRound, Rocket, Terminal } from "lucide-react";

const STEPS = [
  {
    icon: Database,
    title: "1. Создай проект Supabase",
    body: "Перейди на supabase.com, залогинься через GitHub и создай новый проект. Подожди 1–2 минуты, пока подготовится база.",
  },
  {
    icon: KeyRound,
    title: "2. Отключи подтверждение email",
    body: "В Supabase: Authentication → Providers → Email. Выключи тумблер «Confirm email». Импульс использует локальные юзернеймы, поэтому письмо не нужно.",
  },
  {
    icon: Terminal,
    title: "3. Выполни SQL-схему",
    body: "Открой SQL Editor в Supabase, вставь содержимое файла sql/schema.sql из репозитория и нажми Run. Создадутся таблицы, политики безопасности и storage-бакеты.",
  },
  {
    icon: KeyRound,
    title: "4. Впиши ключи в проект",
    body: "Скопируй Project URL и anon public key (Project Settings → API). Создай файл .env.local и впиши переменные NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.",
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-primary/40">
            <svg viewBox="0 0 64 64" className="h-9 w-9" fill="none">
              <path d="M34 12C34 11 33 10 32 11L31 12C22 21 18 27 18 35C18 43 24 50 32 50C40 50 46 43 46 35C46 29 42 24 38 20L37 22C40 25 42 29 42 35C42 41 38 46 32 46C26 46 22 41 22 35C22 29 25 24 32 18L33 17C33.5 16.5 34 16 34 15V12Z" fill="white"/>
              <circle cx="32" cy="35" r="6" fill="white"/>
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Добро пожаловать в Импульс</h1>
          <p className="mt-2 text-muted-foreground">
            Чтобы запустить мессенджер, подключи бесплатный Supabase-бэкенд. Это займёт ~5 минут.
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
                <code>{`NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-public-key`}</code>
              </pre>
              <button
                onClick={() =>
                  copy(
                    `NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-public-key`,
                    "env"
                  )
                }
                className="absolute right-2 top-2 rounded-lg bg-background/80 p-2 text-muted-foreground hover:text-foreground"
              >
                {copied === "env" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Ключи берём в Supabase Dashboard → Project Settings → API.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <h3 className="font-medium text-foreground">После настройки</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Сохрани <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code> и
              перезагрузи страницу. Появится экран регистрации. Полный туториал по деплою
              на GitHub Pages — в файле <code className="rounded bg-muted px-1.5 py-0.5 text-xs">README.md</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
