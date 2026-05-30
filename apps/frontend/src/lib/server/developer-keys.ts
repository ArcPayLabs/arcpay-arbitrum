import { createHash, randomBytes } from "node:crypto";

const TABLE = "arcpay_arbitrum_developer_keys";

export type DeveloperKeyRow = {
  id: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  owner: string;
  label: string;
  key_prefix: string;
  scopes: string[];
};

export function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hashDeveloperKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateDeveloperKey() {
  return `ap_arbitrum_${randomBytes(32).toString("base64url")}`;
}

export function keyPrefix(key: string) {
  return `${key.slice(0, 13)}...${key.slice(-4)}`;
}

export async function listDeveloperKeys(owner: string): Promise<DeveloperKeyRow[]> {
  if (!hasSupabase()) return [];
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?owner=eq.${encodeURIComponent(owner.toLowerCase())}&select=id,created_at,updated_at,last_used_at,revoked_at,owner,label,key_prefix,scopes&order=created_at.desc`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createDeveloperKey(owner: string, label: string) {
  if (!hasSupabase()) throw new Error("supabase_not_configured");
  const key = generateDeveloperKey();
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      owner: owner.toLowerCase(),
      label: label || "MCP key",
      key_prefix: keyPrefix(key),
      key_hash: hashDeveloperKey(key),
      scopes: ["mcp:tools"],
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json() as DeveloperKeyRow[];
  return { key, row: rows[0] };
}

export async function revokeDeveloperKey(owner: string, id: string) {
  if (!hasSupabase()) throw new Error("supabase_not_configured");
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&owner=eq.${encodeURIComponent(owner.toLowerCase())}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function validateDeveloperKey(key: string) {
  if (!hasSupabase() || !key.startsWith("ap_arbitrum_")) return false;
  const hash = hashDeveloperKey(key);
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?key_hash=eq.${hash}&revoked_at=is.null&select=id,scopes&limit=1`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return false;
  const rows = await response.json() as Array<{ id: string; scopes?: string[] }>;
  const row = rows[0];
  if (!row?.id || !row.scopes?.includes("mcp:tools")) return false;

  await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  }).catch(() => undefined);

  return true;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}
