-- Импульс — схема базы данных Supabase
-- Выполните весь этот файл в Supabase SQL Editor (Dashboard → SQL → New query)

-- =========================================================
-- 1. Расширения
-- =========================================================
create extension if not exists "pgcrypto";

-- =========================================================
-- 2. Таблица профилей
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) >= 3 and char_length(username) <= 20 and username ~ '^[a-zA-Z0-9_]+$'),
  display_name text not null check (char_length(display_name) >= 1 and char_length(display_name) <= 40),
  bio text default '',
  avatar_url text,
  theme text not null default 'violet' check (theme in ('violet','aurora','midnight','rose','emerald')),
  color_mode text not null default 'dark' check (color_mode in ('light','dark')),
  chat_wallpaper text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (lower(username));

-- =========================================================
-- 3. Чаты и участники
-- =========================================================
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  title text,
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  muted boolean not null default false,
  pinned boolean not null default false,
  last_read_message_id uuid,
  primary key (chat_id, user_id)
);

create index if not exists chat_members_user_idx on public.chat_members (user_id);
create index if not exists chat_members_chat_idx on public.chat_members (chat_id);

-- =========================================================
-- 4. Сообщения
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  type text not null default 'text' check (type in ('text','image','video','audio','file','voice','system','call')),
  attachment_url text,
  attachment_name text,
  attachment_size bigint,
  attachment_mime text,
  duration int,
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  status text not null default 'sent' check (status in ('sending','sent','delivered','read'))
);

create index if not exists messages_chat_idx on public.messages (chat_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id);

-- =========================================================
-- 5. Звонки
-- =========================================================
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','declined','ended','missed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists calls_chat_idx on public.calls (chat_id);

-- =========================================================
-- 6. Realtime: публикации
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.chat_members;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.calls;

-- =========================================================
-- 7. Триггер: авто-создание профиля при регистрации
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(replace(new.id::text, '-', ''), 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Пользователь')
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 8. Триггер: обновление last_message_at в чате
-- =========================================================
create or replace function public.touch_chat_last_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.chats set last_message_at = new.created_at where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute procedure public.touch_chat_last_message();

-- =========================================================
-- 9. Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;

-- Вспомогательная функция: проверяет членство пользователя в чате.
-- security definer — выполняется с правами владельца, обходит RLS,
-- чтобы избежать бесконечной рекурсии политик на chat_members.
create or replace function public.is_chat_member(chat_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.chat_members m
    where m.chat_id = chat_uuid and m.user_id = auth.uid()
  );
$$;

-- Профили: читать могут все авторизованные (нужно для поиска), редактировать — владелец
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- Чаты: видны участникам (через функцию, без рекурсии)
drop policy if exists "chats_select_member" on public.chats;
create policy "chats_select_member" on public.chats
  for select to authenticated
  using (public.is_chat_member(id));

drop policy if exists "chats_insert_creator" on public.chats;
create policy "chats_insert_creator" on public.chats
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "chats_update_member" on public.chats;
create policy "chats_update_member" on public.chats
  for update to authenticated
  using (public.is_chat_member(id));

-- Участники чата
drop policy if exists "members_select_self_or_peer" on public.chat_members;
create policy "members_select_self_or_peer" on public.chat_members
  for select to authenticated
  using (
    user_id = auth.uid() or public.is_chat_member(chat_id)
  );

drop policy if exists "members_insert_self" on public.chat_members;
create policy "members_insert_self" on public.chat_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.chats c
      where c.id = chat_id and c.created_by = auth.uid()
    )
  );

drop policy if exists "members_update_self" on public.chat_members;
create policy "members_update_self" on public.chat_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "members_delete_self_or_owner" on public.chat_members;
create policy "members_delete_self_or_owner" on public.chat_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.chats c
      where c.id = chat_id and c.created_by = auth.uid()
    )
  );

-- Сообщения
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages
  for select to authenticated
  using (public.is_chat_member(chat_id));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid() and public.is_chat_member(chat_id)
  );

drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender" on public.messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

drop policy if exists "messages_delete_sender" on public.messages;
create policy "messages_delete_sender" on public.messages
  for delete to authenticated
  using (sender_id = auth.uid());

-- Звонки
drop policy if exists "calls_select_member" on public.calls;
create policy "calls_select_member" on public.calls
  for select to authenticated
  using (
    caller_id = auth.uid() or public.is_chat_member(chat_id)
  );

drop policy if exists "calls_insert_member" on public.calls;
create policy "calls_insert_member" on public.calls
  for insert to authenticated
  with check (
    caller_id = auth.uid() and public.is_chat_member(chat_id)
  );

drop policy if exists "calls_update_member" on public.calls;
create policy "calls_update_member" on public.calls
  for update to authenticated
  using (
    caller_id = auth.uid() or public.is_chat_member(chat_id)
  );

-- =========================================================
-- 10. Storage buckets
-- =========================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Avatars: каждый авторизованный может читать, писать только в свою папку
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_self" on storage.objects;
create policy "avatars_insert_self" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_self" on storage.objects;
create policy "avatars_update_self" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_self" on storage.objects;
create policy "avatars_delete_self" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Attachments: читать могут все (публичный bucket), писать — авторизованные в свою папку
drop policy if exists "attachments_read" on storage.objects;
create policy "attachments_read" on storage.objects
  for select to public using (bucket_id = 'attachments');

drop policy if exists "attachments_insert_self" on storage.objects;
create policy "attachments_insert_self" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_delete_self" on storage.objects;
create policy "attachments_delete_self" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- Готово
-- =========================================================
