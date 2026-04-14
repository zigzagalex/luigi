const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reservationId: string }> },
) {
  try {
    const { reservationId } = await params;
    if (!reservationId) {
      return Response.json({ error: "missing_reservation_id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id");
    const query = shopId ? `?shop_id=${encodeURIComponent(shopId)}` : "";
    const cookieHeader = req.headers.get("cookie") ?? "";

    const upstream = await fetch(`${API_BASE}/v1/admin/reservations/${reservationId}/invoice${query}`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        accept: "application/pdf",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const errorBody = await upstream.text();
      return Response.json(
        { error: "backend_error", status: upstream.status, detail: errorBody || "invoice_download_failed" },
        { status: upstream.status },
      );
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const disposition =
      upstream.headers.get("content-disposition") ?? `attachment; filename="reservation-${reservationId}-invoice.pdf"`;

    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
      },
    });
  } catch (error: any) {
    return Response.json(
      { error: "invoice_proxy_failed", detail: error?.message ?? "unknown_error" },
      { status: 500 },
    );
  }
}
