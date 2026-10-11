import { NextResponse } from "next/server";
import { apiBase } from "@/lib/apiBase";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const shopId = body?.shop_id;

  const res = await fetch(`${apiBase()}/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ shop_id: shopId }),
  });

  const text = await res.text();

  const out = new NextResponse(text, { status: res.status });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) out.headers.append("set-cookie", c);

  return out;
}
