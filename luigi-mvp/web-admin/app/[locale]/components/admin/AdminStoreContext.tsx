"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SHOP_ID } from "@/lib/AuthSession";
import { listStores } from "@/lib/storesApi";
import { useAdminAuth } from "@/[locale]/components/auth/AdminAuthContext";

export type AdminStoreOption = {
  id: number;
  city: string;
  name: string;
};

type AdminStoreCtx = {
  stores: AdminStoreOption[];
  selectedStoreId: number | null;
  setSelectedStoreId: (value: number | null) => void;
  loading: boolean;
};

const Ctx = createContext<AdminStoreCtx | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAdminAuth();
  const [stores, setStores] = useState<AdminStoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!me) {
      setStores([]);
      setSelectedStoreId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await listStores(SHOP_ID);
        if (cancelled) return;
        const mapped = rows
          .filter((row) => row.is_active)
          .map((row) => ({
            id: row.id,
            city: (row.city ?? "").trim() || "—",
            name: row.name,
          }))
          .sort((a, b) => a.city.localeCompare(b.city));
        setStores(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  const value = useMemo(
    () => ({ stores, selectedStoreId, setSelectedStoreId, loading }),
    [stores, selectedStoreId, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminStore() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return value;
}
