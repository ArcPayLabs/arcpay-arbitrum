import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Send,
  FileText,
  Users,
  ArrowLeftRight,
  TrendingUp,
  EyeOff,
  ShieldAlert,
  SlidersHorizontal,
  ScrollText,
  Settings as SettingsIcon,
  Bot,
  CreditCard,
  Gauge,
  Workflow,
  RadioTower,
  Trophy,
  Activity,
  Cable,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoIcon } from "@/components/brand/LogoIcon";
import { useNetwork, type NetworkMode } from "@/store/network";

const ITEMS = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, networks: ["arbitrum"] },
  { title: "Wallet", url: "/wallet", icon: Wallet, networks: ["arbitrum"] },
  { title: "Agents", url: "/app/agents", icon: Bot, networks: ["arbitrum"] },
  { title: "Orders", url: "/app/orders", icon: Workflow, networks: ["arbitrum"] },
  { title: "x402", url: "/x402", icon: RadioTower, networks: ["arbitrum"] },
  { title: "Execution", url: "/execution", icon: Cable, networks: ["arbitrum"] },
  { title: "Cards", url: "/app/cards", icon: CreditCard, networks: ["arbitrum"] },
  { title: "Payments", url: "/payments", icon: Send, networks: ["arbitrum"] },
  { title: "Invoices", url: "/invoices", icon: FileText, networks: ["arbitrum"] },
  { title: "Contractors", url: "/contractors", icon: Users, networks: ["arbitrum"] },
  { title: "Swaps", url: "/swaps", icon: ArrowLeftRight, networks: ["arbitrum"] },
  { title: "Yield", url: "/yield", icon: TrendingUp, networks: ["arbitrum"] },
  { title: "Privacy", url: "/privacy", icon: EyeOff, networks: ["arbitrum"] },
  { title: "Risk", url: "/risk", icon: ShieldAlert, networks: ["arbitrum"] },
  { title: "Reputation", url: "/reputation", icon: Trophy, networks: ["arbitrum"] },
  { title: "Oracle", url: "/app/oracle", icon: Gauge, networks: ["arbitrum"] },
  { title: "Policies", url: "/policies", icon: SlidersHorizontal, networks: ["arbitrum"] },
  { title: "Audit", url: "/audit", icon: ScrollText, networks: ["arbitrum"] },
  { title: "Status", url: "/status", icon: Activity, networks: ["arbitrum"] },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const network = useNetwork((s) => s.mode);
  const isActive = (url: string) => path === url || path.startsWith(url + "/");
  const visibleItems = ITEMS.filter((item) => isEnabledForNetwork(item.networks, network));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2 px-1">
          <LogoIcon className="w-6 h-6 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
              ArcPay
            </span>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Treasury</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
                  <Link to="/settings" className="flex items-center gap-2">
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function isEnabledForNetwork(networks: readonly NetworkMode[], current: NetworkMode) {
  return networks.includes(current);
}
