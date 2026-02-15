import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id");

    if (!shopId) {
      return NextResponse.json(
        { error: "missing_shop_id" },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get("cookie") ?? "";

    const res = await fetchApi(
      `/v1/cart/attach-guest-cart?shop_id=${shopId}`,
      {
        method: "POST",
        headers: {
          cookie: cookieHeader,
        },
        cache: "no-store",
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("Attach guest backend error:", {
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
      return NextResponse.json(
        { error: "invalid_backend_response" },
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    console.error("Attach guest proxy failed:", e);

    return NextResponse.json(
      { error: "proxy_failed", detail: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
