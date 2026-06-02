"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Bot, CheckCircle2, ClipboardCopy, Landmark, ShieldCheck, TrendingUp, WalletCards, Workflow } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { CONTRACTS, shortAddress, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: YieldRoute } };

const STRATEGIES = [
  { name: "USDC conservative reserve", asset: "USDC", description: "Keep operating capital in a tokenized dollar-yield bucket with strict drawdown and withdrawal controls." },
  { name: "WETH treasury sleeve", asset: "WETH", description: "Prepare an ETH-denominated Arbitrum treasury sleeve for operator-approved yield exposure." },
  { name: "GMX hedged treasury sleeve", asset: "ETH/USDC", description: "Prepare a policy-approved hedge or execution intent and attach Arbiscan or Dune evidence after activity." },
  { name: "Manual RWA review", asset: "USDC/WETH", description: "Export a risk memo for a human operator before any signed transaction." },
] as const;

function YieldRoute() {
  const [form, setForm] = useState({
    strategy: "USDC conservative reserve",
    asset: "USDC",
    amount: "10",
    target: "Preserve runway while keeping idle treasury in low-risk Arbitrum RWA exposure.",
    maxDrawdown: "2",
    maxAllocation: "25",
    rebalanceCadence: "weekly",
    agent: "yield-strategy-agent",
  });
  const [message, setMessage] = useState("Create a governed Arbitrum RWA/yield strategy request. ArcPay requires policy and evidence before execution.");

  const payload = useMemo(() => ({
    kind: "arcpay-arbitrum-yield-intent",
    chain: "arbitrum-sepolia",
    strategy: form.strategy,
    asset: form.asset,
    amount: form.amount,
    target: form.target,
    risk: {
      maxDrawdownPercent: form.maxDrawdown,
      maxTreasuryAllocationPercent: form.maxAllocation,
      rebalanceCadence: form.rebalanceCadence,
      leverageAllowed: false,
      operatorApprovalRequired: true,
    },
    agent: form.agent,
    integrations: {
      gmx: form.strategy.includes("GMX"),
      duneEvidence: true,
      usdcCards: true,
      invoices: true,
      privacyIntents: true,
    },
    contracts: {
      policy: CONTRACTS.TreasuryPolicy,
      spendCards: CONTRACTS.AgentSpendCardVault,
      invoices: CONTRACTS.AgentInvoiceBook,
      privacyVault: CONTRACTS.ArbitrumPrivacyVault,
      reputation: CONTRACTS.AgentReputationBook,
    },
  }), [form]);

  function saveIntent() {
    writeRecord({
      id: crypto.randomUUID(),
      type: "audit",
      title: `Yield strategy ${form.strategy}`,
      amount: `${form.amount} ${form.asset}`,
      status: "arbitrum_yield_intent_ready",
    });
    setMessage("Yield intent saved. It can now move through policy review, Arbitrum execution handoff, or manual operator execution.");
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMessage("Copied Arbitrum yield strategy payload.");
  }

  const guardrails = [
    { label: "Asset", value: form.asset },
    { label: "Allocation cap", value: `${form.maxAllocation}%` },
    { label: "Drawdown cap", value: `${form.maxDrawdown}%` },
    { label: "Executor", value: form.agent },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingUp}
        eyebrow="Arbitrum RWA / yield"
        title="Agent-managed yield strategy"
        description="Prepare policy-approved USDC, WETH, GMX, and RWA strategy requests with explicit risk caps, allocation limits, and evidence requirements before any treasury movement."
        actions={<button type="button" onClick={copyPayload} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"><ClipboardCopy className="h-4 w-4" /> Copy strategy</button>}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard icon={Landmark} label="Arbitrum thesis" value="RWA" hint="USDC / WETH" emphasis />
        <StatCard icon={ShieldCheck} label="Policy" value="Required" hint="Before allocation" />
        <StatCard icon={WalletCards} label="Runway asset" value="USDC" hint="Invoice/card compatible" />
        <StatCard icon={Bot} label="Agent" value="Optional" hint="Execution handoff" />
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <form className="rounded-3xl border border-border bg-card p-5 space-y-4" onSubmit={(event) => { event.preventDefault(); saveIntent(); }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Strategy builder</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create RWA/yield intent</h2>
            <p className="mt-1 text-sm text-muted-foreground">This creates the policy envelope an agent or operator must satisfy before execution.</p>
          </div>
          <Field label="Strategy">
            <select className="ap-in" value={form.strategy} onChange={(event) => {
              const strategy = STRATEGIES.find((item) => item.name === event.target.value);
              setForm({ ...form, strategy: event.target.value, asset: strategy?.asset ?? form.asset });
            }}>
              {STRATEGIES.map((strategy) => <option key={strategy.name}>{strategy.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Asset"><input className="ap-in" value={form.asset} onChange={(event) => setForm({ ...form, asset: event.target.value })} /></Field>
            <Field label="Amount"><input className="ap-in" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} inputMode="decimal" /></Field>
            <Field label="Max drawdown %"><input className="ap-in" value={form.maxDrawdown} onChange={(event) => setForm({ ...form, maxDrawdown: event.target.value })} inputMode="decimal" /></Field>
            <Field label="Max allocation %"><input className="ap-in" value={form.maxAllocation} onChange={(event) => setForm({ ...form, maxAllocation: event.target.value })} inputMode="decimal" /></Field>
            <Field label="Rebalance cadence"><input className="ap-in" value={form.rebalanceCadence} onChange={(event) => setForm({ ...form, rebalanceCadence: event.target.value })} /></Field>
            <Field label="Executor agent"><input className="ap-in" value={form.agent} onChange={(event) => setForm({ ...form, agent: event.target.value })} /></Field>
          </div>
          <Field label="Treasury objective">
            <textarea className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} />
          </Field>
          <button className="h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" type="submit">Save yield intent</button>
          <div className="rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {STRATEGIES.map((strategy) => (
              <article key={strategy.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{strategy.asset}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{strategy.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{strategy.description}</p>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {guardrails.map((item) => (
              <article className="rounded-2xl border border-border bg-card p-4" key={item.label}>
                <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{item.label}</h3>
                <p className="mt-4 break-all text-lg font-semibold">{item.value}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-[#101414] p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45"><Workflow className="h-4 w-4" /> Strategy payload</div>
            <pre className="mt-4 max-h-[360px] overflow-auto rounded-2xl bg-black/35 p-4 text-xs leading-relaxed text-white/75">{JSON.stringify(payload, null, 2)}</pre>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
              <span>Policy {shortAddress(CONTRACTS.TreasuryPolicy)}</span>
              <span>Privacy {shortAddress(CONTRACTS.ArbitrumPrivacyVault)}</span>
              <span>Invoices {shortAddress(CONTRACTS.AgentInvoiceBook)}</span>
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
