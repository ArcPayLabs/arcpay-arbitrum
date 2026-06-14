"use client";

import { useState } from "react";
import { CreditCard, Pause, Plus, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { connectedAddress, erc20Contract, hashText, shortAddress, USDC_TOKEN_ADDRESS, spendCardVaultContract, toUnits, txOverrides, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: CardsRoute } };

function CardsRoute() {
  const [form, setForm] = useState({ slug: "research-card-001", agent: "", label: "Research Agent USDC Card", limit: "5", topUp: "5" });
  const [status, setStatus] = useState("Create USDC cards for agents with limits, top-ups, freeze, and activation controls.");

  async function createCard() {
    const vault = await spendCardVaultContract() as any;
    const agent = form.agent.trim() || await connectedAddress();
    const tx = await vault.createCard(hashText(form.slug), agent, USDC_TOKEN_ADDRESS, toUnits(form.limit), form.label, await txOverrides());
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "card", title: `Created ${form.label}`, status: "created", amount: form.limit, txHash: tx.hash });
    setStatus(`Card created: ${tx.hash}`);
  }

  async function topUpCard() {
    const amount = toUnits(form.topUp);
    const token = await erc20Contract(USDC_TOKEN_ADDRESS) as any;
    const vault = await spendCardVaultContract() as any;
    const approve = await token.approve(vault.target, amount, await txOverrides());
    await approve.wait();
    const tx = await vault.topUpCard(hashText(form.slug), amount, await txOverrides());
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "card", title: `Topped up ${form.slug}`, status: "funded", amount: form.topUp, txHash: tx.hash });
    setStatus(`Card topped up: ${tx.hash}`);
  }

  async function setActive(active: boolean) {
    const vault = await spendCardVaultContract() as any;
    const tx = await vault.setCardStatus(hashText(form.slug), active, await txOverrides());
    await tx.wait();
    setStatus(active ? `Card activated: ${tx.hash}` : `Card frozen: ${tx.hash}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} eyebrow="Agent spend cards" title="USDC cards" description="Create token-backed agent budgets with card limits and operational freeze controls." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={WalletCards} label="Token" value="USDC" hint={shortAddress(USDC_TOKEN_ADDRESS)} />
        <StatCard label="Limit" value={`${form.limit} USDC`} hint="Per card" />
        <StatCard label="Status controls" value="Live" hint="Freeze and activate" emphasis />
      </div>
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>
      <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{key}</span>
              <input value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="ap-in" placeholder={key === "agent" ? "0x agent wallet" : undefined} />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => void createCard()} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Create card</button>
          <button onClick={() => void topUpCard()} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Approve + top up</button>
          <button onClick={() => void setActive(false)} className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold"><Pause className="h-4 w-4" /> Freeze</button>
          <button onClick={() => void setActive(true)} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Activate</button>
        </div>
      </section>
    </div>
  );
}
