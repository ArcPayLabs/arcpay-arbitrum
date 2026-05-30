"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, PlugZap, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/app/developer-access")({
  component: DeveloperAccessRoute,
});

type DeveloperKey = {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function DeveloperAccessRoute() {
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [label, setLabel] = useState("Claude Desktop MCP");
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState("Create a developer key to connect hosted MCP clients to ArcPay tools.");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/developer/keys", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not load developer keys.");
      setKeys(body.keys ?? []);
      setStatus("Developer access loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setLoading(true);
    setSecret("");
    try {
      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not create key.");
      setSecret(body.key);
      setStatus("Developer key created. Copy it now; it will not be shown again.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/developer/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Could not revoke key.");
      setStatus("Developer key revoked.");
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyRound}
        eyebrow="Developer access"
        title="Hosted MCP keys."
        description="Issue scoped keys for Claude, Cursor, agent runners, or HTTP clients that need ArcPay Arbitrum MCP tools without exposing the global server token."
        actions={
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="text-sm font-medium">Key label</span>
            <input className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <button className="h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60" onClick={() => void createKey()} disabled={loading || !label.trim()}>
            Create MCP key
          </button>
        </div>

        {secret ? (
          <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm font-semibold">Copy this key now</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-background p-3">
              <code className="min-w-0 flex-1 break-all text-xs">{secret}</code>
              <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background" onClick={() => void navigator.clipboard.writeText(secret)}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Use as `Authorization: Bearer {secret}` when calling `/api/mcp`.
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{status}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4 text-sm font-semibold">Issued keys</div>
        <div className="divide-y divide-border">
          {keys.map((key) => (
            <div key={key.id} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_180px_160px_auto] md:items-center">
              <div>
                <div className="font-medium">{key.label}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{key.key_prefix}</div>
              </div>
              <div className="text-sm text-muted-foreground">{key.scopes.join(", ")}</div>
              <div className="text-xs text-muted-foreground">
                {key.revoked_at ? "Revoked" : key.last_used_at ? `Used ${new Date(key.last_used_at).toLocaleString()}` : "Never used"}
              </div>
              <button className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50" disabled={Boolean(key.revoked_at) || loading} onClick={() => void revoke(key.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </button>
            </div>
          ))}

          {!keys.length ? (
            <div className="p-6">
              <EmptyState
                icon={PlugZap}
                title="No developer keys yet"
                description="Create one key for each external agent host. Revoke old keys when rotating access."
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> MCP connection</div>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-muted p-4 text-xs">{`{
  "mcpServers": {
    "arcpay-arbitrum": {
      "url": "https://arcpay-arbitrum.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ap_arbitrum_..."
      }
    }
  }
}`}</pre>
      </section>
    </div>
  );
}
