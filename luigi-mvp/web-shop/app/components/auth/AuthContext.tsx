"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
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
   * - logged-in users: luigi_session cookie (Firebase session cookie)
   * - guests: luigi_guest cookie (anonymous id) so carts can persist
   */
  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      // If the user is logged in, this returns a user object.
      // If not logged in, fetchMe() returns null (or throws 401 depending on implementation).
      const data = await fetchMe();

      if (data) {
        setMe(data);
      } else {
        setMe(null);
        // Not logged in → bootstrap guest session cookie (no-op if it already exists)
        await ensureGuestSession();
      }
    } catch (err) {
      // Treat any failure as logged out, but still try to ensure guest session.
      setMe(null);
      try {
        await ensureGuestSession();
      } catch {
        // If this fails, browsing still works but cart persistence may not.
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const onLoginSuccess = useCallback(async () => {
    // 1) Attach guest cart → user cart (idempotent endpoint)
    await fetch("/api/cart/attach-guest=cart", {
      method: "POST",
      credentials: "include",
    });
     
  
    // 2) Refresh user state
    await refresh();
  }, [refresh]);

  /**
   * Logs out the user session (server cookie) and Firebase client auth.
   */
  const logout = useCallback(async () => {
    await logoutSession(SHOP_ID); // clears luigi_session cookie on the API
    await signOut(auth);   // clears Firebase client auth state
    setMe(null);

    // After logout, ensure guest session exists so cart can persist
    try {
      await ensureGuestSession();
    } catch {
      // Ignore - non-critical
    }
  }, []);

  // Bootstrap on first mount
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
