const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export type ApiUser = {
  id: number;
  shop_id?: number | null;
  store_id?: number | null;
  firebase_uid?: string | null;
  email?: string | null;
  display_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function listUsers(shopId: number): Promise<ApiUser[]> {
  const res = await fetch(
    `${API_BASE}/v1/users?shop_id=${encodeURIComponent(String(shopId))}&limit=200`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ApiUser[];
}

export type CreateUserBody = {
  shop_id: number;
  email: string;
  firebase_uid: string;
  display_name?: string;
  role: "admin" | "staff";
};

export async function createUser(body: CreateUserBody): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/v1/users`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      shop_id: body.shop_id,
      email: body.email,
      firebase_uid: body.firebase_uid,
      display_name: body.display_name || undefined,
      role: body.role,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ApiUser;
}
