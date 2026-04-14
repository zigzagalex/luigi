import {NullableInt64, NullableString, NullableTime} from "@/lib/nulls"

export type StoreView = {
  id: number;
  name: string;
  address1: string;       
  postal_code: string;    
  city: string;           
};

export type ReservationItem = {
  id: number;
  reservation_id: number;
  inventory_item_id: number;

  product_id: number | null;
  variant_id: number | null;

  is_active: boolean;
  unit_price_cents: number;
  quantity: number;
  currency: string;
};

export type Reservation = {
  id: number;
  shop_id: number;
  store_id: number;
  status: string;
  currency: string;

  customer_id: number | null;

  start_at: string; // RFC3339
  end_at: string;

  total_price_cents: number;

  idempotency_key: string | null;
  version: number;

  notes: string | null;
  pickup_person_name: string | null;
  pickup_person_phone: string | null;
  pickup_person_email: string | null;

  cancelled_at: string | null;     // RFC3339 or null
  cancel_reason: string | null;

  store_snapshot_name: string | null;

  created_at: string; // RFC3339
  updated_at: string; // RFC3339
};

export type ReservationItemView = {
  reservation_item: ReservationItem;
  product_id?: number;
  variant_id?: number;
  product_name?: string;
  variant_text?: string;
  image_url?: string;
};

export type ReservationView = {
  reservation: Reservation;
  items: ReservationItemView[];
  store?: StoreView | null;
};
  
export type CheckoutRequest = {
    shop_id: number;
    store_id: number;
    idempotency_key: string;

    notes?: string;
    pickup_person_name?: string;
    pickup_person_phone?: string;
    pickup_person_email?: string;
};

export type CancelReservationRequest = {
    shop_id: number;
    expected_version: number;
    cancel_reason?: string;
};
  
export type RescheduleReservationRequest = {
    shop_id: number;
    expected_version: number;
    start_date: string; // "YYYY-MM-DD"
    end_date: string;
};

export async function fetchReservations(
    shopId: number
  ): Promise<ReservationView[]> {
    const res = await fetch(`/api/reservations?shop_id=${shopId}`, {
      method: "GET",
      credentials: "include",
    });
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

export async function fetchReservation(
    reservationId: number,
    shopId: number
  ): Promise<ReservationView> {
    const res = await fetch(
      `/api/reservations/${reservationId}?shop_id=${shopId}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

export async function downloadReservationInvoice(reservationId: number, shopId: number): Promise<void> {
  const res = await fetch(`/api/reservations/${reservationId}/invoice?shop_id=${shopId}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/pdf" },
  });

  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `reservation-${reservationId}-invoice.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function checkoutReservation(
    payload: CheckoutRequest
  ): Promise<ReservationView[]> {
    const res = await fetch("/api/reservations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
export async function cancelReservation(
    reservationId: number,
    payload: CancelReservationRequest
  ): Promise<ReservationView> {
    const res = await fetch(
      `/api/reservations/${reservationId}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

export async function rescheduleReservation(
    reservationId: number,
    payload: RescheduleReservationRequest
  ): Promise<ReservationView> {
    const res = await fetch(
      `/api/reservations/${reservationId}/reschedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export type UpdateReservationDetailsRequest = {
    shop_id: number;
    expected_version: number;
    pickup_person_name?: string | null;
    pickup_person_phone?: string | null;
    pickup_person_email?: string | null;
    notes?: string | null;
  };
  
  export async function updateReservationDetails(
    reservationId: number,
    payload: UpdateReservationDetailsRequest
  ): Promise<ReservationView> {
    const res = await fetch(`/api/reservations/${reservationId}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
  
  export type CancelReservationItemRequest = {
    shop_id: number;
    expected_version: number;
  };
  
  export async function cancelReservationItem(
    reservationId: number,
    reservationItemId: number,
    payload: CancelReservationItemRequest
  ): Promise<ReservationView> {
    const res = await fetch(
      `/api/reservations/${reservationId}/items/${reservationItemId}/cancel`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );
  
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }