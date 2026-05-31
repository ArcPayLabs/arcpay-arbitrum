"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeftRight, Bot, CheckCircle2, ClipboardCopy, ExternalLink, Gauge, Route as RouteIcon, ShieldCheck, Workflow } from "lucide-react";
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

type GmxStatus = {
  ok: boolean;
  configured: boolean;
  mode: string;
  network: { name: string; chainId: number; explorer: string };
  liveProof?: { orderTxHash: string; executionTxHash: string; requestId: string; proofUrl: string; explorerUrl: string };
  docs: { contracts: string; sdk: string; source: string };
  sdk: {
    package: string;
    chainId: number;
    requiredInputs: string[];
    supportedMethods: string[];
    rpcUrlConfigured: boolean;
    apiBaseUrlConfigured: boolean;
    executionMode?: string;
  };
  contracts: Record<string, string>;
  markets: Array<{ label: string; indexToken: string; longToken: string; shortToken: string; risk: string }>;
  guardrails: Record<string, boolean | number>;
};

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
  const [gmxStatus, setGmxStatus] = useState<GmxStatus | null>(null);
  const [gmxMessage, setGmxMessage] = useState("Loading GMX Arbitrum Sepolia adapter config.");

  useEffect(() => {
    let cancelled = false;
    async function loadGmx() {
      const response = await fetch("/api/gmx/status", { cache: "no-store" });
      const body = await response.json() as GmxStatus;
      if (!cancelled) {
        setGmxStatus(body);
        setGmxMessage(body.configured
          ? "GMX is live-tested on Arbitrum Sepolia through classic SDK execution. The proof includes create-order and execution tx hashes."
          : "GMX official testnet contracts are loaded. Execution remains disabled until the SDK path is verified.");
      }
    }
    loadGmx().catch((error) => {
      if (!cancelled) setGmxMessage(error instanceof Error ? error.message : String(error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    gmx: {
      network: gmxStatus?.network ?? { name: "arbitrum-sepolia", chainId: 421614 },
      sdkPackage: gmxStatus?.sdk.package ?? "@gmx-io/sdk",
      sdkMethods: gmxStatus?.sdk.supportedMethods ?? ["createSwapOrder", "createIncreaseOrder", "createDecreaseOrder"],
      liveProof: gmxStatus?.liveProof ?? null,
      contracts: {
        exchangeRouter: gmxStatus?.contracts.ExchangeRouter ?? "loading",
        router: gmxStatus?.contracts.Router ?? "loading",
        reader: gmxStatus?.contracts.Reader ?? "loading",
        dataStore: gmxStatus?.contracts.DataStore ?? "loading",
        eventEmitter: gmxStatus?.contracts.EventEmitter ?? "loading",
      },
    },
    contracts: {
      registry: CONTRACTS.AgentRegistry,
      orderBook: CONTRACTS.AgentOrderBook,
      policy: CONTRACTS.TreasuryPolicy,
      reputation: CONTRACTS.AgentReputationBook,
    },
  }), [form, gmxStatus]);

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

  function applyGmxMarket(market: { label: string; longToken: string; shortToken: string }) {
    setForm({
      ...form,
      from: market.longToken,
      to: market.shortToken,
      adapter: "GMX execution intent",
      objective: `${market.label}: prepare a policy-approved GMX route, require operator signature, then attach Arbiscan and Dune evidence before completion.`,
    });
    setGmxMessage(`Loaded ${market.label} into the route builder.`);
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

      <section className="overflow-hidden rounded-[2rem] border border-sky-200/70 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#eef8ff_46%,#fffaf2_100%)] shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">
                <RouteIcon className="h-3.5 w-3.5" /> GMX Arbitrum Sepolia
              </span>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Official contracts loaded
              </span>
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">GMX routes with ArcPay policy before execution.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              ArcPay prepares GMX swap, hedge, and execution payloads against the official Arbitrum Sepolia GMX contracts. The current adapter has been live-tested with a classic SDK WETH to USDC.SG market swap and requires Arbiscan plus proof JSON evidence before completion.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {gmxStatus?.docs.contracts ? (
                <a href={gmxStatus.docs.contracts} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                  GMX contracts <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              {gmxStatus?.docs.sdk ? (
                <a href={gmxStatus.docs.sdk} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white/75 px-4 text-sm font-semibold">
                  SDK docs <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              <button type="button" onClick={copyPayload} className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white/75 px-4 text-sm font-semibold">
                <ClipboardCopy className="h-4 w-4" /> Copy GMX manifest
              </button>
              {gmxStatus?.liveProof?.explorerUrl ? (
                <a href={gmxStatus.liveProof.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
                  Live GMX tx <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-white/75 px-4 py-3 text-sm text-muted-foreground">{gmxMessage}</div>
          </div>

          <div className="border-t border-sky-200/70 bg-white/55 p-6 md:p-7 xl:border-l xl:border-t-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <GmxMetric icon={RouteIcon} label="ExchangeRouter" value={shortGmxAddress(gmxStatus, "ExchangeRouter")} />
              <GmxMetric icon={Gauge} label="Reader" value={shortGmxAddress(gmxStatus, "Reader")} />
              <GmxMetric icon={Workflow} label="SDK methods" value={gmxStatus?.sdk.supportedMethods.length ? `${gmxStatus.sdk.supportedMethods.length} methods` : "loading"} />
              <GmxMetric icon={ShieldCheck} label="Mode" value={gmxStatus?.mode ?? "loading"} />
            </div>
            {gmxStatus?.liveProof ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Live proof</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-950">GMX WETH to USDC.SG executed on Arbitrum Sepolia</div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-emerald-950/80">
                  <a href={gmxStatus.liveProof.explorerUrl} target="_blank" rel="noreferrer" className="truncate underline decoration-emerald-400 underline-offset-4">Execution: {gmxStatus.liveProof.executionTxHash}</a>
                  <a href={`https://sepolia.arbiscan.io/tx/${gmxStatus.liveProof.orderTxHash}`} target="_blank" rel="noreferrer" className="truncate underline decoration-emerald-400 underline-offset-4">Create order: {gmxStatus.liveProof.orderTxHash}</a>
                  <a href={gmxStatus.liveProof.proofUrl} target="_blank" rel="noreferrer" className="truncate underline decoration-emerald-400 underline-offset-4">Proof JSON: {gmxStatus.liveProof.requestId}</a>
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              {gmxStatus?.markets.map((market) => (
                <button key={market.label} type="button" onClick={() => applyGmxMarket(market)} className="rounded-2xl border border-border/70 bg-background/80 p-4 text-left transition hover:border-primary">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{market.label}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{market.risk}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{market.longToken} to {market.shortToken} via policy-gated GMX intent</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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

function GmxMetric({ icon: Icon, label, value }: { icon: typeof RouteIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function shortGmxAddress(status: GmxStatus | null, key: string) {
  const value = status?.contracts[key];
  return value ? shortAddress(value) : "loading";
}
