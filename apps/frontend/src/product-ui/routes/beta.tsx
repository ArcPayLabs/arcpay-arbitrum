"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, RadioTower, ShieldCheck, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "ArcPay Arbitrum Beta" },
      { name: "description", content: "Join the ArcPay Arbitrum private beta for agent treasury, x402, privacy intents, and USDC cards." },
    ],
  }),
  component: BetaPage,
});

type SubmitState = "idle" | "loading" | "success" | "error";

function BetaPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    telegram: "",
    walletAddress: "",
    role: "Agent builder",
    useCase: "",
    agentUrl: "",
  });
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("https://t.me/TheLuckyReborned");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(body?.error ?? "Beta request failed.");
      setState("success");
      setMessage(body.message ?? "Beta request received.");
      if (body.telegramUrl) setTelegramUrl(body.telegramUrl);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <MarketingShell navTone="light">
      <div className="px-6 py-12 md:py-16">
        <div className="mx-auto grid max-w-[88rem] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <section className="relative overflow-hidden rounded-[2rem] border border-orange-200/70 bg-[radial-gradient(circle_at_18%_12%,rgba(255,122,24,0.26),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(20,184,166,0.16),transparent_24%),linear-gradient(140deg,#fff9ef_0%,#f3eadc_48%,#fffaf2_100%)] p-8 text-foreground shadow-sm md:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 hidden h-72 w-72 rounded-full border-[42px] border-orange-300/25 sm:block" />
            <div className="pointer-events-none absolute -bottom-24 left-12 hidden h-56 w-56 rounded-full bg-white/45 blur-3xl sm:block" />
            <div className="relative inline-flex rounded-full border border-orange-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              Arbitrum private beta
            </div>
            <h1 className="relative mt-8 max-w-2xl text-5xl font-medium leading-[0.95] tracking-[-0.05em] md:text-7xl">
              Bring your agents into a real treasury loop.
            </h1>
            <p className="relative mt-6 max-w-xl text-base leading-7 text-muted-foreground">
              ArcPay is onboarding Arbitrum builders who want wallet-first agent accounts, x402 paid endpoints, ETH escrow, USDC spend cards, privacy intents, risk checks, and reputation records on testnet.
            </p>
            <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
              <Pill icon={Bot} title="Agent onboarding" body="Register existing agents and expose capability metadata." />
              <Pill icon={RadioTower} title="x402 paid work" body="Charge for protected agent endpoints with on-chain settlement." />
              <Pill icon={ShieldCheck} title="Policy controls" body="Limit spend by hour, day, week, allowlist, and pause state." />
              <Pill icon={Users} title="Beta feedback" body="Use the product, report edge cases, and shape the Arbitrum stack." />
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Request access</div>
              <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em]">Tell us what you want to run.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We prioritize agent builders, protocol teams, and operators who can run real testnet flows and give precise feedback.
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
                <Field label="Work email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Telegram" placeholder="@handle" value={form.telegram} onChange={(value) => setForm({ ...form, telegram: value })} />
                <Field label="Arbitrum wallet" placeholder="0x..." value={form.walletAddress} onChange={(value) => setForm({ ...form, walletAddress: value })} />
              </div>
              <label className="block">
                <span className="text-sm font-medium">Builder type</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option>Agent builder</option>
                  <option>Protocol team</option>
                  <option>Treasury operator</option>
                  <option>Hackathon team</option>
                  <option>Developer tooling</option>
                </select>
              </label>
              <Field label="Agent or app URL" placeholder="https://..." value={form.agentUrl} onChange={(value) => setForm({ ...form, agentUrl: value })} />
              <label className="block">
                <span className="text-sm font-medium">What will you test?</span>
                <textarea
                  className="mt-2 min-h-32 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Example: I want to onboard a research agent, expose an x402 endpoint, set daily spend limits, receive USDC card payments, and record order-backed reputation."
                  value={form.useCase}
                  onChange={(event) => setForm({ ...form, useCase: event.target.value })}
                  required
                />
              </label>

              {message ? (
                <div className={`rounded-2xl px-4 py-3 text-sm ${state === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                  {message}
                </div>
              ) : null}

              <button disabled={state === "loading"} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60">
                {state === "loading" ? "Submitting..." : "Request beta access"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {state === "success" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={telegramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">
                  Join Telegram <ArrowRight className="h-4 w-4" />
                </a>
                <Link to="/onboard" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold">
                  Open app <CheckCircle2 className="h-4 w-4" />
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}

function Pill({ icon: Icon, title, body }: { icon: typeof Bot; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{body}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </label>
  );
}
