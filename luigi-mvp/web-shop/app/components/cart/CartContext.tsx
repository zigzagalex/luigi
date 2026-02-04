"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { CartView } from "@/lib/cartClient";
import { fetchCart, addCartItems, patchCartItem, deleteCartItem } from "@/lib/cartClient";
import { useAuth } from "@/components/auth/AuthContext";

import { fetchVariantImages, type VariantImage } from "@/lib/variantImagesClient";
import { getPrimaryVariantImage } from "@/../utils/images";
import { int64OrNull } from "@/lib/nulls";

import { fetchProductVariant, type ProductVariantDTO } from "@/lib/productVariantsClient";
import { fetchProduct, type ProductDTO } from "@/lib/ProductsClient";
import {normalizeVariantAttributes} from "@/lib/variantsLabel"

type CartItem = CartView["items"][number];

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
    end_date: string; // YYYY-MM-DD
    quantity: number;
  }) => Promise<void>;

  removeItem: (cartItemId: number) => Promise<void>;
  updateItem: (
    cartItemId: number,
    input: { shop_id: number; store_id: number; start_date: string; end_date: string; quantity: number }
  ) => Promise<void>;

  // UI helpers
  imageUrlForCartItem: (item: CartItem) => string;
  productNameForCartItem: (item: CartItem) => string;
  variantTextForCartItem: (item: CartItem) => string; // label + attributes summary
};

const Ctx = createContext<CartCtx | null>(null);

type CartProviderProps = {
  shopId: number;
  children: React.ReactNode;
};

const PLACEHOLDER = "/media/placeholders/blue/blue-1.png";

export function CartProvider({ shopId, children }: CartProviderProps) {
  const { loading: authLoading, me } = useAuth();

  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mutating, setMutating] = useState(false);

  // Hydrated caches
  const [productsById, setProductsById] = useState<Record<number, ProductDTO>>({});
  const [variantsById, setVariantsById] = useState<Record<number, ProductVariantDTO>>({});
  const [imagesByVariantId, setImagesByVariantId] = useState<Record<number, VariantImage[]>>({});

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

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, me?.id, refresh]);
  

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
    setMutating(true);
    try {
      const updated = await deleteCartItem(cartItemId);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove item");
      throw e;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateItem = useCallback(async (cartItemId: number, input: any) => {
    setError(null);
    setMutating(true);
    try {
      const updated = await patchCartItem(cartItemId, input);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update item");
      throw e;
    } finally {
      setMutating(false);
    }
  }, []);

  const itemCount = cart?.items?.length ?? 0;

  // Hydrate product + variant + images caches based on cart items
  useEffect(() => {
    const items: CartItem[] = cart?.items ?? [];
    if (items.length === 0) return;

    const productIds = Array.from(
      new Set(
        items
          .map((it) => int64OrNull((it as any).product_id))
          .filter((x): x is number => x != null)
      )
    );

    const variantIds = Array.from(
      new Set(
        items
          .map((it) => int64OrNull((it as any).variant_id))
          .filter((x): x is number => x != null)
      )
    );

    let cancelled = false;

    (async () => {
      try {
        // only fetch missing
        const missingProducts = productIds.filter((id) => !productsById[id]);
        const missingVariants = variantIds.filter((id) => !variantsById[id]);
        const missingImages = variantIds.filter((id) => !imagesByVariantId[id]);

        const [prodResults, varResults, imgResults] = await Promise.all([
          Promise.all(missingProducts.map(async (id) => [id, await fetchProduct(id)] as const)),
          Promise.all(missingVariants.map(async (id) => [id, await fetchProductVariant(id)] as const)),
          Promise.all(missingImages.map(async (id) => [id, await fetchVariantImages(id)] as const)),
        ]);

        if (cancelled) return;

        if (prodResults.length) {
          setProductsById((prev) => {
            const next = { ...prev };
            for (const [id, p] of prodResults) next[id] = p;
            return next;
          });
        }

        if (varResults.length) {
          setVariantsById((prev) => {
            const next = { ...prev };
            for (const [id, v] of varResults) next[id] = v;
            return next;
          });
        }

        if (imgResults.length) {
          setImagesByVariantId((prev) => {
            const next = { ...prev };
            for (const [id, imgs] of imgResults) next[id] = imgs;
            return next;
          });
        }
      } catch {
        // ignore; UI can still render fallback labels + placeholder
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cart, productsById, variantsById, imagesByVariantId]);

  const imageUrlForCartItem = useCallback(
    (item: CartItem) => {
      const vid = int64OrNull((item as any).variant_id);
      if (!vid) return PLACEHOLDER;

      const imgs = imagesByVariantId[vid] ?? null;
      const primary = getPrimaryVariantImage(imgs);
      return primary?.url ?? PLACEHOLDER;
    },
    [imagesByVariantId]
  );

  const productNameForCartItem = useCallback(
    (item: CartItem) => {
      const pid = int64OrNull((item as any).product_id);
      if (!pid) return "Bike";
      return productsById[pid]?.name ?? "Bike";
    },
    [productsById]
  );

  const variantTextForCartItem = useCallback(
    (item: CartItem) => {
      const vid = int64OrNull((item as any).variant_id);
      if (!vid) return "";
      const v = variantsById[vid];
      if (!v) return "";
      
      const specs = normalizeVariantAttributes(v.attributes);
      const attrs = formatVariantAttributes(specs);
      return attrs ? `${attrs}` : v.label;
    },
    [variantsById]
  );

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      itemCount,
      refresh,
      addItems,
      removeItem,
      updateItem,
      imageUrlForCartItem,
      productNameForCartItem,
      variantTextForCartItem,
    }),
    [
      cart,
      loading,
      error,
      itemCount,
      refresh,
      addItems,
      removeItem,
      updateItem,
      imageUrlForCartItem,
      productNameForCartItem,
      variantTextForCartItem,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}

// ---- helpers ----

function formatVariantAttributes(attrs: Record<string, any> | null): string {
  if (!attrs) return "";

  // Common case: { size: "S", color: "black" }
  const size = typeof attrs.size === "string" ? attrs.size : undefined;
  const color = typeof attrs.color === "string" ? attrs.color : undefined;

  const parts: string[] = [];
  if (size) parts.push(`Size ${size}`);
  if (color) parts.push(color);

  // fallback: show a couple of keys
  if (parts.length === 0) {
    const keys = Object.keys(attrs).slice(0, 2);
    for (const k of keys) parts.push(`${k}: ${String(attrs[k])}`);
  }

  return parts.join(" · ");
}
