# Changelog — @mohasinac/appkit

All notable changes to this package will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.3] — 2026-04-11

### Added

- New feature modules: `about`, `contact`, `copilot` — source, barrel exports, and build entries.
- New build batch 9 for `about`, `contact`, `copilot` client features.
- Expanded barrel exports across all existing client-facing features: `admin`, `auth`, `blog`, `cart`, `categories`, `faq`, `homepage`, `products`, `promotions`, `reviews`, `search`, `seller`, `stores`, `wishlist`.
- Full view-component suite added to each feature barrel (e.g. `AdminDashboardView`, `LoginForm`, `ProductDetailView`, `CartView`, `SellerDashboardView`, …).
- `FAQAccordion` component enhanced with additional props and behaviour.
- Alias map extended with `@mohasinac/feat-about`, `@mohasinac/feat-contact`, `@mohasinac/feat-copilot`.

### Fixed

- Build batch 8 (`clientPrimitiveEntries`) now injects `"use client"` banner for `react/index` and `ui/index`, ensuring those entries remain isolated from the server primitive batch.
- `createRouteHandler` response type widened in `routeHandler.ts` to prevent DTS edge-cases.

---

## [2.0.2] — 2026-04-10

### Fixed

- Preserved the `"use client"` directive in built client primitive entries (`react` and `ui`) by moving them to a dedicated build batch with an explicit client banner.
- Prevented server-side runtime crashes like `createContext is not a function` during Next.js page-data collection when consuming `@mohasinac/appkit/ui` in client boundaries.

## [2.0.1] — 2026-04-10

### Fixed

- `createRouteHandler` return typing in `next/api/routeHandler` now resolves to `Promise<Response>`, fixing DTS generation failures during package builds.
- Published package now includes server-safe feature entry points (for Next.js API stubs) under:
  - `@mohasinac/appkit/features/auth/server`
  - `@mohasinac/appkit/features/blog/server`
  - `@mohasinac/appkit/features/categories/server`
  - `@mohasinac/appkit/features/events/server`
  - `@mohasinac/appkit/features/homepage/server`
  - `@mohasinac/appkit/features/pre-orders/server`
  - `@mohasinac/appkit/features/products/server`
  - `@mohasinac/appkit/features/reviews/server`
  - `@mohasinac/appkit/features/search/server`
  - `@mohasinac/appkit/features/stores/server`

### Notes

- These server entry points allow consumer API routes to avoid importing mixed client/server feature roots.

## [2.0.0] — 2026-04-09

### Added

- Initial release consolidating all 58 `@mohasinac/*` packages
- Sub-path exports for all layers: contracts, core, http, errors, utils, validation, tokens, next, react, ui, security, seo, monitoring, instrumentation, style/tailwind, style/vanilla
- Provider sub-paths: db-firebase, auth-firebase, email-resend, storage-firebase, payment-razorpay, search-algolia, shipping-shiprocket
- Feature sub-paths: layout, forms, filters, media, auth, account, admin, cms, blog, cart, categories, checkout, collections, consultation, corporate, events, faq, homepage, loyalty, orders, payments, products, promotions, reviews, search, seller, stores, wishlist, auctions, pre-orders, before-after, whatsapp-bot
- CLI sub-path: withFeatures(), mergeFeatureMessages()
- Full TypeScript declarations (`.d.ts`) for all entry points
- Tree-shakeable ESM + CJS dual output via `tsup` with code splitting

### Migration

- Replace `@mohasinac/contracts` → `@mohasinac/appkit/contracts`
- Replace `@mohasinac/http` → `@mohasinac/appkit/http`
- Replace all other `@mohasinac/*` → `@mohasinac/appkit/<path>`
- See [README migration guide](./README.md#migrating-from-separate-packages)
