"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Gauge, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { fromWei, hashText, riskOracleContract, riskOracleQuote, shortAddress, txOverrides, txUrl, writeRecord } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: OracleRoute } };

function OracleRoute() {
  const [prompt, setPrompt] = useState("Score contractor wallet before USDC card funding");
  const [orderId, setOrderId] = useState(hashText("demo-order"));
  const [status, setStatus] = useState("Request Arbitrum risk oracle decisions and persist evidence for policy checks.");
  const [requestId, setRequestId] = useState("");
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof riskOracleQuote>> | null>(null);
  const [result, setResult] = useState<{ score: string; verdict: string; evidenceUri: string; txHash?: string } | null>(null);

  useEffect(() => {
    riskOracleQuote()
      .then((next) => {
        setQuote(next);
        setStatus(`Arbitrum Agent requester deposit loaded: ${fromWei(next.totalWei)} ETH total for agent ${next.agentId}.`);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load Arbitrum agent requester quote."));
  }, []);

  async function requestRisk() {
    const oracle = await riskOracleContract() as any;
    const nextQuote = quote ?? await riskOracleQuote();
    const tx = await oracle.requestRisk(orderId, prompt, await txOverrides({ value: nextQuote.totalWei }));
    const receipt = await tx.wait();
    const parsed = receipt.logs
      ?.map((log: unknown) => {
        try {
          return oracle.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event: { name?: string } | null) => event?.name === "RiskRequested");
    const nextRequestId = parsed?.args?.requestId?.toString() ?? "";
    if (!nextRequestId) throw new Error("RiskRequested event missing.");
    setRequestId(nextRequestId);
    setResult(null);
    writeRecord({ id: crypto.randomUUID(), type: "oracle", title: "Requested Arbitrum agent risk score", status: "requested", amount: fromWei(nextQuote.totalWei), txHash: tx.hash });
    setStatus(`Risk oracle requested through Arbitrum Agent platform: ${tx.hash}`);
  }

  async function fulfillForDemo() {
    if (!requestId) {
      setStatus("Request risk first, then fulfill the demo result.");
      return;
    }
    const oracle = await riskOracleContract() as any;
    const tx = await oracle.ownerFulfillForDemo(BigInt(requestId), 88, "APPROVE", "ipfs://arcpay-risk-evidence", await txOverrides());
    await tx.wait();
    const loaded = await oracle.results(BigInt(requestId));
    setResult({ score: loaded.score.toString(), verdict: loaded.verdict, evidenceUri: loaded.evidenceUri, txHash: tx.hash });
    writeRecord({ id: crypto.randomUUID(), type: "oracle", title: `Fulfilled risk request ${requestId}`, status: loaded.verdict, txHash: tx.hash });
    setStatus(`Risk request ${requestId} fulfilled with ${loaded.verdict}: ${tx.hash}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={Gauge} eyebrow="Risk oracle" title="Oracle" description="Request on-chain risk evidence that policies can use before agent orders, spend cards, or contractor payouts proceed." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={Gauge} label="Oracle" value="Live" hint="Arbitrum Sepolia contract" />
        <StatCard icon={Sparkles} label="Agent request fee" value={quote ? `${fromWei(quote.totalWei)} ETH` : "--"} hint="Live platform deposit + agent budget" />
        <StatCard label="Last request" value={requestId || "--"} hint="Arbitrum agent request id" emphasis />
      </div>
      {quote && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard label="Platform" value={shortAddress(quote.platform)} hint="Arbitrum requester contract" />
          <StatCard label="Risk agent" value={quote.agentId} hint="Configured agent id" />
          <StatCard label="Subcommittee" value={quote.subcommitteeSize.toString()} hint={`${fromWei(quote.pricePerAgentWei)} ETH per agent`} />
        </div>
      )}
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>
      <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Order id</span>
            <input className="ap-in" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Risk prompt</span>
            <textarea className="ap-in min-h-28" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>
        </div>
        <button onClick={() => void requestRisk()} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          <Wand2 className="h-4 w-4" /> Request risk
        </button>
        <button onClick={() => void fulfillForDemo()} className="ml-2 mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
          <CheckCircle2 className="h-4 w-4" /> Demo fulfill
        </button>
      </section>
      {result && (
        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Score" value={result.score} hint="0-100" />
            <StatCard label="Verdict" value={result.verdict} hint="Policy signal" emphasis />
            <StatCard label="Evidence" value={result.evidenceUri} hint="Agent evidence URI" />
            <a href={result.txHash ? txUrl(result.txHash) : "#"} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-muted/40 p-4 text-sm font-semibold text-primary">
              Open fulfillment tx
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
