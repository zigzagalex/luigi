import { NextResponse } from "next/server";
import { fetchApi } from "@/../utils/fetchAPI";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetchApi("/v1/cart/items", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { cookie: (req.headers.get("cookie") ?? "") },
      cache: "no-store",
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


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ cart_item_id: string }> }
) {
  const { cart_item_id } = await params;           
  const id = Number(cart_item_id);                

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid_cart_item_id" }, { status: 400 });
  }

  const res = await fetchApi(`/v1/cart/items/${id}`, {
    method: "DELETE",
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ cart_item_id: string }> }
) {
  const { cart_item_id } = await params;           // ✅ await the promise
  const id = Number(cart_item_id);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid_cart_item_id" }, { status: 400 });
  }

  const body = await req.text();

  const res = await fetchApi(`/v1/cart/items/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body,
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}