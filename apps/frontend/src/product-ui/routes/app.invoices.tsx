// @ts-nocheck
"use client";

import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, ExternalLink, FileText, Plus, RefreshCw, WalletCards, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getOptionalSupabaseClient } from "../../app/supabase-client";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewModal } from "@/components/primitives/ReviewModal";
import { StatCard } from "@/components/primitives/StatCard";
import { checkActionPolicies } from "@/lib/policy";
import {
  CONTRACTS,
  NATIVE_TOKEN,
  USDC_TOKEN_ADDRESS,
  erc20Contract,
  hashText,
  invoiceBookContract,
  shortAddress,
  toUnits,
  toWei,
  txOverrides,
  txUrl,
  writeRecord,
} from "@arbitrum/lib/arbitrum";
import { useNetwork } from "@/store/network";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({ meta: [{ title: "Invoices - ArcPay" }] }),
  component: InvoicesPage,
});

const TOKENS = ["ETH", "USDC"] as const;
const TOKENS_BY_NETWORK = { arbitrum: ["ETH", "USDC"] } as const;
const ZERO_PAYER = "0x0000000000000000000000000000000000000000";
const INVOICE_STATUS = ["pending", "paid", "cancelled"] as const;

const schema = z.object({
  client: z.string().trim().min(2, "Client name required").max(80),
  email: z.string().trim().email("Invalid email"),
  payer: z.string().trim().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  token: z.enum(TOKENS),
  due: z.string().min(1, "Pick a due date"),
  memo: z.string().trim().max(280).optional(),
});
type Form = z.infer<typeof schema>;

type Invoice = {
  id: string;
  publicId: string;
  onchainId: string;
  client: string;
  email: string;
  payer: string;
  amount: number;
  token: string;
  amountUnits: string;
  due: string;
  memo: string;
  status: "paid" | "pending" | "overdue" | "failed" | "cancelled";
  paymentUrl: string;
  txHash?: string;
  settlementTxHash?: string;
  cancelTxHash?: string;
};

function InvoicesPage() {
  const network = useNetwork((state) => state.mode);
  const tokenOptions = TOKENS_BY_NETWORK[network] ?? TOKENS_BY_NETWORK.arbitrum;
  const [items, setItems] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<Form | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState("Connect an Arbitrum wallet to create or pay invoices.");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { token: "ETH", payer: "" },
  });

  useEffect(() => {
    void loadInvoices();
  }, [network]);

  async function loadInvoices() {
    const supabase = getOptionalSupabaseClient();
    if (!supabase) {
      setItems(readLocalInvoices());
      setMessage("Supabase is not configured; showing browser invoice records.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems(readLocalInvoices());
      setMessage("Wallet actions still work. Sign in to sync invoices across devices.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("arcpay_invoices")
      .select("*")
      .eq("network", network)
      .order("created_at", { ascending: false });
    setLoading(false);

    if (error) {
      setItems(readLocalInvoices());
      setMessage(error.message);
      return;
    }

    const rows = (data ?? []).map(rowToInvoice);
    setItems(mergeInvoices(rows, readLocalInvoices()));
    setMessage("Invoices loaded. On-chain status can be refreshed from Arbitrum.");
  }

  const onSubmit = (data: Form) => setReview(data);

  const confirm = async () => {
    if (!review) return;
    if (CONTRACTS.AgentInvoiceBook === NATIVE_TOKEN) throw new Error("AgentInvoiceBook is not deployed yet.");

    const blockReason = checkActionPolicies({
      action: "Send",
      network,
      token: review.token,
      amount: review.amount,
      requireWallet: false,
    });
    if (blockReason) throw new Error(blockReason);

    const publicId = createInvoiceId();
    const onchainId = hashText(publicId);
    const tokenAddress = review.token === "ETH" ? NATIVE_TOKEN : USDC_TOKEN_ADDRESS;
    const amountUnits = review.token === "ETH" ? toWei(String(review.amount)) : toUnits(String(review.amount), 6);
    const payer = normalizePayer(review.payer);
    const metadataUri = buildMetadataUri(publicId, review);
    const book = await invoiceBookContract();

    const tx = await book.createInvoice(onchainId, payer, tokenAddress, amountUnits, metadataUri, await txOverrides());
    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;
    const paymentUrl = `${window.location.origin}/pay/${publicId}`;
    const invoice = {
      id: publicId,
      publicId,
      onchainId,
      client: review.client,
      email: review.email,
      payer,
      amount: review.amount,
      token: review.token,
      amountUnits: amountUnits.toString(),
      due: review.due,
      memo: review.memo ?? "",
      status: "pending",
      paymentUrl,
      txHash,
    };

    saveLocalInvoice(invoice);
    await saveSupabaseInvoice(invoice);
    writeRecord({
      id: `invoice-${publicId}`,
      type: "invoice",
      title: `Created invoice ${publicId}`,
      status: "pending",
      amount: `${review.amount} ${review.token}`,
      txHash,
    });

    setItems((current) => mergeInvoices([invoice], current));
    setMessage(`Invoice ${publicId} created on Arbitrum.`);
    setReview(null);
    setOpen(false);
    reset({ token: tokenOptions[0], payer: "" });
  };

  async function payInvoice(invoice: Invoice) {
    setBusyId(invoice.publicId);
    try {
      const book = await invoiceBookContract();
      let tx;
      if (invoice.token === "ETH") {
        tx = await book.payNativeInvoice(invoice.onchainId, await txOverrides({ value: BigInt(invoice.amountUnits) }));
      } else {
        const token = await erc20Contract(USDC_TOKEN_ADDRESS);
        await (await token.approve(CONTRACTS.AgentInvoiceBook, BigInt(invoice.amountUnits), await txOverrides())).wait();
        tx = await book.payTokenInvoice(invoice.onchainId, await txOverrides());
      }
      const receipt = await tx.wait();
      updateInvoice(invoice.publicId, { status: "paid", settlementTxHash: receipt?.hash ?? tx.hash });
      writeRecord({
        id: `invoice-paid-${invoice.publicId}`,
        type: "invoice",
        title: `Paid invoice ${invoice.publicId}`,
        status: "paid",
        amount: `${invoice.amount} ${invoice.token}`,
        txHash: receipt?.hash ?? tx.hash,
      });
      setMessage(`Invoice ${invoice.publicId} paid on Arbitrum.`);
    } catch (error) {
      setMessage(error?.shortMessage || error?.message || String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function cancelInvoice(invoice: Invoice) {
    setBusyId(invoice.publicId);
    try {
      const book = await invoiceBookContract();
      const tx = await book.cancelInvoice(invoice.onchainId, await txOverrides());
      const receipt = await tx.wait();
      updateInvoice(invoice.publicId, { status: "cancelled", cancelTxHash: receipt?.hash ?? tx.hash });
      writeRecord({
        id: `invoice-cancelled-${invoice.publicId}`,
        type: "invoice",
        title: `Cancelled invoice ${invoice.publicId}`,
        status: "cancelled",
        amount: `${invoice.amount} ${invoice.token}`,
        txHash: receipt?.hash ?? tx.hash,
      });
      setMessage(`Invoice ${invoice.publicId} cancelled.`);
    } catch (error) {
      setMessage(error?.shortMessage || error?.message || String(error));
    } finally {
      setBusyId(null);
    }
  }

  async function refreshOnchain(invoice: Invoice) {
    setBusyId(invoice.publicId);
    try {
      const book = await invoiceBookContract();
      const row = await book.invoices(invoice.onchainId);
      const status = INVOICE_STATUS[Number(row.status)] ?? invoice.status;
      updateInvoice(invoice.publicId, { status });
      setMessage(`Invoice ${invoice.publicId} is ${status} on Arbitrum.`);
    } catch (error) {
      setMessage(error?.shortMessage || error?.message || String(error));
    } finally {
      setBusyId(null);
    }
  }

  function updateInvoice(publicId: string, patch: Partial<Invoice>) {
    const next = items.map((item) => item.publicId === publicId ? { ...item, ...patch } : item);
    setItems(next);
    writeLocalInvoices(next);
  }

  async function copyLink(invoice: Invoice) {
    if (!invoice.paymentUrl || typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(invoice.paymentUrl);
    setCopied(invoice.id);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const outstanding = items.filter((item) => item.status === "pending" || item.status === "overdue");
  const paid = items.filter((item) => item.status === "paid");
  const onchainReady = CONTRACTS.AgentInvoiceBook !== NATIVE_TOKEN;

  return (
    <div>
      <PageHeader
        icon={FileText}
        eyebrow="Treasury"
        title="Invoices"
        description="Issue ETH or USDC invoices, settle them through wallet signatures, and keep transaction evidence attached to the treasury record."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90">
            <Plus className="h-4 w-4" /> New invoice
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Outstanding" value={`${sum(outstanding).toLocaleString()} ETH/USDC`} hint={`${outstanding.length} open`} icon={WalletCards} />
        <StatCard label="Paid" value={paid.length} hint={`${sum(paid).toLocaleString()} total units`} />
        <StatCard label="Cancelled" value={items.filter((item) => item.status === "cancelled").length} />
        <StatCard label="Contract" value={onchainReady ? "Live" : "Missing"} hint={onchainReady ? shortAddress(CONTRACTS.AgentInvoiceBook) : "Deploy invoice book"} />
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {loading ? "Loading invoices..." : message}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden grid-cols-12 gap-3 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid">
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {items.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create an ETH or USDC invoice, attach client metadata, then settle it with a wallet signature and explorer-backed evidence."
                actionLabel="Create invoice"
                onAction={() => setOpen(true)}
              />
            </div>
          )}
          {items.map((invoice) => (
            <div key={invoice.publicId} className="grid gap-3 px-5 py-4 text-sm hover:bg-muted/40 md:grid-cols-12 md:items-center">
              <div className="md:col-span-2">
                <div className="font-mono text-xs">{invoice.publicId}</div>
                {invoice.txHash && <a href={txUrl(invoice.txHash)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">created <ExternalLink className="h-3 w-3" /></a>}
              </div>
              <div className="truncate md:col-span-2">
                <div className="font-medium">{invoice.client}</div>
                <div className="text-xs text-muted-foreground">{invoice.email}</div>
              </div>
              <div className="text-muted-foreground md:col-span-2">{invoice.due}</div>
              <div className="font-mono md:col-span-2">{invoice.amount.toLocaleString()} {invoice.token}</div>
              <div className="md:col-span-1">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  invoice.status === "paid" ? "bg-success/15 text-success" :
                  invoice.status === "pending" ? "bg-warning/30 text-warning-foreground" :
                  "bg-destructive/15 text-destructive"
                }`}>{invoice.status}</span>
              </div>
              <div className="flex flex-wrap justify-start gap-2 md:col-span-3 md:justify-end">
                <button onClick={() => void refreshOnchain(invoice)} disabled={busyId === invoice.publicId} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60">
                  <RefreshCw className="h-3.5 w-3.5" /> Sync
                </button>
                <button onClick={() => void copyLink(invoice)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  {copied === invoice.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />} Link
                </button>
                {invoice.status === "pending" && (
                  <>
                    <button onClick={() => void payInvoice(invoice)} disabled={busyId === invoice.publicId} className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60">
                      Pay
                    </button>
                    <button onClick={() => void cancelInvoice(invoice)} disabled={busyId === invoice.publicId} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-60">
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} onClick={(event) => event.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">New invoice</div>
                <h2 className="mt-1 text-2xl font-medium tracking-tight" style={{ letterSpacing: "-0.02em" }}>Bill a client</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close invoice drawer" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Client name" error={errors.client?.message}><input {...register("client")} className="ap-input" placeholder="Acme Robotics" /></Field>
              <Field label="Email" error={errors.email?.message}><input type="email" {...register("email")} className="ap-input" placeholder="ap@acme.io" /></Field>
              <Field label="Payer wallet optional" error={errors.payer?.message}><input {...register("payer")} className="ap-input font-mono" placeholder="0x... or leave open" /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Amount" error={errors.amount?.message} className="col-span-2"><input type="number" step="0.000001" {...register("amount")} className="ap-input" placeholder="0.00" /></Field>
                <Field label="Token"><select {...register("token")} className="ap-input">{tokenOptions.map((token) => <option key={token}>{token}</option>)}</select></Field>
              </div>
              <Field label="Due date" error={errors.due?.message}><input type="date" {...register("due")} className="ap-input" /></Field>
              <Field label="Memo" error={errors.memo?.message}><textarea rows={3} {...register("memo")} className="ap-input resize-none" placeholder="Notes for the client" /></Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">Review</button>
            </div>
            <style>{`.ap-input{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:var(--background);padding:0.625rem 0.75rem;font-size:0.875rem;outline:none}.ap-input:focus{box-shadow:0 0 0 2px var(--ring)}`}</style>
          </form>
        </div>
      )}

      <ReviewModal
        open={!!review}
        onOpenChange={(value) => { if (!value) setReview(null); }}
        title="Review on-chain invoice"
        description="This creates an invoice in AgentInvoiceBook. Payment requires a separate payer wallet signature."
        rows={review ? [
          { label: "Client", value: review.client },
          { label: "Payer", value: normalizePayer(review.payer) === ZERO_PAYER ? "Any wallet" : shortAddress(normalizePayer(review.payer)), mono: true },
          { label: "Amount", value: `${review.amount.toLocaleString()} ${review.token}`, mono: true },
          { label: "Due", value: review.due },
        ] : []}
        warnings={["Invoice creation is on-chain and visible on the Arbitrum explorer.", "USDC payments require token approval before settlement."]}
        confirmLabel="Create on-chain invoice"
        onConfirm={confirm}
      />
    </div>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function createInvoiceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `inv_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }
  return `inv_${Date.now().toString(36)}`;
}

function normalizePayer(value?: string) {
  const text = (value ?? "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(text) ? text : ZERO_PAYER;
}

function buildMetadataUri(publicId: string, review: Form) {
  const payload = {
    publicId,
    client: review.client,
    email: review.email,
    due: review.due,
    memo: review.memo ?? "",
  };
  return `arcpay://invoice/${publicId}?data=${encodeURIComponent(JSON.stringify(payload))}`;
}

function rowToInvoice(row: any): Invoice {
  const publicId = row.public_id ?? row.publicId ?? row.id;
  const token = row.token ?? "ETH";
  const amount = Number(row.amount ?? 0);
  return {
    id: row.id ?? publicId,
    publicId,
    onchainId: row.onchain_invoice_id ?? row.onchainId ?? hashText(publicId),
    client: row.client ?? "Client",
    email: row.email ?? "",
    payer: row.payer_wallet ?? row.payer ?? ZERO_PAYER,
    amount,
    token,
    amountUnits: row.amount_units ?? (token === "ETH" ? toWei(String(amount)).toString() : toUnits(String(amount), 6).toString()),
    due: row.due ?? "",
    memo: row.memo ?? "",
    status: row.status ?? "pending",
    paymentUrl: row.payment_url ?? row.paymentUrl ?? `${window.location.origin}/pay/${publicId}`,
    txHash: row.onchain_tx_hash ?? row.txHash,
    settlementTxHash: row.settlement_tx_hash ?? row.settlementTxHash,
    cancelTxHash: row.cancel_tx_hash ?? row.cancelTxHash,
  };
}

async function saveSupabaseInvoice(invoice: Invoice) {
  const supabase = getOptionalSupabaseClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("arcpay_invoices").insert({
    user_id: user.id,
    public_id: invoice.publicId,
    network: "arbitrum",
    client: invoice.client,
    email: invoice.email,
    amount: invoice.amount,
    token: invoice.token,
    due: invoice.due,
    memo: invoice.memo,
    status: invoice.status,
    payment_url: invoice.paymentUrl,
    onchain_invoice_id: invoice.onchainId,
    onchain_tx_hash: invoice.txHash ?? null,
    payer_wallet: invoice.payer === ZERO_PAYER ? null : invoice.payer,
    amount_units: invoice.amountUnits,
  });
}

function readLocalInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("arcpay-arbitrum-invoices") ?? "[]");
  } catch {
    return [];
  }
}

function writeLocalInvoices(items: Invoice[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("arcpay-arbitrum-invoices", JSON.stringify(items.slice(0, 100)));
}

function saveLocalInvoice(invoice: Invoice) {
  writeLocalInvoices(mergeInvoices([invoice], readLocalInvoices()));
}

function mergeInvoices(primary: Invoice[], secondary: Invoice[]) {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((invoice) => {
    if (seen.has(invoice.publicId)) return false;
    seen.add(invoice.publicId);
    return true;
  });
}

function sum(items: Invoice[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}
