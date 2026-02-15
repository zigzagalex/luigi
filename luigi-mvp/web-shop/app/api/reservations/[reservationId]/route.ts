import { fetchApi } from "@/../utils/fetchAPI";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reservationId: string }> } 
) {
  const { reservationId } = await params;
  const res = await fetchApi(
    `/v1/reservations/${reservationId}`
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: await res.text() },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
