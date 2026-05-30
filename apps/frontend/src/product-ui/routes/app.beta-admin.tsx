"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/primitives/StatCard";

export const Route = createFileRoute("/app/beta-admin")({
  component: BetaAdminRoute,
});

type BetaSignup = {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  telegram: string | null;
  wallet_address: string | null;
  role: string | null;
  use_case: string | null;
  agent_url: string | null;
  status: "new" | "invited" | "active" | "paused" | "rejected";
};

const STATUSES: BetaSignup["status"][] = ["new", "invited", "active", "paused", "rejected"];

function BetaAdminRoute() {
  const [rows, setRows] = useState<BetaSignup[]>([]);
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("Load beta requests from Supabase.");
  const [loading, setLoading] = useState(false);

  async function load(nextFilter = filter) {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/beta?status=${encodeURIComponent(nextFilter)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load beta requests.");
      setRows(body.rows ?? []);
      setStatus("Beta queue loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function update(id: string, nextStatus: BetaSignup["status"]) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/beta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not update beta request.");
      setStatus(`Marked request as ${nextStatus}.`);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => ({
    total: rows.length,
    new: rows.filter((row) => row.status === "new").length,
    active: rows.filter((row) => row.status === "active").length,
    invited: rows.filter((row) => row.status === "invited").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Beta operations"
        title="Private beta queue."
        description="Review Arbitrum builders, invite operators, and track active beta testers from the production signup table."
        actions={
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="Loaded" value={counts.total} hint="Current filter" />
        <StatCard icon={UserCheck} label="New" value={counts.new} hint="Needs review" />
        <StatCard icon={UserCheck} label="Invited" value={counts.invited} hint="Ready to onboard" />
        <StatCard icon={UserCheck} label="Active" value={counts.active} hint="Using beta" emphasis />
      </div>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {["all", ...STATUSES].map((item) => (
            <button
              key={item}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${filter === item ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
              onClick={() => {
                setFilter(item);
                void load(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{status}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold">Requests</div>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-4 px-6 py-5 xl:grid-cols-[1fr_180px_240px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold">{row.name || "Unnamed builder"}</div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{row.status}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{row.email} {row.telegram ? `- ${row.telegram}` : ""}</div>
                <div className="mt-3 text-sm leading-6">{row.use_case}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {row.role ? <span className="rounded-full bg-muted px-2 py-1">{row.role}</span> : null}
                  {row.wallet_address ? <span className="rounded-full bg-muted px-2 py-1 font-mono">{row.wallet_address}</span> : null}
                  {row.agent_url ? <a className="rounded-full bg-muted px-2 py-1 underline" href={row.agent_url} target="_blank" rel="noreferrer">agent/app</a> : null}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((item) => (
                  <button key={item} className="rounded-full border border-border px-3 py-2 text-xs font-semibold disabled:opacity-40" disabled={loading || row.status === item} onClick={() => void update(row.id, item)}>
                    {item}
                  </button>
                ))}
              </div>
            </article>
          ))}

          {!rows.length ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No beta requests in this view"
                description="Change the filter or share /beta with Arbitrum builders."
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
