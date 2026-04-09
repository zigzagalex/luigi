import {
  fetchImagesForVariant,
  fetchProducts,
  fetchProductById,
  fetchVariantsForProduct,
  type Product,
  type ProductVariant,
  type ProductVariantImage,
} from "./products";

/** @deprecated Use Product with is_accessory === true */
export type Accessory = Product;

/** @deprecated Use ProductVariant */
export type AccessoryVariant = ProductVariant;

/** @deprecated Use ProductVariantImage */
export type AccessoryVariantImage = ProductVariantImage;

export interface Store {
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
}

export interface AccessoryInventoryItem {
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
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined) continue;
    q.set(key, String(val));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

/** Lists accessory catalog rows (`is_accessory=true`). */
export async function fetchAccessories(
  params?: Record<string, string | number | boolean | undefined>,
): Promise<Accessory[]> {
  const merged = { ...params, is_accessory: true };
  return fetchProducts(merged);
}

export async function attachPrimaryImagesToAccessories(accessories: Accessory[]): Promise<Accessory[]> {
  return Promise.all(
    accessories.map(async (accessory) => {
      try {
        const variants = await fetchVariantsForAccessory(accessory.id);
        if (!variants.length) return accessory;
        const firstVariant = variants[0];
        const images = await fetchImagesForAccessoryVariant(firstVariant.id);
        if (!images.length) return accessory;
        const primary = images.find((img) => img.is_primary) ?? images[0];
        return {
          ...accessory,
          primary_image_url: primary.url,
        };
      } catch {
        return accessory;
      }
    }),
  );
}

export async function fetchAccessoryByID(accessoryID: string | number, locale?: string): Promise<Accessory> {
  return fetchProductById(accessoryID, locale);
}

export async function fetchVariantsForAccessory(accessoryID: number): Promise<AccessoryVariant[]> {
  return fetchVariantsForProduct(accessoryID);
}

export async function fetchImagesForAccessoryVariant(variantID: number): Promise<AccessoryVariantImage[]> {
  return fetchImagesForVariant(variantID);
}

/** Loads shop inventory and keeps rows for the given variant ids (add-on SKUs). */
export async function fetchAccessoryInventory(
  shopID: number,
  variantIds: number[],
): Promise<AccessoryInventoryItem[]> {
  const { fetchApi } = await import("./fetchAPI");
  const res = await fetchApi(
    `/v1/inventory_items${buildQuery({
      shop_id: shopID,
      limit: 2500,
    })}`,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const all = (await res.json()) as AccessoryInventoryItem[];
  if (!variantIds.length) {
    return [];
  }
  const allowed = new Set(variantIds);
  return all.filter((row) => allowed.has(row.product_variant_id));
}

export async function fetchStores(shopID: number): Promise<Store[]> {
  const { fetchApi } = await import("./fetchAPI");
  const res = await fetchApi(`/v1/stores${buildQuery({ shop_id: shopID })}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<Store[]>;
}
