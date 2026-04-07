-- Support and bug report storage
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text null,
  type text not null check (type in ('support', 'bug')),
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists support_messages_user_id_idx on public.support_messages (user_id);
create index if not exists support_messages_type_idx on public.support_messages (type);
create index if not exists support_messages_status_idx on public.support_messages (status);
create index if not exists support_messages_created_at_idx on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;

-- Users can insert their own authenticated message; service role bypasses RLS for API usage.
drop policy if exists "support_messages_insert_authenticated" on public.support_messages;
create policy "support_messages_insert_authenticated"
  on public.support_messages
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);
