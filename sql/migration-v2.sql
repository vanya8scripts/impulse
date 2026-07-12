-- Импульс — миграция v2: верификация, админка, каналы, приватность, сессии
-- ВЫПОЛНИТЕ В Supabase SQL Editor (Dashboard → SQL → New query → Run)

-- =========================================================
-- 1. Расширение таблицы profiles
-- =========================================================
alter table public.profiles
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists block_reason text,
  add column if not exists is_muted boolean not null default false,
  add column if not exists mute_reason text,
  add column if not exists mute_until timestamptz,
  add column if not exists who_can_message text not null default 'everyone' check (who_can_message in ('everyone','contacts','nobody')),
  add column if not exists who_can_call text not null default 'everyone' check (who_can_call in ('everyone','contacts','nobody'));

-- Назначаем vanya администратором и верифицируем
update public.profiles
set is_admin = true, is_verified = true
where lower(username) = 'vanya';

-- Если vanya ещё не зарегистрирован — создаём флаг-функцию для будущей регистрации
create or replace function public.claim_admin_if_vanya()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.username) = 'vanya' and not exists (select 1 from public.profiles where lower(username) = 'vanya' and is_admin = true) then
    new.is_admin := true;
    new.is_verified := true;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_before_insert on public.profiles;
create trigger on_profile_before_insert
  before insert on public.profiles
  for each row execute procedure public.claim_admin_if_vanya();

-- =========================================================
-- 2. Расширение таблицы chats (каналы)
-- =========================================================
alter table public.chats
  add column if not exists is_official boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists description text,
  add column if not exists subscriber_count int not null default 0;

-- Расширяем check на type: добавляем 'channel'
alter table public.chats drop constraint if exists chats_type_check;
alter table public.chats
  add constraint chats_type_check check (type in ('direct','group','channel'));

-- =========================================================
-- 3. Расширение chat_members (роли для каналов)
-- =========================================================
alter table public.chat_members
  add column if not exists last_read_at timestamptz;

alter table public.chat_members drop constraint if exists chat_members_role_check;
alter table public.chat_members
  add constraint chat_members_role_check check (role in ('owner','admin','member','subscriber'));

-- =========================================================
-- 4. Создаём официальный канал Импульс (если не существует)
-- =========================================================
insert into public.chats (id, type, title, is_official, is_verified, description, created_by)
select '00000000-0000-0000-0000-000000000001', 'channel', 'Импульс', true, true,
       'Официальный канал мессенджера Импульс. Новости и обновления.',
       (select id from public.profiles where is_admin = true limit 1)
where not exists (select 1 from public.chats where id = '00000000-0000-0000-0000-000000000001');

-- =========================================================
-- 5. Функция авто-подписки на официальный канал при регистрации
-- =========================================================
create or replace function public.subscribe_new_user_to_impulse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_members (chat_id, user_id, role)
  values ('00000000-0000-0000-0000-000000000001', new.id, 'subscriber')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_after_insert_impulse on public.profiles;
create trigger on_profile_after_insert_impulse
  after insert on public.profiles
  for each row execute procedure public.subscribe_new_user_to_impulse();

-- Подписываем всех существующих пользователей на официальный канал
insert into public.chat_members (chat_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', p.id, 'subscriber'
from public.profiles p
where not exists (
  select 1 from public.chat_members m
  where m.chat_id = '00000000-0000-0000-0000-000000000001' and m.user_id = p.id
);

-- =========================================================
-- 6. Функция создания канала (security definer)
-- =========================================================
create or replace function public.create_channel(
  p_title text,
  p_description text default null,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  me_id uuid := auth.uid();
begin
  if me_id is null then raise exception 'not authenticated'; end if;

  -- Проверка мьюта/блока
  if exists (select 1 from public.profiles where id = me_id and (is_blocked or is_muted)) then
    raise exception 'account restricted';
  end if;

  insert into public.chats (type, title, description, avatar_url, created_by)
  values ('channel', p_title, p_description, p_avatar_url, me_id)
  returning id into new_id;

  insert into public.chat_members (chat_id, user_id, role)
  values (new_id, me_id, 'owner');

  return new_id;
end;
$$;

-- =========================================================
-- 7. Функция создания группы
-- =========================================================
create or replace function public.create_group(
  p_title text,
  p_description text default null,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  me_id uuid := auth.uid();
begin
  if me_id is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = me_id and (is_blocked or is_muted)) then
    raise exception 'account restricted';
  end if;

  insert into public.chats (type, title, description, avatar_url, created_by)
  values ('group', p_title, p_description, p_avatar_url, me_id)
  returning id into new_id;

  insert into public.chat_members (chat_id, user_id, role)
  values (new_id, me_id, 'owner');

  return new_id;
end;
$$;

-- =========================================================
-- 8. Функция подписки на канал/группу
-- =========================================================
create or replace function public.subscribe_to_chat(p_chat_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me_id uuid := auth.uid();
  chat_type text;
begin
  if me_id is null then raise exception 'not authenticated'; end if;
  select type into chat_type from public.chats where id = p_chat_id;
  if chat_type is null then raise exception 'chat not found'; end if;
  if chat_type = 'direct' then raise exception 'cannot subscribe to direct chat'; end if;

  insert into public.chat_members (chat_id, user_id, role)
  values (p_chat_id, me_id, 'subscriber')
  on conflict do nothing;

  return true;
end;
$$;

-- =========================================================
-- 9. Админ-функции (только для is_admin = true)
-- =========================================================
create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'admin only';
  end if;
end;
$$;

-- Заблокировать пользователя
create or replace function public.admin_block_user(p_user_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.profiles set is_blocked = true, block_reason = p_reason where id = p_user_id;
  return true;
end;
$$;

-- Разблокировать
create or replace function public.admin_unblock_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.profiles set is_blocked = false, block_reason = null where id = p_user_id;
  return true;
end;
$$;

-- Замьютить
create or replace function public.admin_mute_user(p_user_id uuid, p_reason text, p_hours int default 24)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.profiles
  set is_muted = true, mute_reason = p_reason,
      mute_until = case when p_hours > 0 then now() + (p_hours || ' hours')::interval else null end
  where id = p_user_id;
  return true;
end;
$$;

-- Размьютить
create or replace function public.admin_unmute_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.profiles set is_muted = false, mute_reason = null, mute_until = null where id = p_user_id;
  return true;
end;
$$;

-- Выдать галочку
create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  update public.profiles set is_verified = p_verified where id = p_user_id;
  return true;
end;
$$;

-- =========================================================
-- 10. RLS-политики для новых столбцов profiles
-- =========================================================
-- Профили может читать кто угодно (нужно для поиска и проверок)
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

-- Обновлять свой профиль может только владелец, КРОМЕ админ-полей
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =========================================================
-- 11. Перезагрузка schema cache
-- =========================================================
select pg_notify('pgrst', 'reload schema');

-- =========================================================
-- Готово
-- =========================================================
