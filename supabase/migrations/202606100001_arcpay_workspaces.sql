create table if not exists public.arcpay_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  network text not null check (network in ('somnia', 'mantle', 'arbitrum')),
  name text not null,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, network, name)
);

create index if not exists arcpay_workspaces_user_network_idx
  on public.arcpay_workspaces (user_id, network, is_active desc, updated_at desc);

alter table public.arcpay_workspaces enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'arcpay_workspaces' and policyname = 'Users can read own arcpay workspaces'
  ) then
    create policy "Users can read own arcpay workspaces"
      on public.arcpay_workspaces for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'arcpay_workspaces' and policyname = 'Users can insert own arcpay workspaces'
  ) then
    create policy "Users can insert own arcpay workspaces"
      on public.arcpay_workspaces for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'arcpay_workspaces' and policyname = 'Users can update own arcpay workspaces'
  ) then
    create policy "Users can update own arcpay workspaces"
      on public.arcpay_workspaces for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'arcpay_workspaces' and policyname = 'Users can delete own arcpay workspaces'
  ) then
    create policy "Users can delete own arcpay workspaces"
      on public.arcpay_workspaces for delete
      using (auth.uid() = user_id);
  end if;
end $$;
