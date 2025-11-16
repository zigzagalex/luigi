// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

// Create GoogleAuth once. It won't actually call GCP until we use it.
const auth = new GoogleAuth();

// Cache the resolved IdTokenClient
let idTokenClient: IdTokenClient | null = null;

async function getIdTokenClient(audience: string): Promise<IdTokenClient> {
  if (!idTokenClient) {
    idTokenClient = await auth.getIdTokenClient(audience);
  }
  return idTokenClient;
}

/**
 * Server-side helper to call the protected Go API.
 *
 * - Reads API_BASE_URL / NEXT_PUBLIC_API_BASE at *call time* (runtime),
 *   not at module import time (build).
 * - In Cloud Run, GoogleAuth uses the service account `run-web-shop@...`
 *   to mint ID tokens for `audience = API_BASE_URL`.
 */
export async function fetchApi(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const base =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE;

  if (!base) {
    throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE is not set");
  }

  const client = await getIdTokenClient(base);

  // TS is picky; cast via unknown into a plain header map
  const headers = (await client.getRequestHeaders()) as unknown as Record<
    string,
    string
  >;

  const authHeader =
    headers["Authorization"] ?? headers["authorization"];

  if (!authHeader) {
    throw new Error("Failed to obtain Authorization header from IdTokenClient");
  }

  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: authHeader,
    },
  });
}
