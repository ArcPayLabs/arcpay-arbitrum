"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Plus, Search, Send, ShieldCheck, Users } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewModal, type ReviewRow } from "@/components/primitives/ReviewModal";
import { StatCard } from "@/components/primitives/StatCard";
import { readLocalJson, writeLocalJson } from "@/lib/browser-cache";
import { checkActionPolicies } from "@/lib/policy";
import { connectedAddress, hashText, shortAddress, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: ContractorsPage } };

type Contractor = {
  id: string;
  name: string;
  wallet: string;
  role: string;
  monthlyLimit: string;
  riskScore: number;
  allowed: boolean;
  selected?: boolean;
};

const STORAGE_KEY = "arcpay-arbitrum-contractors";

function ContractorsPage() {
  const [items, setItems] = useState<Contractor[]>(() => readLocalJson(STORAGE_KEY, [] as Contractor[]));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("Add Arbitrum contractors, risk-score them, and prepare wallet-signed payout batches.");
  const [form, setForm] = useState({ name: "", wallet: "", role: "Research contributor", monthlyLimit: "250" });

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return items;
    return items.filter((item) => `${item.name} ${item.wallet} ${item.role}`.toLowerCase().includes(text));
  }, [items, query]);

  const selected = items.filter((item) => item.selected);
  const totalSelected = selected.reduce((sum, item) => sum + Number.parseFloat(item.monthlyLimit || "0"), 0);
  const avgRisk = items.length ? Math.round(items.reduce((sum, item) => sum + item.riskScore, 0) / items.length) : 0;

  function persist(next: Contractor[]) {
    setItems(next);
    writeLocalJson(STORAGE_KEY, next);
  }

  function addContractor() {
    if (!form.name.trim() || !form.wallet.trim()) {
      setMessage("Name and Arbitrum wallet are required.");
      return;
    }
    const riskScore = scoreWallet(form.wallet);
    const contractor: Contractor = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      wallet: form.wallet.trim(),
      role: form.role.trim() || "Contributor",
      monthlyLimit: form.monthlyLimit || "0",
      riskScore,
      allowed: riskScore >= 70,
    };
    persist([contractor, ...items]);
    writeRecord({ id: contractor.id, type: "contractor", title: `Added ${contractor.name}`, status: contractor.allowed ? "allowed" : "review" });
    setForm({ name: "", wallet: "", role: "Research contributor", monthlyLimit: "250" });
    setOpen(false);
    setMessage(`${contractor.name} added with deterministic Arbitrum risk score ${riskScore}.`);
  }

  function toggle(id: string) {
    persist(items.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function toggleAllow(id: string) {
    persist(items.map((item) => item.id === id ? { ...item, allowed: !item.allowed } : item));
  }

  async function confirmBatch() {
    const blockReason = checkActionPolicies({
      action: "Send",
      network: "arbitrum",
      token: "USDC",
      amount: totalSelected,
      counterpartyWallets: selected.map((item) => item.wallet),
      minObservedScore: selected.length ? Math.min(...selected.map((item) => item.riskScore)) : null,
    });
    if (blockReason) throw new Error(blockReason);
    const signer = await connectedAddress();
    const batchId = hashText(`${signer}:${Date.now()}:${selected.map((item) => item.wallet).join(",")}`);
    writeRecord({ id: batchId, type: "payroll", title: `Prepared ${selected.length} contractor payouts`, status: "ready_to_execute", amount: String(totalSelected) });
    persist(items.map((item) => ({ ...item, selected: false })));
    setMessage(`Payroll batch ${shortAddress(batchId)} prepared by ${shortAddress(signer)}.`);
    setReview(false);
  }

  const rows: ReviewRow[] = [
    { label: "Recipients", value: selected.length },
    { label: "Total", value: `${totalSelected.toLocaleString()} USDC`, mono: true },
    { label: "Lowest score", value: selected.length ? Math.min(...selected.map((item) => item.riskScore)) : "--" },
    { label: "Policy", value: "Allowlist + risk floor enforced" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Counterparties"
        title="Contractors"
        description="Maintain contractor allowlists, Arbitrum wallet identities, risk scores, and batch payout intents before any treasury action is signed."
        actions={
          <>
            <button onClick={() => setOpen(true)} className="rounded-full bg-muted px-4 py-2.5 text-sm font-semibold">Add contractor</button>
            <button disabled={selected.length === 0} onClick={() => setReview(true)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">
              <Send className="h-4 w-4" /> Pay selected
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Contractors" value={items.length} hint="Arbitrum wallet identities" />
        <StatCard icon={ShieldCheck} label="Allowed" value={items.filter((item) => item.allowed).length} hint="Policy-approved recipients" />
        <StatCard label="Average risk" value={items.length ? avgRisk : "--"} hint="Deterministic testnet scorer" />
        <StatCard label="Selected payroll" value={`${totalSelected.toLocaleString()} USDC`} emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{message}</div>

      {open && (
        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="ap-in" /></Field>
            <Field label="Arbitrum wallet"><input value={form.wallet} onChange={(event) => setForm({ ...form, wallet: event.target.value })} className="ap-in" placeholder="0x..." /></Field>
            <Field label="Role"><input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="ap-in" /></Field>
            <Field label="Monthly limit USDC"><input value={form.monthlyLimit} onChange={(event) => setForm({ ...form, monthlyLimit: event.target.value })} className="ap-in" inputMode="decimal" /></Field>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={addContractor} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Save contractor</button>
            <button onClick={() => setOpen(false)} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold">Contractor directory</div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contractor" className="w-full rounded-full bg-muted py-2 pl-8 pr-3 text-sm outline-none" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Users}
                title="No contractors found"
                description="Add contractor wallets, assign monthly USDC limits, score counterparties, and prepare policy-checked payout batches."
                actionLabel="Add contractor"
                onAction={() => setOpen(true)}
              />
            </div>
          ) : null}
          {filtered.map((item) => (
            <div key={item.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
              <div className="md:col-span-1"><input type="checkbox" checked={Boolean(item.selected)} onChange={() => toggle(item.id)} className="accent-primary" /></div>
              <div className="md:col-span-3"><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.role}</div></div>
              <div className="md:col-span-3 font-mono text-xs text-muted-foreground">{shortAddress(item.wallet)}</div>
              <div className="md:col-span-2">{item.monthlyLimit} USDC</div>
              <div className="md:col-span-1">{item.riskScore}</div>
              <div className="md:col-span-2">
                <button onClick={() => toggleAllow(item.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${item.allowed ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
                  {item.allowed ? "Allowed" : "Review"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReviewModal open={review} onOpenChange={setReview} title="Prepare contractor payout batch" rows={rows} confirmLabel="Sign batch intent" onConfirm={confirmBatch} />
    </div>
  );
}

function scoreWallet(wallet: string) {
  let score = 45;
  for (const char of wallet.toLowerCase()) score = (score + char.charCodeAt(0)) % 101;
  return Math.max(20, score);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
