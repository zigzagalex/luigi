// utils/fetchAPI.ts

function getApiBase(): string {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE ??
    "http://localhost:8080/v1";

  return base.replace(/\/+$/, "");
}

/**
 * Server-side helper to call the API.
 * Cookie auth is handled by the browser for client fetches; this helper is for
 * Next server components / route handlers talking to the Go API.
 */
export async function fetchApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = getApiBase();
  const url = new URL(path, base).toString();
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

/* CATEGORY HELPERS FOR SEARCH PILL */

export type CategoryOption = {
  id: number | null; // null = Any bike
  label: string;
};

type CategoryDTO = {
  id: number;
  shop_id: number;
  parent_id?: number | null;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
  children?: CategoryDTO[];
};

export async function fetchCategoryOptions(
  shopId: number
): Promise<CategoryOption[]> {
  try {
    // Use the shared helper. Path includes /v1.
    const path = `/v1/categories/tree?shop_id=${shopId}`;
    const res = await fetchApi(path);

    // For debugging – you’ll see the full URL in the console via fetchApi’s logic if you log there.
    console.log("fetchCategoryOptions path:", path);

    if (!res.ok) {
      console.error("fetchCategoryOptions failed:", res.status);
      return [];
    }

    const data = (await res.json()) as CategoryDTO[];

    // Top-level, active categories only
    const topLevel = data
      .filter((c) => (c.parent_id ?? null) === null && c.is_active !== false)
      .sort((a, b) => {
        const ao = a.sort_order ?? 0;
        const bo = b.sort_order ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });

    return topLevel.map((c) => ({
      id: c.id,
      label: c.name,
    }));
  } catch (err) {
    console.error("fetchCategoryOptions threw:", err);
    return [];
  }
}

import type { Product } from "./products";

/* AVAILABILITY SEARCH FOR SEARCH PILL */

export type AvailabilitySearchParams = {
  shopId: number;
  from?: string;      // "YYYY-MM-DD"
  to?: string;        // "YYYY-MM-DD"
  categoryId?: number | null;
  quantity?: number;
};

export async function searchAvailableProducts(
  params: AvailabilitySearchParams
): Promise<Product[]> {
  const qs = new URLSearchParams();

  qs.set("shop_id", String(params.shopId));

  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.categoryId != null) {
    qs.set("category_id", String(params.categoryId));
  }
  if (params.quantity != null) {
    qs.set("quantity", String(params.quantity));
  }

  const path = `/v1/availability/search?${qs.toString()}`;
  const res = await fetchApi(path);

  if (!res.ok) {
    throw new Error(`availability search failed: ${res.status}`);
  }

  return (await res.json()) as Product[];
}

/* ---------- STORE HELPERS ---------- */
// utils/fetchAPI.ts

export type StoreOption = {
  id: number;   // no more null
  label: string;
};

type NullStringDTO = {
  String: string;
  Valid: boolean;
};

type StoreDTO = {
  id: number;
  shop_id: number;
  name: string;
  city?: NullStringDTO | null;   
  is_active?: boolean | null;
};

function unwrapNullString(v: unknown): string {
  if (typeof v === "string") return v.trim(); // in case you later return plain strings
  if (v && typeof v === "object" && "Valid" in v && "String" in v) {
    const obj = v as { Valid: boolean; String: string };
    return obj.Valid ? obj.String.trim() : "";
  }
  return "";
}

export async function fetchStoreOptions(
  shopId: number
): Promise<StoreOption[]> {
  try {
    const res = await fetchApi(`/v1/stores?shop_id=${shopId}`);
    if (!res.ok) {
      console.error("fetchStoreOptions failed:", res.status);
      return [];
    }

    const data = (await res.json()) as StoreDTO[];

    const activeStores = data.filter((s) => s.is_active !== false);

    return activeStores.map((s) => {
      const cityLabel = unwrapNullString(s.city);
    
      return {
        id: s.id,
        label: cityLabel || s.name || `Store #${s.id}`,
      };
    });
    
  } catch (err) {
    console.error("fetchStoreOptions threw:", err);
    return [];
  }
}

export type StoreForLocation = {
  id: number;
  name: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  timezone: string;
};

type StoreDetailDTO = {
  id: number;
  shop_id: number;
  name: string;
  address1?: unknown;
  address2?: unknown;
  postal_code?: unknown;
  city?: unknown;
  country?: unknown;
  timezone?: unknown;
  is_active?: boolean | null;
};

export async function fetchStoresForLocations(
  shopId: number,
): Promise<StoreForLocation[]> {
  try {
    const res = await fetchApi(`/v1/stores?shop_id=${shopId}`);
    if (!res.ok) {
      console.error("fetchStoresForLocations failed:", res.status);
      return [];
    }

    const data = (await res.json()) as StoreDetailDTO[];

    return data
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        id: s.id,
        name: (s.name && String(s.name).trim()) || `Store #${s.id}`,
        line1: unwrapNullString(s.address1),
        line2: unwrapNullString(s.address2),
        postalCode: unwrapNullString(s.postal_code),
        city: unwrapNullString(s.city),
        country: unwrapNullString(s.country),
        timezone: unwrapNullString(s.timezone),
      }));
  } catch (err) {
    console.error("fetchStoresForLocations threw:", err);
    return [];
  }
}

// Quote types
export type QuoteRequest = {
  product_variant_id: number;
  store_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  quantity: number;
};

export type QuoteResponse = {
  currency: string;
  total_price_cents: number;
  // add whatever your service returns
};

