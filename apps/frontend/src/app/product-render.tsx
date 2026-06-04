"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBar } from "@/components/app/AppTopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAppAccess } from "@/hooks/use-app-access";

type ProductRoute = {
  readonly options?: {
    readonly component?: () => ReactNode;
  };
  readonly component?: () => ReactNode;
};

export function renderProductRoute(route: ProductRoute): ReactNode {
  const Component = route.options?.component ?? route.component;

  if (!Component) {
    return null;
  }

  return <Component />;
}

export function ProductAppShell({ children }: { readonly children: ReactNode }) {
  const access = useAppAccess();
  const router = useRouter();

  useEffect(() => {
    if (!access.loading && !access.canOpenApp) {
      router.replace("/onboard");
    }
  }, [access.canOpenApp, access.loading, router]);

  if (!access.loading && !access.canOpenApp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <div className="text-sm font-semibold text-foreground">Redirecting to onboarding...</div>
          <div className="mt-1 text-sm text-muted-foreground">Connect a wallet or sign in before opening ArcPay.</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full min-w-0 overflow-x-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col">
          <AppTopBar />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
