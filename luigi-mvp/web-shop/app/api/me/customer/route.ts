import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;
const API_PREFIX = process.env.API_VERSION ?? "";

function forwardedCookie(req: NextRequest) {
  return req.headers.get("cookie") ?? "";
}

function joinPath(prefix: string, path: string) {
  const a = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const b = path.startsWith("/") ? path : `/${path}`;
  return `${a}${b}`;
}

function backendUrl(path: string) {
  if (!API_BASE_URL) return null;
  return `${API_BASE_URL}${joinPath(API_PREFIX, path)}`;
}

function ns(x: any): string {
  if (typeof x === "string") return x;
  if (
    x &&
    typeof x === "object" &&
    typeof x.String === "string" &&
    typeof x.Valid === "boolean"
  ) {
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

// GET

export async function GET(req: NextRequest) {
  try {
    const url = backendUrl("/me/customer");

    if (!url) {
      console.error("API_BASE_URL missing");
      return NextResponse.json(
        { error: "server_configuration_error" },
        { status: 500 }
      );
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

    const text = await res.text();

    if (!res.ok) {
      console.error("GET /me/customer backend error:", {
        status: res.status,
        body: text,
      });

      return NextResponse.json(
        { error: "backend_error" },
        { status: res.status }
      );
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      console.error("Invalid JSON from /me/customer:", text);
      return NextResponse.json(
        { error: "invalid_backend_response" },
        { status: 502 }
      );
    }

    return NextResponse.json(normalizeCustomer(raw), { status: 200 });
  } catch (e: any) {
    console.error("GET /me/customer proxy failed:", e);

    return NextResponse.json(
      { error: "proxy_failed" },
      { status: 500 }
    );
  }
}

// PUT

export async function PUT(req: NextRequest) {
  try {
    const url = backendUrl("/me/customer");

    if (!url) {
      console.error("API_BASE_URL missing");
      return NextResponse.json(
        { error: "server_configuration_error" },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json_body" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Cookie: forwardedCookie(req),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("PUT /me/customer backend error:", {
        status: res.status,
        body: text,
      });

      return NextResponse.json(
        { error: "backend_error" },
        { status: res.status }
      );
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      console.error("Invalid JSON from PUT /me/customer:", text);
      return NextResponse.json(
        { error: "invalid_backend_response" },
        { status: 502 }
      );
    }

    return NextResponse.json(normalizeCustomer(raw), { status: 200 });
  } catch (e: any) {
    console.error("PUT /me/customer proxy failed:", e);

    return NextResponse.json(
      { error: "proxy_failed" },
      { status: 500 }
    );
  }
}
