"use client";

import {
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
  fetchMe,
  isStaffOrAdminRole,
  logoutSession,
  SHOP_ID,
  type Me,
} from "@/lib/AuthSession";

type Ctx = {
  me: Me | null;
  loading: boolean;
  /** Returns the loaded user (or null). Use after login to sync session into React state. */
  refresh: () => Promise<Me | null>;
  logout: () => Promise<void>;
};

const AdminAuthCtx = createContext<Ctx | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<Me | null> => {
    setLoading(true);
    try {
      const data = await fetchMe();
      if (data && !isStaffOrAdminRole(data.role)) {
        await logoutSession(SHOP_ID);
        await signOut(auth);
        setMe(null);
        return null;
      }
      setMe(data);
      return data;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutSession(SHOP_ID);
    await signOut(auth);
    setMe(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, loading, refresh, logout }),
    [me, loading, refresh, logout],
  );

  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}

export function useAdminAuth() {
  const v = useContext(AdminAuthCtx);
  if (!v) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return v;
}
