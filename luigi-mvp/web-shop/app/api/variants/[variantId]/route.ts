import { fetchApi } from "@/../utils/fetchAPI";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ variantId: string }> }
) {
  const { variantId } = await params;

  const res = await fetchApi(`/v1/product_variants/${variantId}`);
  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
