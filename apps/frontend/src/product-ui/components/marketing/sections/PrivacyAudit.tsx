import { Eye, EyeOff, KeyRound } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";

export function PrivacyAudit() {
  return (
    <section className="bg-background px-6 pb-24">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-10">
          <SectionHeading
            eyebrow="Privacy & audit"
            title="Public chain evidence without exposing every private detail."
            description="ArcPay includes a ArbitrumPrivacyVault contract for commitment-based payment intents, encrypted memo pointers, and selective disclosure records."
          />
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: EyeOff, t: "Commit", b: "Privacy Vault intents" },
              { icon: KeyRound, t: "Disclose", b: "Scoped viewing keys" },
              { icon: Eye, t: "Audit", b: "Local and mirrored records" },
            ].map((c) => (
              <div key={c.t} className="rounded-xl bg-muted p-4">
                <c.icon className="mb-2 h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">{c.t}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.b}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-h-[420px] flex-col justify-between rounded-3xl bg-surface-dark p-10 text-surface-dark-foreground ap-grid-bg">
          <div className="text-xs uppercase tracking-[0.18em] text-white/50">Builder opportunity</div>
          <div>
            <p className="text-2xl font-medium leading-snug md:text-3xl" style={{ letterSpacing: "-0.025em" }}>
              "Arbitrum agents need privacy-aware payment coordination. ArcPay ships a reusable privacy-intent layer operators and agent builders can build on."
            </p>
            <div className="mt-6 text-sm text-white/55">ArcPay privacy principle</div>
          </div>
        </div>
      </div>
    </section>
  );
}
