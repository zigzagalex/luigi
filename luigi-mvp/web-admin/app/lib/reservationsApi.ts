const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export type ApiAdminReservation = {
  reservation_id: number;
  shop_id: number;
  store_id: number;
  status: string;
  start_at: string;
  end_at: string;
  version: number;
  customer: {
    id: number | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  };
  pickup_person: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  };
  items: Array<{
    id: number;
    name: string;
    details?: string;
  }>;
};

export async function listAdminReservations(shopId: number, status = "confirmed"): Promise<ApiAdminReservation[]> {
  const res = await fetch(
    `${API_BASE}/v1/admin/reservations?shop_id=${encodeURIComponent(String(shopId))}&status=${encodeURIComponent(status)}&limit=200`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(await res.text());
  const payload = (await res.json()) as ApiAdminReservation[];
  return Array.isArray(payload) ? payload : [];
}

export async function updateAdminReservationStatus(input: {
  reservationId: number;
  shopId: number;
  expectedVersion: number;
  status: string;
}): Promise<{ reservation_id: number; status: string; version: number }> {
  const res = await fetch(`${API_BASE}/v1/admin/reservations/${encodeURIComponent(String(input.reservationId))}/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      shop_id: input.shopId,
      expected_version: input.expectedVersion,
      status: input.status,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { reservation_id: number; status: string; version: number };
}
