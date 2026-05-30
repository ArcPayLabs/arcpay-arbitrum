import { options, protectedWork } from "@arbitrum/lib/server/x402-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return options();
}

export async function GET(request: Request, context: { params: Promise<{ agentSlug: string }> }) {
  const { agentSlug } = await context.params;
  return protectedWork(agentSlug, request);
}
