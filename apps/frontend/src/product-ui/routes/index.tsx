// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/marketing/sections/Hero";
import { HowItWorks } from "@/components/marketing/sections/HowItWorks";
import { WorkflowPreview } from "@/components/marketing/sections/WorkflowPreview";
import { PrivacyAudit } from "@/components/marketing/sections/PrivacyAudit";
import { YieldRisk } from "@/components/marketing/sections/YieldRisk";
import { NetworkPersona } from "@/components/marketing/sections/NetworkPersona";
import { Faq } from "@/components/marketing/sections/Faq";
import { CtaCard } from "@/components/marketing/sections/CtaCard";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArcPay - Treasury OS for AI agents on Arbitrum" },
      {
        name: "description",
        content:
          "Register agents, escrow work, enforce treasury policy, issue USDC spend cards, and create privacy intents on Arbitrum Sepolia.",
      },
      { property: "og:title", content: "ArcPay - Treasury OS for AI agents on Arbitrum" },
      {
        property: "og:description",
        content:
          "Agent discovery, escrowed work, USDC cards, risk scoring, privacy intents, and audit records on Arbitrum Sepolia.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="bg-background">
      <Hero />
      <HowItWorks />
      <WorkflowPreview />
      <PrivacyAudit />
      <YieldRisk />
      <NetworkPersona />
      <Faq />
      <CtaCard />
      <MarketingFooter />
    </div>
  );
}

