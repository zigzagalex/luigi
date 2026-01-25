"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartView } from "@/lib/cartClient";
import { fetchCart, addCartItems, patchCartItem, deleteCartItem } from "@/lib/cartClient";
import { useAuth } from "@/components/auth/AuthContext";

type CartCtx = {
  cart: CartView | null;
  loading: boolean;
  error: string | null;

  itemCount: number;
  refresh: () => Promise<void>;

  addItems: (input: {
    shop_id: number;
    store_id: number;
    product_id: number;
    variant_id: number;
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
    quantity: number;
  }) => Promise<void>;

  removeItem: (cartItemId: number) => Promise<void>;
  updateItem: (cartItemId: number, input: { shop_id: number; store_id: number; start_date: string; end_date: string; quantity: number }) => Promise<void>;
};

const Ctx = createContext<CartCtx | null>(null);

type CartProviderProps = {
    shopId: number;
    children: React.ReactNode;
  };

export function CartProvider({ shopId, children }: CartProviderProps) {
  const { loading: authLoading } = useAuth(); // ensures guest session in your AuthProvider
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCart(shopId);
      setCart(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load cart");
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  // Load cart once auth layer finished creating a guest identity.
  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const [mutating, setMutating] = useState(false);

  const addItems = useCallback(async (input: any) => {
    setError(null);
    setMutating(true);
    try {
      const updated = await addCartItems(input);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add to cart");
      throw e;
    } finally {
      setMutating(false);
    }
  }, []);  

  const removeItem = useCallback(async (cartItemId: number) => {
    setError(null);
    try {
      const updated = await deleteCartItem(cartItemId);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove item");
      throw e;
    }
  }, []);

  const updateItem = useCallback(async (cartItemId: number, input: any) => {
    setError(null);
    try {
      const updated = await patchCartItem(cartItemId, input);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update item");
      throw e;
    }
  }, []);

  const itemCount = cart?.items?.length ?? 0;

  const value = useMemo(
    () => ({ cart, loading, error, itemCount, refresh, addItems, removeItem, updateItem }),
    [cart, loading, error, itemCount, refresh, addItems, removeItem, updateItem]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}


  

