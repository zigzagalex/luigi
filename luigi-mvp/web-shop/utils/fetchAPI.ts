// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

const auth = new GoogleAuth();

let idTokenClient: IdTokenClient | null = null;
let idTokenAudience: string | null = null;

async function getIdTokenClient(audience: string): Promise<IdTokenClient> {
  if (!idTokenClient || idTokenAudience !== audience) {
    idTokenClient = await auth.getIdTokenClient(audience);
    idTokenAudience = audience;
  }
  return idTokenClient;
}

function getApiBase(): string {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 
    process.env.NEXT_PUBLIC_API_BASE ??    
    "http://localhost:8080/v1";             

  // normalize: no trailing slash
  return base.replace(/\/+$/, "");
}

function isLocalBase(base: string): boolean {
  return (
    base.startsWith("http://localhost") ||
    base.startsWith("http://127.0.0.1")
  );
}

/**
 * Server-side helper to call the API.
 *
 * - In dev/local (API_BASE_URL = http://localhost:8080), uses plain fetch.
 * - In prod/stage (Cloud Run), uses GoogleAuth + IdTokenClient for IAM auth.
 */
export async function fetchApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = getApiBase();
  const url = new URL(path, base).toString();
  console.log("fetchApi url:", url);
  // Local dev: plain fetch
  if (isLocalBase(base)) {
    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    });
  }

  // Cloud Run / IAM-protected
  const client = await getIdTokenClient(base);

  const nodeRes = await client.request({
    url,
    method: init.method ?? "GET",
    headers: init.headers as any,
    data: init.body as any,
    validateStatus: () => true,
  });

  const status = nodeRes.status ?? 200;
  const rawData = nodeRes.data;

  let body: string;
  if (typeof rawData === "string") {
    body = rawData;
  } else if (rawData === undefined || rawData === null) {
    body = "";
  } else {
    body = JSON.stringify(rawData);
  }

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
    },
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
      return [{ id: null, label: "Any bike" }];
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

    return [
      { id: null, label: "Any bike" },
      ...topLevel.map((c) => ({
        id: c.id,
        label: c.name,
      })),
    ];
  } catch (err) {
    console.error("fetchCategoryOptions threw:", err);
    return [{ id: null, label: "Any bike" }];
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

