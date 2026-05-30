import { NextResponse } from "next/server";
import { trackUsageEvent } from "@arbitrum/lib/server/usage";

const BETA_TABLE = "arcpay_arbitrum_beta_signups";
const RECORDS_TABLE = validRecordsTable(process.env.ARCPAY_RECORDS_TABLE ?? "arcpay_arbitrum_records");

type BetaPayload = {
  name: string;
  email: string;
  telegram: string;
  walletAddress: string;
  role: string;
  useCase: string;
  agentUrl: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = normalizePayload(body);
  const validation = validatePayload(payload);
  if (validation) return NextResponse.json({ ok: false, error: validation }, { status: 400 });

  if (!hasSupabase()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });
  }

  const betaResult = await writeBetaSignup(payload, request);
  if (betaResult.ok) {
    await trackBetaSignup(payload, "beta_table");
    return NextResponse.json({
      ok: true,
      mode: "beta_table",
      message: "Beta request received. Join Telegram and use the app while we review operator accounts.",
      telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/TheLuckyReborned",
    });
  }

  const fallback = await writeFallbackRecord(payload, betaResult.error);
  if (fallback.ok) {
    await trackBetaSignup(payload, "records_fallback");
    return NextResponse.json({
      ok: true,
      mode: "records_fallback",
      message: "Beta request recorded in the audit table. Apply the beta migration for the dedicated beta queue.",
      telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/TheLuckyReborned",
    }, { status: 202 });
  }

  return NextResponse.json({ ok: false, error: fallback.error || betaResult.error || "beta_signup_failed" }, { status: 502 });
}

function normalizePayload(body: Record<string, unknown>): BetaPayload {
  return {
    name: clean(body.name, 120),
    email: clean(body.email, 180).toLowerCase(),
    telegram: clean(body.telegram, 80),
    walletAddress: clean(body.walletAddress, 80),
    role: clean(body.role, 80),
    useCase: clean(body.useCase, 1500),
    agentUrl: clean(body.agentUrl, 300),
  };
}

function validatePayload(payload: BetaPayload) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) return "valid_email_required";
  if (!payload.name) return "name_required";
  if (!payload.role) return "role_required";
  if (payload.useCase.length < 20) return "use_case_min_20_chars";
  return "";
}

async function writeBetaSignup(payload: BetaPayload, request: Request) {
  const metadata = {
    source: "arcpay-arbitrum-beta",
    userAgent: request.headers.get("user-agent") ?? "",
    referrer: request.headers.get("referer") ?? "",
  };
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${BETA_TABLE}`, {
    method: "POST",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      email: payload.email,
      name: payload.name,
      telegram: payload.telegram || null,
      wallet_address: payload.walletAddress || null,
      role: payload.role,
      use_case: payload.useCase,
      agent_url: payload.agentUrl || null,
      status: "new",
      metadata,
      updated_at: new Date().toISOString(),
    }),
  });

  if (response.ok) return { ok: true };
  if (response.status === 409) return { ok: true };
  return { ok: false, error: await response.text() };
}

async function writeFallbackRecord(payload: BetaPayload, betaError: string | undefined) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${RECORDS_TABLE}`, {
    method: "POST",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      owner: "beta",
      type: "beta",
      title: `Beta request: ${payload.name} <${payload.email}>`,
      status: "new",
      amount: JSON.stringify({
        role: payload.role,
        telegram: payload.telegram,
        walletAddress: payload.walletAddress,
        useCase: payload.useCase,
        agentUrl: payload.agentUrl,
      }),
      tx_hash: null,
      created_at: new Date().toISOString(),
    }),
  });

  if (response.ok) return { ok: true };
  return { ok: false, error: await response.text() };
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function validRecordsTable(table: string) {
  return /^arcpay_[a-z0-9_]+_records$/.test(table) ? table : "arcpay_arbitrum_records";
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

async function trackBetaSignup(payload: BetaPayload, mode: string) {
  await trackUsageEvent({
    eventType: "beta_signup_created",
    owner: payload.walletAddress || payload.email,
    agentSlug: payload.agentUrl ? "external-agent" : null,
    source: "beta",
    path: "/api/beta",
    status: mode,
    metadata: {
      role: payload.role,
      hasTelegram: Boolean(payload.telegram),
      hasWallet: Boolean(payload.walletAddress),
      hasAgentUrl: Boolean(payload.agentUrl),
    },
  });
}
