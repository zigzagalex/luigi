import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("price_category");
    if (!category?.trim()) {
      return NextResponse.json(
        { error: "price_category_required" },
        { status: 400 }
      );
    }

    const qs = new URLSearchParams({ price_category: category.trim() });
    const res = await fetchApi(`/v1/price_points?${qs.toString()}`);

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "proxy_failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
