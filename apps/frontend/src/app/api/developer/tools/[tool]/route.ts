import { NextResponse } from "next/server";
import { runDeveloperTool } from "@arbitrum/lib/server/developer-tools";
import { trackUsageEvent } from "@arbitrum/lib/server/usage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ tool: string }> }) {
  try {
    const { tool } = await context.params;
    const url = new URL(request.url);
    const args = Object.fromEntries(url.searchParams.entries());
    const result = await runDeveloperTool(tool, args);
    await trackUsageEvent({
      eventType: "developer_tool_called",
      source: "developer-tools",
      path: `/api/developer/tools/${tool}`,
      toolName: tool,
      status: "ok",
      metadata: { argKeys: Object.keys(args).slice(0, 20), method: "GET" },
    });
    if (result.contentType === "text/plain") {
      return new Response(String(result.body), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return NextResponse.json(result.body);
  } catch (error) {
    const { tool } = await context.params.catch(() => ({ tool: "unknown" }));
    await trackUsageEvent({
      eventType: "developer_tool_called",
      source: "developer-tools",
      path: `/api/developer/tools/${tool}`,
      toolName: tool,
      status: "error",
      metadata: { method: "GET" },
    });
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 400 });
  }
}
