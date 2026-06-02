"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, ClipboardCopy, DatabaseZap, ExternalLink, Gauge, KeyRound, Route as RouteIcon, ShieldCheck, Sparkles, WalletCards, Workflow, Zap } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { CONTRACTS, EXECUTION_ADAPTERS, executionRouterContract, hashText, shortAddress, toWei, txUrl, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: ExecutionRoute } };

type Handoff = {
  strategyName: string;
  adapter: string;
  executionAddress: string;
  primaryVenue: string;
  operator: string;
  agentSlug: string;
  objective: string;
  budgetEth: string;
  riskLimit: string;
  assets: string;
  x402Resource: string;
  developerToolUrl: string;
  targetContract: string;
  calldataSummary: string;
  policyUri: string;
  evidenceUri: string;
  txHashOrReceipt: string;
};

type IntegrationStatus = {
  ok: boolean;
  integrations: {
    zerodev: {
      configured: boolean;
      apiKeyConfigured: boolean;
      projectId: string | null;
      rpcUrl: string | null;
      sponsorPolicy: string;
      maxNativeValueEth: string;
      maxTokenAmount: string;
      walletAllowlistEnabled: boolean;
    };
    dune: { configured: boolean; mcpServer: string; evidenceQueryId: string; evidenceUrl: string; purpose: string };
    gmx: { configured: boolean; mode: string; purpose: string };
    fhenix: { configured: boolean; mode: string; purpose: string };
  };
};

type ZeroDevProof = {
  ok: boolean;
  generatedAt: string;
  chain: string;
  chainId: number;
  smartAccount: string;
  txHash: string;
  txStatus: string;
  blockNumber: string;
  explorerUrl: string;
  target: string;
  action: string;
  slug: string;
  agentId: string;
  endpoint: string;
  zerodev: { projectId: string; rpcConfigured: boolean; apiKeyConfigured: boolean };
};

const DEFAULT_FORM: Handoff = {
  strategyName: "arcpay-arbitrum-cfo",
  adapter: "GMX execution intent",
  executionAddress: "",
  primaryVenue: "GMX",
  operator: "ArcPay operator",
  agentSlug: "treasury-router",
  objective: "Prepare policy-approved Arbitrum treasury work across x402 payments, USDC invoices, privacy intents, and agent execution evidence.",
  budgetEth: "0.02",
  riskLimit: "No leverage without operator approval, no completion without Arbiscan tx hash or x402 proof.",
  assets: "ETH, USDC, WETH",
  x402Resource: "https://arcpay-arbitrum.vercel.app/api/agent/research-agent/work",
  developerToolUrl: "https://arcpay-arbitrum.vercel.app/api/developer/tools/execution_handoff",
  targetContract: "0x0000000000000000000000000000000000000000",
  calldataSummary: "GMX ETH/USDC route, ZeroDev session key, Dune evidence, or manual signer payload",
  policyUri: "ipfs://arcpay-arbitrum/policies/treasury-router",
  evidenceUri: "dune://arcpay-arbitrum/execution-evidence",
  txHashOrReceipt: "",
};

const SETUP_STEPS = [
  "Register or select the ArcPay agent that will own the order and audit trail.",
  "Pick the execution adapter: GMX intent, ZeroDev smart account, Dune evidence, Robinhood Chain path, or manual signer.",
  "Generate the x402 quote or escrow order before any paid work begins.",
  "Run the policy check and keep leverage or large moves behind operator approval.",
  "Attach Arbiscan tx hash, x402 verification, Dune query link, or signed result evidence before marking the work complete.",
];

const INTEGRATIONS = [
  { label: "GMX", value: "Execution intents", hint: "Perps/spot route evidence" },
  { label: "ZeroDev", value: "Smart accounts", hint: "Session-key agent UX" },
  { label: "Dune", value: "Analytics", hint: "Public proof dashboards" },
];

function ExecutionRoute() {
  const [form, setForm] = useState<Handoff>(DEFAULT_FORM);
  const [intentId, setIntentId] = useState("");
  const [message, setMessage] = useState("Create an Arbitrum execution handoff. ArcPay keeps policy, x402, audit, privacy, and evidence records.");
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [zeroDevProof, setZeroDevProof] = useState<ZeroDevProof | null>(null);
  const [zeroDevMessage, setZeroDevMessage] = useState("ZeroDev sponsorship proof is loaded from the latest ArcPay Arbitrum sponsored UserOp artifact.");

  useEffect(() => {
    let cancelled = false;
    async function loadZeroDevReadiness() {
      const [integrationsResponse, proofResponse] = await Promise.all([
        fetch("/api/integrations", { cache: "no-store" }),
        fetch("/proofs/arbitrum-zerodev-sponsored-userop.json", { cache: "no-store" }),
      ]);
      const [integrationsBody, proofBody] = await Promise.all([
        integrationsResponse.json() as Promise<IntegrationStatus>,
        proofResponse.json() as Promise<ZeroDevProof>,
      ]);
      if (!cancelled) {
        setIntegrations(integrationsBody);
        setZeroDevProof(proofBody);
      }
    }
    loadZeroDevReadiness().catch((error) => {
      if (!cancelled) setZeroDevMessage(error instanceof Error ? error.message : String(error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const payload = useMemo(() => ({
    protocol: "arcpay-arbitrum-execution-handoff",
    chain: "arbitrum-sepolia",
    chainId: 421614,
    adapter: form.adapter,
    executionAddress: form.executionAddress || "set-after-wallet-or-smart-account-connection",
    primaryVenue: form.primaryVenue,
    strategyName: form.strategyName,
    operator: form.operator,
    agentSlug: form.agentSlug,
    objective: form.objective,
    constraints: {
      maxBudgetEth: form.budgetEth,
      riskLimit: form.riskLimit,
      allowedAssets: form.assets.split(",").map((asset) => asset.trim()).filter(Boolean),
      allowedVenues: ["GMX", "ZeroDev smart account", "Dune evidence", "Robinhood Chain", "Manual signer"],
      requireArcPayPolicy: true,
      requireOperatorOverrideForLeverage: true,
      requireExecutionEvidence: true,
      requireArbiscanTxHashForCompletion: true,
    },
    endpoints: {
      x402ProtectedResource: form.x402Resource,
      arcPayDeveloperTool: form.developerToolUrl,
      x402Gateway: "https://arcpay-arbitrum.vercel.app/api",
      openapi: "https://arcpay-arbitrum.vercel.app/openapi.json",
    },
    contracts: {
      registry: CONTRACTS.AgentRegistry,
      orderBook: CONTRACTS.AgentOrderBook,
      policy: CONTRACTS.TreasuryPolicy,
      privacyVault: CONTRACTS.ArbitrumPrivacyVault,
      reputation: CONTRACTS.AgentReputationBook,
      identity8004: CONTRACTS.AgentIdentity8004,
      executionRouter: CONTRACTS.ArbitrumExecutionRouter,
    },
  }), [form]);

  async function proposeIntent() {
    const contract = await executionRouterContract() as any;
    const adapter = adapterId(form.primaryVenue);
    const tx = await contract.proposeIntent(
      hashText(form.agentSlug),
      adapter,
      form.targetContract,
      toWei(form.budgetEth),
      hashText(form.calldataSummary),
      form.policyUri,
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed: any) => parsed?.name === "ExecutionIntentProposed");
    const nextIntentId = event?.args?.intentId ? String(event.args.intentId) : "";
    setIntentId(nextIntentId);
    writeRecord({
      id: crypto.randomUUID(),
      type: "audit",
      title: `Arbitrum execution ${form.strategyName}`,
      status: "execution_intent_proposed",
      amount: `${form.budgetEth} ETH budget`,
      txHash: tx.hash,
    });
    setMessage(`Execution intent proposed: ${nextIntentId || tx.hash}`);
  }

  async function approveIntent() {
    if (!intentId) {
      setMessage("Create or paste an execution intent id before approval.");
      return;
    }
    const contract = await executionRouterContract() as any;
    const tx = await contract.approveIntent(intentId, form.evidenceUri);
    await tx.wait();
    writeRecord({
      id: crypto.randomUUID(),
      type: "audit",
      title: `Approved execution ${form.primaryVenue}`,
      status: "execution_intent_approved",
      amount: `${form.budgetEth} ETH budget`,
      txHash: tx.hash,
    });
    setMessage(`Execution intent approved: ${txUrl(tx.hash)}`);
  }

  async function recordExecution() {
    if (!intentId) {
      setMessage("Create or paste an execution intent id before recording execution.");
      return;
    }
    if (!form.txHashOrReceipt) {
      setMessage("Add an Arbiscan tx hash or receipt hash before recording execution.");
      return;
    }
    const contract = await executionRouterContract() as any;
    const tx = await contract.recordExecution(intentId, hashText(form.txHashOrReceipt), form.evidenceUri);
    await tx.wait();
    writeRecord({
      id: crypto.randomUUID(),
      type: "audit",
      title: `Execution evidence ${form.primaryVenue}`,
      status: "execution_recorded",
      amount: `${form.budgetEth} ETH budget`,
      txHash: tx.hash,
    });
    setMessage(`Execution evidence recorded: ${txUrl(tx.hash)}`);
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setMessage("Copied Arbitrum execution payload.");
  }

  async function copyZeroDevHandoff() {
    const handoff = {
      protocol: "arcpay-arbitrum-zerodev-sponsored-execution",
      chain: "arbitrum-sepolia",
      chainId: 421614,
      smartAccount: zeroDevProof?.smartAccount ?? "load-proof-first",
      sponsorPolicy: integrations?.integrations.zerodev.sponsorPolicy ?? "/api/zerodev/sponsor-policy",
      proof: zeroDevProof ? {
        txHash: zeroDevProof.txHash,
        explorerUrl: zeroDevProof.explorerUrl,
        action: zeroDevProof.action,
        agentSlug: zeroDevProof.slug,
        agentId: zeroDevProof.agentId,
      } : null,
      constraints: {
        requireArcPayPolicy: true,
        requireSponsorWebhookApproval: true,
        requireArbiscanTxHashForCompletion: true,
        maxNativeValueEth: integrations?.integrations.zerodev.maxNativeValueEth ?? "not-loaded",
      },
    };
    await navigator.clipboard.writeText(JSON.stringify(handoff, null, 2));
    setZeroDevMessage("Copied ZeroDev smart-account handoff.");
  }

  function useZeroDevProofAccount() {
    if (!zeroDevProof) {
      setZeroDevMessage("ZeroDev proof is still loading.");
      return;
    }
    setForm({
      ...form,
      adapter: "ZeroDev sponsored smart account",
      executionAddress: zeroDevProof.smartAccount,
      primaryVenue: "ZeroDev smart account",
      txHashOrReceipt: zeroDevProof.txHash,
      evidenceUri: zeroDevProof.explorerUrl,
      targetContract: zeroDevProof.target,
      calldataSummary: `${zeroDevProof.action} for ${zeroDevProof.slug}`,
    });
    setZeroDevMessage("Loaded the sponsored smart account, target contract, and proof tx into the execution form.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        eyebrow="Arbitrum execution"
        title="Agent execution handoff"
        description="Prepare and record policy-approved Arbitrum execution intents for GMX, ZeroDev, Dune, Fhenix, Robinhood Chain, or manual signers. ArcPay stores the execution envelope and final evidence on-chain."
        actions={<button type="button" onClick={copyPayload} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"><ClipboardCopy className="h-4 w-4" /> Copy payload</button>}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard icon={RouteIcon} label="Adapter" value="GMX/ZeroDev" hint="Execution path" emphasis />
        <StatCard icon={DatabaseZap} label="Dune" value="Evidence" hint="Analytics proof" />
        <StatCard icon={ShieldCheck} label="Policy" value="Required" hint="Budget first" />
        <StatCard icon={WalletCards} label="Assets" value="ETH/USDC" hint="WETH strategy-ready" />
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-orange-200/70 bg-[radial-gradient(circle_at_top_left,rgba(255,122,24,0.20),transparent_34%),linear-gradient(135deg,#fffaf2_0%,#f7efe3_52%,#fffdf8_100%)] shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                <Zap className="h-3.5 w-3.5" /> ZeroDev smart accounts
              </span>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Sponsored UserOp live
              </span>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-4xl">Gasless agent execution, embedded in ArcPay.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Operators can onboard a Kernel smart account, enforce ArcPay sponsor policy, and keep every sponsored execution attached to an Arbiscan transaction, agent id, and audit record.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" onClick={useZeroDevProofAccount} className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                    <Sparkles className="h-4 w-4" /> Use proof account
                  </button>
                  <button type="button" onClick={() => void copyZeroDevHandoff()} className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white/70 px-4 text-sm font-semibold">
                    <ClipboardCopy className="h-4 w-4" /> Copy handoff
                  </button>
                  {zeroDevProof?.explorerUrl ? (
                    <a href={zeroDevProof.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white/70 px-4 text-sm font-semibold">
                      Arbiscan proof <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live sponsor posture</div>
                <div className="mt-4 grid gap-3">
                  <ReadinessRow label="Project" value={integrations?.integrations.zerodev.projectId ?? "loading"} ready={Boolean(integrations?.integrations.zerodev.configured)} />
                  <ReadinessRow label="API key" value={integrations?.integrations.zerodev.apiKeyConfigured ? "configured" : "not configured"} ready={Boolean(integrations?.integrations.zerodev.apiKeyConfigured)} />
                  <ReadinessRow label="Webhook" value={integrations?.integrations.zerodev.sponsorPolicy ?? "loading"} ready={Boolean(integrations?.integrations.zerodev.sponsorPolicy)} />
                  <ReadinessRow label="Native cap" value={`${integrations?.integrations.zerodev.maxNativeValueEth ?? "..."} ETH`} ready />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-200/70 bg-white/55 p-6 md:p-7 xl:border-l xl:border-t-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProofMetric icon={WalletCards} label="Smart account" value={zeroDevProof ? shortAddress(zeroDevProof.smartAccount) : "loading"} />
              <ProofMetric icon={Gauge} label="Tx status" value={zeroDevProof?.txStatus ?? "loading"} />
              <ProofMetric icon={RouteIcon} label="Action" value={zeroDevProof?.action ?? "loading"} />
              <ProofMetric icon={DatabaseZap} label="Block" value={zeroDevProof?.blockNumber ?? "loading"} />
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof artifact</div>
              <div className="mt-2 break-all text-sm font-medium">{zeroDevProof?.txHash ?? "Loading sponsored transaction hash..."}</div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <span>Agent slug: {zeroDevProof?.slug ?? "loading"}</span>
                <span>Target: {zeroDevProof ? shortAddress(zeroDevProof.target) : "loading"}</span>
                <span>Endpoint: {zeroDevProof?.endpoint ?? "loading"}</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
              {zeroDevMessage}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <DatabaseZap className="h-4 w-4 text-primary" /> Dune evidence
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Public proof register</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Dune is wired as ArcPay's public evidence layer for contract addresses, proof artifacts, and execution links. Arbitrum Sepolia events still use ArcPay worker/API proof until Dune exposes dependable Sepolia event tables.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {integrations?.integrations.dune.evidenceUrl ? (
              <a href={integrations.integrations.dune.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background">
                Open Dune query <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            <button type="button" onClick={() => void navigator.clipboard.writeText(integrations?.integrations.dune.evidenceUrl ?? "https://dune.com/queries/7623300")} className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold">
              <ClipboardCopy className="h-4 w-4" /> Copy Dune link
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ProofMetric icon={DatabaseZap} label="Query" value={integrations?.integrations.dune.evidenceQueryId ? `#${integrations.integrations.dune.evidenceQueryId}` : "loading"} />
          <ProofMetric icon={CheckCircle2} label="MCP" value={integrations?.integrations.dune.mcpServer ?? "loading"} />
          <ProofMetric icon={ShieldCheck} label="Mode" value={integrations?.integrations.dune.configured ? "configured" : "public proof"} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form className="space-y-4 rounded-3xl border border-border bg-card p-5" onSubmit={(event) => { event.preventDefault(); void proposeIntent(); }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Handoff builder</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Arbitrum strategy envelope</h2>
            <p className="mt-1 text-sm text-muted-foreground">This creates an execution-ready payload. ArcPay keeps treasury policy, x402, on-chain records, and the final proof gate.</p>
          </div>
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium">{labelFor(key)}</span>
              {key === "objective" || key === "riskLimit" ? (
                <textarea className="mt-1.5 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
              ) : (
                <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
              )}
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-medium">Execution intent id</span>
            <input className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={intentId} onChange={(event) => setIntentId(event.target.value)} placeholder="0x... after proposeIntent" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" type="submit">Propose on-chain intent</button>
            <button className="h-12 rounded-xl border border-border px-5 font-semibold" type="button" onClick={() => void approveIntent()}>Approve intent</button>
            <button className="h-12 rounded-xl border border-border px-5 font-semibold" type="button" onClick={() => void recordExecution()}>Record execution</button>
          </div>
          <div className="rounded-xl border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div>
        </form>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Workflow className="h-4 w-4" /> Execution path
            </div>
            <div className="mt-5 grid gap-3">
              {SETUP_STEPS.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-muted/40 p-4 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {INTEGRATIONS.map((item) => (
              <article className="rounded-2xl border border-border bg-card p-5" key={item.label}>
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="mt-8 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">{item.label}</h3>
                <p className="mt-2 break-all text-xl font-semibold">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
              </article>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-[#101414] p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Payload preview</div>
                <h2 className="mt-1 text-xl font-semibold">Agent-readable execution context</h2>
              </div>
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl bg-black/35 p-4 text-xs leading-relaxed text-white/75">{JSON.stringify(payload, null, 2)}</pre>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
              <span>Registry {shortAddress(CONTRACTS.AgentRegistry)}</span>
              <span>OrderBook {shortAddress(CONTRACTS.AgentOrderBook)}</span>
              <span>Privacy {shortAddress(CONTRACTS.ArbitrumPrivacyVault)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function adapterId(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("zerodev")) return EXECUTION_ADAPTERS.ZeroDev;
  if (normalized.includes("dune")) return EXECUTION_ADAPTERS.Dune;
  if (normalized.includes("fhenix")) return EXECUTION_ADAPTERS.Fhenix;
  if (normalized.includes("robinhood")) return EXECUTION_ADAPTERS.RobinhoodChain;
  if (normalized.includes("manual")) return EXECUTION_ADAPTERS.Manual;
  return EXECUTION_ADAPTERS.GMX;
}

function ReadinessRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <div className="mt-1 max-w-[18rem] truncate text-sm font-medium">{value}</div>
      </div>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ready ? "bg-emerald-500" : "bg-muted-foreground/35"}`} />
    </div>
  );
}

function ProofMetric({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}
