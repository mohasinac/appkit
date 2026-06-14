// W3 — `isAuthError` was folded into the central catch-clause normalizer at
// `../errors/normalize.ts`. This file is a thin re-export shim so existing
// consumers (17 imports across the monorepo) continue to compile while
// migrating to `import { isAuthError } from "@mohasinac/appkit"`.

export { isAuthError } from "../errors/normalize";
