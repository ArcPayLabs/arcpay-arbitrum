"use client";

import { useEffect, useState } from "react";
import { getOptionalSupabaseClient } from "../../app/supabase-client";

const walletSessionKey = "arcpay-arbitrum-wallet-session";

export function useAppAccess() {
  const [signedIn, setSignedIn] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const walletSession = typeof window !== "undefined" ? window.localStorage.getItem(walletSessionKey) : null;
    setWalletConnected(Boolean(walletSession));

    async function loadSession() {
      const supabase = getOptionalSupabaseClient();
      if (!supabase) {
        if (mounted) {
          setSignedIn(Boolean(walletSession));
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSignedIn(Boolean(data.session?.user) || Boolean(walletSession));
      setLoading(false);
    }

    void loadSession();

    const onStorage = () => {
      const nextWallet = window.localStorage.getItem(walletSessionKey);
      setWalletConnected(Boolean(nextWallet));
      setSignedIn((value) => value || Boolean(nextWallet));
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const canOpenApp = signedIn || walletConnected;

  return {
    canOpenApp,
    loading,
    openAppPath: canOpenApp ? "/dashboard" : "/onboard",
    signedIn,
    walletConnected,
  };
}
