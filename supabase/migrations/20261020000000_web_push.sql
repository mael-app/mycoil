alter table public.coil_settings
  add column if not exists last_notified_at timestamptz;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on public.push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists coil_settings_due_idx
  on public.coil_settings (next_change_at)
  where coil_count > 0;
