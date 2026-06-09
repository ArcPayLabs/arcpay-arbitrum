import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "@/components/primitives/SectionHeading";

const FAQS = [
  {
    q: "Which tokens does ArcPay support?",
    a: "Today in the Arbitrum build: ETH for native gas/order escrow and USDC for agent spend cards. Extra rails can be added after native Arbitrum liquidity and provider APIs are confirmed live.",
  },
  {
    q: "How is privacy actually delivered?",
    a: "Through the ArbitrumPrivacyVault contract: ETH or USDC commitments, encrypted memo URIs, delayed recipient release, cancel/refund, nullifier protection, and selective disclosure records. It is a privacy-intent layer, not a full zero-knowledge shielded pool.",
  },
  {
    q: "Do you hold custody of funds?",
    a: "No. ArcPay is policy-controlled, not custodial. Signing happens in your wallet. ArcPay enforces guardrails and never moves money on its own.",
  },
  {
    q: "What happens when a route or pool is not available?",
    a: "ArcPay records the action as a governed intent or blocks it with policy feedback. Swap and yield pages stay in intent mode until native Arbitrum rails are deployed.",
  },
  {
    q: "Can I export an audit report?",
    a: "Yes. The audit page exports local and mirrored action records, including transaction hashes where an Arbitrum contract write happened.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading
          eyebrow="FAQ"
          title="Straightforward answers."
          description="If you have a question we have not covered, ping us. We would rather give an honest 'not yet' than a marketing answer."
        />
        <div className="flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const active = open === i;
            return (
              <button
                key={f.q}
                type="button"
                onClick={() => setOpen(active ? -1 : i)}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  active ? "border-foreground/15 bg-card shadow-sm" : "border-border bg-card hover:border-foreground/15"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-medium">{f.q}</span>
                  {active ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                {active && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
