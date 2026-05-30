import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@arbitrum/lib/server/access";
import { readUsageAnalytics } from "@arbitrum/lib/server/usage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (!session) return unauthorized();
  return NextResponse.json(await readUsageAnalytics());
}
