// app/api/cart/attach-guest/route.ts
import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function POST() {
  const res = await fetchApi("/v1/cart/attach-guest", {
    method: "POST",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
