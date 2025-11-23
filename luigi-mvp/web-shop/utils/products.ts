// utils/products.ts
import { fetchApi } from "./fetchAPI";

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


export interface ProductCategoryGroup {
  key: string;    // slug, e.g. "mountain-bikes"
  title: string;  // label, e.g. "Mountain Bikes"
  products: Product[];
}

// Root slugs
const MAIN_CATEGORY_SLUG_PRIORITY = ["mountain-bikes", "road-bikes"];

function getMainCategoryForProduct(product: Product): ProductCategory | null {
  const cats = product.categories ?? [];
  if (!cats.length) return null;

  // 1) Prefer main root categories if present
  for (const slug of MAIN_CATEGORY_SLUG_PRIORITY) {
    const match = cats.find((c) => c.slug === slug);
    if (match) return match;
  }

  // 2) Otherwise just take the first category
  return cats[0];
}

/**
 * Group products into rows by their "main" category
 * (Mountain Bikes, Road Bikes, etc.).
 */
export function groupProductsByMainCategory(
  products: Product[],
): ProductCategoryGroup[] {
  const groups = new Map<string, ProductCategoryGroup>();

  for (const p of products) {
    const mainCat = getMainCategoryForProduct(p);

    const key = mainCat?.slug ?? "other";
    const title = mainCat?.name ?? "Other Bikes";

    const existing = groups.get(key);
    if (existing) {
      existing.products.push(p);
    } else {
      groups.set(key, {
        key,
        title,
        products: [p],
      });
    }
  }

  return Array.from(groups.values());
}