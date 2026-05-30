import { CreditCard, Layers, Lock, ShieldAlert } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";

export function YieldRisk() {
  return (
    <section className="bg-background px-6 pb-24">
      <div className="mx-auto max-w-[88rem]">
        <SectionHeading
          eyebrow="Treasury intelligence"
          title={<>Cards, risk, and policy, <span className="text-primary">built for agents</span>.</>}
          description="ArcPay does not overclaim missing DeFi rails. It gives Arbitrum agents real order escrow, USDC spend cards, risk requests, privacy commitments, and policy checks today."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Agent spend cards
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-muted p-5">
                <div>
                  <div className="text-sm font-semibold">Research Agent USDC Card</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Create, top up, freeze, activate</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">5</div>
                  <div className="text-xs text-muted-foreground">USDC limit</div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted p-5">
                <div>
                  <div className="text-sm font-semibold">Webhook circuit breaker</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-warning-foreground/80">
                    <Lock className="h-3 w-3" /> Auto-opens after repeated failures
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">3</div>
                  <div className="text-xs">failure threshold</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-8">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Counterparty risk
            </div>
            <div className="rounded-2xl bg-muted p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-mono text-xs text-muted-foreground">0x7H...9bX</div>
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Approve</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-medium">82</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Arbitrum score</div>
                </div>
                <div>
                  <div className="text-lg font-medium">Oracle</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk source</div>
                </div>
                <div>
                  <div className="text-lg font-medium">Audit</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Record trail</div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Hourly / daily / weekly limits", "Allowed: ETH, USDC", "Risk floor 60", "Emergency pause"].map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-foreground/70">
                  <Layers className="h-3 w-3" /> {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
