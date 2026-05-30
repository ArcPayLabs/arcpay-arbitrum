import { NextResponse } from "next/server";
import { collectRuntimeStatus } from "@arbitrum/lib/server/status";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const status = await collectRuntimeStatus(origin);
  return NextResponse.json(status, {
    status: status.ok ? 200 : 207,
    headers: { "Cache-Control": "no-store" },
  });
}
