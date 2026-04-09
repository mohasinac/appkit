# Changelog — @mohasinac/appkit

All notable changes to this package will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/).

---

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
