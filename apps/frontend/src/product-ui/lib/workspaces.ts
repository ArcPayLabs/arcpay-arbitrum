import { getOptionalSupabaseClient } from "../../app/supabase-client";

type SupabaseClient = NonNullable<ReturnType<typeof getOptionalSupabaseClient>>;
export type ArcPayNetwork = "somnia" | "mantle" | "arbitrum";

export type WorkspaceRecord = {
  id: string;
  name: string;
  network: ArcPayNetwork;
  isActive: boolean;
  source: "cloud" | "legacy";
};

const DEFAULT_WORKSPACE: Record<ArcPayNetwork, string> = {
  somnia: "Somnia agent treasury",
  mantle: "Mantle agent treasury",
  arbitrum: "Arbitrum agent treasury",
};

export async function loadWorkspaces(
  supabase: SupabaseClient,
  network: ArcPayNetwork,
  fallbackName = DEFAULT_WORKSPACE[network],
): Promise<WorkspaceRecord[]> {
  const userId = await getUserId(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("arcpay_workspaces")
    .select("id, name, network, is_active")
    .eq("user_id", userId)
    .eq("network", network)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return loadLegacyWorkspace(supabase, network, fallbackName);

  if (!data?.length) {
    const created = await createWorkspace(supabase, network, fallbackName);
    return created ? [created] : loadLegacyWorkspace(supabase, network, fallbackName);
  }

  const hasActive = data.some((row) => row.is_active);
  const rows = data.map((row, index) => ({
    id: row.id,
    name: row.name,
    network: row.network,
    isActive: row.is_active || (!hasActive && index === 0),
    source: "cloud" as const,
  }));

  const active = rows.find((row) => row.isActive) ?? rows[0];
  if (active) await syncLegacyWorkspace(supabase, userId, network, active.name);
  return rows;
}

export async function createWorkspace(
  supabase: SupabaseClient,
  network: ArcPayNetwork,
  name: string,
): Promise<WorkspaceRecord | null> {
  const userId = await getUserId(supabase);
  const cleanName = name.trim();
  if (!userId || !cleanName) return null;

  const now = new Date().toISOString();
  const deactivate = await supabase
    .from("arcpay_workspaces")
    .update({ is_active: false, updated_at: now })
    .eq("user_id", userId)
    .eq("network", network);

  if (deactivate.error) {
    await syncLegacyWorkspace(supabase, userId, network, cleanName);
    return { id: `legacy-${network}`, name: cleanName, network, isActive: true, source: "legacy" };
  }

  const { data, error } = await supabase
    .from("arcpay_workspaces")
    .upsert(
      { user_id: userId, network, name: cleanName, is_active: true, updated_at: now },
      { onConflict: "user_id,network,name" },
    )
    .select("id, name, network, is_active")
    .single();

  await syncLegacyWorkspace(supabase, userId, network, cleanName);
  if (error || !data) return { id: `legacy-${network}`, name: cleanName, network, isActive: true, source: "legacy" };

  return { id: data.id, name: data.name, network: data.network, isActive: true, source: "cloud" };
}

export async function activateWorkspace(
  supabase: SupabaseClient,
  network: ArcPayNetwork,
  workspace: WorkspaceRecord,
) {
  const userId = await getUserId(supabase);
  if (!userId) return false;

  if (workspace.source === "cloud") {
    const now = new Date().toISOString();
    await supabase.from("arcpay_workspaces").update({ is_active: false, updated_at: now }).eq("user_id", userId).eq("network", network);
    const { error } = await supabase
      .from("arcpay_workspaces")
      .update({ is_active: true, updated_at: now })
      .eq("user_id", userId)
      .eq("network", network)
      .eq("id", workspace.id);
    if (error) return false;
  }

  await syncLegacyWorkspace(supabase, userId, network, workspace.name);
  return true;
}

async function loadLegacyWorkspace(supabase: SupabaseClient, network: ArcPayNetwork, fallbackName: string): Promise<WorkspaceRecord[]> {
  const userId = await getUserId(supabase);
  if (!userId) return [];
  const { data } = await supabase.from("user_workspace_settings").select("workspace_name").eq("user_id", userId).maybeSingle();
  const name = data?.workspace_name || fallbackName;
  await syncLegacyWorkspace(supabase, userId, network, name);
  return [{ id: `legacy-${network}`, name, network, isActive: true, source: "legacy" }];
}

async function syncLegacyWorkspace(supabase: SupabaseClient, userId: string, network: ArcPayNetwork, name: string) {
  await supabase.from("user_workspace_settings").upsert(
    {
      user_id: userId,
      workspace_name: name,
      default_network: network as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function getUserId(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}
