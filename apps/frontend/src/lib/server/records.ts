type RecordInput = {
  type: string;
  title: string;
  status: string;
  amount?: string;
  txHash?: string;
};

const memoryRecords: Array<RecordInput & { id: string; owner: string; createdAt: string }> = [];
const DEFAULT_RECORDS_TABLE = "arcpay_arbitrum_records";

export async function listRecords(owner: string) {
  if (hasSupabase()) {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${recordsTable()}?owner=eq.${encodeURIComponent(owner)}&order=created_at.desc`, {
      headers: supabaseHeaders(),
      cache: "no-store",
    });
    if (response.ok) return response.json();
  }
  return memoryRecords.filter((record) => record.owner === owner);
}

export async function createRecord(owner: string, input: RecordInput) {
  const record = {
    id: crypto.randomUUID(),
    owner,
    ...input,
    createdAt: new Date().toISOString(),
  };
  if (hasSupabase()) {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/${recordsTable()}`, {
      method: "POST",
      headers: { ...supabaseHeaders(), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        id: record.id,
        owner,
        type: input.type,
        title: input.title,
        status: input.status,
        amount: input.amount ?? null,
        tx_hash: input.txHash ?? null,
        created_at: record.createdAt,
      }),
    });
  } else {
    memoryRecords.unshift(record);
  }
  return record;
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function recordsTable() {
  const table = process.env.ARCPAY_RECORDS_TABLE ?? DEFAULT_RECORDS_TABLE;
  if (!/^arcpay_[a-z0-9_]+_records$/.test(table)) return DEFAULT_RECORDS_TABLE;
  return table;
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}
