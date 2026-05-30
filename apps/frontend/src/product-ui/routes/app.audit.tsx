"use client";

import { useMemo, useState } from "react";
import { Download, Eye, EyeOff, KeyRound, ScrollText, Search } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { fetchRecords, readRecords, shortAddress, writeRecord, type LocalRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: AuditPage } };

function AuditPage() {
  const [records, setRecords] = useState<LocalRecord[]>(() => readRecords());
  const [query, setQuery] = useState("");
  const [reveal, setReveal] = useState(false);
  const [message, setMessage] = useState("Audit records are sourced from Arbitrum actions, local evidence, and the Supabase mirror.");

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return records;
    return records.filter((item) => `${item.type} ${item.title} ${item.status} ${item.txHash ?? ""}`.toLowerCase().includes(text));
  }, [query, records]);

  async function refresh() {
    setRecords(await fetchRecords());
    setMessage("Audit records refreshed from this browser and server mirror.");
  }

  function createViewingKey() {
    const id = crypto.randomUUID();
    writeRecord({
      id,
      type: "viewing-key",
      title: "Scoped auditor access for Arbitrum treasury",
      status: "configured",
    });
    setRecords(readRecords());
    setReveal(true);
    setMessage("Viewing-key evidence created. Private fields are visible in this browser session.");
  }

  function exportCsv() {
    const header = ["created_at", "type", "title", "status", "amount", "tx_hash"];
    const rows = filtered.map((item) => [
      item.createdAt,
      item.type,
      item.title,
      item.status,
      reveal ? item.amount ?? "" : "requires viewing key",
      item.txHash ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "arcpay-arbitrum-audit.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${rows.length} Arbitrum audit rows.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        eyebrow="Evidence layer"
        title="Audit"
        description="A clean audit trail for Arbitrum treasury actions, agent orders, policies, payment intents, privacy commitments, and operator approvals."
        actions={
          <>
            <button onClick={createViewingKey} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold">
              <KeyRound className="h-4 w-4" /> Viewing key
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Audit rows" value={records.length} hint="Arbitrum local + server records" />
        <StatCard label="Filtered" value={filtered.length} hint="Current search result" />
        <StatCard label="Tx evidence" value={records.filter((item) => item.txHash).length} hint="Explorer-backed records" />
        <StatCard label="Private fields" value={reveal ? "Visible" : "Hidden"} hint="Viewing-key controlled" emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{message}</div>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search type, title, status, tx" className="w-full rounded-full bg-muted py-2 pl-8 pr-3 text-sm outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setReveal((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold">
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {reveal ? "Hide private" : "Reveal private"}
            </button>
            <button onClick={() => void refresh()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Refresh</button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid-cols-12">
          <div className="md:col-span-2">Time</div>
          <div className="md:col-span-2">Type</div>
          <div className="md:col-span-4">Evidence</div>
          <div className="md:col-span-2">Private</div>
          <div className="md:col-span-2">Status</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={ScrollText}
                title="No audit records"
                description="Run a wallet action, register an agent, create an order, submit a privacy intent, or refresh the Supabase mirror to populate the evidence trail."
                actionLabel="Refresh records"
                onAction={() => void refresh()}
              />
            </div>
          ) : null}
          {filtered.map((item) => (
            <div key={`${item.id}-${item.createdAt}`} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
              <div className="font-mono text-xs text-muted-foreground md:col-span-2">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="md:col-span-2"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{item.type}</span></div>
              <div className="min-w-0 md:col-span-4">
                <div className="truncate font-medium">{item.title}</div>
                <div className="font-mono text-xs text-muted-foreground">{item.txHash ? shortAddress(item.txHash) : item.id}</div>
              </div>
              <div className="md:col-span-2">{reveal ? item.amount ?? "No private amount" : "Viewing key required"}</div>
              <div className="md:col-span-2"><span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">{item.status}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
