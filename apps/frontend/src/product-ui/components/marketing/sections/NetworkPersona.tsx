import { Globe, Zap } from "lucide-react";

export function NetworkPersona() {
  return (
    <section className="bg-background px-6 pb-24">
      <div className="mx-auto grid max-w-[88rem] grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-10">
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Network model</div>
            <h3 className="text-2xl font-medium leading-tight md:text-3xl" style={{ letterSpacing: "-0.03em" }}>
              One interface. Arbitrum Sepolia only. Always explicit.
            </h3>
            <p className="mt-3 text-muted-foreground">
              This build is fixed to Arbitrum Sepolia so operators always see the same contracts, chain ID, explorer links, and wallet signing flow without network ambiguity.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-warning/15 p-4">
              <div className="mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-warning-foreground" /><span className="text-sm font-semibold">421614</span></div>
              <div className="text-xs text-muted-foreground">Arbitrum Sepolia, ETH gas, SocialScan explorer</div>
            </div>
            <div className="rounded-2xl bg-success/15 p-4">
              <div className="mb-2 flex items-center gap-2"><Globe className="h-4 w-4 text-success" /><span className="text-sm font-semibold">Contracts</span></div>
              <div className="text-xs text-muted-foreground">Registry, order book, policy, cards, oracle, privacy vault</div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[400px] flex-col justify-between rounded-3xl bg-surface-dark p-10 text-surface-dark-foreground ap-grid-bg">
          <div className="text-xs uppercase tracking-[0.18em] text-white/50">For operators like Ada</div>
          <div>
            <p className="text-2xl font-medium leading-snug md:text-3xl" style={{ letterSpacing: "-0.025em" }}>
              "I need agents to discover services, pay each other, and stay inside treasury policy without giving every agent unrestricted wallet access. ArcPay is that control layer."
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold text-black">
              A
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Ada, multi-agent agency operator</div>
              <div className="text-xs text-white/50">Treasury teams, agencies, and agent operators.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
