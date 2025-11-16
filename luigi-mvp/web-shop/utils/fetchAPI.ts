// utils/fetchAPI.ts
import { GoogleAuth, IdTokenClient } from "google-auth-library";

// Prefer server-only API_BASE_URL, fall back to NEXT_PUBLIC_API_BASE if needed
const envBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE;

if (!envBase) {
  throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE is not set");
}

const base: string = envBase;

// GoogleAuth will use the Cloud Run service account in prod
const auth = new GoogleAuth();

// Cache the *resolved* IdTokenClient, not the promise-of-a-promise
let idTokenClient: IdTokenClient | null = null;

async function getIdTokenClient(): Promise<IdTokenClient> {
  if (!idTokenClient) {
    // base is guaranteed non-null by the check above
    idTokenClient = await auth.getIdTokenClient(base);
  }
  return idTokenClient;
}

export async function fetchApi(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const client = await getIdTokenClient();

  // google-auth-library types this loosely; treat it as a plain header map
const headers = (await client.getRequestHeaders()) as unknown as Record<string, string>;
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
