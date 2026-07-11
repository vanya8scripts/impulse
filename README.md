# Импульс

Мессенджер на Next.js и Supabase. Сообщения в реальном времени, звонки, файлы, голосовые, темы оформления.

## Возможности

- Регистрация по юзернейму и паролю, аватарка из фото
- Личные чаты, сообщения в реальном времени
- Текст, эмодзи, ответы, редактирование, удаление
- Статусы: отправлено, доставлено, прочитано
- Фото, видео, аудио, документы, голосовые сообщения
- Индикатор печати, онлайн и был в сети
- Аудио и видеозвонки через WebRTC
- Поиск людей по юзернейму
- 5 акцентных тем, светлый и тёмный режим
- Закрепление, mute, удаление чатов
- Адаптивный интерфейс

## Стек

Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase (Auth, Postgres, Realtime, Storage), Zustand, WebRTC.

## Локальный запуск

1. Создай проект на supabase.com
2. В Supabase открой Authentication, Providers, Email. Выключи Confirm email
3. Открой SQL Editor, вставь содержимое sql/schema.sql и выполни
4. Затем выполни sql/fix-recursion.sql и sql/fix-create-chat.sql
5. Скопируй Project URL и anon key из Project Settings, API
6. Создай файл .env.local:

```
NEXT_PUBLIC_SUPABASE_URL=https://твой-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой-anon-key
```

7. Установи зависимости и запусти:

```bash
bun install
bun run dev
```

## Деплой на GitHub Pages

1. Запушь проект в репозиторий GitHub
2. В Settings, Secrets and variables, Actions добавь секреты:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
3. В Settings, Pages выбери Source: GitHub Actions
4. Любой коммит в main запустит деплой автоматически

Сайт будет доступен по адресу https://ИМЯ.github.io/impulse/

## Структура

- sql — схема базы данных и фиксы RLS
- src/app — точка входа Next.js
- src/components/impulse — компоненты мессенджера
- src/lib — клиент Supabase, сервисы, WebRTC движок
- src/stores — состояние Zustand
- src/types — типы

## Лицензия

Свободно для личного использования.
