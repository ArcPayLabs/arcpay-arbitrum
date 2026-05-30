create table if not exists public.arcpay_arbitrum_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  owner text,
  agent_id text,
  agent_slug text,
  source text not null default 'app',
  path text,
  tool_name text,
  status text not null default 'ok',
  tx_hash text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists arcpay_arbitrum_usage_events_type_created_idx
on public.arcpay_arbitrum_usage_events (event_type, created_at desc);

create index if not exists arcpay_arbitrum_usage_events_owner_created_idx
on public.arcpay_arbitrum_usage_events (owner, created_at desc);

create index if not exists arcpay_arbitrum_usage_events_agent_slug_created_idx
on public.arcpay_arbitrum_usage_events (agent_slug, created_at desc);

create index if not exists arcpay_arbitrum_usage_events_source_created_idx
on public.arcpay_arbitrum_usage_events (source, created_at desc);

grant select, insert, update, delete on public.arcpay_arbitrum_usage_events to service_role;

alter table public.arcpay_arbitrum_usage_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arcpay_arbitrum_usage_events'
      and policyname = 'service_role_manages_usage_events'
  ) then
    create policy service_role_manages_usage_events
    on public.arcpay_arbitrum_usage_events
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
