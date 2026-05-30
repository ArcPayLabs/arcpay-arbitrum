"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Copy, DatabaseZap, ExternalLink, PlugZap, Plus, Sparkles, Workflow } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { agentIdFromSlug, fromWei, registryContract, shortAddress, toWei, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: AgentsRoute } };

function AgentsRoute() {
  const [form, setForm] = useState({
    slug: "research-agent",
    name: "Treasury Research Agent",
    endpoint: "https://example.com/arbitrum-agent/research",
    capabilities: "risk-scoring, invoice-review, payment-routing",
    price: "0.01",
  });
  const [agent, setAgent] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState("Register an agent so other Arbitrum agents can discover and hire it.");
  const [template, setTemplate] = useState<(typeof AGENT_TEMPLATES)[number]>(AGENT_TEMPLATES[0]);
  const [copied, setCopied] = useState("");

  const agentId = agentIdFromSlug(form.slug);
  const protectedUrl = `https://arbitrum-x402.20.208.46.195.nip.io/agent/${encodeURIComponent(form.slug)}/work`;

  async function registerAgent() {
    setStatus("Submitting agent registry transaction...");
    const contract = await registryContract() as any;
    const tx = await contract.registerAgent(agentId, form.name, form.endpoint, form.capabilities, toWei(form.price));
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "agent", title: `Registered ${form.name}`, status: "confirmed", txHash: tx.hash });
    setStatus(`Agent registered on Arbitrum: ${tx.hash}`);
    await loadAgent();
  }

  async function loadAgent() {
    const contract = await registryContract() as any;
    const next = await contract.agents(agentId);
    setAgent({
      id: agentId,
      owner: next[0],
      name: next[1],
      endpoint: next[2],
      capabilities: next[3],
      price: fromWei(next[4]),
      active: String(next[5]),
    });
    setStatus("Agent loaded from Arbitrum registry.");
  }

  function applyTemplate(next: (typeof AGENT_TEMPLATES)[number]) {
    setTemplate(next);
    setForm({
      slug: next.slug,
      name: next.name,
      endpoint: next.endpoint,
      capabilities: next.capabilities,
      price: next.price,
    });
    setStatus(`${next.name} template loaded. Review endpoint, price, and capabilities before registering.`);
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    setStatus(`${label} copied.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        eyebrow="Agent discovery"
        title="Agents"
        description="Publish agent capability metadata, endpoints, and ETH pricing into the Arbitrum registry so autonomous clients can discover and hire services."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={Bot} label="Registry" value="Live" hint="Arbitrum contract" />
        <StatCard icon={Sparkles} label="Price" value={`${form.price} ETH`} hint="Per service call" />
        <StatCard icon={DatabaseZap} label="Capabilities" value={form.capabilities.split(",").length} hint="Discovery tags" emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>

      <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <PlugZap className="h-3.5 w-3.5" /> Bring your own agent
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Publish any Arbitrum-ready service endpoint.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Register a slug, capability metadata, HTTPS endpoint, and ETH price. ArcPay turns that into a discoverable service that can be paid through the live x402 gateway and governed by treasury policy.
            </p>
          </div>
          <a href="https://docs.arbitrum.network/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold">
            Arbitrum docs <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {AGENT_TEMPLATES.map((item) => (
            <button
              type="button"
              key={item.slug}
              onClick={() => applyTemplate(item)}
              className={`rounded-2xl border p-4 text-left transition hover:border-primary/60 ${template.slug === item.slug ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold tracking-tight">{item.name}</div>
                {template.slug === item.slug ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.capabilities}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Workflow className="h-4 w-4" /> Onboarding path
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Expose an HTTPS endpoint for your agent service.",
                "Register the slug, capabilities, endpoint, and ETH price on Arbitrum.",
                "Use x402 payment requirements so clients can pay before work unlocks.",
                "Let ArcPay policy, audit records, and privacy intents govern the work.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-muted/40 p-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Builder payload</div>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-foreground p-4 text-xs text-background">{JSON.stringify({
              slug: form.slug,
              agentId,
              endpoint: form.endpoint,
              capabilities: form.capabilities.split(",").map((item) => item.trim()).filter(Boolean),
              priceStt: form.price,
              x402ProtectedUrl: protectedUrl,
              network: "Arbitrum Sepolia",
              chainId: 421614,
            }, null, 2)}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copy(agentId, "Agent ID")} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Copy ID</button>
              <button type="button" onClick={() => void copy(protectedUrl, "x402 URL")} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Copy x402 URL</button>
              <button type="button" onClick={() => void copy(templateSnippet(form.slug), "Starter snippet")} className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background"><Copy className="h-3.5 w-3.5" /> Copy starter snippet</button>
              {copied ? <span className="px-2 py-2 text-xs font-medium text-muted-foreground">{copied} ready.</span> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Register service agent</h2>
          <div className="mt-5 grid gap-4">
            {Object.entries(form).map(([key, value]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{key}</span>
                <input value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="ap-in" />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => void registerAgent()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Register on Arbitrum
            </button>
            <button onClick={() => void loadAgent()} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Load by slug</button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Registry result</h2>
          {agent ? (
            <div className="mt-5 space-y-3">
              {Object.entries(agent).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-2xl bg-muted/50 p-3">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{key}</span>
                  <span className="max-w-[70%] truncate text-right font-mono text-sm">{key === "owner" || key === "id" ? shortAddress(value) : value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={Bot}
                title="No agent loaded"
                description="Register a Arbitrum service agent or load an existing slug to inspect its endpoint, price, capabilities, and registry owner."
                actionLabel="Load by slug"
                onAction={() => void loadAgent()}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const AGENT_TEMPLATES = [
  {
    slug: "research-agent",
    name: "Treasury Research Agent",
    endpoint: "https://example.com/arbitrum-agent/research",
    capabilities: "risk-scoring, invoice-review, payment-routing",
    price: "0.01",
    description: "Paid research endpoint for counterparty checks, invoice context, and treasury recommendations.",
  },
  {
    slug: "routing-agent",
    name: "Real-Time Routing Agent",
    endpoint: "https://example.com/arbitrum-agent/routing",
    capabilities: "real-time-routing, policy-checks, x402-quotes",
    price: "0.005",
    description: "Arbitrum-speed payment coordinator for route intents, x402 quotes, and policy-safe execution plans.",
  },
  {
    slug: "privacy-agent",
    name: "Privacy Intent Agent",
    endpoint: "https://example.com/arbitrum-agent/privacy",
    capabilities: "privacy-intents, encrypted-memos, disclosure-reports",
    price: "0.008",
    description: "Agent service for encrypted memo pointers, recipient disclosure workflows, and audit-safe privacy reports.",
  },
] as const;

function templateSnippet(slug: string) {
  return [
    `const res = await fetch("https://arbitrum-x402.20.208.46.195.nip.io/agent/${encodeURIComponent(slug)}/work");`,
    "if (res.status === 402) {",
    "  const quote = await res.json();",
    "  // Pay quote.accepts[0] through AgentOrderBook.createOrder(agentId, requestUri).",
    "}",
  ].join("\n");
}
