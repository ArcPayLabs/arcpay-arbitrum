"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Mail, UserRound, Wallet } from "lucide-react";
import { ProductAppShell } from "../product-render";
import { PageHeader } from "../../product-ui/components/app/PageHeader";
import { StatCard } from "../../product-ui/components/primitives/StatCard";
import { useWalletConnectAction } from "../../product-ui/hooks/use-wallet-connect-action";
import { getOptionalSupabaseClient } from "../supabase-client";

type ProfileForm = {
  displayName: string;
  role: string;
  notificationEmail: string;
  walletLabel: string;
};

const EMPTY_PROFILE: ProfileForm = {
  displayName: "",
  role: "Founder / finance lead",
  notificationEmail: "",
  walletLabel: "Arbitrum operations wallet",
};

export default function ProfilePage() {
  const walletAction = useWalletConnectAction();
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("Connect an Arbitrum wallet or sign in with email to sync profile details.");
  const walletAddress = walletAction.publicKeyBase58 ?? "";

  useEffect(() => {
    const supabase = getOptionalSupabaseClient();
    let mounted = true;

    async function load() {
      if (!supabase) {
        setStatus("Supabase env is not configured. Wallet profile remains local.");
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted) return;
      setUserId(user?.id ?? "");
      setEmail(user?.email ?? "");
      if (!user) return;

      const { data: row, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        setStatus(`Profile load failed: ${error.message}`);
        return;
      }
      setProfile({
        displayName: row?.display_name ?? "",
        role: row?.role ?? "Founder / finance lead",
        notificationEmail: row?.notification_email || user.email || "",
        walletLabel: row?.wallet_label || "Arbitrum operations wallet",
      });
      setStatus("Profile loaded.");
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function connectWallet() {
    await walletAction.connectWallet();
    setStatus(walletAction.errorMessage ?? "Arbitrum wallet linked to this browser session.");
  }

  async function saveProfile() {
    const supabase = getOptionalSupabaseClient();
    if (!supabase || !userId) {
      setStatus("Email profile sync requires Supabase sign-in. Wallet identity is already stored in this browser session.");
      return;
    }
    const { error } = await supabase.from("user_profiles").upsert({
      user_id: userId,
      display_name: profile.displayName,
      role: profile.role,
      notification_email: profile.notificationEmail || email,
      wallet_label: profile.walletLabel,
      linked_wallet_address: walletAddress || null,
    }, { onConflict: "user_id" });
    setStatus(error ? `Profile save failed: ${error.message}` : "Profile saved.");
  }

  return (
    <ProductAppShell>
      <div className="space-y-6">
        <PageHeader
          icon={UserRound}
          eyebrow="Workspace identity"
          title="Profile"
          description="Manage the operator profile, notification email, and Arbitrum wallet identity used for ArcPay treasury actions."
          actions={
            <button onClick={() => void connectWallet()} className="rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
              {walletAddress ? "Refresh wallet" : "Connect Arbitrum wallet"}
            </button>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard icon={Wallet} label="Wallet" value={walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "--"} hint="Arbitrum signer" />
          <StatCard icon={Mail} label="Email" value={email || "--"} hint="Optional login identity" />
          <StatCard label="Sync" value={userId ? "Supabase" : "Local"} hint="Profile persistence" emphasis />
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{status}</div>

        <section className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display name"><input className="ap-in" value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></Field>
            <Field label="Role"><input className="ap-in" value={profile.role} onChange={(event) => setProfile({ ...profile, role: event.target.value })} /></Field>
            <Field label="Notification email"><input className="ap-in" value={profile.notificationEmail} onChange={(event) => setProfile({ ...profile, notificationEmail: event.target.value })} /></Field>
            <Field label="Wallet label"><input className="ap-in" value={profile.walletLabel} onChange={(event) => setProfile({ ...profile, walletLabel: event.target.value })} /></Field>
          </div>
          <button onClick={() => void saveProfile()} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Save profile</button>
        </section>
      </div>
    </ProductAppShell>
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
