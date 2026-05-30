import { NextResponse } from "next/server";
import { developerTools, runDeveloperTool } from "@arbitrum/lib/server/developer-tools";
import { trackUsageEvent } from "@arbitrum/lib/server/usage";

export const dynamic = "force-dynamic";

export async function GET() {
  await trackUsageEvent({
    eventType: "developer_tools_listed",
    source: "developer-tools",
    path: "/api/developer/tools",
  });
  return NextResponse.json({
    ok: true,
    service: "arcpay-arbitrum-developer-tools",
    transport: "http",
    tools: developerTools,
  });
}

export async function POST(request: Request) {
  let tool = "";
  try {
    const body = await request.json();
    tool = String(body.tool ?? "");
    const args = asRecord(body.args);
    const result = await runDeveloperTool(tool, args);
    await trackDeveloperTool(tool, args, "ok");
    return NextResponse.json({
      ok: true,
      tool,
      contentType: result.contentType,
      result: result.body,
    });
  } catch (error) {
    await trackDeveloperTool(tool || "unknown", {}, "error");
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 400 });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function trackDeveloperTool(toolName: string, args: Record<string, unknown>, status: string) {
  await trackUsageEvent({
    eventType: "developer_tool_called",
    source: "developer-tools",
    path: "/api/developer/tools",
    toolName,
    status,
    metadata: { argKeys: Object.keys(args).slice(0, 20) },
  });
}
