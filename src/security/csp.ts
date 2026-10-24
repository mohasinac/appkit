/**
 * Content Security Policy helpers — **NOT WIRED. Do not wire as-is.**
 *
 * 🛑 Measured 2026-10-24: these two functions are exported from three barrels
 * (`security/index.ts`, `security/browser.ts`, and appkit's main `index.ts`) and imported by
 * **nothing** — not elsewhere in appkit, not in the consumer. That is Root Cause #87's shape:
 * a module whose absence is silent because nothing registers it. For the whole time it
 * existed, letitrip.in shipped no CSP at all.
 *
 * 🛑 **And wiring `buildCSP` unchanged would break the live site.** The policy below predates
 * four integrations the app now depends on, and every one of them fails *silently, in someone
 * else's browser*:
 *
 *   - **Razorpay** — no `checkout.razorpay.com` / `api.razorpay.com` in `script-src`,
 *     `frame-src` or `connect-src`. Checkout would not load.
 *   - **YouTube embeds** — no `www.youtube-nocookie.com` in `frame-src`. Every product and
 *     blog video embed would be blocked.
 *   - **Firebase RTDB** — no `wss://*.firebasedatabase.app` in `connect-src` (only the older
 *     `firebaseio.com`). The auth/payment/bulk signal channels would stop.
 *   - **`frame-ancestors`** and **`object-src`** are absent entirely.
 *
 * **What ships instead, today:** a `Content-Security-Policy-Report-Only` header built inline
 * in the consumer's `next.config.js`, covering all four of the above. Report-Only on purpose —
 * an enforced policy guessed without report data is how you discover the gaps above from a
 * user. `audit-security-headers` requires a CSP in either spelling and accepts Report-Only as
 * a valid end state.
 *
 * **Why this file is kept rather than deleted:** the *nonce* approach here is the correct
 * destination — `'nonce-…'` is strictly better than the `'unsafe-inline'` the inline policy
 * currently needs. Getting there means generating a nonce in `src/proxy.ts`, threading it
 * through `requestHeaders`, and attaching it to every inline script Next emits. That is its
 * own change, and the policy string needs the four additions above first.
 *
 * @example
 * ```ts
 * // The intended shape, once the nonce is threaded through proxy.ts:
 * const nonce = generateNonce();
 * const csp = buildCSP(nonce);
 * response.headers.set("Content-Security-Policy", csp);
 * requestHeaders.set("x-nonce", nonce);
 * ```
 */

/** Generate a 16-byte base64 nonce for a single request. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Build the full CSP header value for the given nonce. */
export function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://*.googleapis.com",
      "https://*.google.com",
      "https://*.firebase.com",
      "https://*.firebaseio.com",
      "https://*.cloudfunctions.net",
      // Allow local network in dev (CSP does not support IP wildcards; http: covers 192.168.1.* range)
      ...(isDev ? ["http:"] : []),
    ].join(" "),
    "frame-src 'self' https://accounts.google.com",
    "media-src 'self' https: blob:",
    "worker-src 'self' blob:",
  ].join("; ");
}
