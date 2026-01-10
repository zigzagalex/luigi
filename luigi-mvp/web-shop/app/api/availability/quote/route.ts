import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

// This runs on the server (Route Handler), so fetchApi is safe here.
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetchApi("/v1/availability/quote", {
      method: "POST",
      body: JSON.stringify(body),
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
