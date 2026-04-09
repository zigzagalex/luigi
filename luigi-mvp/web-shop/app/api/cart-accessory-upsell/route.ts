import { NextResponse } from "next/server";

import { fetchCartAccessoryUpsell } from "@/../utils/cartAccessoryUpsell";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopRaw = searchParams.get("shop_id");
    const shopId = shopRaw ? parseInt(shopRaw, 10) : NaN;
    const locale = (searchParams.get("locale") ?? "en").trim() || "en";

    if (!Number.isFinite(shopId) || shopId <= 0) {
      return NextResponse.json({ error: "invalid_shop_id" }, { status: 400 });
    }

    const rows = await fetchCartAccessoryUpsell(shopId, locale);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "upsell_failed", detail },
      { status: 500 },
    );
  }
}
