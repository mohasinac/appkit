/**
 * The short, buyer-facing reference for an order.
 *
 * 🛑 WHY THIS EXISTS. Four sites independently rendered
 * `order.id.slice(-8).toUpperCase()` — the buyer's order view (twice), the
 * invoice, and `OrdersList`. A fixed-width tail is the wrong shape for these
 * ids: `generateOrderId` produces
 *
 *     order-{itemCount}-{YYYYMMDD}-{rand6}
 *
 * whose final segment is **6** characters, so `slice(-8)` takes seven of them
 * plus one extra — and that extra is the last digit of the DATE. Measured on a
 * real order, `order-2-20260929-ezq0pc` rendered as **`#9-EZQ0PC`**.
 *
 * Three things are wrong with that, in increasing order of cost:
 *
 * 1. It straddles a delimiter, so the reference is not a substring of anything
 *    meaningful — the leading `9` looks like part of a structured reference and
 *    is a fragment of `20260929`.
 * 2. Every order placed on the 9th, 19th or 29th of any month renders the same
 *    leading digit, and the 1st/11th/21st/31st share another. The digit adds no
 *    distinguishing information while looking like it does.
 * 3. It is the number a buyer reads off their own screen and quotes to support,
 *    and it does not appear anywhere in the real document id. The payment page
 *    shows the full `order-2-20260929-ezq0pc`, so the same order presents two
 *    unrelated-looking references depending on which page you are on.
 *
 * The random suffix alone is the intended unique part, so that is what this
 * returns. Taking the last hyphen-delimited SEGMENT rather than a character
 * count also means the format can change without silently re-slicing.
 *
 * @tag domain:orders
 * @tag layer:utils
 * @tag access:isomorphic
 * @tag sideEffects:none — pure
 */

/**
 * `order-2-20260929-ezq0pc` → `EZQ0PC`.
 *
 * Falls back to the whole id, uppercased, for anything that is not in the
 * generator's shape (a legacy Firestore auto-id, say) — a reference that is
 * merely long is far better than one that is wrong, and an empty string would
 * render as a bare `#`.
 */
export function shortOrderRef(orderId: string): string {
  if (!orderId) return "";
  const segments = orderId.split("-").filter(Boolean);
  const last = segments[segments.length - 1] ?? orderId;
  /*
   * A single trailing segment that is purely numeric is a date, not a suffix —
   * that would be an id shaped `order-2-20260929` with no random part. Prefer
   * the whole thing over presenting a date as a reference number.
   */
  if (segments.length > 1 && /^\d+$/.test(last)) return orderId.toUpperCase();
  return last.toUpperCase();
}
