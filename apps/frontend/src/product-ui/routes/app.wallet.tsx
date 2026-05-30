"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, KeyRound, Network, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/primitives/StatCard";
import { balances, connectedAddress, shortAddress, switchToArbitrum } from "@arbitrum/lib/arbitrum";

export const Route = { options: { component: WalletRoute } };

function WalletRoute() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [message, setMessage] = useState("Connect an EVM wallet to Arbitrum Sepolia.");

  async function connect() {
    setMessage("Switching wallet to Arbitrum Sepolia...");
    await switchToArbitrum();
    const next = await connectedAddress();
    setAddress(next);
    setBalance(await balances(next));
    window.localStorage.setItem("arcpay-arbitrum-wallet-session", next);
    window.dispatchEvent(new StorageEvent("storage", { key: "arcpay-arbitrum-wallet-session" }));
    setMessage("Arbitrum wallet connected and ready for contract writes.");
  }

  useEffect(() => {
    connectedAddress().then(async (next) => {
      setAddress(next);
      setBalance(await balances(next));
      setMessage("Existing Arbitrum wallet session detected.");
    }).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        eyebrow="Wallet interface"
        title="Arbitrum wallet control"
        description="The wallet is the signing layer for account access, ETH transfers, agent orders, USDC cards, policy updates, oracle requests, and privacy intents."
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Signer" value={address ? shortAddress(address) : "--"} hint="Connected EVM account" />
        <StatCard icon={Network} label="Network" value="421614" hint="Arbitrum Sepolia" />
        <StatCard icon={BadgeCheck} label="Balance" value={address ? `${Number(balance || 0).toFixed(4)} ETH` : "--"} hint="Live RPC balance" />
        <StatCard icon={KeyRound} label="Auth" value={address ? "Linked" : "Required"} hint="Wallet challenge session" emphasis />
      </div>
      <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current signer</div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight">{address || "No wallet connected"}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{message}</p>
          </div>
          <button onClick={() => void connect()} className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background">
            {address ? "Refresh wallet" : "Connect Arbitrum wallet"}
          </button>
        </div>
      </section>
    </div>
  );
}
