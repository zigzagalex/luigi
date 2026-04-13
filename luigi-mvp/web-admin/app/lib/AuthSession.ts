import { auth } from "@/lib/firebaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export const SHOP_ID = 1;

export type Me = {
  id: number;
  email: string | null;
  display_name: string | null;
  role: string | null;
  shop_id: number | null;
  store_id: number | null;
};

export type Provisioning = {
  shop_id: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export async function exchangeIdTokenForSessionCookie(input?: Provisioning) {
  const user = auth.currentUser;
  if (!user) throw new Error("No Firebase currentUser");

  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE}/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      idToken,
      ...(input ?? {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Session exchange failed: ${res.status} ${body}`);
  }
}

/** Go `sql.NullString` may JSON-encode as `{ String, Valid }` instead of a plain string. */
export function normalizeSqlNullString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "Valid" in v) {
    const o = v as { String?: string; Valid?: boolean };
    return o.Valid ? (o.String ?? null) : null;
  }
  return null;
}

/** @deprecated use normalizeSqlNullString */
export const normalizeRoleField = normalizeSqlNullString;

/** Go `sql.NullInt64` may JSON-encode as `{ Int64, Valid }`. */
export function normalizeSqlNullInt64(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v !== null && "Valid" in v) {
    const o = v as { Int64?: number; Valid?: boolean };
    return o.Valid && o.Int64 != null ? o.Int64 : null;
  }
  return null;
}

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/me failed: ${res.status} ${await res.text()}`);

  const raw = (await res.json()) as Record<string, unknown>;
  return {
    id: raw.id as number,
    email: normalizeSqlNullString(raw.email),
    display_name: normalizeSqlNullString(raw.display_name),
    role: normalizeSqlNullString(raw.role),
    shop_id: normalizeSqlNullInt64(raw.shop_id),
    store_id: normalizeSqlNullInt64(raw.store_id),
  };
}

export async function logoutSession(shopId: number) {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shop_id: shopId }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function isStaffOrAdminRole(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase().trim();
  return r === "admin" || r === "staff";
}
