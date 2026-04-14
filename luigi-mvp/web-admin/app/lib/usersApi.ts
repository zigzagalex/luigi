import {
  normalizeSqlNullInt64,
  normalizeSqlNullString,
} from "@/lib/AuthSession";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export type ApiUser = {
  id: number;
  shop_id?: number | null;
  store_id?: number | null;
  firebase_uid?: string | null;
  email?: string | null;
  phone?: string | null;
  display_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

function normalizeApiUser(raw: Record<string, unknown>): ApiUser {
  return {
    id: raw.id as number,
    shop_id: normalizeSqlNullInt64(raw.shop_id),
    store_id: normalizeSqlNullInt64(raw.store_id),
    firebase_uid: normalizeSqlNullString(raw.firebase_uid),
    email: normalizeSqlNullString(raw.email),
    phone: normalizeSqlNullString(raw.phone),
    display_name: normalizeSqlNullString(raw.display_name),
    role: normalizeSqlNullString(raw.role),
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : undefined,
    created_at: typeof raw.created_at === "string" ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
  };
}

export async function listUsers(shopId: number): Promise<ApiUser[]> {
  const res = await fetch(
    `${API_BASE}/v1/users?shop_id=${encodeURIComponent(String(shopId))}&limit=200`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(await res.text());
  const arr = (await res.json()) as Record<string, unknown>[];
  return Array.isArray(arr) ? arr.map((row) => normalizeApiUser(row)) : [];
}

export type CreateUserBody = {
  shop_id: number;
  email: string;
  phone: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
};

function formatApiErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as {
      error?: string;
      details?: unknown;
    };
    if (!j.error) return text;
    if (j.details === undefined || j.details === null) return j.error;
    if (typeof j.details === "string") return `${j.error}: ${j.details}`;
    return `${j.error}: ${JSON.stringify(j.details)}`;
  } catch {
    return text;
  }
}

export async function createUser(body: CreateUserBody): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/v1/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      shop_id: body.shop_id,
      email: body.email,
      phone: body.phone,
      // Always send the key so the API does not treat the request as "manual" (firebase_uid-only).
      password: body.password ?? "",
      first_name: body.first_name,
      last_name: body.last_name,
      role: body.role,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiErrorBody(text));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeApiUser(raw);
}

export type UpdateUserBody = {
  email?: string;
  phone?: string;
  display_name?: string;
  role?: "admin" | "staff";
  is_active?: boolean;
};

export async function updateUser(userId: number, body: UpdateUserBody): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/v1/users/${encodeURIComponent(String(userId))}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiErrorBody(text));
  }
  const raw = (await res.json()) as Record<string, unknown>;
  return normalizeApiUser(raw);
}
