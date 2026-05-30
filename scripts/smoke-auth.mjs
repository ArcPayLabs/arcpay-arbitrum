import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Contract, JsonRpcProvider, Wallet, id } from "ethers";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, public Supabase key, or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const createdUserIds = [];

try {
  await smokeRecords();
  await smokeEmailWorkspace();
  await smokeWalletWorkspace();
  await smokeArbitrumReads();
} finally {
  for (const userId of createdUserIds) {
    await admin.from("user_workspace_settings").delete().eq("user_id", userId);
    await admin.from("user_profiles").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function smokeRecords() {
  const owner = `smoke-${Date.now()}`;
  const rowId = randomUUID();
  const insert = await admin
    .from("arcpay_arbitrum_records")
    .insert({ id: rowId, owner, type: "audit", title: "Smoke record", status: "created", metadata: { smoke: true } })
    .select("id")
    .single();
  if (insert.error) throw insert.error;

  const select = await admin.from("arcpay_arbitrum_records").select("owner").eq("id", rowId).single();
  if (select.error || select.data.owner !== owner) throw select.error || new Error("record owner mismatch");

  const del = await admin.from("arcpay_arbitrum_records").delete().eq("id", rowId);
  if (del.error) throw del.error;
  pass("Supabase records mirror", "insert/select/delete ok");
}

async function smokeEmailWorkspace() {
  const email = `arcpay.email.smoke.${Date.now()}@gmail.com`;
  const password = `Smoke-${randomUUID()}a1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Email", last_name: "Smoke", workspace: "Email Smoke Workspace" },
  });
  if (created.error || !created.data.user) throw created.error || new Error("email smoke user missing");
  createdUserIds.push(created.data.user.id);

  const signedIn = await supabase.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) throw signedIn.error || new Error("email sign-in did not return user");

  await upsertWorkspace(signedIn.data.user.id, "Email Smoke", email, null, "Email Smoke Workspace");
  pass("Email sign-in + workspace", "confirmed user signs in and workspace/profile upsert works");
}

async function smokeWalletWorkspace() {
  const wallet = Wallet.createRandom();
  const email = `wallet-${wallet.address.slice(2).toLowerCase()}@arcpay.local`;
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      data: {
        name: `Arbitrum ${wallet.address.slice(0, 6)}`,
        wallet_address: wallet.address,
        workspace: "Arbitrum agent treasury",
      },
    },
  });
  if (link.error || !link.data.properties?.hashed_token) throw link.error || new Error("wallet auth token missing");

  const verified = await supabase.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  if (verified.error || !verified.data.user) throw verified.error || new Error("wallet token did not create session");
  createdUserIds.push(verified.data.user.id);

  await upsertWorkspace(verified.data.user.id, `Arbitrum ${wallet.address.slice(0, 6)}`, "", wallet.address, "Arbitrum agent treasury");
  pass("Wallet auth + workspace", `session/profile/workspace ok for ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`);
}

async function smokeArbitrumReads() {
  const deployment = JSON.parse(fs.readFileSync("deployments/arbitrum-sepolia.json", "utf8"));
  const provider = new JsonRpcProvider(process.env.ARBITRUM_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc", 421614);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 421614) throw new Error(`wrong chain ${network.chainId}`);

  const code = await provider.getCode(deployment.contracts.AgentRegistry);
  if (!code || code === "0x") throw new Error("AgentRegistry bytecode missing");

  const registry = new Contract(
    deployment.contracts.AgentRegistry,
    ["function agents(bytes32) view returns (address owner,string name,string endpoint,string capabilities,uint256 priceWei,bool active,uint256 createdAt,uint256 updatedAt)"],
    provider,
  );
  await registry.agents(id("smoke-agent-read"));
  pass("Arbitrum RPC + contract reads", `chain 421614 block ${await provider.getBlockNumber()}`);
}

async function upsertWorkspace(userId, displayName, notificationEmail, walletAddress, workspaceName) {
  const profile = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, display_name: displayName, notification_email: notificationEmail, linked_wallet_address: walletAddress }, { onConflict: "user_id" })
    .select("user_id")
    .single();
  if (profile.error) throw profile.error;

  const workspace = await supabase
    .from("user_workspace_settings")
    .upsert({ user_id: userId, workspace_name: workspaceName }, { onConflict: "user_id" })
    .select("workspace_name")
    .single();
  if (workspace.error) throw workspace.error;
}

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
}

function pass(name, detail) {
  console.log(`PASS ${name} - ${detail}`);
}
