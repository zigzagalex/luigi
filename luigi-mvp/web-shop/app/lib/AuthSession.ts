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

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/v1/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: { "Accept": "application/json" },
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
