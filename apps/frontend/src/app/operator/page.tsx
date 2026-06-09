// @ts-nocheck
"use client";

import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { KeyRound, RadioTower, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RecordTable } from "@/components/RecordTable";
import { DEPTH_CONTRACTS_READY, agentIdFromSlug, hashText, operatorControlsContract, writeRecord } from "@arbitrum/lib/arbitrum";

export default function OperatorPage() {
  const [claim, setClaim] = useState({
    code: "claim-research-agent-001",
    agentSlug: "research-agent",
    metadataUri: "ipfs://agent-onboarding-pack",
    ttlSeconds: "86400",
  });
  const [webhook, setWebhook] = useState("https://agent.example/webhook");
  const [status, setStatus] = useState("Ready to create claim codes or update webhook circuit breaker state.");

  async function createClaimCode() {
    if (!DEPTH_CONTRACTS_READY) {
      setStatus("OperatorControls is not available in this deployment config. Confirm the contract address before signing.");
      return;
    }
    const contract = await operatorControlsContract();
    const tx = await contract.createClaimCode(hashText(claim.code), agentIdFromSlug(claim.agentSlug), claim.metadataUri, BigInt(claim.ttlSeconds || "0"));
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "audit", title: `Claim code created for ${claim.agentSlug}`, status: "confirmed", txHash: tx.hash });
    setStatus(`Claim code created: ${tx.hash}`);
  }

  async function redeemClaimCode() {
    if (!DEPTH_CONTRACTS_READY) {
      setStatus("OperatorControls is not available in this deployment config. Confirm the contract address before signing.");
      return;
    }
    const contract = await operatorControlsContract();
    const tx = await contract.redeemClaimCode(claim.code);
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "audit", title: `Claim code redeemed for ${claim.agentSlug}`, status: "confirmed", txHash: tx.hash });
    setStatus(`Claim code redeemed: ${tx.hash}`);
  }

  async function recordWebhook(kind: "success" | "failure" | "reset" | "check") {
    if (!DEPTH_CONTRACTS_READY) {
      setStatus("Webhook circuit breakers are not available in this deployment config. Confirm OperatorControls before signing.");
      return;
    }
    const contract = await operatorControlsContract();
    const originHash = hashText(webhook);
    if (kind === "check") {
      setStatus(`Circuit open: ${await contract.isWebhookOpen(originHash)}`);
      return;
    }
    const tx =
      kind === "success"
        ? await contract.recordWebhookSuccess(originHash)
        : kind === "failure"
          ? await contract.recordWebhookFailure(originHash)
          : await contract.resetWebhookCircuit(originHash);
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "audit", title: `Webhook ${kind}: ${webhook}`, status: "confirmed", txHash: tx.hash });
    setStatus(`Webhook ${kind} confirmed: ${tx.hash}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operator controls"
        title="Claim codes and webhook breakers"
        description="Issue agent onboarding codes, monitor webhook health, and keep every operator action attached to audit evidence before agents move funds."
        badges={["Agent claim codes", "Circuit breaker", "Audit evidence"]}
      />

      <section className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard icon={ShieldCheck} label="Controls" value={DEPTH_CONTRACTS_READY ? "On-chain" : "Config required"} />
          <StatusCard icon={KeyRound} label="Claim code" value={claim.agentSlug} />
          <StatusCard icon={RadioTower} label="Webhook" value={shortHost(webhook)} />
        </div>

        {!DEPTH_CONTRACTS_READY ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            OperatorControls is not enabled in the current deployment config. The page remains usable for planning and evidence capture, but write actions will stop before wallet signing until a valid contract address is configured.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Agent claim onboarding" description="Create a redeemable onboarding code so an agent can claim its ArcPay identity without manual dashboard setup.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Claim code"><input className={`${INPUT_CLASS} font-mono`} value={claim.code} onChange={(event) => setClaim({ ...claim, code: event.target.value })} /></Field>
              <Field label="Agent slug"><input className={INPUT_CLASS} value={claim.agentSlug} onChange={(event) => setClaim({ ...claim, agentSlug: event.target.value })} /></Field>
              <Field label="Metadata URI"><input className={INPUT_CLASS} value={claim.metadataUri} onChange={(event) => setClaim({ ...claim, metadataUri: event.target.value })} /></Field>
              <Field label="TTL seconds"><input className={INPUT_CLASS} value={claim.ttlSeconds} onChange={(event) => setClaim({ ...claim, ttlSeconds: event.target.value })} /></Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={createClaimCode}>Create claim code</button>
              <button className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={redeemClaimCode}>Redeem as agent</button>
            </div>
          </Card>

          <Card title="Webhook circuit breaker" description="Track failing webhook origins and pause unsafe agent endpoints before retries waste treasury budget.">
            <Field label="Webhook origin"><input className={INPUT_CLASS} value={webhook} onChange={(event) => setWebhook(event.target.value)} /></Field>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => recordWebhook("success")}>Record success</button>
              <button className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={() => recordWebhook("failure")}>Record failure</button>
              <button className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={() => recordWebhook("check")}>Check breaker</button>
              <button className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold" onClick={() => recordWebhook("reset")}>Reset</button>
            </div>
            <div className="mt-5 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground break-words">{status}</div>
          </Card>
        </div>

        <Card title="Operator audit" description="Confirmed claim-code and webhook events appear here with transaction hashes when wallet-signed actions complete.">
          <RecordTable type="audit" />
        </Card>
      </section>
    </>
  );
}

function Card({ title, description, children }: { readonly title: string; readonly description: string; readonly children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusCard({ icon: Icon, label, value }: { readonly icon: ComponentType<{ className?: string }>; readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function shortHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return value || "--";
  }
}

const INPUT_CLASS = "h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-medium outline-none transition focus:border-primary";
