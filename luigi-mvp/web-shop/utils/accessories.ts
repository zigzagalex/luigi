import { fetchApi } from "./fetchAPI";

export interface Accessory {
  id: number;
  shop_id: number;
  sku: string | null;
  name: string;
  description: string | null;
  detailed_description?: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AccessoryVariant {
  id: number;
  accessory_id: number;
  label: string;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
}

export interface AccessoryVariantImage {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
}

export interface AccessoryInventoryItem {
  id: number;
  shop_id: number;
  accessory_variant_id: number;
  store_id: number;
  tag_code: string | null;
  serial_number: string | null;
  status: string | null;
  service_padding_before: string | null;
  service_padding_after: string | null;
  is_active: boolean | null;
}

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

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined) continue;
    q.set(key, String(val));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchAccessories(params?: Record<string, string | number | undefined>): Promise<Accessory[]> {
  const res = await fetchApi(`/v1/accessories${buildQuery(params)}`);
  return parseJSON<Accessory[]>(res);
}

export async function fetchAccessoryByID(accessoryID: string | number, locale?: string): Promise<Accessory> {
  const res = await fetchApi(`/v1/accessories/${accessoryID}${buildQuery({ locale })}`);
  return parseJSON<Accessory>(res);
}

export async function fetchVariantsForAccessory(accessoryID: number): Promise<AccessoryVariant[]> {
  const res = await fetchApi(`/v1/accessory_variants${buildQuery({ accessory_id: accessoryID })}`);
  return parseJSON<AccessoryVariant[]>(res);
}

export async function fetchImagesForAccessoryVariant(variantID: number): Promise<AccessoryVariantImage[]> {
  const res = await fetchApi(`/v1/accessory_variants/${variantID}/images`);
  return parseJSON<AccessoryVariantImage[]>(res);
}

export async function fetchAccessoryInventory(shopID: number): Promise<AccessoryInventoryItem[]> {
  const res = await fetchApi(`/v1/accessory_inventory_items${buildQuery({ shop_id: shopID, limit: 1000 })}`);
  return parseJSON<AccessoryInventoryItem[]>(res);
}

export async function fetchStores(shopID: number): Promise<Store[]> {
  const res = await fetchApi(`/v1/stores${buildQuery({ shop_id: shopID })}`);
  return parseJSON<Store[]>(res);
}
