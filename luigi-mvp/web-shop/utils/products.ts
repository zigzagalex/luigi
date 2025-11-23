// utils/products.ts
import { fetchApi } from "./fetchAPI";

// ───────────────────────────────────────────
// Types
// ───────────────────────────────────────────

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  shop_id: number;

  sku: string | null;
  name: string;
  description: string | null;
  price_category: string;
  is_active: boolean | null;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  primary_image_url?: string | null; 
  categories?: ProductCategory[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  label: string;

  // Attributes is JSONB, nullable
  attributes: Record<string, any> | null;

  is_active: boolean | null;
}

export interface ProductVariantImage {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
}

// ───────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// Build query strings safely
function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      q.set(key, String(val));
    }
  });
  const qs = q.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

// ───────────────────────────────────────────
// Products
// ───────────────────────────────────────────

// GET /v1/products
export async function fetchProducts(params?: Record<string, any>): Promise<Product[]> {
  const res = await fetchApi(`/v1/products${buildQuery(params)}`);
  return parseJSON<Product[]>(res);
}

// GET /v1/products/:id
export async function fetchProductById(id: string | number): Promise<Product> {
  const res = await fetchApi(`/v1/products/${id}`);
  return parseJSON<Product>(res);
}

// ───────────────────────────────────────────
// Variants
// ───────────────────────────────────────────

// GET /v1/product_variants?product_id=x
export async function fetchVariantsForProduct(productId: number): Promise<ProductVariant[]> {
  const res = await fetchApi(`/v1/product_variants?product_id=${productId}`);
  return parseJSON<ProductVariant[]>(res);
}

// GET /v1/product_variants/:variantId/images
// IF you expose this route; otherwise use your existing API path:
export async function fetchImagesForVariant(variantId: number): Promise<ProductVariantImage[]> {
  const res = await fetchApi(`/v1/product_variant_images?variant_id=${variantId}`);
  return parseJSON<ProductVariantImage[]>(res);
}