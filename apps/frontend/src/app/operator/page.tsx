// @ts-nocheck
"use client";

import { useState } from "react";
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
  const [status, setStatus] = useState("");

  async function createClaimCode() {
    if (!DEPTH_CONTRACTS_READY) {
      setStatus("OperatorControls requires the depth contract redeploy.");
      return;
    }
    const contract = await operatorControlsContract();
    const tx = await contract.createClaimCode(
      hashText(claim.code),
      agentIdFromSlug(claim.agentSlug),
      claim.metadataUri,
      BigInt(claim.ttlSeconds || "0"),
    );
    await tx.wait();
    writeRecord({ id: crypto.randomUUID(), type: "audit", title: `Claim code created for ${claim.agentSlug}`, status: "confirmed", txHash: tx.hash });
    setStatus(`Claim code created: ${tx.hash}`);
  }

  async function redeemClaimCode() {
    if (!DEPTH_CONTRACTS_READY) {
      setStatus("OperatorControls requires the depth contract redeploy.");
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
      setStatus("Webhook circuit breakers require the depth contract redeploy.");
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
        eyebrow="Cards402-depth operator controls"
        title="Claim codes and webhook breakers"
        description="Operators can create redeemable agent onboarding codes and track webhook origin health with an on-chain circuit breaker."
        badges={["Agent claim codes", "Per-origin breaker", "Audit events"]}
      />
      <section className="grid section">
        {!DEPTH_CONTRACTS_READY ? (
          <div className="panel full notice">OperatorControls is compiled and tested but not deployed in the current address file. Top up the deployer and run `npm run deploy:arbitrum`.</div>
        ) : null}
        <div className="panel">
          <h2>Agent claim onboarding</h2>
          <label className="field"><span>Claim code</span><input value={claim.code} onChange={(event) => setClaim({ ...claim, code: event.target.value })} /></label>
          <label className="field"><span>Agent slug</span><input value={claim.agentSlug} onChange={(event) => setClaim({ ...claim, agentSlug: event.target.value })} /></label>
          <label className="field"><span>Metadata URI</span><input value={claim.metadataUri} onChange={(event) => setClaim({ ...claim, metadataUri: event.target.value })} /></label>
          <label className="field"><span>TTL seconds</span><input value={claim.ttlSeconds} onChange={(event) => setClaim({ ...claim, ttlSeconds: event.target.value })} /></label>
          <div className="actions">
            <button onClick={createClaimCode}>Create claim code</button>
            <button className="secondary" onClick={redeemClaimCode}>Redeem as agent</button>
          </div>
        </div>

        <div className="panel">
          <h2>Webhook circuit breaker</h2>
          <label className="field">
            <span>Webhook origin</span>
            <input value={webhook} onChange={(event) => setWebhook(event.target.value)} />
          </label>
          <div className="actions">
            <button onClick={() => recordWebhook("success")}>Record success</button>
            <button className="secondary" onClick={() => recordWebhook("failure")}>Record failure</button>
            <button className="secondary" onClick={() => recordWebhook("check")}>Check breaker</button>
            <button className="secondary" onClick={() => recordWebhook("reset")}>Reset</button>
          </div>
          {status ? <div className="notice">{status}</div> : null}
        </div>

        <div className="panel full">
          <h2>Operator audit</h2>
          <RecordTable type="audit" />
        </div>
      </section>
    </>
  );
}
