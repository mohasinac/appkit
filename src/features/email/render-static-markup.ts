/**
 * `renderToStaticMarkup`, behind a lazy `require` — the ONE definition.
 *
 * ## Why this is not a plain import
 *
 * A top-level `import { renderToStaticMarkup } from "react-dom/server"` is
 * flagged by Next's static tracer the moment any module in the re-export chain
 * is reachable from a Server Component — and these are, via
 * `@mohasinac/appkit/server` → `providers.config.ts` → `src/app/layout.tsx`:
 *
 *   Error: You're importing a component that imports react-dom/server.
 *
 * `require()` is opaque to that analyser, so the chain stops here. The
 * specifier MUST stay BARE: a relative one resolves against the emitted chunk
 * and fails only in production (Root Cause #86).
 *
 * ## 🛑 Why it is a module rather than a local helper per file
 *
 * It was a local copy in `features/contact/email.tsx` and
 * `features/email/notification-templates.tsx`, which worked — but
 * `courier-block` and `dailyStatusDigest` imported `react-dom/server` DIRECTLY
 * and broke `next build` outright. Giving each of those a fourth and fifth copy
 * of the shim would have traded a build error for an `audit-duplicate-helpers`
 * failure, which fires at THREE byte-identical top-level bodies. One definition
 * is the only answer that satisfies both.
 *
 * 🛑 The build error was INVISIBLE on the registry pin, because a package in
 * `node_modules` is not traversed as first-party source. It surfaced only when
 * the consumer was switched to `file:./appkit`. So "it builds" was a property
 * of where appkit was installed, not of appkit being correct — which matters
 * for Tier AK, where the whole point is that appkit must stand on its own.
 */
import type { ReactElement } from "react";

export function renderStaticMarkup(el: ReactElement): string {
  const m = require("react-dom/server") as typeof import("react-dom/server");
  return m.renderToStaticMarkup(el);
}
