"use client";

import { type ReactNode, useEffect, useState } from "react";
import { NetworkModeProvider } from "./network-context";
import { useNetwork } from "../product-ui/store/network";

type PersistState = {
  hasHydrated?: () => boolean;
  onFinishHydration?: (callback: () => void) => () => void;
};

export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <NetworkModeProvider>
      <ArbitrumHydrationGate>{children}</ArbitrumHydrationGate>
    </NetworkModeProvider>
  );
}

function ArbitrumHydrationGate({ children }: { readonly children: ReactNode }) {
  const persist = (useNetwork as typeof useNetwork & { persist?: PersistState }).persist;
  const [hydrated, setHydrated] = useState(() => persist?.hasHydrated?.() ?? true);

  useEffect(() => {
    if (!persist) {
      setHydrated(true);
      return;
    }

    if (persist.hasHydrated?.()) {
      setHydrated(true);
      return;
    }

    const unsubscribe = persist.onFinishHydration?.(() => setHydrated(true));
    return () => unsubscribe?.();
  }, [persist]);

  return hydrated ? children : null;
}
