import { Link } from "@tanstack/react-router";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search, Wallet, ChevronDown, Building2, UserRound, Settings, LogOut, ShieldCheck, Plus } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOptionalSupabaseClient } from "../../../app/supabase-client";
import { useWalletConnectAction } from "@/hooks/use-wallet-connect-action";
import { ensureCurrentUserAccount } from "@/lib/account";
import { activateWorkspace, createWorkspace as createCloudWorkspace, loadWorkspaces, type WorkspaceRecord } from "@/lib/workspaces";

const QUICK_NAV = [
  { label: "Overview", to: "/dashboard" },
  { label: "Wallet", to: "/wallet" },
  { label: "Agents", to: "/agents" },
  { label: "x402", to: "/x402" },
  { label: "Execution", to: "/execution" },
  { label: "Payments", to: "/payments" },
  { label: "Invoices", to: "/invoices" },
  { label: "Contractors", to: "/contractors" },
  { label: "Swaps", to: "/swaps" },
  { label: "Yield", to: "/yield" },
  { label: "Privacy", to: "/privacy" },
  { label: "Risk", to: "/risk" },
  { label: "Reputation", to: "/reputation" },
  { label: "Policies", to: "/policies" },
  { label: "Audit", to: "/audit" },
  { label: "Status", to: "/status" },
  { label: "Settings", to: "/settings" },
];

const NETWORK = "arbitrum" as const;

export function AppTopBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState("Multi-agent agency");
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceRecord[]>([]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState("Arbitrum agent treasury");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const walletAction = useWalletConnectAction();

  useEffect(() => {
    const supabase = getOptionalSupabaseClient();
    let mounted = true;

    async function loadAccount() {
      if (!supabase) return;
      const account = await ensureCurrentUserAccount(supabase);
      if (!mounted) return;
      if (!account) {
        setEmail(null);
        setDisplayName("");
        setWorkspaceName("Multi-agent agency");
        setWorkspaceOptions([]);
        return;
      }
      const workspaces = await loadWorkspaces(supabase, NETWORK, account.workspaceName);
      if (!mounted) return;
      const activeWorkspace = workspaces.find((workspace) => workspace.isActive) ?? workspaces[0];
      setEmail(account.email);
      setDisplayName(account.displayName);
      setWorkspaceOptions(workspaces);
      setWorkspaceName(activeWorkspace?.name ?? account.workspaceName);
    }

    void loadAccount();

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (!session?.user) {
        setDisplayName("");
        setWorkspaceName("Multi-agent agency");
        setWorkspaceOptions([]);
      }
      else void loadAccount();
    }) ?? { data: { subscription: { unsubscribe: () => undefined } } };

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = getOptionalSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    window.localStorage.removeItem("arcpay-arbitrum-wallet-session");
    setEmail(null);
    setDisplayName("");
    setWorkspaceName("Multi-agent agency");
    setWorkspaceOptions([]);
    router.push("/");
  }

  async function disconnectWallet() {
    window.localStorage.removeItem("arcpay-arbitrum-wallet-session");
    if (!email) router.push("/");
  }

  async function createWorkspace() {
    const nextName = workspaceDraft.trim();
    if (!nextName) {
      setWorkspaceMessage("Workspace name is required.");
      return;
    }
    const supabase = getOptionalSupabaseClient();
    if (!supabase) {
      setWorkspaceName(nextName);
      setWorkspaceMessage("Workspace created locally. Sign in to sync it across devices.");
      setWorkspaceOpen(false);
      return;
    }
    const account = await ensureCurrentUserAccount(supabase);
    if (!account) {
      setWorkspaceMessage("Sign in first to save workspaces across devices.");
      setWorkspaceOpen(false);
      return;
    }
    const workspace = await createCloudWorkspace(supabase, NETWORK, nextName);
    const workspaces = await loadWorkspaces(supabase, NETWORK, workspace?.name ?? nextName);
    const activeWorkspace = workspaces.find((item) => item.isActive) ?? workspace;
    setWorkspaceOptions(workspaces);
    setWorkspaceName(activeWorkspace?.name ?? nextName);
    setWorkspaceMessage("Workspace saved to your ArcPay account.");
    setWorkspaceOpen(false);
  }

  async function switchWorkspace(workspace: WorkspaceRecord) {
    const supabase = getOptionalSupabaseClient();
    if (!supabase) return;
    const switched = await activateWorkspace(supabase, NETWORK, workspace);
    if (!switched) {
      setWorkspaceMessage("Workspace switch failed. Try again.");
      return;
    }
    const workspaces = await loadWorkspaces(supabase, NETWORK, workspace.name);
    setWorkspaceOptions(workspaces);
    setWorkspaceName(workspace.name);
  }

  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20 flex items-center px-3 gap-3">
        <SidebarTrigger className="ml-1" />

        <details className="group relative hidden sm:block">
          <summary className="flex max-w-[260px] cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{workspaceName}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-11 z-40 w-72 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-xl">
            <div className="px-3 py-2">
              <div className="text-sm font-semibold">Workspace</div>
              <div className="truncate text-xs text-muted-foreground">{workspaceName}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            <div className="grid gap-1 p-1">
              {workspaceOptions.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => void switchWorkspace(workspace)}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <span className="min-w-0 truncate">{workspace.name}</span>
                  {workspace.isActive ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Active</span> : null}
                </button>
              ))}
            </div>
            <div className="my-1 h-px bg-border" />
            <Link to="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted">
              <Settings className="h-4 w-4" /> Workspace settings
            </Link>
            <button type="button" onClick={() => setWorkspaceOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted">
              <Plus className="h-4 w-4" /> Create workspace
            </button>
          </div>
        </details>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => {
            if (!walletAction.publicKeyBase58) void walletAction.connectWallet();
          }}
          disabled={walletAction.connecting}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 text-sm font-medium transition-colors"
        >
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-xs">{walletAction.label}</span>
        </button>

        <details className="group relative hidden lg:block">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/70 [&::-webkit-details-marker]:hidden">
            <Search className="w-4 h-4" />
            <span>Jump to...</span>
            <kbd className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
          </summary>
          <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-xl">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Navigation</div>
            <div className="grid max-h-[420px] gap-1 overflow-y-auto">
              {QUICK_NAV.map((item) => (
                <Link key={item.to} to={item.to} className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </details>

        <button type="button" className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-black" type="button">
              {initial(displayName || email)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
            <DropdownMenuLabel>
              <div className="text-sm">{displayName || "ArcPay operator"}</div>
              <div className="text-xs font-normal text-muted-foreground truncate">{email ?? "Sign in to sync workspace settings"}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile"><UserRound className="w-4 h-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings"><Settings className="w-4 h-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/policies"><ShieldCheck className="w-4 h-4" /> Policies</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {walletAction.connected && (
              <DropdownMenuItem onSelect={() => void disconnectWallet()}>
                <Wallet className="w-4 h-4" /> Disconnect wallet
              </DropdownMenuItem>
            )}
            {email ? (
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to="/sign-in"><LogOut className="w-4 h-4" /> Sign in</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {workspaceOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close workspace drawer" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setWorkspaceOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-border bg-background p-6 shadow-2xl sm:rounded-l-[2rem]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Create workspace</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Name the workspace for this operator account. Signed-in workspaces are saved to ArcPay and available across devices.
            </p>
            <label className="mt-6 block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace name</span>
              <input value={workspaceDraft} onChange={(event) => setWorkspaceDraft(event.target.value)} className="ap-in" />
            </label>
            {workspaceMessage ? <div className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{workspaceMessage}</div> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => void createWorkspace()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Create workspace</button>
              <button type="button" onClick={() => setWorkspaceOpen(false)} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold">Cancel</button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function initial(value: string | null) {
  return (value?.trim()[0] ?? "A").toUpperCase();
}
