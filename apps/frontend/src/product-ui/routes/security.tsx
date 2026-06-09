// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, FileSearch, KeyRound, Lock, ServerCog, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionHeading } from "@/components/primitives/SectionHeading";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security - ArcPay" },
      { name: "description", content: "How ArcPay handles custody, signing, privacy intents, policy, and audit on Arbitrum." },
      { property: "og:title", content: "Security - ArcPay" },
      { property: "og:description", content: "Custody, signing, privacy intents, policy, and audit on Arbitrum." },
    ],
  }),
  component: SecurityPage,
});

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Non-custodial",
    body: "ArcPay never holds keys. Signing happens in the connected Arbitrum EVM wallet before contract writes or payment intents proceed.",
  },
  {
    icon: KeyRound,
    title: "Viewing keys, not surveillance",
    body: "Auditors get scoped disclosure records per review scope. Private memo data stays separate from the public commitment trail.",
  },
  {
    icon: Lock,
    title: "Privacy-intent layer",
    body: "ArbitrumPrivacyVault creates ETH or USDC commitments, encrypted memo pointers, delayed recipient release, cancel/refund, and nullifier protection. It is not marketed as a full shielded pool.",
  },
  {
    icon: FileSearch,
    title: "Action-level audit",
    body: "Agent registry, order, card, payment, policy, privacy, and oracle actions are recorded with transaction hashes where an Arbitrum write occurred.",
  },
  {
    icon: AlertTriangle,
    title: "Policy-enforced spend",
    body: "Hourly, daily, and weekly limits, approval thresholds, allowed tokens, blocked actions, minimum Arbitrum risk score, contractor allowlist, and emergency pause.",
  },
  {
    icon: ServerCog,
    title: "Final-review modal, always",
    body: "Network, wallet, token, amount, route, recipient, and policy context are reviewed before any money-moving signature.",
  },
];

function SecurityPage() {
  return (
    <MarketingShell navTone="light">
      <div className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[88rem]">
          <SectionHeading
            align="center"
            eyebrow="Security"
            title={<>What we secure, and how <span className="text-primary">honestly</span>.</>}
            description="ArcPay is a control plane, not a custodian. We separate live Arbitrum Sepolia contracts, wallet signatures, and hosted infrastructure responsibilities clearly."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ITEMS.map((i) => (
              <div key={i.title} className="rounded-3xl border border-border bg-card p-7">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <i.icon className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold">{i.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
