// src/lib/authSession.ts
import { auth } from "@/lib/firebaseClient";

type Provisioning = {
  shopId: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

/**
 * Exchanges the current Firebase ID token for your httpOnly session cookie.
 * Sends provisioning fields only when provided (signup flow).
 */
export async function exchangeIdTokenForSessionCookie(input: Provisioning) {
  if (!API_BASE) {
    // This is exactly what causes `/undefined/v1/...`
    throw new Error("NEXT_PUBLIC_API_BASE is not set (got undefined).");
  }

  const user = auth.currentUser;
  if (!user) throw new Error("No currentUser. Did Firebase login succeed?");

  // forceRefresh=true avoids stale tokens when you just signed up / signed in
  const idToken = await user.getIdToken(true);

  const payload: Record<string, any> = {
    idToken,
    shop_id: input.shopId,
  };

  // Only send these if present (login doesn't need them)
  if (input.firstName) payload.first_name = input.firstName;
  if (input.lastName) payload.last_name = input.lastName;
  if (input.phone) payload.phone = input.phone;

  const res = await fetch(`${API_BASE}/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Session exchange failed: ${res.status} ${text}`);
  }
}

export async function logoutSession() {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set.");

  const res = await fetch(`${API_BASE}/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Logout failed: ${res.status} ${text}`);
  }
}

export async function getMe() {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set.");

  const res = await fetch(`${API_BASE}/v1/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) return null;
  return res.json();
}
