import { fetchApi } from "@/../utils/fetchAPI";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { reservationId: string } }
) {
  try {
    const { reservationId } = params;

    if (!reservationId) {
      return NextResponse.json(
        { error: "missing_reservation_id" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json_body" },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get("cookie") ?? "";

    const res = await fetchApi(
      `/v1/reservations/${reservationId}/cancel`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("Cancel backend error:", {
        reservationId,
        status: res.status,
        body: text,
      });

      return NextResponse.json(
        { error: "backend_error", status: res.status },
        { status: res.status }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON from cancel backend:", text);
      return NextResponse.json(
        { error: "invalid_backend_response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("Cancel proxy failed:", e);

    return NextResponse.json(
      { error: "proxy_failed", detail: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
