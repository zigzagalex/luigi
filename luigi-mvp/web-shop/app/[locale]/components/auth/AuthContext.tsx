"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ensureGuestSession,
  fetchMe,
  logoutSession,
  SHOP_ID,
  type Me,
} from "@/lib/AuthSession";

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  onLoginSuccess: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Ensure we always have *some* session identity:
   * - logged-in users: luigi_customer cookie
   * - guests: luigi_guest cookie so carts can persist
   */
  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchMe();

      if (data) {
        setMe(data);
        // Keep a guest cookie too: staff/admin (no customer row) still need it to cart.
        try {
          await ensureGuestSession();
        } catch {
          // browsing still works; cart may fail until guest cookie exists
        }
      } else {
        setMe(null);
        await ensureGuestSession();
      }
    } catch {
      setMe(null);
      try {
        await ensureGuestSession();
      } catch {
        // browsing still works; cart persistence may not
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onLoginSuccess = useCallback(async () => {
    await fetch(`/api/cart/attach-guest-cart?shop_id=${SHOP_ID}`, {
      method: "POST",
      credentials: "include",
    });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutSession(SHOP_ID);
    setMe(null);
    try {
      await ensureGuestSession();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, refresh, onLoginSuccess, logout }),
    [me, loading, refresh, onLoginSuccess, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
