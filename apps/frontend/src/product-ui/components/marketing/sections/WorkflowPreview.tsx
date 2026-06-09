import { useEffect, useState } from "react";
import { Coins, Lock, TrendingUp, Wallet } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";
import { StatCard } from "@/components/primitives/StatCard";

const SAMPLE = [
  { t: "00:00", in: 6, out: 2 },
  { t: "04:00", in: 10, out: 4 },
  { t: "08:00", in: 15, out: 8 },
  { t: "12:00", in: 22, out: 12 },
  { t: "16:00", in: 18, out: 15 },
  { t: "20:00", in: 27, out: 17 },
  { t: "24:00", in: 31, out: 20 },
];

export function WorkflowPreview() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="bg-background px-6 pb-24 pt-8">
      <div className="mx-auto max-w-[88rem]">
        <div className="rounded-3xl bg-surface-dark p-6 text-surface-dark-foreground ap-grid-bg md:p-10">
          <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <SectionHeading
              tone="dark"
              eyebrow="Arbitrum control plane"
              title="A finance dashboard for daily agent operations."
              description="Wallet balance, agent registry, order escrow, policy controls, spend cards, privacy intents, risk signals, and audit records stay in one operator view."
            />
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Connect an Arbitrum wallet for live contract writes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard tone="dark" icon={Wallet} label="Signer" value="421614" hint="Arbitrum Sepolia chain" />
            <StatCard tone="dark" icon={Lock} label="Privacy" value="Vault" hint="Commitment intents" />
            <StatCard tone="dark" icon={Coins} label="USDC" value="Cards" hint="Agent budgets" />
            <StatCard tone="dark" icon={TrendingUp} label="Worker" value="Azure" hint="Event monitor active" emphasis />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/50">24h activity</div>
                  <div className="mt-1 text-xl font-medium">Agent orders vs policy events</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-white/70"><span className="h-2 w-2 rounded-full bg-primary" /> Orders</span>
                  <span className="inline-flex items-center gap-1.5 text-white/70"><span className="h-2 w-2 rounded-full bg-accent" /> Controls</span>
                </div>
              </div>
              <div className="h-56">
                {mounted ? <PreviewChart /> : <div className="h-full rounded-xl bg-white/[0.04]" />}
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 text-xs uppercase tracking-wider text-white/50">Pending approvals</div>
              <div className="flex flex-1 flex-col gap-3">
                {[
                  { who: "Register research agent", amt: "0.01 ETH price", risk: "Approve" },
                  { who: "Escrow work order", amt: "0.01 ETH", risk: "Review" },
                  { who: "Top up USDC card", amt: "5 USDC", risk: "Approve" },
                ].map((r) => (
                  <div key={r.who} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 px-3 py-3">
                    <div>
                      <div className="text-sm font-medium text-white">{r.who}</div>
                      <div className="text-xs text-white/50">{r.amt}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      r.risk === "Approve" ? "bg-success/20 text-success" : "bg-warning/20 text-warning-foreground"
                    }`}>
                      {r.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewChart() {
  const width = 760;
  const height = 220;
  const padX = 26;
  const padY = 20;
  const max = Math.max(...SAMPLE.flatMap((row) => [row.in, row.out]));
  const points = (key: "in" | "out") =>
    SAMPLE.map((row, index) => {
      const x = padX + (index / (SAMPLE.length - 1)) * (width - padX * 2);
      const y = height - padY - (row[key] / max) * (height - padY * 2);
      return `${x},${y}`;
    }).join(" ");
  const area = (key: "in" | "out") => `${padX},${height - padY} ${points(key)} ${width - padX},${height - padY}`;

  return (
    <svg aria-label="Preview agent treasury chart" className="h-full w-full" role="img" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="previewIn" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.74 0.18 47)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.74 0.18 47)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="previewOut" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.85 0.13 85)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.85 0.13 85)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line key={ratio} x1={padX} x2={width - padX} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,0.06)" strokeDasharray="5 8" />
      ))}
      <polygon points={area("in")} fill="url(#previewIn)" />
      <polygon points={area("out")} fill="url(#previewOut)" />
      <polyline points={points("in")} fill="none" stroke="oklch(0.74 0.18 47)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <polyline points={points("out")} fill="none" stroke="oklch(0.85 0.13 85)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </svg>
  );
}
