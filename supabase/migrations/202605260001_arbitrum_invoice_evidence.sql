alter table public.arcpay_invoices
add column if not exists onchain_invoice_id text,
add column if not exists onchain_tx_hash text,
add column if not exists settlement_tx_hash text,
add column if not exists cancel_tx_hash text,
add column if not exists payer_wallet text,
add column if not exists amount_units text;

create index if not exists arcpay_invoices_onchain_invoice_id_idx
on public.arcpay_invoices (onchain_invoice_id);
