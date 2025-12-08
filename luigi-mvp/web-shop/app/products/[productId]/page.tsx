// app/products/[productId]/page.tsx
export const dynamic = "force-dynamic";

import ProductDetail from "./ProductDetail";
import { fetchApi } from "@/../utils/fetchAPI";
import type { Product } from "@/../utils/products";

// Helpers

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

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

// Types

type Variant = {
  id: number;
  product_id: number;
  label: string;
  attributes: Record<string, any> | null;
  is_active: boolean | null;
};

type VariantImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

type Store = {
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

type InventoryItem = {
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

// API helpers

async function fetchProduct(productId: string): Promise<Product> {
  const res = await fetchApi(`/v1/products/${productId}`);
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


async function fetchStores(shopId: number): Promise<Store[]> {
  const res = await fetchApi(`/v1/stores${buildQuery({ shop_id: shopId })}`);
  return parseJSON<Store[]>(res);
}

async function fetchInventory(shopId: number): Promise<InventoryItem[]> {
  const res = await fetchApi(`/v1/inventory_items${buildQuery({ shop_id: shopId, limit: 500 })}`);
  return parseJSON<InventoryItem[]>(res);
}

// Page

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const { productId } = params;

  // 1) product
  const product = await fetchProduct(productId);

  // 2) variants + images
  const variants = await fetchVariants(productId);

  const imagesPerVariant = await Promise.all(
    variants.map((v) => fetchImages(v.id))
  );

  // flatten all images so we can fall back if some variant has none
  const allImages = imagesPerVariant.flat();

  const variantsWithImages = variants.map((variant, idx) => {
    const imgs = imagesPerVariant[idx] ?? [];
    const finalImages =
      imgs.length > 0
        ? imgs
        : allImages.length > 0
        ? allImages
        : []; // worst case, truly no images in DB

    return {
      ...variant,
      images: finalImages,
    };
  });

  // 3) stores + inventory for that shop
  const [stores, inventory] = await Promise.all([
    fetchStores(product.shop_id),
    fetchInventory(product.shop_id),
  ]);

  console.log(
    "ProductPage data",
    JSON.stringify(
      {
        productId,
        variants,
        imagesPerVariant,
        variantsWithImages,
      },
      null,
      2
    )
  );

  return (
    <main className="page product-detail-page">
      <div className="page-inner">
        <ProductDetail
          product={product}
          variants={variantsWithImages}
          stores={stores}
          inventory={inventory}
        />
      </div>
    </main>
  );
}