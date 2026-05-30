import { NextResponse } from "next/server";
import { createRecord, listRecords } from "@arbitrum/lib/server/records";
import { readSession, sessionCookie } from "@arbitrum/lib/server/session";
import { trackUsageEvent } from "@arbitrum/lib/server/usage";

function sessionFromRequest(request: Request) {
  return readSession(request.headers.get("cookie")?.match(new RegExp(`${sessionCookie}=([^;]+)`))?.[1]);
}

export async function GET(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await listRecords(session.address));
}

export async function POST(request: Request) {
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json();
  const type = String(body.type ?? "audit");
  const status = String(body.status ?? "created");
  const txHash = body.txHash ? String(body.txHash) : undefined;
  const record = await createRecord(session.address, {
    type,
    title: String(body.title ?? "Untitled"),
    status,
    amount: body.amount ? String(body.amount) : undefined,
    txHash,
  });
  await trackUsageEvent({
    eventType: "record_created",
    owner: session.address,
    source: "app",
    path: "/api/records",
    status,
    txHash,
    metadata: { recordType: type, title: String(body.title ?? "Untitled").slice(0, 160) },
  });
  return NextResponse.json(record);
}
