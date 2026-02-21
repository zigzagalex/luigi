import {NullableInt64, NullableString, NullableTime} from "@/lib/nulls"

export type ReservationItem = {
    id: number;
    reservation_id: number;
    inventory_item_id: number;  
    padded_range: unknown; // pg tstzrange serialized (keep unknown unless you parse it)    
    product_id: NullableInt64 | null;
    variant_id: NullableInt64 | null;   
    is_active: boolean;
    unit_price_cents: number;
    quantity: number;
    currency: string;
};

export type Reservation = {
    id: number;
    shop_id: number;
    store_id: number;   
    customer_id: NullableInt64 | null;  
    status: string; 
    start_at: string; // RFC3339
    end_at: string; 
    total_price_cents: number;
    currency: string;   
    idempotency_key: NullableString | null;
    version: number;    
    notes: NullableString | null;   
    pickup_person_name: NullableString | null;
    pickup_person_phone: NullableString | null;
    pickup_person_email: NullableString | null; 
    cancelled_at: NullableTime | null;
    cancel_reason: NullableString | null;   
    store_snapshot_name: NullableString | null; 
    created_at: string;
    updated_at: string;
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
  
  
  