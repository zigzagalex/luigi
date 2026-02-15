import { fetchApi } from "@/../utils/fetchAPI";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? "";

    const res = await fetchApi("/v1/reservations", {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("Reservations API error:", {
        status: res.status,
        body: text,
      });

      return NextResponse.json(
        {
          error: "backend_error",
          status: res.status,
        },
        { status: res.status }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Invalid JSON from backend:", text);
      return NextResponse.json(
        { error: "invalid_backend_response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("Reservations proxy failed:", e);

    return NextResponse.json(
      {
        error: "proxy_failed",
        detail: e?.message ?? "unknown_error",
      },
      { status: 500 }
    );
  }
}
