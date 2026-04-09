import { fetchApi } from "./fetchAPI";
import type { Product } from "./products";

type Variant = {
  id: number;
  product_id: number;
  label: string;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
};

type VariantImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

export type ProductDetailStore = {
  id: number;
  shop_id: number;
  name: string;
  address1: string | null;
  address2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean | null;
};

export type ProductDetailInventoryItem = {
  id: number;
  shop_id: number;
  product_variant_id: number;
  store_id: number;
  tag_code: string | null;
  serial_number: string | null;
  status: string | null;
  service_padding_before: string | null;
  service_padding_after: string | null;
  is_active: boolean | null;
};

export type VariantWithImages = Variant & { images: VariantImage[] };

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function buildQuery(params?: Record<string, unknown>): string {
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

async function fetchProduct(productId: string, locale: string): Promise<Product> {
  const res = await fetchApi(`/v1/products/${productId}${buildQuery({ locale })}`);
  return parseJSON<Product>(res);
}

async function fetchVariants(productId: string): Promise<Variant[]> {
  const res = await fetchApi(`/v1/product_variants${buildQuery({ product_id: productId })}`);
  return parseJSON<Variant[]>(res);
}

async function fetchImages(variantId: number): Promise<VariantImage[]> {
  const res = await fetchApi(`/v1/product_variants/${variantId}/images`);
  return parseJSON<VariantImage[]>(res);
}

async function fetchStores(shopId: number): Promise<ProductDetailStore[]> {
  const res = await fetchApi(`/v1/stores${buildQuery({ shop_id: shopId })}`);
  return parseJSON<ProductDetailStore[]>(res);
}

async function fetchInventory(shopId: number): Promise<ProductDetailInventoryItem[]> {
  const res = await fetchApi(`/v1/inventory_items${buildQuery({ shop_id: shopId, limit: 8000 })}`);
  return parseJSON<ProductDetailInventoryItem[]>(res);
}

export async function loadProductDetailPageData(
  productId: string,
  locale: string,
): Promise<{
  product: Product;
  variantsWithImages: VariantWithImages[];
  stores: ProductDetailStore[];
  inventory: ProductDetailInventoryItem[];
}> {
  const product = await fetchProduct(productId, locale);
  const variants = await fetchVariants(productId);

  const imagesPerVariant = await Promise.all(variants.map((v) => fetchImages(v.id)));
  const allImages = imagesPerVariant.flat();

  const variantsWithImages: VariantWithImages[] = variants.map((variant, idx) => {
    const imgs = imagesPerVariant[idx] ?? [];
    const finalImages = imgs.length > 0 ? imgs : allImages.length > 0 ? allImages : [];
    return {
      ...variant,
      images: finalImages,
    };
  });

  const [stores, inventoryAll] = await Promise.all([fetchStores(product.shop_id), fetchInventory(product.shop_id)]);

  const variantIdSet = new Set(variants.map((v) => v.id));
  const inventory = inventoryAll.filter((row) => variantIdSet.has(row.product_variant_id));

  return { product, variantsWithImages, stores, inventory };
}
