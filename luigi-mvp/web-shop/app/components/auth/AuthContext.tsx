"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { fetchMe, logoutSession, type Me } from "@/lib/AuthSession";

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMe(); // should send cookies (credentials: "include")
      setMe(data);
    } catch (err: any) {
      // most common “error” is: not logged in / cookie missing => treat as logged out
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    await signOut(auth);
    setMe(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ me, loading, refresh, logout }), [me, loading, refresh, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
