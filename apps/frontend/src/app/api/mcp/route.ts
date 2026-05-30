import { NextResponse } from "next/server";
import { developerTools, runDeveloperTool } from "@arbitrum/lib/server/developer-tools";
import { validateDeveloperKey } from "@arbitrum/lib/server/developer-keys";
import { trackUsageEvent } from "@arbitrum/lib/server/usage";

export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

export async function GET(request: Request) {
  const blocked = await guardRequest(request);
  if (blocked) return blocked;

  await trackUsageEvent({
    eventType: "mcp_manifest_read",
    source: "mcp",
    path: "/api/mcp",
  });
  return NextResponse.json({
    ok: true,
    service: "arcpay-arbitrum-remote-mcp",
    transport: "http-json-rpc",
    protocolVersion: "2024-11-05",
    auth: mcpBearerToken() ? "bearer" : "public-rate-limited",
    methods: ["initialize", "tools/list", "tools/call"],
    tools: developerTools,
  });
}

export async function POST(request: Request) {
  const blocked = await guardRequest(request);
  if (blocked) return blocked;

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error", 400);
  }

  const id = body.id ?? null;
  const method = String(body.method ?? "");

  try {
    if (method === "initialize") {
      await trackMcp(method, "ok");
      return jsonRpcResult(id, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "arcpay-arbitrum", version: "0.1.0" },
        capabilities: { tools: {} },
      });
    }

    if (method === "tools/list") {
      await trackMcp(method, "ok");
      return jsonRpcResult(id, { tools: developerTools });
    }

    if (method === "tools/call") {
      const params = asRecord(body.params);
      const toolName = String(params.name ?? "");
      const args = asRecord(params.arguments ?? params.args);
      const result = await runDeveloperTool(toolName, args);
      await trackMcp(method, "ok", toolName, args);
      return jsonRpcResult(id, {
        content: [{ type: "text", text: typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2) }],
        structuredContent: result.contentType === "application/json" ? result.body : undefined,
        isError: false,
      });
    }

    return jsonRpcError(id, -32601, `Method not found: ${method}`, 404);
  } catch (error) {
    await trackMcp(method || "unknown", "error");
    return jsonRpcError(id, -32000, error instanceof Error ? error.message : String(error), 400);
  }
}

async function guardRequest(request: Request) {
  const auth = await checkAuth(request);
  if (auth) return auth;
  const limited = checkRateLimit(request);
  if (limited) return limited;
  return null;
}

async function checkAuth(request: Request) {
  const token = mcpBearerToken();
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token && !bearer) return null;
  if (token && bearer === token) return null;
  if (bearer && await validateDeveloperKey(bearer)) return null;
  if (!token && !bearer) return null;
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

function checkRateLimit(request: Request) {
  const limit = Number(process.env.ARCPAY_MCP_RATE_LIMIT_PER_MINUTE || DEFAULT_RATE_LIMIT);
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  current.count += 1;
  if (current.count <= limit) return null;
  return NextResponse.json({
    ok: false,
    error: "rate_limited",
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  }, {
    status: 429,
    headers: { "retry-after": String(Math.ceil((current.resetAt - now) / 1000)) },
  });
}

function mcpBearerToken() {
  return process.env.ARCPAY_MCP_BEARER_TOKEN || process.env.MCP_BEARER_TOKEN || "";
}

function jsonRpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: JsonRpcRequest["id"], code: number, message: string, status: number) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function trackMcp(method: string, status: string, toolName?: string, args: Record<string, unknown> = {}) {
  await trackUsageEvent({
    eventType: method === "tools/call" ? "mcp_tool_called" : "mcp_method_called",
    source: "mcp",
    path: "/api/mcp",
    toolName: toolName || method,
    status,
    metadata: { method, argKeys: Object.keys(args).slice(0, 20) },
  });
}
