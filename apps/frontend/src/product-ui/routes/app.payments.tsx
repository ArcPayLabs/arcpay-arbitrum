"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Plus, Search, Send, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewModal, type ReviewRow } from "@/components/primitives/ReviewModal";
import { StatCard } from "@/components/primitives/StatCard";
import { readLocalJson, writeLocalJson } from "@/lib/browser-cache";
import { checkActionPolicies } from "@/lib/policy";
import { connectedAddress, shortAddress, toWei, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: PaymentsPage } };

type PaymentRequest = {
  id: string;
  recipient: string;
  amount: string;
  token: "ETH" | "USDC";
  memo: string;
  route: "Agent order" | "Contractor payout" | "USDC card top-up";
  status: "Draft" | "Ready to sign" | "Signed intent";
  createdAt: string;
};

const STORAGE_KEY = "arcpay-arbitrum-payments";

function PaymentsPage() {
  const [items, setItems] = useState<PaymentRequest[]>(() => readLocalJson(STORAGE_KEY, [] as PaymentRequest[]));
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<PaymentRequest | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Create signer-gated payment intents for Arbitrum agents and operators.");
  const [form, setForm] = useState({
    recipient: "",
    amount: "0.01",
    token: "ETH" as PaymentRequest["token"],
    memo: "Research agent payout",
    route: "Agent order" as PaymentRequest["route"],
  });

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) => `${item.recipient} ${item.amount} ${item.token} ${item.memo} ${item.route}`.toLowerCase().includes(text));
  }, [items, query]);

  const ready = items.filter((item) => item.status === "Ready to sign").length;
  const signed = items.filter((item) => item.status === "Signed intent").length;

  function stagePayment() {
    const amount = Number.parseFloat(form.amount);
    if (!form.recipient.trim()) {
      setMessage("Recipient address is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid positive amount.");
      return;
    }

    const blockReason = checkActionPolicies({
      action: "Send",
      network: "arbitrum",
      token: form.token,
      amount,
      requireWallet: false,
      counterpartyWallets: [form.recipient.trim()],
    });
    if (blockReason) {
      setMessage(blockReason);
      return;
    }

    setReview({
      id: crypto.randomUUID(),
      recipient: form.recipient.trim(),
      amount: form.amount,
      token: form.token,
      memo: form.memo.trim(),
      route: form.route,
      status: "Ready to sign",
      createdAt: new Date().toISOString(),
    });
  }

  async function confirmPayment() {
    if (!review) return;
    const signer = await connectedAddress();
    const next = [{ ...review, status: "Signed intent" as const }, ...items].slice(0, 50);
    setItems(next);
    writeLocalJson(STORAGE_KEY, next);
    writeRecord({
      id: review.id,
      type: "payment",
      title: `${review.amount} ${review.token} payment to ${shortAddress(review.recipient)}`,
      status: "signed_intent",
      amount: review.amount,
    });
    setMessage(`Payment intent signed by ${shortAddress(signer)}. Submit through the linked Arbitrum order, card, or treasury contract.`);
    setReview(null);
    setOpen(false);
  }

  const rows: ReviewRow[] = review ? [
    { label: "Recipient", value: shortAddress(review.recipient), mono: true },
    { label: "Amount", value: `${review.amount} ${review.token}`, mono: true },
    { label: "Route", value: review.route },
    { label: "Wei", value: review.token === "ETH" ? toWei(review.amount).toString() : "USDC token units", mono: true },
    { label: "Policy", value: "Arbitrum Sepolia enforced" },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Send}
        eyebrow="Treasury execution"
        title="Payments"
        description="Create signer-gated payment intents for agent orders, contractor payouts, and USDC spend cards on Arbitrum Sepolia."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90">
            <Plus className="h-4 w-4" /> New payment
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={WalletCards} label="Total intents" value={items.length} hint="Local + Supabase record mirror" />
        <StatCard icon={Send} label="Ready" value={ready} hint="Awaiting wallet signature" />
        <StatCard icon={CheckCircle2} label="Signed" value={signed} hint="Operator approved intents" />
        <StatCard label="Network" value="421614" hint="Arbitrum Sepolia only" emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{message}</div>

      {open && (
        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Recipient">
              <input value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} className="ap-in" placeholder="0x..." />
            </Field>
            <Field label="Route">
              <select value={form.route} onChange={(event) => setForm({ ...form, route: event.target.value as PaymentRequest["route"] })} className="ap-in">
                <option>Agent order</option>
                <option>Contractor payout</option>
                <option>USDC card top-up</option>
              </select>
            </Field>
            <Field label="Amount">
              <input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="ap-in" inputMode="decimal" />
            </Field>
            <Field label="Token">
              <select value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value as PaymentRequest["token"] })} className="ap-in">
                <option>ETH</option>
                <option>USDC</option>
              </select>
            </Field>
            <Field label="Memo">
              <input value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} className="ap-in" />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={stagePayment} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Review and sign</button>
            <button onClick={() => setOpen(false)} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold">Payment intents</div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payments" className="w-full rounded-full bg-muted py-2 pl-8 pr-3 text-sm outline-none" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Send}
                title="No payment intents"
                description="Stage an agent payout, contractor transfer, or USDC card top-up before submitting the wallet-signed transaction."
                actionLabel="New payment"
                onAction={() => setOpen(true)}
              />
            </div>
          ) : null}
          {filtered.map((item) => (
            <div key={item.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
              <div className="md:col-span-3">
                <div className="font-medium">{item.route}</div>
                <div className="font-mono text-xs text-muted-foreground">{shortAddress(item.recipient)}</div>
              </div>
              <div className="md:col-span-3 text-muted-foreground">{item.memo || "No memo"}</div>
              <div className="md:col-span-2 font-mono">{item.amount} {item.token}</div>
              <div className="md:col-span-2">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="md:col-span-2">
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReviewModal
        open={Boolean(review)}
        onOpenChange={(value) => !value && setReview(null)}
        title="Sign Arbitrum payment intent"
        description="This confirms the operator intent. Contract execution still requires the relevant Arbitrum transaction signature."
        rows={rows}
        confirmLabel="Sign intent"
        onConfirm={confirmPayment}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
