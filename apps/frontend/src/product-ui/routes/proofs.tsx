"use client";

import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import deployment from "../../deployment/arbitrum-sepolia.json";

export const Route = createFileRoute("/proofs")({
  head: () => ({
    meta: [
      { title: "Trust Center - ArcPay Arbitrum" },
      { name: "description", content: "Arbitrum contract deployment, worker, MCP, CLI, and frontend verification evidence." },
    ],
  }),
  component: ProofsPage,
});

type Status = "live" | "testnet" | "local" | "package-ready";

const STATUS_STYLE: Record<Status, string> = {
  live: "bg-success/15 text-success",
  testnet: "bg-warning/25 text-warning-foreground",
  local: "bg-muted text-muted-foreground",
  "package-ready": "bg-muted text-muted-foreground",
};

const CHECKS: { surface: string; status: Status; evidence: string }[] = [
  { surface: "Arbitrum Sepolia contracts", status: "testnet", evidence: "AgentRegistry, TreasuryPolicy, AgentOrderBook, OperatorControls, RiskOracle, SpendCardVault, PrivacyVault, AgentInvoiceBook, and AgentReputationBook are deployed on chain 421614." },
  { surface: "Funded live smoke", status: "testnet", evidence: "npm run smoke:live performs live writes for registry, policy, escrowed orders, reputation reviews, operator controls, USDC cards, privacy release, on-chain invoice settlement, and Arbitrum agent risk fulfillment." },
  { surface: "x402 payment gate", status: "testnet", evidence: "npm run smoke:x402 starts the HTTP 402 server, registers an agent, creates an on-chain order, fulfills it, unlocks the protected resource, and settles." },
  { surface: "Auth and workspace smoke", status: "live", evidence: "npm run smoke:auth verifies Supabase records, email sign-in workspace upsert, wallet workspace creation, and Arbitrum contract reads." },
  { surface: "Frontend", status: "live", evidence: "Next.js product UI builds successfully with Arbitrum-only wallet/auth/dashboard content." },
  { surface: "Worker", status: "local", evidence: "Worker code check passes and is configured to listen to Arbitrum registry, policy, treasury, order, card, operator, privacy, invoice, risk, and reputation events after hosting." },
  { surface: "Tests", status: "local", evidence: "Hardhat test suite covers order lifecycle, approvals, emergency pause, weekly limit, cards, claim codes, circuit breakers, oracle, privacy vault, invoice settlement, and reputation reviews." },
  { surface: "Agent docs", status: "live", evidence: "skill.md, /llms.txt, and /openapi.json describe how AI agents should interact with ArcPay." },
  { surface: "MCP, CLI, starter kit", status: "package-ready", evidence: "Package dry-runs pass for @arcpaylabs/arbitrum-cli, @arcpaylabs/arbitrum-mcp, and @arcpaylabs/arbitrum-x402-agent-starter; publish after npm auth is available." },
];

function ProofsPage() {
  const contracts = Object.entries((deployment as { contracts: Record<string, string> }).contracts);

  return (
    <MarketingShell navTone="light">
      <div className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[88rem]">
          <SectionHeading
            eyebrow="Trust center"
            title={<>Infrastructure that matches the <span className="text-primary">live build</span>.</>}
            description="ArcPay publishes its Arbitrum contracts, verification commands, worker surface, x402 server, and agent tooling so operators can inspect the stack before relying on it."
          />

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border px-6 py-4 text-sm font-semibold">Verification checklist</div>
              <div className="divide-y divide-border">
                {CHECKS.map((row) => (
                  <div key={row.surface} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_120px_1.8fr] md:items-center">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-success" /> {row.surface}
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground">{row.evidence}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <div className="text-sm font-semibold">Verify locally</div>
              <div className="mt-4 space-y-3">
                {["npm run build:frontend", "npm test", "npm run check:worker", "npm run check:x402", "npm run smoke:auth", "npm run smoke:live", "npm run smoke:x402"].map((cmd) => (
                  <code key={cmd} className="block rounded-2xl bg-muted px-4 py-3 text-sm">{cmd}</code>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                Network: Arbitrum Sepolia, chain {String((deployment as { chainId: number }).chainId)}. Currency: ETH.
              </div>
            </section>
          </div>

          <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border px-6 py-4 text-sm font-semibold">Deployed contracts</div>
            <div className="divide-y divide-border">
              {contracts.map(([name, address]) => (
                <a
                  key={name}
                  href={`https://sepolia.arbiscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid gap-2 px-6 py-4 text-sm hover:bg-muted/50 md:grid-cols-[260px_1fr_24px] md:items-center"
                >
                  <span className="font-semibold">{name}</span>
                  <span className="font-mono text-muted-foreground">{address}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
