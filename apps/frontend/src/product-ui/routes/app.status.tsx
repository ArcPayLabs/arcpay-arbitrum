"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/primitives/StatCard";

export const Route = createFileRoute("/app/status")({
  component: StatusRoute,
});

type HealthState = "ok" | "degraded" | "down" | "unknown";

type RuntimeCheck = {
  name: string;
  state: HealthState;
  summary: string;
  detail?: string;
  checkedAt: string;
};

type RuntimeStatus = {
  ok: boolean;
  generatedAt: string;
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
  };
  checks: RuntimeCheck[];
};

const STATE_STYLE: Record<HealthState, string> = {
  ok: "bg-success/15 text-success",
  degraded: "bg-warning/25 text-warning-foreground",
  down: "bg-destructive/15 text-destructive",
  unknown: "bg-muted text-muted-foreground",
};

function StatusRoute() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const body = await response.json();
      setStatus(body);
      if (!response.ok && response.status !== 207) setError(body?.error ?? "Status check failed.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = countStates(status?.checks ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        eyebrow="Runtime status"
        title="ArcPay Arbitrum system health."
        description="Live checks for the Arbitrum RPC, deployed contracts, x402 gateway, Mintlify docs, and worker-indexed audit records."
        actions={
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Healthy" value={counts.ok} hint="Passing checks" />
        <StatCard icon={AlertTriangle} label="Degraded" value={counts.degraded} hint="Needs attention" />
        <StatCard icon={Server} label="Network" value={status?.network.chainId ?? "--"} hint={status?.network.name ?? "Arbitrum Sepolia"} />
        <StatCard icon={Activity} label="Generated" value={status ? new Date(status.generatedAt).toLocaleTimeString() : "--"} hint="No cached result" emphasis />
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <div className="text-sm font-semibold">Live surfaces</div>
            <div className="text-xs text-muted-foreground">These checks are server-side and use production/testnet endpoints.</div>
          </div>
          {status ? (
            <a href={status.network.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold">
              Explorer <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>

        <div className="divide-y divide-border">
          {status?.checks.map((check) => (
            <div key={check.name} className="grid gap-3 px-6 py-5 md:grid-cols-[220px_120px_1fr] md:items-center">
              <div className="flex items-center gap-2 font-medium">
                {check.state === "ok" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                {check.name}
              </div>
              <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[check.state]}`}>{check.state}</span></div>
              <div>
                <div className="text-sm">{check.summary}</div>
                {check.detail ? <div className="mt-1 break-all text-xs text-muted-foreground">{check.detail}</div> : null}
              </div>
            </div>
          ))}

          {!status?.checks.length ? (
            <div className="p-6">
              <EmptyState
                icon={Activity}
                title={loading ? "Checking runtime..." : "No status checks loaded"}
                description={loading ? "ArcPay is checking RPC, contracts, x402, docs, and worker records." : "Refresh the status page to run the checks again."}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function countStates(checks: RuntimeCheck[]) {
  return checks.reduce((acc, check) => {
    acc[check.state] += 1;
    return acc;
  }, { ok: 0, degraded: 0, down: 0, unknown: 0 } as Record<HealthState, number>);
}
