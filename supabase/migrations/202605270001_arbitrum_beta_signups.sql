create table if not exists public.arcpay_arbitrum_beta_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  name text,
  telegram text,
  wallet_address text,
  role text,
  use_case text,
  agent_url text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  constraint arcpay_arbitrum_beta_signups_email_check check (position('@' in email) > 1),
  constraint arcpay_arbitrum_beta_signups_status_check check (status in ('new', 'invited', 'active', 'paused', 'rejected'))
);

create unique index if not exists arcpay_arbitrum_beta_signups_email_idx
on public.arcpay_arbitrum_beta_signups (lower(email));

create index if not exists arcpay_arbitrum_beta_signups_status_created_idx
on public.arcpay_arbitrum_beta_signups (status, created_at desc);

grant select, insert, update, delete on public.arcpay_arbitrum_beta_signups to service_role;

alter table public.arcpay_arbitrum_beta_signups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'arcpay_arbitrum_beta_signups'
      and policyname = 'service_role_manages_beta_signups'
  ) then
    create policy service_role_manages_beta_signups
    on public.arcpay_arbitrum_beta_signups
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
