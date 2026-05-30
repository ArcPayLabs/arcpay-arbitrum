"use client";

import Link from "next/link";
import { BookOpen, Bot, CheckCircle2, Code2, CreditCard, ExternalLink, FileText, Gauge, KeyRound, Lock, Network, RadioTower, ScrollText, ShieldCheck, Terminal, WalletCards, Workflow } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import deployment from "../../../../../deployments/arbitrum-sepolia.json";

export const Route = { options: { component: DocsPage } };

const MODULES = [
  { icon: Bot, title: "Agent registry", body: "Publish agent capability metadata, endpoint URLs, ETH pricing, and active status on Arbitrum.", href: "/app/agents" },
  { icon: Workflow, title: "Order book", body: "Escrow ETH for autonomous work and reconcile pending, processing, fulfilled, settled, refunded, or failed states.", href: "/app/orders" },
  { icon: RadioTower, title: "x402 server", body: "Expose paid HTTP resources that quote exact Arbitrum requirements and unlock after on-chain fulfillment.", href: "/app/x402" },
  { icon: WalletCards, title: "Invoices", body: "Create, pay, cancel, and sync ETH/USDC receivables through AgentInvoiceBook.", href: "/app/invoices" },
  { icon: CreditCard, title: "USDC cards", body: "Give agents bounded token budgets with top-up, freeze, activate, and spend controls.", href: "/app/cards" },
  { icon: ShieldCheck, title: "Policy engine", body: "Enforce time windows, allowlists, spend caps, approval thresholds, and emergency pause before treasury actions.", href: "/app/policies" },
  { icon: Lock, title: "Privacy intents", body: "Commit encrypted payment metadata first, release later with recipient, nullifier, and audit evidence.", href: "/app/privacy" },
  { icon: Gauge, title: "Risk oracle", body: "Quote the live Arbitrum agent requester deposit and store risk callback evidence for operator review.", href: "/app/oracle" },
  { icon: KeyRound, title: "Wallet auth", body: "Challenge-sign EVM wallets into an ArcPay workspace. Email auth remains optional for team sync.", href: "/sign-in" },
  { icon: ScrollText, title: "Audit mirror", body: "Azure worker indexes contract events into Supabase-backed records for dashboard and CSV export.", href: "/app/audit" },
  { icon: Terminal, title: "CLI and MCP", body: "Use the repo-local CLI now; npm packages are package-ready and can be published once npm auth is available.", href: "/proofs" },
  { icon: BookOpen, title: "MCP, starter kit, llms.txt", body: "Published MCP tools, x402 starter package, OpenAPI, and llms.txt help autonomous clients operate ArcPay.", href: "/proofs" },
];

const QUICKSTART = [
  "Connect an EVM wallet and switch to Arbitrum Sepolia.",
  "Register an agent with endpoint, capabilities, and ETH price.",
  "Set policy limits and allowlist the agent.",
  "Create an order or x402 payment, then fulfill and settle it.",
  "Create a USDC card, invoice, or privacy intent for treasury operations.",
  "Review records in Audit and export evidence.",
];

const COMMANDS = [
  "npm run build:frontend",
  "npm test",
  "npm run smoke:auth",
  "npm run smoke:live",
  "npm run smoke:x402",
  "npm run worker:once",
];

function DocsPage() {
  const contracts = Object.entries((deployment as { contracts: Record<string, string> }).contracts);

  return (
    <MarketingShell navTone="light">
      <main className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[88rem]">
          <SectionHeading
            align="center"
            eyebrow="Docs"
            title={<>Operate an <span className="text-primary">agent treasury</span> on Arbitrum.</>}
            description="A practical map for using ArcPay as a wallet-first operating account: agents, x402, invoices, policy, privacy intents, worker indexing, and audit exports."
          />

          <section className="mt-12 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-border bg-card p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Network className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Arbitrum runtime</h2>
                  <p className="text-sm text-muted-foreground">Fixed to testnet for predictable operator flows.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Info label="Network" value="Arbitrum Sepolia" />
                <Info label="Chain ID" value="421614 / 0x66eee" />
                <Info label="Gas" value="ETH" />
                <Info label="x402" value="https://arcpay-arbitrum.vercel.app/api" mono />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/sign-in" className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">Open app</Link>
                <a href="/openapi.json" target="_blank" rel="noreferrer" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">OpenAPI</a>
                <a href="/llms.txt" target="_blank" rel="noreferrer" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">llms.txt</a>
                <a href="https://sepolia.arbiscan.io" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold">
                  Explorer <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border bg-muted/40 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/15 text-success"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Operator quickstart</h2>
                  <p className="text-sm text-muted-foreground">The shortest path to a verifiable treasury action.</p>
                </div>
              </div>
              <ol className="mt-6 space-y-3">
                {QUICKSTART.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold">{index + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Product modules</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">What is live in the app</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((item) => (
                <Link key={item.title} href={item.href} className="rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Verify locally</h2>
              </div>
              <div className="mt-5 space-y-2">
                {COMMANDS.map((cmd) => <code key={cmd} className="block rounded-2xl bg-muted px-4 py-3 text-sm">{cmd}</code>)}
              </div>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
              <div className="border-b border-border px-6 py-4 text-sm font-semibold">Deployed contracts</div>
              <div className="max-h-[29rem] divide-y divide-border overflow-auto">
                {contracts.map(([name, address]) => (
                  <a key={name} href={`https://sepolia.arbiscan.io/address/${address}`} target="_blank" rel="noreferrer" className="grid gap-2 px-6 py-4 text-sm hover:bg-muted/50 md:grid-cols-[220px_1fr_24px] md:items-center">
                    <span className="font-semibold">{name}</span>
                    <span className="truncate font-mono text-muted-foreground">{address}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-2 truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
