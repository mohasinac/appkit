/**
 * Redact a gateway webhook body down to something safe to keep for 90 days.
 *
 * ## Why the raw body is never stored
 *
 * A Razorpay payment entity carries the buyer's `email`, `contact`,
 * `card.last4`, `vpa` and `bank` — so persisting the body verbatim would make
 * `gatewayEvents` a **new PII store**, with a 90-day retention, no encryption,
 * and an admin table rendering it. That is a worse outcome than the problem the
 * inbox solves.
 *
 * The integrity guarantee does not depend on keeping the body: `bodySha256` is
 * computed over the verbatim bytes before redaction, so "is this the same event
 * the gateway signed" stays answerable regardless of what the projection drops.
 *
 * ## Deny-list, and why that is defensible HERE specifically
 *
 * 🛑 Root Cause #70 is the incident where a deny-list projection published
 * every field nobody thought to delete, and § "Public Data Projections" draws
 * the rule: **a document field is private until someone names it public.** This
 * redactor is a deny-list, which looks like the same mistake. It is not, for
 * two reasons worth stating rather than assuming:
 *
 *   1. **The shape is THEIRS, not ours.** An allow-list requires enumerating
 *      every field a gateway might send, across providers and across their
 *      future API versions. A field we failed to anticipate would be *dropped*,
 *      and the whole value of this row is being able to read a payload we did
 *      not expect — that is what makes an unhandled event diagnosable. An
 *      allow-list here optimises for the case that never needs diagnosing.
 *   2. **The output is never published.** It reaches one admin maintenance
 *      table behind `admin:maintenance:view-server-errors`. The field that got
 *      away in #70 went to an *unauthenticated, edge-cached* public endpoint.
 *
 * The deny-list is therefore keyed on *categories of sensitive data* rather
 * than on one provider's field names, and it matches **recursively on the key
 * at every depth** — so `payload.payment.entity.card.last4` is caught by the
 * `card` key without anyone having written that path down.
 */

import type { FirestoreDocument, FirestoreValue } from "../../../../schemas/types";
import { GATEWAY_EVENT_PAYLOAD_MAX_BYTES } from "../../../../features/gateway-events/schemas/firestore";
import { normalizeError } from "../../../../errors/normalize";

/**
 * Keys dropped wherever they appear, at any depth.
 *
 * Grouped by why, because "it looked sensitive" is not a maintainable reason
 * and the next person needs to know whether to extend the list:
 *
 * - **direct identifiers** — reach a person without any other data
 * - **instrument data** — card/UPI/bank details; `last4` is nested under `card`
 *   and so is covered by the parent key
 * - **our own passthrough** — `notes` and `metaInfo` are where WE pack
 *   `uid`/`addressId`/`outOfStockPolicy` at create-order time, so they are the
 *   one category that is sensitive *because of what we put there*
 * - **credentials** — anything token-shaped, which should never be in a webhook
 *   body but costs nothing to exclude
 */
const DENY_KEYS = new Set([
  // direct identifiers
  "email",
  "contact",
  "phone",
  "phone_number",
  "phoneNumber",
  "mobile",
  "name",
  "customer_id",
  "customerId",
  "address",
  "billing_address",
  "shipping_address",
  // instrument data
  "card",
  "card_id",
  "vpa",
  "bank_account",
  "bankAccount",
  "account_number",
  "accountNumber",
  "ifsc",
  "upi",
  "wallet",
  // our own passthrough channel
  "notes",
  "metaInfo",
  "udf1",
  "udf2",
  "udf3",
  "udf4",
  "udf5",
  // credentials
  "token",
  "access_token",
  "accessToken",
  "refresh_token",
  "secret",
  "signature",
  "password",
]);

/**
 * `vpa` appears as a bare key AND embedded in strings like
 * `"someone@okhdfcbank"`. The key test catches the former; nothing here tries
 * to catch the latter, and that is a deliberate limit rather than an oversight:
 * a value-scanning redactor over arbitrary provider JSON produces false
 * positives on ids that merely contain "@", and a redactor that mangles the
 * diagnostic data is worse than one with a documented edge.
 *
 * What covers the gap is that the *keys* carrying an address — `email`,
 * `contact`, `vpa` — are all denied, so a value only survives if the gateway
 * put a contact detail under a key none of us anticipated.
 */
export interface RedactResult {
  payload: FirestoreDocument;
  truncated: boolean;
}

function redactValue(value: FirestoreValue): FirestoreValue {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactValue);

  const out: Record<string, FirestoreValue> = {};
  for (const [key, child] of Object.entries(value as Record<string, FirestoreValue>)) {
    if (DENY_KEYS.has(key)) continue;
    out[key] = redactValue(child);
  }
  return out;
}

/**
 * Redact, then cap.
 *
 * 🛑 The cap is applied by MEASURING the serialised result and, if it is over
 * budget, replacing it with a marker rather than by slicing the JSON string.
 * A sliced JSON string is not JSON — it would be stored as a truncated blob
 * that no reader can parse, which is a field that looks present and is
 * unusable. A marker plus `payloadTruncated: true` tells the reader exactly
 * what happened, and `bodySha256` still proves what arrived.
 */
export function redactGatewayPayload(body: unknown): RedactResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { payload: {}, truncated: false };
  }

  const redacted = redactValue(body as FirestoreValue) as FirestoreDocument;

  let serialisedLength: number;
  try {
    serialisedLength = JSON.stringify(redacted)?.length ?? 0;
  } catch (err) {
    /*
     * A circular structure cannot come from `JSON.parse`, which is the only
     * producer here — but this function is exported and a future caller could
     * hand it something else. Failing to a marker keeps the row writable.
     *
     * 🛑 The reason is CARRIED, not discarded. This was a bare `catch {}`, so
     * the one case the comment above exists to anticipate — a future caller
     * handing it something `JSON.stringify` cannot take — produced a row
     * saying only `redactionFailed: true`, with nothing anywhere to say why.
     * The row is a debugging record; a marker that cannot explain itself is
     * the silent-degrade shape this codebase keeps paying for.
     */
    const n = normalizeError(err);
    return {
      payload: { redactionFailed: true, reason: n.message },
      truncated: true,
    };
  }

  if (serialisedLength > GATEWAY_EVENT_PAYLOAD_MAX_BYTES) {
    return {
      payload: {
        omitted: "payload exceeded the size budget after redaction",
        approximateBytes: serialisedLength,
      },
      truncated: true,
    };
  }

  return { payload: redacted, truncated: false };
}
