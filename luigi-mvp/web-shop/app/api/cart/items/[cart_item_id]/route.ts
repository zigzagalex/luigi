import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetchApi("/v1/cart/items", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { cookie: (req.headers.get("cookie") ?? "") },
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
