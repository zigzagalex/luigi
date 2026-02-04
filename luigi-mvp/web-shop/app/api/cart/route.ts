import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const shop_id = url.searchParams.get("shop_id");
    if (!shop_id) {
      return NextResponse.json(
        { error: "missing_params", details: { shop_id} },
        { status: 400 }
      );
    }

    const res = await fetchApi(`/v1/cart?shop_id=${shop_id}`, {
      method: "GET",
      headers: { cookie: (req.headers.get("cookie") ?? "") },
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
