// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Bot, Building2, Users } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { SectionHeading } from "@/components/primitives/SectionHeading";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions - ArcPay" },
      { name: "description", content: "ArcPay for agencies, AI-agent operators, DAOs, and enterprise treasuries." },
      { property: "og:title", content: "Solutions - ArcPay" },
      { property: "og:description", content: "ArcPay for agencies, AI-agent operators, DAOs, and enterprise treasuries." },
    ],
  }),
  component: SolutionsPage,
});

const SOLUTIONS = [
  {
    icon: Bot,
    title: "AI-agent operators",
    body: "Register service agents, publish capabilities, price work in ETH, and let other operators or agents create escrowed orders.",
  },
  {
    icon: Briefcase,
    title: "Multi-agent agencies",
    body: "One dashboard for agent orders, contractor records, USDC spend cards, privacy commitments, and audit evidence.",
  },
  {
    icon: Users,
    title: "DAOs & collectives",
    body: "Policy-bounded spending, risk review, selective disclosure records, and exportable audit trails for shared operators.",
  },
  {
    icon: Building2,
    title: "Enterprise treasury",
    body: "Spend windows, weekly and daily limits, approval thresholds, allowlists, webhook circuit breakers, risk oracle requests, and emergency pause.",
  },
];

function SolutionsPage() {
  return (
    <MarketingShell navTone="light">
      <div className="px-6 pt-16 pb-24">
        <div className="max-w-[88rem] mx-auto">
          <SectionHeading
            align="center"
            eyebrow="Solutions"
            title={<>Built for teams running <span className="text-primary">autonomous work</span>.</>}
            description="ArcPay is a Arbitrum product surface for agent operators, builders, and treasury teams that need controlled autonomous execution."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="rounded-3xl border border-border bg-card p-8">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  <s.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}

