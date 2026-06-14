"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Lock, Send, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewModal, type ReviewRow } from "@/components/primitives/ReviewModal";
import { StatCard } from "@/components/primitives/StatCard";
import { readLocalJson, writeLocalJson } from "@/lib/browser-cache";
import { checkActionPolicies } from "@/lib/policy";
import { connectedAddress, CONTRACTS, erc20Contract, hashText, privacyVaultContract, shortAddress, USDC_TOKEN_ADDRESS, toUnits, toWei, txOverrides, txUrl, writeRecord } from "@arbitrum/lib/arbitrum";
import { FHENIX_ARBITRUM_SEPOLIA } from "@arbitrum/lib/fhenix";

export const Route = { options: { component: PrivacyPage } };

type PrivacyIntent = {
  id: string;
  commitment: string;
  amount: string;
  memoUri: string;
  recipient: string;
  token: "ETH" | "USDC";
  status: "Prepared" | "Submitted" | "Disclosure ready" | "Cancelled";
  txHash?: string;
  releaseTxHash?: string;
  cancelTxHash?: string;
  nullifier?: string;
  createdAt: string;
};

const STORAGE_KEY = "arcpay-arbitrum-privacy";

function PrivacyPage() {
  const [items, setItems] = useState<PrivacyIntent[]>(() => readLocalJson(STORAGE_KEY, [] as PrivacyIntent[]));
  const [open, setOpen] = useState<"shield" | "key" | null>(null);
  const [review, setReview] = useState<PrivacyIntent | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<PrivacyIntent | null>(null);
  const [message, setMessage] = useState("Create ETH or USDC privacy intents with encrypted memo pointers, delayed recipient release, cancellation, and one-time nullifiers.");
  const [form, setForm] = useState({ amount: "0.01", token: "ETH" as "ETH" | "USDC", recipient: "", memoUri: "ipfs://encrypted-agent-payment-memo", nullifier: "release-secret-001" });

  const submitted = items.filter((item) => item.status === "Submitted");
  const disclosures = items.filter((item) => item.status === "Disclosure ready");
  const latest = useMemo(() => items[0], [items]);

  function persist(next: PrivacyIntent[]) {
    setItems(next);
    writeLocalJson(STORAGE_KEY, next);
  }

  function prepareShield() {
    const amount = Number.parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid shield amount.");
      return;
    }
    const blockReason = checkActionPolicies({
      action: "Shield",
      network: "arbitrum",
      token: form.token,
      amount,
      requireWallet: false,
    });
    if (blockReason) {
      setMessage(blockReason);
      return;
    }
    const commitment = hashText(`${form.amount}:${form.recipient}:${form.memoUri}:${Date.now()}`);
    setReview({
      id: crypto.randomUUID(),
      commitment,
      amount: form.amount,
      token: form.token,
      recipient: form.recipient.trim(),
      memoUri: form.memoUri.trim(),
      status: "Prepared",
      createdAt: new Date().toISOString(),
    });
  }

  async function submitShield() {
    if (!review) return;
    const signer = await connectedAddress();
    const contract = await privacyVaultContract() as any;
    let tx;
    if (review.token === "USDC") {
      const token = await erc20Contract(USDC_TOKEN_ADDRESS) as any;
      const units = toUnits(review.amount);
      const approve = await token.approve(CONTRACTS.ArbitrumPrivacyVault, units, await txOverrides());
      await approve.wait();
      tx = await contract.createTokenIntent(review.commitment, USDC_TOKEN_ADDRESS, units, review.memoUri, await txOverrides());
    } else {
      tx = await contract.createNativeIntent(review.commitment, review.memoUri, await txOverrides({ value: toWei(review.amount) }));
    }
    await tx.wait();
    const next = [{ ...review, status: "Submitted" as const, txHash: tx.hash }, ...items].slice(0, 50);
    persist(next);
    writeRecord({ id: review.id, type: "privacy", title: `Created ${review.token} privacy commitment ${shortAddress(review.commitment)}`, status: "submitted", amount: `${review.amount} ${review.token}`, txHash: tx.hash });
    setMessage(`Privacy intent submitted by ${shortAddress(signer)}: ${tx.hash}`);
    setReview(null);
    setOpen(null);
  }

  async function releaseIntent(item: PrivacyIntent) {
    const recipient = form.recipient.trim();
    if (!recipient || !recipient.startsWith("0x")) {
      setMessage("Enter a recipient wallet address before releasing the intent.");
      return;
    }

    const contract = await privacyVaultContract() as any;
    const nullifier = hashText(`${item.id}:${form.nullifier}:${Date.now()}`);
    const tx = await contract.releaseIntent(item.commitment, nullifier, recipient, await txOverrides());
    await tx.wait();
    const next = items.map((current) => current.id === item.id ? { ...current, status: "Disclosure ready" as const, releaseTxHash: tx.hash, nullifier } : current);
    persist(next);
    writeRecord({ id: crypto.randomUUID(), type: "privacy", title: `Released ${item.token} privacy commitment ${shortAddress(item.commitment)}`, status: "released", amount: `${item.amount} ${item.token}`, txHash: tx.hash });
    setMessage(`Privacy intent released with nullifier ${shortAddress(nullifier)}: ${tx.hash}`);
    setReleaseTarget(null);
  }

  async function cancelIntent(item: PrivacyIntent) {
    const contract = await privacyVaultContract() as any;
    const tx = await contract.cancelIntent(item.commitment, await txOverrides());
    await tx.wait();
    const next = items.map((current) => current.id === item.id ? { ...current, status: "Cancelled" as const, cancelTxHash: tx.hash } : current);
    persist(next);
    writeRecord({ id: crypto.randomUUID(), type: "privacy", title: `Cancelled ${item.token} privacy commitment ${shortAddress(item.commitment)}`, status: "cancelled", amount: `${item.amount} ${item.token}`, txHash: tx.hash });
    setMessage(`Privacy intent cancelled and refunded: ${tx.hash}`);
  }

  function createDisclosure() {
    const id = crypto.randomUUID();
    const intent: PrivacyIntent = {
      id,
      commitment: hashText(`disclosure:${Date.now()}`),
      amount: "0",
      token: "ETH",
      memoUri: "selective-disclosure://workspace-auditor",
      recipient: form.recipient.trim() || "Workspace auditor",
      status: "Disclosure ready",
      createdAt: new Date().toISOString(),
    };
    persist([intent, ...items]);
    writeRecord({ id, type: "viewing-key", title: "Created selective disclosure record", status: "configured" });
    setMessage("Selective disclosure record created for auditor review.");
    setOpen(null);
  }

  const rows: ReviewRow[] = review ? [
    { label: "Amount", value: `${review.amount} ${review.token}`, mono: true },
    { label: "Commitment", value: shortAddress(review.commitment), mono: true },
    { label: "Token route", value: review.token === "USDC" ? `USDC ${shortAddress(USDC_TOKEN_ADDRESS)}` : "Native ETH", mono: review.token === "USDC" },
    { label: "Memo URI", value: review.memoUri, mono: true },
    { label: "Vault", value: "ArbitrumPrivacyVault" },
  ] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={EyeOff}
        eyebrow="Privacy layer"
        title="Private agent treasury"
        description="A Arbitrum privacy-intent layer for ETH and USDC: commitments, encrypted memo pointers, delayed recipient release, cancellation, and one-time nullifier evidence."
        actions={
          <>
            <button onClick={() => setOpen("key")} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold">
              <KeyRound className="h-4 w-4" /> Viewing key
            </button>
            <button onClick={() => setOpen("shield")} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
              <Send className="h-4 w-4" /> Shield intent
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Lock} label="Privacy intents" value={items.length} hint="ETH + USDC commitments" />
        <StatCard icon={Sparkles} label="Submitted" value={submitted.length} hint="Vault transactions" />
        <StatCard icon={Eye} label="Disclosures" value={disclosures.length} hint="Viewing-key records" />
        <StatCard label="Latest" value={latest ? shortAddress(latest.commitment) : "--"} hint="Commitment hash" emphasis />
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{message}</div>

      <section className="rounded-[2rem] border border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#eff6ff_100%)] p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Fhenix CoFHE live proof
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Confidential policy handles are recorded on Arbitrum Sepolia.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              ArcPay deployed a CoFHE-backed policy vault and recorded encrypted spend, limit, and approval handles. The public proof stores handles and commitments only; plaintext treasury metadata stays outside public state.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 text-sm lg:min-w-[23rem]">
            <a href={FHENIX_ARBITRUM_SEPOLIA.liveProof.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/75 px-4 py-3 font-semibold text-emerald-950">
              Record tx {shortAddress(FHENIX_ARBITRUM_SEPOLIA.liveProof.recordTxHash)} <ExternalLink className="h-4 w-4" />
            </a>
            <a href={FHENIX_ARBITRUM_SEPOLIA.liveProof.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/75 px-4 py-3 font-semibold">
              Proof JSON <span className="font-mono text-xs text-muted-foreground">{shortAddress(FHENIX_ARBITRUM_SEPOLIA.liveProof.contract)}</span>
            </a>
          </div>
        </div>
      </section>

      {open && (
        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={`Amount ${form.token}`}><input value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="ap-in" inputMode="decimal" /></Field>
            <Field label="Token"><select value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value as "ETH" | "USDC" })} className="ap-in"><option>ETH</option><option>USDC</option></select></Field>
            <Field label="Recipient / auditor"><input value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} className="ap-in" placeholder="0x... or auditor name" /></Field>
            <Field label="Encrypted memo URI"><input value={form.memoUri} onChange={(event) => setForm({ ...form, memoUri: event.target.value })} className="ap-in" /></Field>
            <Field label="Release secret"><input value={form.nullifier} onChange={(event) => setForm({ ...form, nullifier: event.target.value })} className="ap-in" /></Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {open === "shield" ? <button onClick={prepareShield} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Review vault tx</button> : null}
            {open === "key" ? <button onClick={createDisclosure} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Create disclosure</button> : null}
            <button onClick={() => setOpen(null)} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Cancel</button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-4 text-sm font-semibold">Privacy evidence</div>
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={EyeOff}
                title="No privacy intents"
                description="Create a ETH or USDC commitment with an encrypted memo URI, then release it later with a one-time nullifier or selective disclosure."
                actionLabel="Shield intent"
                onAction={() => setOpen("shield")}
              />
            </div>
          ) : null}
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
              <div className="md:col-span-3"><div className="font-medium">{item.status}</div><div className="font-mono text-xs text-muted-foreground">{shortAddress(item.commitment)}</div></div>
              <div className="md:col-span-2 font-mono">{item.amount} {item.token}</div>
              <div className="truncate md:col-span-3 text-muted-foreground">{item.memoUri}</div>
              <div className="md:col-span-2">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="md:col-span-2">
                {item.txHash ? <a href={txUrl(item.txHash)} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">{shortAddress(item.txHash)}</a> : <span className="text-muted-foreground">No tx yet</span>}
              </div>
              <div className="md:col-span-12 flex flex-wrap gap-2">
                {item.status === "Submitted" && (
                  <>
                    <button onClick={() => setReleaseTarget(item)} className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
                      Release with nullifier
                    </button>
                    <button onClick={() => void cancelIntent(item)} className="rounded-full bg-muted px-4 py-2 text-xs font-semibold">
                      Cancel / refund
                    </button>
                  </>
                )}
                {item.releaseTxHash ? <a href={txUrl(item.releaseTxHash)} target="_blank" rel="noreferrer" className="rounded-full bg-success/15 px-4 py-2 text-xs font-semibold text-success">Release tx {shortAddress(item.releaseTxHash)}</a> : null}
                {item.cancelTxHash ? <a href={txUrl(item.cancelTxHash)} target="_blank" rel="noreferrer" className="rounded-full bg-muted px-4 py-2 text-xs font-semibold">Cancel tx {shortAddress(item.cancelTxHash)}</a> : null}
                {item.nullifier ? <span className="rounded-full bg-muted px-4 py-2 text-xs font-mono text-muted-foreground">Nullifier {shortAddress(item.nullifier)}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <ReviewModal open={Boolean(review)} onOpenChange={(value) => !value && setReview(null)} title="Submit privacy vault intent" rows={rows} confirmLabel="Sign vault tx" onConfirm={submitShield} />
      <ReviewModal
        open={Boolean(releaseTarget)}
        onOpenChange={(value) => !value && setReleaseTarget(null)}
        title="Release privacy intent"
        rows={releaseTarget ? [
          { label: "Commitment", value: shortAddress(releaseTarget.commitment), mono: true },
          { label: "Recipient", value: form.recipient || "Missing recipient", mono: true },
          { label: "Nullifier", value: "Derived at release", mono: true },
          { label: "Amount", value: `${releaseTarget.amount} ${releaseTarget.token}`, mono: true },
        ] : []}
        confirmLabel="Sign release"
        onConfirm={() => releaseTarget ? releaseIntent(releaseTarget) : undefined}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
