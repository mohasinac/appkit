import { withRetry } from "../../../../http/retry";
import type { JsonObject } from "../../../../schemas/types";

const IDENTITY_TOOLKIT_BASE =
  "https://identitytoolkit.googleapis.com/v1/accounts";

type IdentityOperation = "signInWithPassword" | "signInWithCustomToken";

/**
 * Calls the Firebase Identity Toolkit REST API with one retry for transient
 * network failures. Throws a plain Error (message from the API) on non-2xx.
 *
 * Both auth routes (login + register) hit this endpoint to exchange
 * credentials / custom tokens for a Firebase ID token that can be converted
 * into a session cookie. Centralised here so the URL, Content-Type, and retry
 * config are in one place.
 */
export async function callFirebaseIdentityToolkit<T extends JsonObject>(
  operation: IdentityOperation,
  body: JsonObject,
  apiKey: string,
): Promise<T> {
  const url = `${IDENTITY_TOOLKIT_BASE}:${operation}?key=${encodeURIComponent(apiKey)}`;
  const res = await withRetry(
    () =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    1,
    500,
  );
  const data = (await res.json()) as T & {
    error?: { message?: string; code?: number };
  };
  if (!res.ok) {
    throw new Error(
      data.error?.message ??
        `Firebase Identity Toolkit ${operation} failed (${res.status})`,
    );
  }
  return data;
}
