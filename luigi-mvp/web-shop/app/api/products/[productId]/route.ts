import { fetchApi } from "../../../../utils/fetchAPI";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const requestURL = new URL(req.url);
  const locale = requestURL.searchParams.get("locale");
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";

  const headers: HeadersInit = {};
  if (locale) {
    headers["Accept-Language"] = locale;
  }

  const res = await fetchApi(`/v1/products/${productId}${query}`, {
    headers,
  });
  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
