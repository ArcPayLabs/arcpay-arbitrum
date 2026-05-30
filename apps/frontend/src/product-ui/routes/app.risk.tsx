"use client";

import { useMemo, useState } from "react";
import { Ban, Search, Shield, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { readLocalJson, writeLocalJson } from "@/lib/browser-cache";
import { loadSavedPolicySettings } from "@/lib/policy";
import { shortAddress, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: RiskPage } };

type RiskLookup = {
  wallet: string;
  score: number;
  txCount: number;
  balanceCount: number;
  recommendation: "APPROVE" | "REVIEW" | "REJECT";
  reasons: string[];
};

const STORAGE_KEY = "arcpay-arbitrum-risk";

function RiskPage() {
  const cached = readLocalJson(STORAGE_KEY, { query: "", lookup: null as RiskLookup | null, history: [] as RiskLookup[] });
  const minScore = loadSavedPolicySettings()?.minScore ?? 60;
  const [query, setQuery] = useState(cached.query);
  const [lookup, setLookup] = useState<RiskLookup | null>(cached.lookup);
  const [history, setHistory] = useState<RiskLookup[]>(cached.history);
  const [message, setMessage] = useState("Score Arbitrum counterparties before payments, card funding, and agent order execution.");

  const stats = useMemo(() => ({
    approved: history.filter((item) => item.recommendation === "APPROVE").length,
    review: history.filter((item) => item.recommendation === "REVIEW").length,
    rejected: history.filter((item) => item.recommendation === "REJECT").length,
  }), [history]);

  function runLookup() {
    const wallet = query.trim();
    if (!wallet) return;
    const result = scoreArbitrumWallet(wallet, minScore);
    const nextHistory = [result, ...history.filter((item) => item.wallet !== wallet)].slice(0, 10);
    setLookup(result);
    setHistory(nextHistory);
    writeLocalJson(STORAGE_KEY, { query, lookup: result, history: nextHistory });
    writeRecord({ id: crypto.randomUUID(), type: "risk", title: `Scored ${shortAddress(wallet)} as ${result.recommendation}`, status: result.recommendation.toLowerCase(), amount: String(result.score) });
    setMessage(`Arbitrum risk score generated for ${shortAddress(wallet)}.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Treasury intelligence"
        title="Risk"
        description="Score a Arbitrum counterparty wallet with the agent risk model before allowing treasury payments, cards, or order settlement."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Approved" value={stats.approved} hint="Current session" />
        <StatCard icon={Shield} label="Review queue" value={stats.review} hint="Operator approval required" />
        <StatCard icon={Ban} label="Rejected" value={stats.rejected} hint="Policy blocked" />
        <StatCard icon={Sparkles} label="Risk floor" value={minScore} hint="Policy setting" emphasis />
      </div>

      <section className="rounded-3xl bg-surface-dark p-6 text-surface-dark-foreground">
        <div className="text-xs uppercase tracking-[0.18em] text-white/50">Counterparty lookup</div>
        <h2 className="mt-1 text-3xl font-medium tracking-tight">Score any Arbitrum wallet</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          This testnet model uses deterministic wallet features, local activity count, and policy floor. It is built to be swapped into a live Arbitrum oracle as ecosystem risk feeds mature.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runLookup();
              }}
              placeholder="Paste a Arbitrum EVM address"
              className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 font-mono text-sm outline-none placeholder:text-white/30 focus:border-primary"
            />
          </div>
          <button onClick={runLookup} disabled={!query.trim()} className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            Score wallet
          </button>
        </div>

        {lookup && (
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-5">
              <div className="text-xs text-white/50">Arbitrum score</div>
              <div className={`mt-1 text-5xl font-medium tracking-tight ${scoreTone(lookup.score)}`}>{lookup.score}</div>
              <div className="mt-2 font-mono text-xs text-white/40">{lookup.wallet}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-white/50">Verdict</div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictBadge(lookup.recommendation)}`}>{lookup.recommendation}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {lookup.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-white/75"><span className="mt-2 h-1 w-1 rounded-full bg-primary" />{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{message}</div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-4 text-sm font-semibold">Lookup history</div>
        <div className="divide-y divide-border">
          {history.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={ShieldAlert}
                title="No scored wallets"
                description="Paste a Arbitrum address to generate a policy-aware counterparty score before payments, cards, invoices, or order settlement."
              />
            </div>
          ) : null}
          {history.map((item) => (
            <div key={item.wallet} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
              <div className="font-mono text-xs text-muted-foreground md:col-span-5">{item.wallet}</div>
              <div className={`font-mono md:col-span-2 ${scoreTone(item.score)}`}>{item.score}</div>
              <div className="text-muted-foreground md:col-span-2">{item.txCount} observed actions</div>
              <div className="md:col-span-3 md:text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdictBadge(item.recommendation)}`}>{item.recommendation}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function scoreArbitrumWallet(wallet: string, minScore: number): RiskLookup {
  let seed = 0;
  for (const char of wallet.toLowerCase()) seed = (seed * 31 + char.charCodeAt(0)) % 9973;
  const txCount = seed % 42;
  const balanceCount = 1 + (seed % 5);
  const score = Math.min(99, Math.max(20, 35 + txCount + balanceCount * 5));
  const recommendation = score >= minScore ? "APPROVE" : score >= Math.max(35, minScore - 20) ? "REVIEW" : "REJECT";
  return {
    wallet,
    score,
    txCount,
    balanceCount,
    recommendation,
    reasons: [
      `Deterministic Arbitrum score calculated from wallet entropy and observed action model.`,
      `${txCount} modeled recent actions and ${balanceCount} modeled balance rows.`,
      `Policy recommendation: ${recommendation}.`,
    ],
  };
}

function scoreTone(score: number) {
  if (score >= 70) return "text-success";
  if (score >= 45) return "text-warning";
  return "text-destructive";
}

function verdictBadge(verdict: RiskLookup["recommendation"]) {
  if (verdict === "APPROVE") return "bg-success/20 text-success";
  if (verdict === "REVIEW") return "bg-warning/30 text-warning";
  return "bg-destructive/30 text-destructive";
}
