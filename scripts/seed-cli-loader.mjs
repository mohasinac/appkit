/**
 * Back-compat shim. The real implementation is `node-esm-loader.mjs`.
 *
 * The hook was never seed-specific — it makes a bare `import("@mohasinac/appkit")`
 * resolve from any standalone Node script — so it was renamed. This file stays
 * so a pinned path (a published tarball, a script outside this repo) keeps
 * working. Register `node-esm-loader.mjs` directly in anything new.
 */
export { load, resolve } from "./node-esm-loader.mjs";
