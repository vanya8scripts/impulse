-- Импульс — RPC-функции для создания чатов (обход RLS-проблем)
-- ВЫПОЛНИТЕ В Supabase SQL Editor
--
-- Эти функции выполняются с правами владельца (security definer),
-- что обходит RLS и гарантирует создание чата + участников одной транзакцией.

-- =========================================================
-- 1. Создание личного чата между двумя пользователями
-- =========================================================
create or replace function public.create_direct_chat(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_chat_id uuid;
  existing_chat_id uuid;
  me_id uuid := auth.uid();
begin
  if me_id is null then
    raise exception 'not authenticated';
  end if;
  if peer_id is null or peer_id = me_id then
    raise exception 'invalid peer';
  end if;

  -- ищем существующий direct-чат с этим peer
  select c.id into existing_chat_id
  from public.chats c
  where c.type = 'direct'
    and exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = me_id)
    and exists (select 1 from public.chat_members m where m.chat_id = c.id and m.user_id = peer_id)
  limit 1;

  if existing_chat_id is not null then
    return existing_chat_id;
  end if;

  -- создаём новый чат
  insert into public.chats (type, created_by)
  values ('direct', me_id)
  returning id into new_chat_id;

  -- добавляем обоих участников
  insert into public.chat_members (chat_id, user_id, role)
  values (new_chat_id, me_id, 'owner'), (new_chat_id, peer_id, 'member');

  return new_chat_id;
end;
$$;

-- =========================================================
-- 2. Проверка, что политики корректны (пересоздадим на всякий случай)
-- =========================================================
drop policy if exists "chats_insert_creator" on public.chats;
create policy "chats_insert_creator" on public.chats
  for insert to authenticated
  with check (created_by = auth.uid());

-- =========================================================
-- 3. Перезагрузка schema cache (чтобы PostgREST увидел функцию)
-- =========================================================
select pg_notify('pgrst', 'reload schema');

-- =========================================================
-- Готово
-- =========================================================
