import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;
const API_PREFIX = process.env.API_VERSION ?? "";

function forwardedCookie(req: NextRequest) {
  return req.headers.get("cookie") ?? "";
}

// join paths safely (avoids double slashes)
function joinPath(prefix: string, path: string) {
  const a = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const b = path.startsWith("/") ? path : `/${path}`;
  return `${a}${b}`;
}

// sql.NullString JSON -> string
function ns(x: any): string {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && typeof x.String === "string" && typeof x.Valid === "boolean") {
    return x.Valid ? x.String : "";
  }
  return "";
}

function normalizeCustomer(raw: any) {
  return {
    email: ns(raw?.email ?? raw?.Email),
    phone: ns(raw?.phone ?? raw?.Phone),
    first_name: ns(raw?.first_name ?? raw?.FirstName),
    last_name: ns(raw?.last_name ?? raw?.LastName),

    address1: ns(raw?.address1 ?? raw?.Address1),
    address2: ns(raw?.address2 ?? raw?.Address2),
    postal_code: ns(raw?.postal_code ?? raw?.PostalCode),
    city: ns(raw?.city ?? raw?.City),
    country: ns(raw?.country ?? raw?.Country),
    notes: ns(raw?.notes ?? raw?.Notes),
  };
}

function backendUrl(path: string) {
  if (!API_BASE_URL) return null;
  return `${API_BASE_URL}${joinPath(API_PREFIX, path)}`;
}

export async function GET(req: NextRequest) {
  const url = backendUrl("/me/customer");
  if (!url) {
    return NextResponse.json({ error: "API_BASE_URL missing" }, { status: 500 });
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: forwardedCookie(req),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    return NextResponse.json(null, { status: 200 });
  }

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Failed to load" }, { status: res.status });
  }

  const raw = await res.json();
  return NextResponse.json(normalizeCustomer(raw), { status: 200 });
}

export async function PUT(req: NextRequest) {
  const url = backendUrl("/me/customer");
  if (!url) {
    return NextResponse.json({ error: "API_BASE_URL missing" }, { status: 500 });
  }

  const body = await req.json();

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Cookie: forwardedCookie(req),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Failed to save" }, { status: res.status });
  }

  const raw = await res.json();
  return NextResponse.json(normalizeCustomer(raw), { status: 200 });
}
