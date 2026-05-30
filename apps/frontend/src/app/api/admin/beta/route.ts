import { NextResponse } from "next/server";
import { requireAdmin, unauthorized, forbidden } from "@arbitrum/lib/server/access";

export const dynamic = "force-dynamic";

const TABLE = "arcpay_arbitrum_beta_signups";

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (!session) return unauthorized();
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const statusFilter = status && status !== "all" ? `&status=eq.${encodeURIComponent(status)}` : "";
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc&limit=100${statusFilter}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ ok: false, error: await response.text() }, { status: 502 });
  return NextResponse.json({ ok: true, rows: await response.json() });
}

export async function PATCH(request: Request) {
  const session = requireAdmin(request);
  if (!session) return forbidden();
  if (!hasSupabase()) return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  if (!["new", "invited", "active", "paused", "rejected"].includes(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return NextResponse.json({ ok: false, error: await response.text() }, { status: 502 });
  return NextResponse.json({ ok: true });
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}
