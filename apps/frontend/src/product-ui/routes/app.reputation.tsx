"use client";

import { useState } from "react";
import { Award, BarChart3, CheckCircle2, MessageSquareWarning, Star, Trophy } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { agentIdFromSlug, reputationBookContract, shortAddress, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: ReputationRoute } };

type ReputationRow = {
  agentId: string;
  reviewCount: string;
  score: string;
  completed: string;
  disputes: string;
  lastUpdated: string;
};

function ReputationRoute() {
  const [form, setForm] = useState({
    agentSlug: "research-agent",
    orderId: "",
    score: "92",
    disputed: false,
    evidenceUri: "ipfs://arcpay-reputation/research-agent-review",
  });
  const [row, setRow] = useState<ReputationRow | null>(null);
  const [status, setStatus] = useState("Record reputation only after a real Arbitrum order reaches fulfilled, settled, refunded, or failed state.");

  const agentId = agentIdFromSlug(form.agentSlug);

  async function loadReputation() {
    const contract = await reputationBookContract() as any;
    const [reputation, score] = await Promise.all([
      contract.reputations(agentId),
      contract.reputationScore(agentId),
    ]);
    setRow({
      agentId,
      reviewCount: reputation.reviewCount.toString(),
      score: score.toString(),
      completed: reputation.completedCount.toString(),
      disputes: reputation.disputeCount.toString(),
      lastUpdated: reputation.lastUpdatedAt > 0n ? new Date(Number(reputation.lastUpdatedAt) * 1000).toLocaleString() : "No reviews",
    });
    setStatus(`Loaded reputation for ${form.agentSlug}.`);
  }

  async function recordReview() {
    if (!form.orderId.trim()) {
      setStatus("Paste a real AgentOrderBook order ID first.");
      return;
    }
    const score = Number(form.score);
    if (!Number.isInteger(score) || score < 1 || score > 100) {
      setStatus("Score must be an integer from 1 to 100.");
      return;
    }

    setStatus("Submitting reputation review...");
    const contract = await reputationBookContract() as any;
    const tx = await contract.recordReview(form.orderId.trim(), agentId, score, form.disputed, form.evidenceUri.trim());
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "reputation", title: `Reviewed ${form.agentSlug}`, status: form.disputed ? "disputed" : "recorded", amount: form.score, txHash: tx.hash });
    setStatus(`Reputation review recorded: ${tx.hash}`);
    await loadReputation();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Trophy}
        eyebrow="Agent trust"
        title="Reputation"
        description="Record order-backed reputation for Arbitrum agents. Only order participants can review, and duplicate reviews are blocked on-chain."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Star} label="Score" value={row?.score ?? "--"} hint="Average on-chain score" />
        <StatCard icon={Award} label="Reviews" value={row?.reviewCount ?? "--"} hint="Order-backed reviews" />
        <StatCard icon={CheckCircle2} label="Completed" value={row?.completed ?? "--"} hint="Fulfilled or settled" />
        <StatCard icon={MessageSquareWarning} label="Disputes" value={row?.disputes ?? "--"} hint="Disputed or failed" emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Record order review</h2>
          <div className="mt-5 grid gap-4">
            <Field label="Agent slug">
              <input className="ap-in" value={form.agentSlug} onChange={(event) => setForm({ ...form, agentSlug: event.target.value })} />
            </Field>
            <Field label="Order ID">
              <input className="ap-in font-mono" value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} placeholder="0x..." />
            </Field>
            <Field label="Score">
              <input className="ap-in" value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} />
            </Field>
            <Field label="Evidence URI">
              <input className="ap-in" value={form.evidenceUri} onChange={(event) => setForm({ ...form, evidenceUri: event.target.value })} />
            </Field>
            <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4 text-sm font-medium">
              Mark as dispute
              <input type="checkbox" checked={form.disputed} onChange={(event) => setForm({ ...form, disputed: event.target.checked })} />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => void recordReview()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Record review</button>
            <button onClick={() => void loadReputation()} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Load reputation</button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Agent reputation state</h2>
          {row ? (
            <div className="mt-5 space-y-3">
              <Row label="Agent ID" value={shortAddress(row.agentId)} mono />
              <Row label="Average score" value={row.score} />
              <Row label="Reviews" value={row.reviewCount} />
              <Row label="Completed" value={row.completed} />
              <Row label="Disputes" value={row.disputes} />
              <Row label="Last updated" value={row.lastUpdated} />
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={BarChart3}
                title="No reputation loaded"
                description="Load an agent slug to inspect its on-chain review count, average score, completion count, and dispute count."
                actionLabel="Load reputation"
                onAction={() => void loadReputation()}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>{children}</label>;
}

function Row({ label, value, mono }: { readonly label: string; readonly value: string; readonly mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-muted/50 p-3">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className={`max-w-[70%] truncate text-right text-sm ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}
