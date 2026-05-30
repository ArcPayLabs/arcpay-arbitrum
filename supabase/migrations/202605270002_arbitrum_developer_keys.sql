create table if not exists public.arcpay_arbitrum_developer_keys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  owner text not null,
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default array['mcp:tools']::text[],
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists arcpay_arbitrum_developer_keys_owner_created_idx
on public.arcpay_arbitrum_developer_keys (owner, created_at desc);

create index if not exists arcpay_arbitrum_developer_keys_prefix_idx
on public.arcpay_arbitrum_developer_keys (key_prefix);

grant select, insert, update, delete on public.arcpay_arbitrum_developer_keys to service_role;

alter table public.arcpay_arbitrum_developer_keys enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arcpay_arbitrum_developer_keys'
      and policyname = 'service_role_manages_developer_keys'
  ) then
    create policy service_role_manages_developer_keys
    on public.arcpay_arbitrum_developer_keys
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
