create table public.coil_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coil_count integer not null default 0 check (coil_count >= 0),
  initial_coil_count integer not null check (initial_coil_count > 0),
  deadline timestamptz not null,
  current_coil_started_at timestamptz not null,
  next_change_at timestamptz not null,
  interval_days numeric not null check (interval_days > 0),
  postpone_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.coil_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('coil_change', 'postpone', 'refill')),
  occurred_at timestamptz not null default now(),
  amount integer
);

alter table public.coil_settings enable row level security;
alter table public.coil_events enable row level security;

create policy "Users can manage their own coil settings"
  on public.coil_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own coil events"
  on public.coil_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
