// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

// Resolve base URL once, with proper typing
const envBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE;

if (!envBase) {
  throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE is not set");
}

const base: string = envBase;

// One auth instance and one IdTokenClient (cached)
const auth = new GoogleAuth();
let idTokenClient: IdTokenClient | null = null;

async function getIdTokenClient(): Promise<IdTokenClient> {
  if (!idTokenClient) {
    // This client automatically attaches an ID token for `base` as audience
    idTokenClient = await auth.getIdTokenClient(base);
  }
  return idTokenClient;
}

/**
 * Server-side helper to call the IAM-protected API.
 *
 * - Uses GoogleAuth + IdTokenClient to mint an ID token
 * - Calls the API with that token (no manual header fiddling)
 * - Wraps the result into a standard Fetch `Response` object
 */
export async function fetchApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const client = await getIdTokenClient();

  // Build absolute URL from base + path
  const url = new URL(path, base).toString();

  // Map minimal RequestInit fields into the client.request call
  const method = init.method ?? "GET";

  // For now we only support simple bodies (string / JSON serialised by caller)
  const data = init.body as any;

  const nodeRes = await client.request({
    url,
    method,
    headers: init.headers as any,
    data,
    // Don't throw on non-2xx, we want to handle status in the caller
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

  // Use the global Response from the Fetch API (available in Next / Node 18+)
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
