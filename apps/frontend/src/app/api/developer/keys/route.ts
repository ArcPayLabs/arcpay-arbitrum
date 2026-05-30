import { NextResponse } from "next/server";
import { createDeveloperKey, listDeveloperKeys, revokeDeveloperKey } from "@arbitrum/lib/server/developer-keys";
import { requireSession, unauthorized } from "@arbitrum/lib/server/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireSession(request);
  if (!session) return unauthorized();
  try {
    return NextResponse.json({ ok: true, keys: await listDeveloperKeys(session.address) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = requireSession(request);
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  try {
    const result = await createDeveloperKey(session.address, String(body.label ?? "MCP key").slice(0, 120));
    return NextResponse.json({ ok: true, key: result.key, record: result.row });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const session = requireSession(request);
  if (!session) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
  try {
    await revokeDeveloperKey(session.address, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 502 });
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
