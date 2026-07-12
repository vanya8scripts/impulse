# Импульс

Мессенджер на Next.js и Supabase. Сообщения в реальном времени с шифрованием, звонки, файлы, голосовые, каналы, группы, темы оформления, админ-панель.

## Возможности

- Регистрация по юзернейму и паролю, аватарка из фото
- Личные чаты, каналы и группы
- Сообщения шифруются (AES-GCM 256)
- Текст, эмодзи, ответы, редактирование, удаление
- Статусы: отправлено, доставлено, прочитано
- Фото, видео, аудио, документы (скачиваются напрямую), голосовые
- Индикатор печати, онлайн и был в сети
- Аудио и видеозвонки через WebRTC
- Поиск людей по юзернейму
- 5 акцентных тем, светлый и тёмный режим
- Верификация пользователей (галочка)
- Админ-панель: блокировка, мьют, верификация
- Приватность: кто может писать и звонить
- Смена пароля с подтверждением текущего, управление сессиями
- Официальный канал Импульс при регистрации
- Адаптивный интерфейс

## Стек

Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase (Auth, Postgres, Realtime, Storage), Zustand, WebRTC, Web Crypto API.

## Локальный запуск

1. Создай проект на supabase.com
2. В Supabase открой Authentication, Providers, Email. Выключи Confirm email
3. Открой SQL Editor и выполни по очереди:
   - sql/schema.sql
   - sql/fix-recursion.sql
   - sql/fix-create-chat.sql
   - sql/migration-v2.sql
4. Скопируй Project URL и anon key из Project Settings, API
5. Создай файл .env.local:

```
NEXT_PUBLIC_SUPABASE_URL=https://твой-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой-anon-key
```

6. Установи зависимости и запусти:

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

## Структура

- sql — схема базы данных и миграции
- src/app — точка входа Next.js
- src/components/impulse — компоненты мессенджера
- src/lib — клиент Supabase, сервисы, WebRTC движок, шифрование
- src/stores — состояние Zustand
- src/types — типы

## Лицензия

Свободно для личного использования.
