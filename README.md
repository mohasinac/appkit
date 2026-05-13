# @mohasinac/appkit

Internal component library and server toolkit for the LetItRip collectibles marketplace.

## Architecture

```
appkit/src/
├── _internal/
│   ├── client/features/   # Client-side feature views (RSC-compatible islands)
│   ├── server/features/   # Server data-fetchers, adapters, server actions
│   └── shared/            # Types, config, constants shared across both
├── features/              # Domain feature modules (auth, products, scams, support …)
├── repositories/          # Firestore Admin SDK repository layer (one per collection)
├── seed/                  # Seed data + manifest for SeedPanel
├── ui/                    # Primitive UI components (Button, Input, Modal, Stack …)
├── next/                  # Next.js helpers (ROUTES, route-map, hooks, SSR utilities)
├── seo/                   # JSON-LD builders, metadata helpers
└── configs/               # Next.js + Tailwind shared config
```

## Entry Points

| Entry | Purpose |
|-------|---------|
| `@mohasinac/appkit` | Main barrel — UI, repositories, constants, seed data |
| `@mohasinac/appkit/client` | Client bundle — UI components, client hooks (firebase-admin free) |
| `@mohasinac/appkit/server` | Server bundle — Admin SDK providers, server actions |
| `@mohasinac/appkit/jobs` | Firebase Functions binders + pure job handlers |
| `@mohasinac/appkit/styles` | Pre-compiled Tailwind utilities CSS |

## Development

```bash
# From the letitrip.in root — watches src/ and recompiles on change
npm run watch:appkit

# Full build + CSS + asset copy
npm run build          # inside appkit/
```

The consumer app links via `"file:./appkit"` — no npm publish required during local dev.

## Publishing

Only publish when explicitly requested. See `CLAUDE.md § Appkit Publish & Deploy Rules`.

```bash
# 1. Commit all source changes
# 2. npm run build  (inside appkit/)
# 3. npm publish   (inside appkit/)
# 4. Update letitrip package.json + lockfile
```

---

## Version History

### v2.7.3 — 2026-05-14

**Barrel cleanup — RSC views moved to server-entry; routeHandler readonly roles fix**

- `server-entry.ts`: RSC page views (bundles, categories, events, stores, products, etc.) moved here from main index to prevent firebase-admin leaking into client bundles
- `src/features/categories/components/index.ts`: `BundlesListView` + `BundleDetailView` removed from client barrel (now server-only)
- `src/next/api/routeHandler.ts`: `roles` option widened to `readonly string[]` — fixes TS error when passing `ROLES_TRUST_SAFETY` (readonly tuple) to `createRouteHandler`

### v2.7.2 — 2026-05-14

**routeHandler readonly roles type fix**

- `src/next/api/routeHandler.ts`: `roles?: string[]` → `roles?: readonly string[]`

### v2.7.1 — 2026-05-14

**Patch publish to clear npm "already published" state**

### v2.7.0 — 2026-05-14

**Support Tickets seed data + Firestore indices + seed pipeline wiring (BAN9/SCAM9 followup)**

- `appkit/src/seed/support-tickets-seed-data.ts` — 6 sample tickets covering all 5 statuses (open, in_progress, waiting_on_user, resolved, closed) and 5 categories
- `SeedCollectionName` extended with `"supportTickets"`; wired into seed manifest + barrel + consumer seed route
- `SUPPORT_TICKET_COLLECTION`, `ACTIVE_TICKET_STATUSES`, `TicketCategoryValues`, `TicketStatusValues`, `TicketPriorityValues` exported from main barrel
- 6 new Firestore composite indices for `supportTickets` (userId+status+createdAt, assignedTo+status, status+priority, category+status, etc.)
- `firestore.indexes.json` regenerated via `firebase-merge.mjs`
- SeedPanel: `supportTickets` entry added to Trust & Safety group with full field schema + seededItems + uiPath
- CSS build fix: stale `tailwind-utilities.css` rebuilt; `verify-css-build.mjs` passes all 8 required breakpoints/classes

### v2.6.9 — 2026-05-14

**Vercel Lambda transitive dependency tracing fix**

- `appkit/src/configs/next.ts`: added `@grpc/**`, `protobufjs/**`, `@protobufjs/**`, `object-hash/**`, `proto3-json-serializer/**`, `long/**`, `node-fetch/**`, `abort-controller/**`, `retry-request/**`, `duplexify/**`, `uuid/**`, `lodash.camelcase/**` to `defaultOutputFileTracingIncludes["/api/**"]`
- Fixes `MODULE_NOT_FOUND: object-hash` and `@protobufjs/*` sub-package `Cannot find module` errors in Vercel Lambdas (google-gax transitive deps)

### v2.6.8 — 2026-05-14

**gRPC/protobuf transitive dep tracing**

- Added `grpc_node.node` native binding and `@grpc/grpc-js/**` to `defaultOutputFileTracingIncludes`

### v2.6.7 — 2026-05-14

**TitleBar auth buttons + role badge + employee role + avatar fix**

- `TitleBarLayout`: `loginHref`/`registerHref` props; guest "Sign in"/"Register" buttons on desktop (lg+); replaced `next/image` with `<img>` for any-domain avatar support
- `AppLayoutShell`: `registerHref` prop forwarded to `TitleBar`; `RoleBadge` overlay replaced with 16px colored dot (role initial, no text overflow)
- `RoleBadge + Badge`: `employee` label/color/variant; `appkit-badge--employee` amber CSS (light + dark)
- Scam awareness: `ScamAwarenessModal` client component (non-dismissible, 7 category cards, checkbox ack); `scamAwarenessAcknowledgedAt` added to `SessionUser`; `LayoutShellClient` 30-day gate
- `LoginForm`/`RegisterForm`: `renderCreateAccountLink`, `renderForgotPasswordLink`, `renderLoginLink`, `renderTermsLink` slot props
- Seed users: `avatarMetadata` on 3 existing users; `user-deepak-verma` (moderator) + `user-simran-kaur` (employee) with avatarMetadata

### v2.6.5 — 2026-05-13

**Dashboard listing quality pass + CSS var tokens**

- `AdminPrizeDrawsView`: CSS var token pass replacing hardcoded zinc/red dark pairs
- `SellerPreOrdersView`, `SellerPrizeDrawsView`: new seller listing views with URL state
- `SELLER_PRE_ORDER_STATUS_TABS`, `SELLER_PRIZE_DRAW_STATUS_TABS` added to `filter-tabs.ts`
- Client barrel exports for 3 new views

### v2.6.4 — 2026-05-13

**S-SBUNI-RULES refund/payout/shipping constants quality pass**

- `REFUND_COPY` constants module — single source for all refund/shipping/sibling-payment strings
- `PayoutRefundDeduction` interface + `applyRefundDeductionAction`
- `buildShiprocketTrackingUrl()` + `SHIPROCKET_STATUS_PICKUP_SCHEDULED` constants
- `TB1/TB2/MNB-1/BN-1` layout system: breakpoint `lg` governs all four; no duplicate wishlist/notificationSlot

### v2.6.3 — 2026-05-13

**Firebase Functions ADC cold-start fix**

- `admin.ts` + `admin-app-lite.ts`: detect `FUNCTION_TARGET || K_SERVICE || FIREBASE_CONFIG || GOOGLE_APPLICATION_CREDENTIALS` → `initializeApp()` with no credential
- Closes cold-start 500 on every HTTPS Cloud Function

### v2.6.2 — 2026-05-13

**S9 RBAC complete — employee permission system + team management + store capabilities**

- `Permission` union (85+ strings) + `EmployeeGroup` union (18 presets) + `PERMISSION_GROUPS` bundles + `StoreCapability` flags
- `getServerPermissions()` resolver — admin bypasses, employee gated by `permissions[]`
- `makeAdminSectionLayout()` factory — generates per-section RSC layout with `admin:X:read` gate
- `AdminTeamView` + `AdminEmployeeEditorView` — invite/edit/revoke employee accounts with permission group picker
- `getStoreCapabilities()` + `storeHasCapability()` — `capabilities[]` array enforcement on auction/preorder creation
- `AdminStoreEditorView` Capabilities section — 3 collapsible tiers with per-capability checkboxes
- `ADMIN_NAV_GROUPS`: `requiredPermission` annotation on every item; `DashboardLayoutClient.filterAdminGroups` hides items by permissions
- `ROUTE_PERMISSION_MAP` — maps every `/admin/[section]` path to its required read permission

### v2.6.1 — 2026-05-13

**S-SBUNI Phase 1 fully closed + SB-UNI-Z1/Z2/Z3 media upload reliability**

- Signed-URL upload flow replacing `/api/media/upload` (SB-UNI-Z1)
- MIME widening: `3gpp`, `3gpp2`, `x-matroska` (SB-UNI-Z2)
- Media limits centralized in `_internal/shared/media/limits.ts` (SB-UNI-Z3)
- `bundleStockStatus` propagation via `onProductStockChangeHandler` (SB-UNI-V)
- Bundle → `categoryType:"bundle"` migration complete; `BUNDLES_COLLECTION` dropped

### v2.6.0 — 2026-05-13

**S8 Event Raffles + Spin Wheel + SB10 tab constants**

- SB9 raffle/spin schema (14 raffle fields on Event, 5 on EventEntry)
- `triggerEventRaffleAction` + `assignSpinPrizeAction` server actions (`crypto.randomInt`)
- `SpinWheelView` + public winner page
- Admin raffle section with manual trigger in event editor
- `SB10` filter-tab constants: `SELLER_LISTING_TABS`, `STORE_LISTINGS_TABS`, `filter-tabs.ts` with 6 view migrations
- SB11 homepage section builder types for `FeaturedBundles`, `PrizeDraws`, `EventRaffles`

### v2.5.x — 2026-05-11 to 2026-05-13

**S7 Prize Draws cohort + SB-UNI Phases 1–5**

- SB4 reveal API (crypto.randomInt pool-exhaust auto-refund) + lock-on-reveal + theatrical 3.2s modal
- 7 Firebase Functions: prizeRevealOpen/Close/Expiry/Reminder, bundleStockSync, triggerEventRaffle, assignSpinPrize
- SB-UNI address top-level collection (`ownerType` discriminator), categories unification (sublisting/brand/bundle)
- `listingType` migration complete: `isAuction`/`isPreOrder` booleans removed; all queries via `where("listingType","==",X)`
- `isAuctionListing()`, `isPreOrderListing()`, `normalizeListingType()` canonical accessors

### v2.4.x — 2026-05-10 to 2026-05-11

**S5/S6 seed scale + S4 bundle/pre-order foundation**

- Auction expansion (11→20) + bid ladder helper `buildBidLadder()`
- Bundle schema: `SB3` stock-sync hook, admin list/edit pages, Zod hardening
- OG edge-runtime fix: all 9 OG routes switched from `runtime="edge"` to Node runtime
- Wishlist (20-cap), History (50-cap FIFO), Cart (50-cap) per-user one-doc pattern

### v2.3.x — 2026-05-08 to 2026-05-09

**S2/S3 cart, checkout, orders, SSR architecture**

- `_internal/server/features/` layers: cart, orders, promotions, reviews, wishlist, history, homepage
- `listingType` field introduced; `isAuction`/`isPreOrder` deprecated (fully removed in v2.5)
- Support ticket schema + `SupportRepository` (BAN1)
- Ban schema: `softBans[]`, `hardBanReason`, `hardBannedAt`; `isSoftBanned()` helper

### v2.2.x — 2026-05-06 to 2026-05-07

**Scam registry foundation + homepage sections + prize draws schema**

- `ScammerDocument` + `scammerRepository` + 27 scam types + SCAM_CATEGORIES
- Public scam pages: `/scams`, `/scams/[slug]`, `/scams/types`
- Homepage sections (19 types): `SB11` full section-builder admin UI
- `DashboardLayoutClient` + `RoleGuard` — collapsed 3 separate layout shells

### v2.1.x — 2026-05-04 to 2026-05-05

**Auth, addresses, messages foundation**

- RTDB signal channel for Google OAuth
- Addresses top-level collection (`SB-UNI-A`)
- `conversationsRepository` + RTDB ping-channel for messages (D5+VC7)
- `ScrollToTop` component; `BaseListingCard.Checkbox` + `useLongPress` card-selection pattern

### v2.0.0 — 2026-05-03

**Initial appkit extraction from letitrip monorepo**

- Extracted from inline letitrip.in code into standalone `@mohasinac/appkit` package
- Firebase Admin SDK entry point separation (`server.ts` vs `client.ts`)
- `sideEffects: false` for Turbopack client-bundle safety
- Repository pattern: `BaseRepository` with PII encryption hooks
