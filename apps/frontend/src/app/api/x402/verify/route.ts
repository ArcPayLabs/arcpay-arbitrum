import { json, options, verifyOrder } from "@arbitrum/lib/server/x402-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return json(await verifyOrder({
    orderId: typeof body.orderId === "string" ? body.orderId : null,
    slug: typeof body.agentSlug === "string" ? body.agentSlug : typeof body.slug === "string" ? body.slug : null,
    requester: typeof body.requester === "string" ? body.requester : null,
  }));
}
