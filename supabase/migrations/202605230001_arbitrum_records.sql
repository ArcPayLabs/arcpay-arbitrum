create table if not exists public.arcpay_arbitrum_records (
  id uuid primary key,
  owner text not null,
  type text not null,
  title text not null,
  status text not null,
  amount text,
  tx_hash text,
  created_at timestamptz not null default now()
);

create index if not exists arcpay_arbitrum_records_owner_created_idx
on public.arcpay_arbitrum_records (owner, created_at desc);

alter table public.arcpay_arbitrum_records enable row level security;

drop policy if exists "Service role manages Arbitrum records" on public.arcpay_arbitrum_records;

create policy "Service role manages Arbitrum records"
on public.arcpay_arbitrum_records
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
