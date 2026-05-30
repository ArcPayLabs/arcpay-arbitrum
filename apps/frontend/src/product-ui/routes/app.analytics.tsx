"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Activity, BarChart3, Bot, KeyRound, RefreshCw, Users, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/primitives/StatCard";

export const Route = createFileRoute("/app/analytics")({
  component: AnalyticsRoute,
});

type CountRow = { name: string; count: number };
type Analytics = {
  ok: boolean;
  reason?: string;
  generatedAt: string;
  totals: {
    usageEvents: number;
    usageEvents24h: number;
    betaSignups: number;
    activeBeta: number;
    developerKeys: number;
    activeDeveloperKeys: number;
    records: number;
    txRecords: number;
    uniqueOwners: number;
    uniqueAgents: number;
  };
  eventsByType: CountRow[];
  events24hByType: CountRow[];
  recordsByType: CountRow[];
  betaByStatus: CountRow[];
  topTools: CountRow[];
  topAgents: CountRow[];
  recentEvents: Array<{ event_type: string; owner: string | null; agent_slug: string | null; source: string | null; tool_name: string | null; status: string | null; created_at: string }>;
};

function AnalyticsRoute() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [status, setStatus] = useState("Load usage analytics from Supabase.");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load analytics.");
      setAnalytics(body);
      setStatus(body.ok ? "Usage analytics loaded." : body.reason ?? "Analytics source unavailable.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = analytics?.totals;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        eyebrow="Usage analytics"
        title="Agent and developer adoption."
        description="Track beta signups, active wallets, x402 usage, MCP/developer tool calls, and indexed on-chain records from one admin view."
        actions={
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard icon={Activity} label="Usage Events" value={totals?.usageEvents ?? "--"} hint={`${totals?.usageEvents24h ?? 0} in 24h`} />
        <StatCard icon={Users} label="Beta Signups" value={totals?.betaSignups ?? "--"} hint={`${totals?.activeBeta ?? 0} active`} />
        <StatCard icon={KeyRound} label="Dev Keys" value={totals?.developerKeys ?? "--"} hint={`${totals?.activeDeveloperKeys ?? 0} active`} />
        <StatCard icon={WalletCards} label="Audit Records" value={totals?.records ?? "--"} hint={`${totals?.txRecords ?? 0} with tx hash`} />
        <StatCard icon={Bot} label="Agents" value={totals?.uniqueAgents ?? "--"} hint={`${totals?.uniqueOwners ?? 0} unique owners`} emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{status}</div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CountPanel title="Events by type" rows={analytics?.eventsByType ?? []} />
        <CountPanel title="Last 24h events" rows={analytics?.events24hByType ?? []} />
        <CountPanel title="Records by type" rows={analytics?.recordsByType ?? []} />
        <CountPanel title="Beta by status" rows={analytics?.betaByStatus ?? []} />
        <CountPanel title="Top developer tools" rows={analytics?.topTools ?? []} />
        <CountPanel title="Top agents" rows={analytics?.topAgents ?? []} />
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold">Recent usage events</div>
        <div className="divide-y divide-border">
          {analytics?.recentEvents.map((event, index) => (
            <div key={`${event.created_at}-${index}`} className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr_180px] md:items-center">
              <div className="font-medium">{event.event_type}</div>
              <div className="text-sm text-muted-foreground">
                {event.tool_name ? `tool: ${event.tool_name}` : event.agent_slug ? `agent: ${event.agent_slug}` : event.source}
                {event.owner ? ` - ${short(event.owner)}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!analytics?.recentEvents.length ? (
            <div className="p-6">
              <EmptyState icon={BarChart3} title="No usage events yet" description="Usage events appear after beta signups, MCP calls, developer tool calls, records, or x402 actions." />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CountPanel({ title, rows }: { title: string; rows: CountRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{row.name}</span>
              <span className="font-semibold">{row.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {!rows.length ? <div className="text-sm text-muted-foreground">No data yet.</div> : null}
      </div>
    </section>
  );
}

function short(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
