import { normalizeSqlNullString } from "@/lib/AuthSession";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export type ApiOpeningTime = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export type ApiHoliday = {
  start_date: string;
  end_date: string;
  note: string | null;
};

export type ApiStore = {
  id: number;
  shop_id: number;
  name: string;
  address1: string | null;
  address2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  is_active: boolean;
  opening_times: ApiOpeningTime[];
  holidays: ApiHoliday[];
};

function normalizeOpeningTime(raw: Record<string, unknown>): ApiOpeningTime {
  return {
    day_of_week: Number(raw.day_of_week ?? 0),
    opens_at: typeof raw.opens_at === "string" ? raw.opens_at : null,
    closes_at: typeof raw.closes_at === "string" ? raw.closes_at : null,
    is_closed: Boolean(raw.is_closed),
  };
}

function normalizeStore(raw: Record<string, unknown>): ApiStore {
  return {
    id: Number(raw.id),
    shop_id: Number(raw.shop_id),
    name: String(raw.name ?? ""),
    address1: normalizeSqlNullString(raw.address1),
    address2: normalizeSqlNullString(raw.address2),
    postal_code: normalizeSqlNullString(raw.postal_code),
    city: normalizeSqlNullString(raw.city),
    country: normalizeSqlNullString(raw.country),
    timezone: normalizeSqlNullString(raw.timezone),
    is_active: Boolean(raw.is_active),
    opening_times: Array.isArray(raw.opening_times)
      ? raw.opening_times.map((it) => normalizeOpeningTime(it as Record<string, unknown>))
      : [],
    holidays: Array.isArray(raw.holidays)
      ? raw.holidays.map((it) => {
          const row = it as Record<string, unknown>;
          return {
            start_date: String(row.start_date ?? ""),
            end_date: String(row.end_date ?? ""),
            note: normalizeSqlNullString(row.note),
          };
        })
      : [],
  };
}

export async function listStores(shopId: number): Promise<ApiStore[]> {
  const res = await fetch(
    `${API_BASE}/v1/stores?shop_id=${encodeURIComponent(String(shopId))}&limit=200`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(await res.text());
  const arr = (await res.json()) as Record<string, unknown>[];
  return Array.isArray(arr) ? arr.map((row) => normalizeStore(row)) : [];
}

export type UpsertStoreBody = {
  shop_id?: number;
  name: string;
  address1: string;
  address2: string;
  postal_code: string;
  city: string;
  country: string;
  timezone: string;
  is_active: boolean;
  opening_times: ApiOpeningTime[];
  holidays: ApiHoliday[];
};

function sanitizeOpeningTimes(items: ApiOpeningTime[]): ApiOpeningTime[] {
  return items.map((item) => ({
    day_of_week: item.day_of_week,
    opens_at: item.is_closed ? null : item.opens_at,
    closes_at: item.is_closed ? null : item.closes_at,
    is_closed: item.is_closed,
  }));
}

function sanitizeHolidays(items: ApiHoliday[]): ApiHoliday[] {
  return items.map((item) => ({
    start_date: item.start_date,
    end_date: item.end_date,
    note: item.note?.trim() ? item.note.trim() : null,
  }));
}

export async function createStore(body: UpsertStoreBody): Promise<ApiStore> {
  const res = await fetch(`${API_BASE}/v1/stores`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      shop_id: body.shop_id,
      name: body.name,
      address1: body.address1,
      address2: body.address2,
      postal_code: body.postal_code,
      city: body.city,
      country: body.country,
      timezone: body.timezone,
      is_active: body.is_active,
      opening_times: sanitizeOpeningTimes(body.opening_times),
      holidays: sanitizeHolidays(body.holidays),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeStore(raw);
}

export async function updateStore(storeId: number, body: UpsertStoreBody): Promise<ApiStore> {
  const res = await fetch(`${API_BASE}/v1/stores/${encodeURIComponent(String(storeId))}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: body.name,
      address1: body.address1,
      address2: body.address2,
      postal_code: body.postal_code,
      city: body.city,
      country: body.country,
      timezone: body.timezone,
      is_active: body.is_active,
      opening_times: sanitizeOpeningTimes(body.opening_times),
      holidays: sanitizeHolidays(body.holidays),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeStore(raw);
}
