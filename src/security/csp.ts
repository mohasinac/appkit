/**
 * Content Security Policy helpers.
 * Generates a per-request nonce and builds the CSP header string.
 *
 * @example
 * ```ts
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

export interface BuildCSPOptions {
  /**
   * Add `'wasm-unsafe-eval'` to `script-src`, permitting
   * `WebAssembly.compile`/`instantiate` from bytes.
   *
   * Required by any page that compiles WebAssembly at runtime — without it the
   * production policy (`script-src 'self' 'nonce-…'`) blocks compilation
   * outright, because WebAssembly compilation counts as script evaluation.
   *
   * Narrower than `'unsafe-eval'` on purpose: it unblocks WASM only and still
   * forbids `eval` and `new Function` for JavaScript. Default `false`, so
   * existing consumers are unaffected.
   */
  wasm?: boolean;
}

/** Build the full CSP header value for the given nonce. */
export function buildCSP(nonce: string, options: BuildCSPOptions = {}): string {
  const isDev = process.env.NODE_ENV === "development";
  const wasm = options.wasm === true ? " 'wasm-unsafe-eval'" : "";
  return [
    "default-src 'self'",
    isDev
      ? // 'unsafe-eval' already subsumes 'wasm-unsafe-eval' in dev.
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : `script-src 'self' 'nonce-${nonce}'${wasm}`,
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
