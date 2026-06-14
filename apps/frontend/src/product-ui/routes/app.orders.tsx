"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Play, RefreshCcw, Workflow } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { agentIdFromSlug, fromWei, orderBookContract, shortAddress, toWei, txOverrides, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: OrdersRoute } };

function OrdersRoute() {
  const [form, setForm] = useState({ agentSlug: "research-agent", requestUri: "ipfs://arcpay/demo-request.json", amount: "0.01", orderId: "" });
  const [order, setOrder] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState("Create a new escrowed order, then ArcPay auto-fills the order ID from the on-chain OrderCreated event.");

  async function createOrder() {
    setStatus("Creating order on Arbitrum...");
    const contract = await orderBookContract() as any;
    const tx = await contract.createOrder(agentIdFromSlug(form.agentSlug), form.requestUri, await txOverrides({ value: toWei(form.amount) }));
    const receipt = await tx.wait();
    const parsed = receipt.logs
      ?.map((log: unknown) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: { name?: string } | null) => event?.name === "OrderCreated");
    const orderId = parsed?.args?.orderId ?? "";
    if (!orderId) throw new Error("OrderCreated event missing.");
    writeRecord({ id: crypto.randomUUID(), type: "order", title: `Created ${form.agentSlug} order`, status: "pending", amount: form.amount, txHash: tx.hash });
    setForm((current) => ({ ...current, orderId }));
    setStatus(`Order created: ${tx.hash}`);
  }

  async function loadOrder() {
    if (!form.orderId.trim()) return;
    const contract = await orderBookContract() as any;
    const next = await contract.orders(form.orderId.trim());
    setOrder({
      id: next[0],
      agentId: next[1],
      requester: next[2],
      provider: next[3],
      amount: fromWei(next[4]),
      requestUri: next[5],
      resultUri: next[6],
      status: String(next[7]),
    });
    setStatus("Order loaded from Arbitrum.");
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Workflow} eyebrow="Order state machine" title="Orders" description="Create, load, and reconcile Arbitrum agent orders with escrowed ETH. New orders generate the order ID automatically; paste an ID only when inspecting an existing order." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={Workflow} label="Lifecycle" value="7 states" hint="Pending to failed" />
        <StatCard label="Escrow" value={`${form.amount} ETH`} hint="Native value" />
        <StatCard label="Agent" value={form.agentSlug} hint="Registry slug" emphasis />
      </div>
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>
      <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Agent slug"><input className="ap-in" value={form.agentSlug} onChange={(event) => setForm({ ...form, agentSlug: event.target.value })} /></Field>
          <Field label="Amount ETH"><input className="ap-in" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></Field>
          <Field label="Request URI"><input className="ap-in" value={form.requestUri} onChange={(event) => setForm({ ...form, requestUri: event.target.value })} /></Field>
          <Field label="Order id optional">
            <input className="ap-in" value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })} placeholder="Auto-filled after Create order" />
            <p className="mt-1.5 text-xs text-muted-foreground">Leave blank to create a new order. Paste an existing order ID only when using Load order.</p>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => void createOrder()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Play className="h-4 w-4" /> Create order</button>
          <button onClick={() => void loadOrder()} className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold"><RefreshCcw className="h-4 w-4" /> Load order</button>
        </div>
      </section>
      <ResultCard record={order} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>{children}</label>;
}

function ResultCard({ record }: { record: Record<string, string> | null }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
      {record ? <div className="grid gap-3 md:grid-cols-2">{Object.entries(record).map(([key, value]) => <div key={key} className="rounded-2xl bg-muted/50 p-3"><div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{key}</div><div className="mt-1 truncate font-mono text-sm">{value.startsWith("0x") ? shortAddress(value) : value}</div></div>)}</div> : (
        <EmptyState
          icon={Workflow}
          title="No order selected"
          description="Create an escrowed agent order, or paste an existing order id to load state-machine evidence from the Arbitrum contract."
        />
      )}
    </section>
  );
}
