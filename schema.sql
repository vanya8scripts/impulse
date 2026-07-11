create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text default '',
  avatar_url text,
  theme text default 'violet',
  created_at timestamptz default now()
);

create table contacts (
  owner_id uuid references profiles(id) on delete cascade,
  contact_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (owner_id, contact_id)
);

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  user_a uuid references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  type text not null default 'text',
  content text,
  file_url text,
  file_name text,
  file_size bigint,
  duration numeric,
  created_at timestamptz default now(),
  seen_at timestamptz
);

create table calls (
  id uuid primary key default uuid_generate_v4(),
  caller_id uuid references profiles(id) on delete cascade,
  callee_id uuid references profiles(id) on delete cascade,
  kind text not null default 'audio',
  peer_id text not null,
  status text not null default 'ringing',
  created_at timestamptz default now(),
  ended_at timestamptz
);

alter table profiles enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table calls enable row level security;

create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "contacts_select_own" on contacts for select using (auth.uid() = owner_id);
create policy "contacts_insert_own" on contacts for insert with check (auth.uid() = owner_id);
create policy "contacts_delete_own" on contacts for delete using (auth.uid() = owner_id);

create policy "conversations_select_member" on conversations for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "conversations_insert_member" on conversations for insert with check (auth.uid() = user_a or auth.uid() = user_b);

create policy "messages_select_member" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy "messages_insert_member" on messages for insert with check (
  auth.uid() = sender_id and exists (select 1 from conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy "messages_update_member" on messages for update using (
  exists (select 1 from conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);

create policy "calls_select_member" on calls for select using (auth.uid() = caller_id or auth.uid() = callee_id);
create policy "calls_insert_member" on calls for insert with check (auth.uid() = caller_id);
create policy "calls_update_member" on calls for update using (auth.uid() = caller_id or auth.uid() = callee_id);

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table calls;
alter publication supabase_realtime add table conversations;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true) on conflict do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_own_write" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_own_update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "attachments_public_read" on storage.objects for select using (bucket_id = 'attachments');
create policy "attachments_own_write" on storage.objects for insert with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
