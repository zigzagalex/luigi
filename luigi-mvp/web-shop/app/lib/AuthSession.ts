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

export type RegisterInput = {
  email: string;
  password: string;
  shop_id: number;
  first_name: string;
  last_name: string;
  phone: string;
};

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: string; details?: unknown };
    if (!j.error) return text || `${res.status}`;
    if (j.details === undefined || j.details === null) return j.error;
    if (typeof j.details === "string") return `${j.error}: ${j.details}`;
    return `${j.error}: ${JSON.stringify(j.details)}`;
  } catch {
    return text || `${res.status}`;
  }
}

export async function loginSession(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function registerSession(input: RegisterInput): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`/me failed: ${res.status} ${await res.text()}`);

  return (await res.json()) as Me;
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

export async function ensureGuestSession() {
  const res = await fetch(`${API_BASE}/v1/auth/guest`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Guest session failed: ${res.status} ${await res.text()}`);
}
