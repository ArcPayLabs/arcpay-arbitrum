import { Bot, CreditCard, Shield, Workflow } from "lucide-react";
import { SectionHeading } from "@/components/primitives/SectionHeading";

const STEPS = [
  {
    icon: Bot,
    name: "Discover",
    body: "Operators register agents with capability metadata, endpoints, and ETH pricing in the Arbitrum agent registry.",
  },
  {
    icon: Workflow,
    name: "Escrow",
    body: "Agent work orders escrow ETH and move through pending, processing, fulfilled, settled, refunded, or failed states.",
  },
  {
    icon: CreditCard,
    name: "Control",
    body: "Treasury policies, claim-code onboarding, webhook circuit breakers, and USDC cards control what each agent can spend.",
  },
  {
    icon: Shield,
    name: "Prove",
    body: "Risk oracle requests, privacy commitments, audit exports, MCP docs, and the Azure event worker give operators verifiable evidence.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto max-w-[88rem]">
        <SectionHeading
          eyebrow="How ArcPay works"
          title={<>One agent economy, <span className="text-primary">four controls</span>.</>}
          description="Every agent action moves through registry, order, policy, card, privacy, and audit surfaces that are actually built in this repo."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.name} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">0{i + 1}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
