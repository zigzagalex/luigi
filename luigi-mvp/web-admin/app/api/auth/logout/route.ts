import { NextResponse } from "next/server";
import { serverApiBase } from "@/lib/apiBase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const shopId = body?.shop_id;
  const audience = typeof body?.audience === "string" ? body.audience : "staff";

  const res = await fetch(`${serverApiBase()}/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ shop_id: shopId, audience }),
  });

  const text = await res.text();

  const out = new NextResponse(text, { status: res.status });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) out.headers.append("set-cookie", c);

  return out;
}
