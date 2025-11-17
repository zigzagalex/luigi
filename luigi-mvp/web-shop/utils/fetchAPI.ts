// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

const auth = new GoogleAuth();

// Cache the client + audience so we don't recreate it every call
let idTokenClient: IdTokenClient | null = null;
let idTokenAudience: string | null = null;

async function getIdTokenClient(audience: string): Promise<IdTokenClient> {
  // If audience changed or client not created yet, build a new one
  if (!idTokenClient || idTokenAudience !== audience) {
    idTokenClient = await auth.getIdTokenClient(audience);
    idTokenAudience = audience;
  }
  return idTokenClient;
}

/**
 * Server-side helper to call the IAM-protected API.
 *
 * - Reads API_BASE_URL / NEXT_PUBLIC_API_BASE at *call time* (runtime),
 *   not at module import time (build).
 * - Uses GoogleAuth + IdTokenClient to mint an ID token with audience = base URL.
 * - Calls the API and wraps the result in a standard Fetch `Response`.
 */
export async function fetchApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  // Read env ONLY when the function is called, not at import
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE;

  if (!base) {
    throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE is not set");
  }

  const url = new URL(path, base).toString();

  const client = await getIdTokenClient(base);

  const nodeRes = await client.request({
    url,
    method: init.method ?? "GET",
    headers: init.headers as any,
    data: init.body as any,
    // Don't throw on non-2xx, we want to inspect status in callers
    validateStatus: () => true,
  });

  const status = nodeRes.status ?? 200;
  const rawData = nodeRes.data;

  let body: string;
  if (typeof rawData === "string") {
    body = rawData;
  } else if (rawData === undefined || rawData === null) {
    body = "";
  } else {
    body = JSON.stringify(rawData);
  }

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
