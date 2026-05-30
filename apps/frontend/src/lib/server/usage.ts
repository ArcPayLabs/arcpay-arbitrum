const TABLE = "arcpay_arbitrum_usage_events";

export type UsageEventInput = {
  eventType: string;
  owner?: string | null;
  agentId?: string | null;
  agentSlug?: string | null;
  source?: string;
  path?: string | null;
  toolName?: string | null;
  status?: string;
  txHash?: string | null;
  metadata?: Record<string, unknown>;
};

export async function trackUsageEvent(input: UsageEventInput) {
  if (!hasSupabase()) return { ok: false, skipped: true };
  const payload = {
    event_type: clean(input.eventType, 120),
    owner: cleanNullable(input.owner, 120),
    agent_id: cleanNullable(input.agentId, 140),
    agent_slug: cleanNullable(input.agentSlug, 120),
    source: clean(input.source || "app", 80),
    path: cleanNullable(input.path, 300),
    tool_name: cleanNullable(input.toolName, 120),
    status: clean(input.status || "ok", 80),
    tx_hash: cleanNullable(input.txHash, 140),
    metadata: input.metadata || {},
  };

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });

    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function readUsageAnalytics() {
  if (!hasSupabase()) return emptyAnalytics("supabase_not_configured");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [events, recent, beta, developerKeys, records] = await Promise.all([
    fetchJson<Array<UsageRow>>(`${TABLE}?select=event_type,owner,agent_slug,source,tool_name,status,created_at&order=created_at.desc&limit=1000`),
    fetchJson<Array<UsageRow>>(`${TABLE}?select=event_type,owner,agent_slug,source,tool_name,status,created_at&created_at=gte.${encodeURIComponent(since24h)}&order=created_at.desc&limit=1000`),
    fetchJson<Array<{ status: string; wallet_address: string | null; agent_url: string | null }>>("arcpay_arbitrum_beta_signups?select=status,wallet_address,agent_url&limit=1000"),
    fetchJson<Array<{ owner: string; revoked_at: string | null; last_used_at: string | null }>>("arcpay_arbitrum_developer_keys?select=owner,revoked_at,last_used_at&limit=1000"),
    fetchJson<Array<{ type: string; owner: string; tx_hash: string | null; created_at: string }>>("arcpay_arbitrum_records?select=type,owner,tx_hash,created_at&order=created_at.desc&limit=1000"),
  ]);

  const allEvents = events.ok ? events.data : [];
  const dayEvents = recent.ok ? recent.data : [];
  const betaRows = beta.ok ? beta.data : [];
  const keyRows = developerKeys.ok ? developerKeys.data : [];
  const recordRows = records.ok ? records.data : [];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    totals: {
      usageEvents: allEvents.length,
      usageEvents24h: dayEvents.length,
      betaSignups: betaRows.length,
      activeBeta: betaRows.filter((row) => row.status === "active").length,
      developerKeys: keyRows.length,
      activeDeveloperKeys: keyRows.filter((row) => !row.revoked_at).length,
      records: recordRows.length,
      txRecords: recordRows.filter((row) => row.tx_hash).length,
      uniqueOwners: unique([...allEvents.map((row) => row.owner), ...recordRows.map((row) => row.owner)]),
      uniqueAgents: unique(allEvents.map((row) => row.agent_slug)),
    },
    eventsByType: countBy(allEvents, "event_type"),
    events24hByType: countBy(dayEvents, "event_type"),
    recordsByType: countBy(recordRows, "type"),
    betaByStatus: countBy(betaRows, "status"),
    topTools: countBy(allEvents.filter((row) => row.tool_name), "tool_name"),
    topAgents: countBy(allEvents.filter((row) => row.agent_slug), "agent_slug"),
    recentEvents: allEvents.slice(0, 30),
    recentRecords: recordRows.slice(0, 30),
  };
}

type UsageRow = {
  event_type: string;
  owner: string | null;
  agent_slug: string | null;
  source: string | null;
  tool_name: string | null;
  status: string | null;
  created_at: string;
};

async function fetchJson<T>(query: string): Promise<{ ok: true; data: T } | { ok: false; data: [] }> {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${query}`, {
      headers: supabaseHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, data: [] };
    return { ok: true, data: await response.json() as T };
  } catch {
    return { ok: false, data: [] };
  }
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function clean(value: string, max: number) {
  return value.trim().slice(0, max) || "unknown";
}

function cleanNullable(value: string | null | undefined, max: number) {
  const next = String(value ?? "").trim().slice(0, max);
  return next || null;
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return Object.entries(rows.reduce((acc, row) => {
    const value = String(row[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>))
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function unique(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean).map((value) => String(value).toLowerCase())).size;
}

function emptyAnalytics(reason: string) {
  return {
    ok: false,
    reason,
    generatedAt: new Date().toISOString(),
    totals: {
      usageEvents: 0,
      usageEvents24h: 0,
      betaSignups: 0,
      activeBeta: 0,
      developerKeys: 0,
      activeDeveloperKeys: 0,
      records: 0,
      txRecords: 0,
      uniqueOwners: 0,
      uniqueAgents: 0,
    },
    eventsByType: [],
    events24hByType: [],
    recordsByType: [],
    betaByStatus: [],
    topTools: [],
    topAgents: [],
    recentEvents: [],
    recentRecords: [],
  };
}
