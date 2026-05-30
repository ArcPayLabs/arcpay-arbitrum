import { json, options, x402Demo } from "@arbitrum/lib/server/x402-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  return json(x402Demo());
}
