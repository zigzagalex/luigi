// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

const auth = new GoogleAuth();

let idTokenClient: IdTokenClient | null = null;
let idTokenAudience: string | null = null;

async function getIdTokenClient(audience: string): Promise<IdTokenClient> {
  if (!idTokenClient || idTokenAudience !== audience) {
    idTokenClient = await auth.getIdTokenClient(audience);
    idTokenAudience = audience;
  }
  return idTokenClient;
}

function getApiBase(): string {
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE is not set");
  }
  return base;
}

function isLocalBase(base: string): boolean {
  return (
    base.startsWith("http://localhost") ||
    base.startsWith("http://127.0.0.1")
  );
}

/**
 * Server-side helper to call the API.
 *
 * - In dev/local (API_BASE_URL = http://localhost:8080), uses plain fetch.
 * - In prod/stage (Cloud Run), uses GoogleAuth + IdTokenClient for IAM auth.
 */
export async function fetchApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = getApiBase();
  const url = new URL(path, base).toString();

  // Local dev path: no IAM, just fetch 
  if (isLocalBase(base)) {
    const res = await fetch(url, init);
    return res;
  }

  // Cloud Run / IAM-protected path 
  const client = await getIdTokenClient(base);

  const nodeRes = await client.request({
    url,
    method: init.method ?? "GET",
    headers: init.headers as any,
    data: init.body as any,
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
