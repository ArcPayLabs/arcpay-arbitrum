import { JsonRpcProvider } from "ethers";
import deployment from "../../deployment/arbitrum-sepolia.json";

type HealthState = "ok" | "degraded" | "down" | "unknown";

export type RuntimeCheck = {
  name: string;
  state: HealthState;
  summary: string;
  detail?: string;
  checkedAt: string;
};

export type RuntimeStatus = {
  ok: boolean;
  generatedAt: string;
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorerUrl: string;
  };
  checks: RuntimeCheck[];
};

const RPC_URL = process.env.ARBITRUM_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const X402_URL = process.env.NEXT_PUBLIC_X402_SERVER_URL ?? "https://arcpay-arbitrum.vercel.app/api";
const EXPLORER_URL = "https://sepolia.arbiscan.io";
const RECORDS_TABLE = validRecordsTable(process.env.ARCPAY_RECORDS_TABLE ?? "arcpay_arbitrum_records");

export async function collectRuntimeStatus(origin?: string): Promise<RuntimeStatus> {
  const checks = await Promise.all([
    checkRpc(),
    checkContracts(),
    checkX402(),
    checkDocs(origin),
    checkWorkerRecords(),
  ]);

  return {
    ok: checks.every((check) => check.state === "ok"),
    generatedAt: new Date().toISOString(),
    network: {
      name: String((deployment as { network?: string }).network ?? "arbitrum-sepolia"),
      chainId: Number((deployment as { chainId?: number }).chainId ?? 421614),
      rpcUrl: RPC_URL,
      explorerUrl: EXPLORER_URL,
    },
    checks,
  };
}

async function checkRpc(): Promise<RuntimeCheck> {
  const startedAt = Date.now();
  try {
    const provider = new JsonRpcProvider(RPC_URL, Number((deployment as { chainId: number }).chainId));
    const [network, blockNumber] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
    const chainId = Number(network.chainId);
    const expected = Number((deployment as { chainId: number }).chainId);
    return check("Arbitrum RPC", chainId === expected ? "ok" : "degraded", `Block ${blockNumber}`, `chain ${chainId}, ${Date.now() - startedAt}ms`);
  } catch (error) {
    return check("Arbitrum RPC", "down", "RPC check failed", errorMessage(error));
  }
}

async function checkContracts(): Promise<RuntimeCheck> {
  try {
    const provider = new JsonRpcProvider(RPC_URL, Number((deployment as { chainId: number }).chainId));
    const contracts = Object.entries((deployment as { contracts: Record<string, string> }).contracts);
    const codeResults = await Promise.all(contracts.map(async ([name, address]) => ({
      name,
      address,
      hasCode: (await provider.getCode(address)) !== "0x",
    })));
    const missing = codeResults.filter((result) => !result.hasCode);
    return check(
      "Arbitrum contracts",
      missing.length ? "degraded" : "ok",
      missing.length ? `${missing.length} contracts missing bytecode` : `${codeResults.length} contracts deployed`,
      missing.map((item) => item.name).join(", ") || "Registry, identity, policy, order book, execution router, cards, privacy, invoices, risk, reputation",
    );
  } catch (error) {
    return check("Arbitrum contracts", "down", "Contract bytecode check failed", errorMessage(error));
  }
}

async function checkX402(): Promise<RuntimeCheck> {
  try {
    const base = trimSlash(X402_URL);
    const healthUrl = base.endsWith("/api") ? `${base}/x402/health` : `${base}/health`;
    const response = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return check("x402 gateway", "down", `Health returned HTTP ${response.status}`);
    const body = await response.json().catch(() => ({}));
    return check("x402 gateway", body?.service === "arcpay-arbitrum-x402" ? "ok" : "degraded", "HTTP 402 payment gateway reachable", trim(JSON.stringify(body), 180));
  } catch (error) {
    return check("x402 gateway", "down", "x402 health check failed", errorMessage(error));
  }
}

async function checkDocs(origin?: string): Promise<RuntimeCheck> {
  const base = origin || process.env.NEXT_PUBLIC_APP_URL || "https://arcpay-arbitrum.vercel.app";
  try {
    const response = await fetch(`${trimSlash(base)}/docs/overview`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    return check("Docs", response.ok ? "ok" : "degraded", response.ok ? "Mintlify docs are reachable" : `Docs returned HTTP ${response.status}`, `${trimSlash(base)}/docs/overview`);
  } catch (error) {
    return check("Docs", "down", "Docs check failed", errorMessage(error));
  }
}

async function checkWorkerRecords(): Promise<RuntimeCheck> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return check("Worker indexing", "unknown", "Supabase service role is not configured for status checks");
  }

  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/${RECORDS_TABLE}?select=id,type,title,status,created_at,tx_hash&order=created_at.desc&limit=1`,
      { headers: supabaseHeaders(), cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return check("Worker indexing", "degraded", `Supabase returned HTTP ${response.status}`);
    const rows = await response.json() as Array<{ created_at?: string; type?: string; title?: string; status?: string }>;
    const latest = rows[0];
    if (!latest?.created_at) return check("Worker indexing", "unknown", "No indexed records found yet");

    const ageMs = Date.now() - new Date(latest.created_at).getTime();
    const idleNote = ageMs < 1000 * 60 * 60 * 6 ? "" : "; no new indexed events recently";
    return check("Worker indexing", "ok", `Latest ${latest.type ?? "record"} is ${formatAge(ageMs)} old${idleNote}`, `${latest.title ?? "Untitled"} (${latest.status ?? "unknown"})`);
  } catch (error) {
    return check("Worker indexing", "down", "Worker record check failed", errorMessage(error));
  }
}

function check(name: string, state: HealthState, summary: string, detail?: string): RuntimeCheck {
  return { name, state, summary, detail, checkedAt: new Date().toISOString() };
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function validRecordsTable(table: string) {
  return /^arcpay_[a-z0-9_]+_records$/.test(table) ? table : "arcpay_arbitrum_records";
}

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function trim(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function formatAge(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
