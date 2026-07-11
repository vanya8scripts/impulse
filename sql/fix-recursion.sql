-- Импульс — исправление рекурсии в RLS-политиках
-- ВЫПОЛНИТЕ ЭТОТ ФАЙЛ в Supabase SQL Editor (Dashboard → SQL → New query → Run)
--
-- Проблема: политики на chat_members и chats ссылаются на chat_members,
-- что вызывает бесконечную рекурсию при проверке RLS.
-- Решение: security definer функция, которая проверяет членство без RLS.

-- =========================================================
-- 1. Функция проверки членства в чате (security definer — обходит RLS)
-- =========================================================
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

-- =========================================================
-- 2. Пересоздаём политики на chat_members (без рекурсии)
-- =========================================================
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

-- =========================================================
-- 3. Пересоздаём политики на chats (через функцию, без рекурсии)
-- =========================================================
drop policy if exists "chats_select_member" on public.chats;
create policy "chats_select_member" on public.chats
  for select to authenticated
  using (public.is_chat_member(id));

drop policy if exists "chats_update_member" on public.chats;
create policy "chats_update_member" on public.chats
  for update to authenticated
  using (public.is_chat_member(id));

-- =========================================================
-- 4. Пересоздаём политики на messages (через функцию)
-- =========================================================
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

-- =========================================================
-- 5. Пересоздаём политики на calls (через функцию)
-- =========================================================
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
-- Готово. Перезагрузите страницу мессенджера.
-- =========================================================
