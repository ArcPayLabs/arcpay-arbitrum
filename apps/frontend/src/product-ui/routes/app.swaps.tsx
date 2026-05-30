"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeftRight, Bot, CheckCircle2, ClipboardCopy, Route as RouteIcon, ShieldCheck, Workflow } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { CONTRACTS, shortAddress, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: SwapsRoute } };

const ADAPTERS = [
  { name: "GMX execution intent", status: "Primary adapter", description: "Prepare policy-approved GMX route or hedge intents and attach Arbiscan tx evidence after execution." },
  { name: "ZeroDev smart account", status: "Smart wallet", description: "Route approved actions through a session-key or paymaster account when enabled." },
  { name: "Stylus policy module", status: "Policy path", description: "Use the same ArcPay policy envelope as the future Stylus/Rust verifier path." },
  { name: "Dune evidence", status: "Analytics", description: "Attach public Dune query links for transaction and treasury analytics evidence." },
  { name: "Manual signer", status: "Available now", description: "Export a policy-approved payload for a human or agent signer to execute." },
] as const;

function SwapsRoute() {
  const [form, setForm] = useState({
    from: "ETH",
    to: "USDC",
    amount: "1",
    maxSlippage: "0.5",
    expiryMinutes: "20",
    adapter: "GMX execution intent",
    agent: "treasury-router",
    objective: "Acquire USDC for invoices and agent spend cards without exceeding policy.",
  });
  const [message, setMessage] = useState("Create a policy-ready Arbitrum route intent. ArcPay does not mark a swap filled until an executor returns signed evidence.");

  const payload = useMemo(() => ({
    kind: "arcpay-arbitrum-swap-intent",
    chain: "arbitrum-sepolia",
    from: form.from,
    to: form.to,
    amount: form.amount,
    maxSlippagePercent: form.maxSlippage,
    expiryMinutes: form.expiryMinutes,
    adapter: form.adapter,
    agent: form.agent,
    objective: form.objective,
    controls: {
      requirePolicyCheck: true,
      requireOperatorApproval: true,
      emergencyPauseAware: true,
      noFillClaimWithoutTxHash: true,
      requireArbiscanTxHashForCompletion: true,
      supportedAdapters: ["GMX", "ZeroDev", "Stylus", "Dune", "Manual signer"],
    },
    contracts: {
      registry: CONTRACTS.AgentRegistry,
      orderBook: CONTRACTS.AgentOrderBook,
      policy: CONTRACTS.TreasuryPolicy,
      reputation: CONTRACTS.AgentReputationBook,
    },
  }), [form]);

  function saveIntent() {
    writeRecord({
      id: crypto.randomUUID(),
      type: "audit",
      title: `Swap intent ${form.amount} ${form.from} to ${form.to}`,
      amount: `${form.amount} ${form.from}`,
      status: "arbitrum_route_intent_ready",
    });
    setMessage("Swap intent saved. It is ready for policy review, x402/escrow order creation, or Arbitrum execution handoff.");
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMessage("Copied Arbitrum swap intent payload.");
  }

  const reviewItems = [
    { label: "Route", value: `${form.from} -> ${form.to}` },
    { label: "Amount", value: form.amount },
    { label: "Slippage", value: `${form.maxSlippage}% max` },
    { label: "Adapter", value: form.adapter },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ArrowLeftRight}
        eyebrow="Arbitrum routing"
        title="Policy-checked swap intents"
        description="Build execution-ready Arbitrum swap requests for GMX, ZeroDev smart accounts, Stylus policy checks, Dune evidence, or manual signers. ArcPay records the intent, policy envelope, and evidence requirement before any fill is claimed."
        actions={<button type="button" onClick={copyPayload} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"><ClipboardCopy className="h-4 w-4" /> Copy route</button>}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard icon={RouteIcon} label="Intent type" value="Swap" hint="Evidence-gated" />
        <StatCard icon={ShieldCheck} label="Policy" value="Required" hint="Before execution" emphasis />
        <StatCard icon={Bot} label="Primary adapter" value="GMX" hint="Agent handoff" />
        <StatCard icon={Workflow} label="Order path" value="x402/escrow" hint="Optional paid execution" />
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <form className="rounded-3xl border border-border bg-card p-5 space-y-4" onSubmit={(event) => { event.preventDefault(); saveIntent(); }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Route builder</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create treasury route intent</h2>
            <p className="mt-1 text-sm text-muted-foreground">This is the safe handoff object an agent uses before touching liquidity.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="From asset"><input className="ap-in" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} /></Field>
            <Field label="To asset"><input className="ap-in" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} /></Field>
            <Field label="Amount"><input className="ap-in" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" /></Field>
            <Field label="Max slippage %"><input className="ap-in" value={form.maxSlippage} onChange={(event) => setForm({ ...form, maxSlippage: event.target.value })} inputMode="decimal" /></Field>
            <Field label="Expiry minutes"><input className="ap-in" value={form.expiryMinutes} onChange={(event) => setForm({ ...form, expiryMinutes: event.target.value })} inputMode="numeric" /></Field>
            <Field label="Executor agent"><input className="ap-in" value={form.agent} onChange={(event) => setForm({ ...form, agent: event.target.value })} /></Field>
          </div>
          <Field label="Adapter">
            <select className="ap-in" value={form.adapter} onChange={(event) => setForm({ ...form, adapter: event.target.value })}>
              {ADAPTERS.map((adapter) => <option key={adapter.name}>{adapter.name}</option>)}
            </select>
          </Field>
          <Field label="Objective">
            <textarea className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} />
          </Field>
          <button className="h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" type="submit">Save swap intent</button>
          <div className="rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ADAPTERS.map((adapter) => (
              <article key={adapter.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{adapter.status}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{adapter.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{adapter.description}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-[#101414] p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Execution payload</div>
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-2xl bg-black/35 p-4 text-xs leading-relaxed text-white/75">{JSON.stringify(payload, null, 2)}</pre>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
              {reviewItems.map((item) => <span key={item.label}>{item.label}: {item.value}</span>)}
              <span>Policy {shortAddress(CONTRACTS.TreasuryPolicy)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
