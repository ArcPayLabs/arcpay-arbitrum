"use client";

import Link from "next/link";
import { Bot, CreditCard, Lock, Route as RouteIcon, ShieldAlert, Wallet, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { StatCard } from "@/components/primitives/StatCard";
import { CONTRACTS, balances, connectedAddress, fetchRecords, shortAddress, type LocalRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: DashboardRoute } };

function DashboardRoute() {
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    void fetchRecords().then(setRecords);
    connectedAddress().then(async (address) => {
      setWallet(address);
      setBalance(await balances(address));
    }).catch(() => undefined);
  }, []);

  const counts = useMemo(() => ({
    payments: records.filter((record) => record.type === "payment").length,
    orders: records.filter((record) => record.type === "order").length,
    agents: records.filter((record) => record.type === "agent").length,
    privacy: records.filter((record) => record.type === "privacy").length,
    audit: records.filter((record) => record.type === "audit").length,
    pending: records.filter((record) => ["pending", "escrowed", "requested"].includes(record.status.toLowerCase())).length,
  }), [records]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        eyebrow="Overview"
        title="Good morning, operator."
        description="Private treasury OS for Arbitrum agents: x402 paid work, wallet-signed ETH payments, escrowed orders, USDC cards, policy controls, privacy intents, and trust exports."
        actions={<Link href="/payments" className="rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background">New payment</Link>}
        back={false}
      />
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-wrap items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Workflow className="w-5 h-5" /></div>
        <div className="flex-1 min-w-[240px]">
          <div className="text-sm font-semibold">Next best action</div>
          <div className="text-sm text-muted-foreground">
            {wallet ? `${shortAddress(wallet)} has ${Number(balance || 0).toFixed(4)} ETH. Register an agent, set policy, then create an x402 or escrow order.` : "Connect a Arbitrum wallet to load live balance and start the agent treasury flow."}
          </div>
        </div>
        <Link href={wallet ? "/app/agents" : "/wallet"} className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground">
          {wallet ? "Register agent" : "Connect wallet"}
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Operating" value={wallet ? `${Number(balance || 0).toFixed(4)} ETH` : "--"} hint="Live Arbitrum wallet balance" />
        <StatCard icon={Workflow} label="Agent orders" value={counts.orders} hint="Escrow and x402 order records" />
        <StatCard icon={CreditCard} label="USDC cards" value={records.filter((record) => record.title.toLowerCase().includes("card")).length} hint="Agent card events" />
        <StatCard icon={Lock} label="Privacy intents" value={counts.privacy} hint="Commitment-based intents" emphasis />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Latest activity</div>
          <h2 className="mt-1 text-lg font-medium">Treasury feed</h2>
          <div className="mt-4 divide-y divide-border">
            {records.slice(0, 8).map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-4 py-3">
                <div><div className="text-sm font-medium">{record.title}</div><div className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</div></div>
                <code className="text-sm">{record.amount ?? record.status}</code>
              </div>
            ))}
            {!records.length ? (
              <EmptyState
                icon={Workflow}
                title="No treasury activity yet"
                description="Start with a wallet, register an agent, then create an order, x402 payment, invoice, card, or privacy intent. Every signed action will appear here and in Audit."
                actionHref="/app/agents"
                actionLabel="Register first agent"
              />
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Runtime</div>
          <h2 className="mt-1 text-lg font-medium">Arbitrum contract map</h2>
          <div className="mt-4 space-y-3">
            <StatCard icon={RouteIcon} label="Contracts" value={Object.keys(CONTRACTS).length} hint="Deployed modules" />
            <StatCard icon={ShieldAlert} label="Policy queue" value={counts.pending} hint="Pending review records" />
            <StatCard icon={Bot} label="Agents indexed" value={counts.agents} hint="Registry events" />
          </div>
        </section>
      </div>
    </div>
  );
}
