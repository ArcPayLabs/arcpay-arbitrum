// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Bell, Globe2, KeyRound, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { useNetwork } from "@/store/network";
import { getOptionalSupabaseClient } from "../../app/supabase-client";
import { ensureCurrentUserAccount } from "@/lib/account";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  saveWorkspaceSettingsSnapshot,
  WORKSPACE_SETTINGS_STORAGE_KEY,
} from "@/lib/policy";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings - ArcPay" }] }),
  component: SettingsPage,
});

type IntegrationKey = "arbitrumRpc" | "agentRegistry" | "orderBook" | "policyEngine" | "spendCards" | "privacyVault" | "riskOracle" | "mcp";

const INTEGRATIONS: { key: IntegrationKey; label: string; description: string }[] = [
  { key: "arbitrumRpc", label: "Arbitrum RPC", description: "Testnet reads, balances, and transaction checks" },
  { key: "agentRegistry", label: "Agent registry", description: "Capability discovery and agent onboarding" },
  { key: "orderBook", label: "Order book", description: "Agent order lifecycle and settlement" },
  { key: "policyEngine", label: "Policy engine", description: "Spend windows, approval thresholds, and pause" },
  { key: "spendCards", label: "USDC cards", description: "Agent-limited virtual treasury cards" },
  { key: "privacyVault", label: "Privacy vault", description: "Commitments and selective disclosure records" },
  { key: "riskOracle", label: "Risk oracle", description: "Counterparty and order risk scoring" },
  { key: "mcp", label: "MCP server", description: "Agent control through Claude or any MCP host" },
];

const DEFAULT_INTEGRATIONS: Record<IntegrationKey, boolean> = {
  arbitrumRpc: true,
  agentRegistry: true,
  orderBook: true,
  policyEngine: true,
  spendCards: true,
  privacyVault: true,
  riskOracle: true,
  mcp: true,
};

function SettingsPage() {
  const network = useNetwork((state) => state.mode);
  const setNetwork = useNetwork((state) => state.setMode);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Multi-agent agency");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [autoYieldSweeps, setAutoYieldSweeps] = useState(false);
  const [requireWallet, setRequireWallet] = useState(true);
  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);
  const [status, setStatus] = useState("Sign in to sync settings across devices.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_SETTINGS_STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Partial<{
          requireWalletForActions: boolean;
          emailNotifications: boolean;
          riskAlerts: boolean;
          autoYieldSweeps: boolean;
          defaultNetwork: "arbitrum";
        }>;
        if (typeof cached.emailNotifications === "boolean") setEmailNotifications(cached.emailNotifications);
        if (typeof cached.riskAlerts === "boolean") setRiskAlerts(cached.riskAlerts);
        if (typeof cached.autoYieldSweeps === "boolean") setAutoYieldSweeps(cached.autoYieldSweeps);
        if (typeof cached.requireWalletForActions === "boolean") setRequireWallet(cached.requireWalletForActions);
        if (cached.defaultNetwork === "arbitrum") setNetwork(cached.defaultNetwork);
      }
    } catch {
      saveWorkspaceSettingsSnapshot(DEFAULT_WORKSPACE_SETTINGS);
    }

    const supabase = getOptionalSupabaseClient();
    let mounted = true;

    async function loadSettings() {
      if (!supabase) {
        setStatus("Supabase env is not configured in this frontend runtime.");
        return;
      }

      const account = await ensureCurrentUserAccount(supabase);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!mounted) return;

      setUserId(user?.id ?? null);

      if (!user) return;
      if (account?.workspaceName) setWorkspaceName(account.workspaceName);

      const { data, error } = await supabase
        .from("user_workspace_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setStatus(`Settings load failed: ${error.message}`);
        return;
      }

      if (data) {
        setWorkspaceName(data.workspace_name);
        setNetwork(data.default_network);
        setEmailNotifications(data.email_notifications);
        setRiskAlerts(data.risk_alerts);
        setAutoYieldSweeps(data.auto_yield_sweeps);
        setRequireWallet(data.require_wallet_for_actions);
        setIntegrations({ ...DEFAULT_INTEGRATIONS, ...data.enabled_integrations });
        saveWorkspaceSettingsSnapshot({
          requireWalletForActions: data.require_wallet_for_actions,
          emailNotifications: data.email_notifications,
          riskAlerts: data.risk_alerts,
          autoYieldSweeps: data.auto_yield_sweeps,
          defaultNetwork: data.default_network,
        });
        setStatus("Settings loaded.");
      } else {
        setStatus("Default settings created for this workspace.");
      }
    }

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, [setNetwork]);

  async function saveSettings() {
    if (!userId) {
      setStatus("Sign in first, then save workspace settings.");
      return;
    }

    const supabase = getOptionalSupabaseClient();
    if (!supabase) {
      setStatus("Supabase env is not configured in this frontend runtime.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("user_workspace_settings")
      .upsert(
        {
          user_id: userId,
          workspace_name: workspaceName,
          default_network: network,
          email_notifications: emailNotifications,
          risk_alerts: riskAlerts,
          auto_yield_sweeps: autoYieldSweeps,
          require_wallet_for_actions: requireWallet,
          enabled_integrations: integrations,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);

    if (error) {
      setStatus(`Settings save failed: ${error.message}`);
      return;
    }

    saveWorkspaceSettingsSnapshot({
      requireWalletForActions: requireWallet,
      emailNotifications,
      riskAlerts,
      autoYieldSweeps,
      defaultNetwork: network,
    });
    setStatus("Settings saved. Workspace preferences are synced.");
  }

  function toggleIntegration(key: IntegrationKey) {
    setIntegrations((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div>
      <PageHeader
        icon={SettingsIcon}
        eyebrow="Workspace"
        title="Settings"
        description="Control workspace identity, default network behavior, notification rules, and enabled provider rails."
        actions={
          <button
            className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50"
            disabled={saving}
            onClick={() => void saveSettings()}
            type="button"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="w-4 h-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Workspace profile</div>
              <div className="text-xs text-muted-foreground">Used in approvals, audit exports, and invoice/payment metadata.</div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace name</span>
            <input
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => setWorkspaceName(event.target.value)}
              value={workspaceName}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <Toggle label="Email notifications" description="Send payment, risk, and policy alerts." enabled={emailNotifications} onToggle={() => setEmailNotifications((v) => !v)} icon={Bell} />
            <Toggle label="Risk alerts" description="Notify when Arbitrum risk score drops below policy." enabled={riskAlerts} onToggle={() => setRiskAlerts((v) => !v)} icon={ShieldCheck} />
            <Toggle label="Auto yield sweeps" description="Queue yield actions when idle funds pass policy." enabled={autoYieldSweeps} onToggle={() => setAutoYieldSweeps((v) => !v)} icon={Globe2} />
            <Toggle label="Require wallet for actions" description="Block signing unless a wallet is connected." enabled={requireWallet} onToggle={() => setRequireWallet((v) => !v)} icon={KeyRound} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-medium">Default network</div>
          <div className="text-xs text-muted-foreground mt-0.5 mb-4">This deployment is fixed to Arbitrum Sepolia so workspace policy, signing, and contract reads stay deterministic.</div>
          <div className="grid grid-cols-1 gap-2">
            <button
              className="rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
              onClick={() => setNetwork("arbitrum")}
              type="button"
            >
              Arbitrum Sepolia
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Current mode: <span className="font-semibold text-foreground">{network}</span>. All actions require wallet review and Arbitrum Sepolia signing.
          </div>
        </section>

        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-medium">Enabled integrations</div>
          <div className="text-xs text-muted-foreground mt-0.5 mb-4">
            Turning off an integration hides it from recommendations and route review, while infrastructure evidence remains available in the trust center.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {INTEGRATIONS.map((item) => (
              <button
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  integrations[item.key] ? "border-primary/40 bg-primary/5" : "border-border bg-background opacity-70"
                }`}
                key={item.key}
                onClick={() => toggleIntegration(item.key)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    integrations[item.key] ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {integrations[item.key] ? "Enabled" : "Off"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">{status}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onToggle,
  icon: Icon,
}: {
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly onToggle: () => void;
  readonly icon: typeof Bell;
}) {
  return (
    <button
      className={`rounded-2xl border p-4 text-left transition-colors ${
        enabled ? "border-primary/40 bg-primary/5" : "border-border bg-background"
      }`}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <div className="text-sm font-semibold">{label}</div>
        </div>
        <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </span>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{description}</div>
    </button>
  );
}
