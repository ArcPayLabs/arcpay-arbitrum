import { json, options, paymentRequirements } from "@arbitrum/lib/server/x402-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return options();
}

export async function GET(request: Request, context: { params: Promise<{ agentSlug: string }> }) {
  try {
    const { agentSlug } = await context.params;
    return json(await paymentRequirements(agentSlug, request));
  } catch (error) {
    const status = typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status });
  }
}
