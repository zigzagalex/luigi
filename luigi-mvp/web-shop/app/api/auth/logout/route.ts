import { NextResponse } from "next/server";
import { serverApiBase } from "@/lib/apiBase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const shopId = body?.shop_id;
  const audience = typeof body?.audience === "string" ? body.audience : "customer";

  const res = await fetch(`${serverApiBase()}/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // forward browser cookies to the Go API
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ shop_id: shopId, audience }),
  });

  const text = await res.text();

  // Create response to browser
  const out = new NextResponse(text, { status: res.status });

  // Forward *all* Set-Cookie headers (Go may set more than one)
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) out.headers.append("set-cookie", c);

  return out;
}
