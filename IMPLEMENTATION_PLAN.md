# @mohasinac/appkit — Consolidation Implementation Plan

**Prepared**: April 9, 2026
**Goal**: Collapse all 58 `@mohasinac/*` packages into a single, well-structured package called **`@mohasinac/appkit`** with sub-path exports, deprecate old packages, audit every file in `letitrip.in` for reusability, and produce a setup pattern that lets any new Next.js e-commerce (or other) app start from `appkit`.

---

## Phase Tracker

| Phase | Name                                    | Status        | Key Deliverables                                                                                                                                                                                         |
| ----- | --------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Foundation                              | ✅ 2026-04-09 | Created standalone `d:\proj\appkit` repo; `package.json` full export map; `tsup.config.ts` with esbuild alias map; `tsconfig.json` with paths; README + CHANGELOG                                        |
| 1     | Primitive Layer                         | ✅ 2026-04-09 | All 16 primitive packages copied to `src/`; tsc passes                                                                                                                                                   |
| 2     | Provider Layer                          | ✅ 2026-04-09 | All 7 provider packages copied to `src/providers/`; tsc passes                                                                                                                                           |
| 3     | Feature Layer                           | ✅ 2026-04-09 | All 31 feat-\* packages copied to `src/features/`; pre-orders consolidated; manifest fixes; 0 tsc errors; pushed to `mohasinac/appkit` branch `feat/appkit-phase-0` (e19f5fb)                            |
| 4     | Tooling                                 | ✅ 2026-04-09 | `src/cli/index.ts` — `withFeatures()` + `mergeFeatureMessages()` + `FEATURE_SUBPATH_MAP` implemented; commit 0d6bf4c                                                                                     |
| 5     | Deprecation Notices                     | ⏸ Deferred    | Old packages kept as-is per user instruction; will be deprecated after appkit is published                                                                                                               |
| 6     | letitrip.in Migration                   | ✅ 2026-04-10 | Source migration across phases 40-48 is complete. Final production verification remains blocked by published appkit feature-root bundles mixing client and server exports in API route usage.            |
| 18    | RBAC System                             | ✅ 2026-04-09 | `createRbacHook`, `createRequirePermission`, `createRbacMiddleware`, `<Can>`, `DEFAULT_ROLES`; admin + seller permission maps; commit 0d6bf4c                                                            |
| 19    | Seed Data in appkit                     | ✅ 2026-04-09 | Generic seed runner + 10 factories + 3 defaults + barrel; `./seed` export sub-path; commit 0d6bf4c                                                                                                       |
| 20    | Mobile-First UX System                  | ✅ 2026-04-09 | THEME_CONSTANTS extended (LAYOUT+TOUCH+CARD+GRID+MOTION+TEXT); BottomNavItem, BottomSheet, BuyBar; commit 0d6bf4c                                                                                        |
| 21    | PII Middleware + Request/Response Chain | ✅ 2026-04-09 | `piiScrubberMiddleware`, `createPiiRedactorMiddleware`, `createApiMiddleware` chain, `runChain`, `buildBaseContext`; commit 0d6bf4c                                                                      |
| 22    | Comprehensive Seed Data                 | ✅ 2026-04-09 | 8 new factories (address/cart/bid/notification/session/coupon/payout), full variants + fixtures, `pii-encrypt.ts`, runner PII encryption, `test-utils.ts`; commit 262e3c9                                |
| 23    | Dynamic Fluid Grid                      | ✅ 2026-04-09 | `FLUID_GRID_MIN_WIDTHS` + `FLUID_GRID` tokens, `useContainerGrid` hook, `fluidGrid` in THEME_CONSTANTS; commit 262e3c9                                                                                   |
| 24    | Horizontal Scroller + Tab Strip         | ✅ 2026-04-09 | `useVisibleItems` hook, `TabStrip` component; commit 262e3c9                                                                                                                                             |
| 25    | Dynamic Form Layouts                    | ✅ 2026-04-09 | `FormGrid`, `FormField`, `DescriptionField`, `form` tokens in `THEME_CONSTANTS`; commit 262e3c9                                                                                                          |
| 26    | Wrapper and Utils Audit                 | ✅ 2026-04-09 | `IconButton`, `TextLink`, `Tooltip`, `Accordion`, `Form`; `Header`/`Footer` aliases; `Div` wrapper; `tooltip` THEME_CONSTANTS tokens; ESLint rules A11Y-001/002, STYL-003; `scripts/audit-violations.ts` |

## -\*/

### ⬜ Pending — appkit Completion

| Phase | Name                                      | Status        | Key Deliverables                                                                                                                                                                                                                    |
| ----- | ----------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27    | Cron Jobs via Firebase Functions          | ✅ 2026-04-10 | `src/features/cron/` — typed cron job registry, `createCronJob()` factory, `onSchedule` wrappers, pub/sub trigger helpers                                                                                                           |
| 28    | README + Index File Systematic Update     | ✅ 2026-04-10 | README.md created for: contracts/, ui/, tokens/, seed/, features/categories/, features/cron/                                                                                                                                        |
| 29    | Rich Text: Events and Blog Extraction     | ✅ 2026-04-10 | `src/ui/rich-text/RichText.tsx` — `highlightCode?: (code, lang) => string` prop added; safe HTML renderer with optional syntax highlighting injection                                                                               |
| 30    | Review System — Modals, Public Profiles   | ✅ 2026-04-10 | `ReviewCard` + `ReviewsList` (co-located), `ViewReviewModal`, `ReviewSummary` with breakdown bar; `useReviews` hook; `StarRating` from `@mohasinac/ui`                                                                              |
| 31    | Category Cards — Enhanced IA              | ✅ 2026-04-10 | `BreadcrumbTrail` created in `src/features/categories/components/`; uses `CategoryItem.ancestors[]` sorted by tier; exported from components barrel                                                                                 |
| 32    | Theme and Card Visual Bug Fixes           | ✅ 2026-04-10 | SKELETON shimmer variants added: `shimmer`, `shimmerText`, `shimmerCard` — left-to-right gradient sweep with `animate-shimmer`; JSDoc documents required tailwind keyframe                                                          |
| 33    | Realistic Seed Data Metrics               | ✅ 2026-04-10 | All 4 factories updated: products (20 Indian product names, INR 99–9999, stock 5–200), users (Indian names), addresses (15 Indian city/state/postal), reviews (weighted 4-5★ 80%); deterministic `irand()`                          |
| 34    | Component Diagrams Reference (Section 34) | ✅ 2026-04-10 | `ProductGrid` `view` prop: "card" (fixed 2→3→4→5 cols) / "fluid" (auto-fill 220px) / "list" (compact rows with `ProductListRow`); `ViewToggle` extended to 3 modes; `ItemRow` raw HTML fixed; `categoryName` added to `ProductItem` |
| 35    | Tooltip + SideModal Responsiveness        | ✅ 2026-04-10 | `Tooltip` — `mobileSheet` + `longPressDelay` props; self-contained bottom sheet `<span>` overlay on long-press (no features/ import); `SideModal` full-screen on mobile already complete; `useModalStack` hook pre-existing         |
| 36    | Locale, Currency & Regional Defaults      | ✅ 2026-04-10 | `LOCALE_CONFIG` added to `src/tokens/index.ts`: defaultLocale en-IN, defaultCurrency INR, defaultTimezone Asia/Kolkata, 6 supported currencies with symbols                                                                         |
| 37    | Architecture Rules Reference (Section 37) | ✅ 2026-04-10 | Section 37 exists in plan (line 7719); ESLint rules, manual rules, wrapper contract, data-layer rules, i18n rules, encoding rules all documented                                                                                    |
| 38    | appkit Self-Audit (Rules Compliance)      | ✅ 2026-04-09 | `scripts/audit-violations.ts` run; all raw HTML violations in `src/features/**/*.tsx` fixed; commit 8f315b9                                                                                                                         |

---

### ⬜ Pending — letitrip.in Migration

| Phase | Name                                       | Status         | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 39    | Publish appkit to npm                      | ✅ 2026-04-10  | `@mohasinac/appkit@2.0.0` published (417 files, 8.9 MB); tsup split into 3 batches (primitives/providers/features) to fix DTS OOM; `dts: { resolve: false }`                                                                                                                                                                                                                                |
| 40    | letitrip — Import Codemod (Phase 6)        | ✅ 2026-04-10  | Migration complete in source/root imports to `@mohasinac/appkit/*` (kept local `file:../appkit` dependency); verified with `npx tsc --noEmit` and `npm run build`                                                                                                                                                                                                                           |
| 41    | letitrip — DUPLICATE File Cleanup          | ✅ 2026-04-10  | Duplicate wrapper/shim cleanup completed: removed pass-through barrels and duplicated wrappers, rewired consumers to appkit sub-paths, and validated with clean typecheck + build                                                                                                                                                                                                           |
| 42    | letitrip — Products Feature Migration      | ✅ 2026-04-10  | Products feature imports migrated to appkit primitives/sub-paths; wrappers retained only for marketplace-specific behavior                                                                                                                                                                                                                                                                  |
| 43    | letitrip — Categories & Stores Migration   | ✅ 2026-04-10  | Categories and stores feature imports migrated to appkit primitives/sub-paths; thin-wrapper pattern preserved                                                                                                                                                                                                                                                                               |
| 44    | letitrip — Orders & Checkout Migration     | ✅ 2026-04-10  | Orders and checkout feature imports migrated to appkit sub-paths; local business-rule logic retained where domain-specific                                                                                                                                                                                                                                                                  |
| 45    | letitrip — Auctions & Pre-Orders Migration | ✅ 2026-04-10  | Auctions and pre-orders feature imports migrated to appkit sub-paths; feature-specific workflows retained locally                                                                                                                                                                                                                                                                           |
| 46    | letitrip — Users, Account & Auth Migration | ✅ 2026-04-10  | User/account/auth surfaces migrated to appkit primitives/sub-paths with local auth/session behavior preserved                                                                                                                                                                                                                                                                               |
| 47    | letitrip — Events & Blog Migration         | ✅ 2026-04-10  | Events/blog imports migrated to appkit sub-paths and shared rich-text paths aligned                                                                                                                                                                                                                                                                                                         |
| 48    | letitrip — Admin & CMS Migration           | ✅ 2026-04-10  | Admin/CMS screens migrated to appkit primitives/sub-paths and duplicate local shims removed                                                                                                                                                                                                                                                                                                 |
| 49    | letitrip — Build Verification & Launch     | 🔄 In progress | Verified today: `npx tsc --noEmit` clean against published `@mohasinac/appkit@^2.0.0`. Blocked: `npm run build --webpack` fails during route evaluation because published feature roots are mixed client/server bundles (`/api/auth/me` first failure: `createContext is not a function`). Also pending: Vercel redeploy after appkit publish fix and cleanup of remaining rule violations. |

---

### ✅ Completed pre-appkit cleanup stages

| Stage     | Description                                                                                                                                                                                                                                                              | Status        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| H2        | **Helper shim directories deleted** — `src/helpers/data/` (7 files) and `src/helpers/ui/` (3 files) removed; `buildSieveFilters` imported from `@mohasinac/utils`; `classNames` from `@mohasinac/ui`; `applySieveToArray` in-memory adapter removed (Firestore only now) | ✅ 2026-04-09 |
| H2-utils  | **`@/utils` barrel slim-down** — `src/utils/index.ts` no longer re-exports `@mohasinac/utils` symbols; callers import directly from the package                                                                                                                          | ✅ 2026-04-09 |
| H2-locale | **`@mohasinac/utils` defaults updated** — `formatCurrency`/`formatNumber`/`formatDate` etc. default to `INR`/`en-IN`; `LOCALE_CONFIG` constant added to `src/constants/config.ts` as single source of regional truth                                                     | ✅ 2026-04-09 |
| H2-auth   | **Firebase auth null guard** — `getCurrentUser()` and `onAuthStateChanged()` in `auth-helpers.ts` now return gracefully when Firebase client SDK is not initialized (SSR / missing env vars)                                                                             | ✅ 2026-04-09 |

> **Tag legend for file audit below**: `EXTRACT` — move as-is · `EXTRACT-SHELL` — VIEW layer to appkit · `EXTRACT-DATA` — DATA layer: base hooks/actions/schemas + letitrip config override · `EXTRACT-RULE` — MARKETPLACE RULES: extract strategy factory + letitrip injects config · `DUPLICATE` — already in appkit; delete local copy · `CMS_CONTENT` — shell to appkit; content to Firestore · `STAY` — 100% letitrip-specific (credentials, seed data, letitrip discriminated unions; no generic equivalent possible)

---

## 1. Why Consolidate?

### Current Pain Points

- **58 separate packages** — every `npm install`, `npm publish`, and `package.json` bump touches all of them
- **Cross-package dependency hell** — `workspace:*` versions during dev, `^1.4.x` in prod; a one-line fix in `core` requires bumping `core`, rebuilding, publishing, then updating every consumer
- **Cognitive overhead** — developers must remember which of the 58 packages holds what; new contributors take hours to orient
- **Publish ceremony** — every feature addition triggers a multi-package publish chain
- **Import verbosity** — `import { X } from "@mohasinac/contracts"; import { Y } from "@mohasinac/http"; import { Z } from "@mohasinac/ui"` across every file

### What We Gain from `appkit`

- **One install**: `npm install @mohasinac/appkit`
- **One version to track**: `appkit@2.0.0` covers everything
- **Sub-path exports** preserve tree-shaking and keep bundle sizes identical
- **Faster local dev**: single package build instead of 58, single `tsup` invocation
- **Simpler new-project setup**: scaffold → install appkit → call `registerProviders()` → done

---

## 2. New Package Name: `@mohasinac/appkit`

| Candidate              | Verdict | Reason                                                    |
| ---------------------- | ------- | --------------------------------------------------------- |
| `@mohasinac/next-core` | No      | "next-core" implies Next.js only; "core" is already taken |
| `@mohasinac/kit`       | Maybe   | Too generic, risks npm naming conflict                    |
| `@mohasinac/appkit`    | YES     | Professional, framework-agnostic, short, memorable        |
| `@mohasinac/platform`  | No      | Sounds infrastructure-heavy; does not convey UI/features  |
| `@mohasinac/studio`    | No      | Creative, but misleading — this is a production framework |

**`@mohasinac/appkit`** — one package, multiple entry points, zero magic.

---

## 3. Sub-Path Export Architecture

The package exposes granular sub-paths. App code can import from the root or from a specific layer.
All paths are tree-shakeable via `tsup` `splitting: true`.

```
@mohasinac/appkit                             full barrel (use sparingly)
@mohasinac/appkit/contracts                   interfaces, registry, SieveQuery
@mohasinac/appkit/core                        Logger, Queue, CacheManager, EventBus, StorageManager
@mohasinac/appkit/http                        ApiClient, apiClient singleton
@mohasinac/appkit/errors                      AppError, ApiError, NotFoundError, handleApiError
@mohasinac/appkit/utils                       formatters, converters, date helpers
@mohasinac/appkit/validation                  Zod schemas, paginationQuerySchema, emailSchema
@mohasinac/appkit/tokens                      COLORS, SPACING, BREAKPOINTS design tokens
@mohasinac/appkit/next                        createApiErrorHandler, IAuthVerifier, createApiHandler
@mohasinac/appkit/react                       useMediaQuery, useBreakpoint, useClickOutside
@mohasinac/appkit/ui                          Section, Heading, Text, Button, Badge, Spinner
@mohasinac/appkit/security                    requireAuth, requireRole, rateLimit, buildCSP, createRbacHook, createRequirePermission, createRbacMiddleware, Can, RbacProvider, DEFAULT_ROLES, resolvePermissions
@mohasinac/appkit/seo                         generateMetadata helpers, JSON-LD schemas
@mohasinac/appkit/monitoring                  trackError, getCacheMetrics, setErrorTracker
@mohasinac/appkit/instrumentation             OpenTelemetry bootstrap
@mohasinac/appkit/style/tailwind              tailwindStyleAdapter (cn, token)
@mohasinac/appkit/style/vanilla               vanillaStyleAdapter
@mohasinac/appkit/providers/db-firebase       FirebaseRepository, firebaseDbProvider
@mohasinac/appkit/providers/auth-firebase     FirebaseAuthProvider
@mohasinac/appkit/providers/email-resend      ResendEmailProvider
@mohasinac/appkit/providers/storage-firebase  FirebaseStorageProvider
@mohasinac/appkit/providers/payment-razorpay  RazorpayProvider
@mohasinac/appkit/providers/search-algolia    algoliaSearch, indexHelpers
@mohasinac/appkit/providers/shipping-shiprocket ShiprocketProvider
@mohasinac/appkit/features/layout             NavbarLayout, FooterLayout, SidebarLayout
@mohasinac/appkit/features/forms              FormInput, FormTextarea, FormSelect
@mohasinac/appkit/features/filters            FilterPanel, RangeSlider, MultiSelect
@mohasinac/appkit/features/media              MediaImage, MediaVideo, MediaAvatar, MediaGallery
@mohasinac/appkit/features/auth               LoginView, SignupView, SessionsView, useAuthSession
@mohasinac/appkit/features/account           ProfileView, AddressBook, OrdersView, useProfile
@mohasinac/appkit/features/admin              AdminLayout, createAdminListQuery, DataTable, FeatureFlagsView, ActivityLogView, AnalyticsDashboardView, NewsletterSubscriberView, ADMIN_PAGE_PERMISSIONS
@mohasinac/appkit/features/cms               AboutPageView, HowItWorksView, PolicyPageView, FeesTableView, TrackOrderView, SiteSettingsFormView, NavigationEditorView, useCmsPage
@mohasinac/appkit/features/copilot           AdminCopilotView, useCopilotChat
@mohasinac/appkit/features/blog               BlogListView, BlogPostView, feat-blog hooks
@mohasinac/appkit/features/cart               CartView, CartItemRow, CartSummary, useCart, CartDrawer
@mohasinac/appkit/features/categories         CategoriesView, useCategoryTree
@mohasinac/appkit/features/checkout          CheckoutView, CheckoutSuccessView, useCheckout
@mohasinac/appkit/features/collections        CollectionsView
@mohasinac/appkit/features/consultation       ConsultationView
@mohasinac/appkit/features/corporate          CorporateView
@mohasinac/appkit/features/events             EventsListView, EventDetailView, AuctionsView
@mohasinac/appkit/features/faq                FaqView, useFaqVote
@mohasinac/appkit/features/homepage           HomepageView, section shells (Hero, Blog, FAQ, Stats…)
@mohasinac/appkit/features/loyalty            LoyaltyView
@mohasinac/appkit/features/orders             OrdersListView, OrderDetailView, useOrders
@mohasinac/appkit/features/payments           PaymentsView, usePaymentEvent
@mohasinac/appkit/features/pre-orders         PreOrderListView, PreOrderDetailView, PreOrderCard
@mohasinac/appkit/features/products           ProductsListView, ProductDetailView, ProductCard
@mohasinac/appkit/features/promotions         PromotionsView
@mohasinac/appkit/features/reviews            ReviewsView, useProductReviews
@mohasinac/appkit/features/search             SearchView, AlgoliaSyncView, useSearch
@mohasinac/appkit/features/seller             SellerDashboard, SellerAnalytics, SellerProducts, SellerOrders, SellerStoreView, StorefrontView, SELLER_PAGE_PERMISSIONS
@mohasinac/appkit/features/stores             StoresView, StoreDetailView
@mohasinac/appkit/features/wishlist           WishlistView, useWishlistToggle
@mohasinac/appkit/features/before-after       BeforeAfterGallery
@mohasinac/appkit/features/whatsapp-bot       WhatsAppBotView
@mohasinac/appkit/features/auctions           AuctionView, AuctionBidPanel
@mohasinac/appkit/cli                         withFeatures(), mergeFeatureMessages()
```

---

## 4. Migration Phases

### Phase 0 — Foundation (half day)

> **Repo change (2026-04-09)**: `appkit` is a **standalone git repo** at `d:\proj\appkit`
> (https://github.com/mohasinac/appkit), NOT a subdirectory of the packages monorepo.
> Steps 3-4 below are replaced by the standalone repo's own `tsconfig.json` + build setup.

Tasks:

1. Create `package.json`, `tsconfig.json`, `tsup.config.ts` in `d:\proj\appkit`
2. Define the complete `exports` map in `package.json` (all sub-paths above)
3. Create branch `feat/appkit-phase-0` and push initial scaffold
4. Add path alias `@mohasinac/appkit => ./src` to `tsconfig.json` (standalone repo)

`package.json` shape:

```json
{
  "name": "@mohasinac/appkit",
  "version": "2.0.0",
  "description": "All-in-one application toolkit — consolidates all @mohasinac/* packages",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./contracts": {
      "types": "./dist/contracts/index.d.ts",
      "import": "./dist/contracts/index.js",
      "require": "./dist/contracts/index.cjs"
    }
  },
  "peerDependencies": {
    "react": ">=18",
    "next": ">=14",
    "next-intl": ">=3"
  }
}
```

---

### Phase 1 — Primitive Layers (1 day)

Copy source from each primitive package into `appkit/src/`:

| Old Package                  | appkit path            | Action                   |
| ---------------------------- | ---------------------- | ------------------------ |
| `@mohasinac/contracts`       | `src/contracts/`       | Move all 15 source files |
| `@mohasinac/core`            | `src/core/`            | Move 6 source files      |
| `@mohasinac/http`            | `src/http/`            | Move 2 source files      |
| `@mohasinac/errors`          | `src/errors/`          | Move 10 source files     |
| `@mohasinac/utils`           | `src/utils/`           | Move 15 source files     |
| `@mohasinac/validation`      | `src/validation/`      | Move 8 source files      |
| `@mohasinac/tokens`          | `src/tokens/`          | Move 1 source file       |
| `@mohasinac/next`            | `src/next/`            | Move 7 source files      |
| `@mohasinac/react`           | `src/react/`           | Move 17 source files     |
| `@mohasinac/ui`              | `src/ui/`              | Move 39 source files     |
| `@mohasinac/security`        | `src/security/`        | Move 5 source files      |
| `@mohasinac/seo`             | `src/seo/`             | Move 2 source files      |
| `@mohasinac/monitoring`      | `src/monitoring/`      | Move 3 source files      |
| `@mohasinac/instrumentation` | `src/instrumentation/` | Move 1 source file       |
| `@mohasinac/css-tailwind`    | `src/style/tailwind/`  | Move 1 source file       |
| `@mohasinac/css-vanilla`     | `src/style/vanilla/`   | Move 1 source file       |

Update internal imports: all cross-package `import { X } from "@mohasinac/contracts"` become
relative imports `import { X } from "../contracts"` within appkit.

---

### Phase 2 — Provider Layer (half day)

| Old Package                      | appkit path                          | Action              |
| -------------------------------- | ------------------------------------ | ------------------- |
| `@mohasinac/db-firebase`         | `src/providers/db-firebase/`         | Move 6 source files |
| `@mohasinac/auth-firebase`       | `src/providers/auth-firebase/`       | Move 4 source files |
| `@mohasinac/email-resend`        | `src/providers/email-resend/`        | Move 2 source files |
| `@mohasinac/storage-firebase`    | `src/providers/storage-firebase/`    | Move 2 source files |
| `@mohasinac/payment-razorpay`    | `src/providers/payment-razorpay/`    | Move 1 source file  |
| `@mohasinac/search-algolia`      | `src/providers/search-algolia/`      | Move 3 source files |
| `@mohasinac/shipping-shiprocket` | `src/providers/shipping-shiprocket/` | Move 1 source file  |

---

### Phase 3 — Feature Layer (1 day)

| Old Package                                     | appkit path                  | Files                        |
| ----------------------------------------------- | ---------------------------- | ---------------------------- |
| `@mohasinac/feat-layout`                        | `src/features/layout/`       | 11                           |
| `@mohasinac/feat-forms`                         | `src/features/forms/`        | 10                           |
| `@mohasinac/feat-filters`                       | `src/features/filters/`      | 6                            |
| `@mohasinac/feat-media`                         | `src/features/media/`        | 13                           |
| `@mohasinac/feat-auth`                          | `src/features/auth/`         | 9                            |
| `@mohasinac/feat-account`                       | `src/features/account/`      | 10                           |
| `@mohasinac/feat-admin`                         | `src/features/admin/`        | 10                           |
| `@mohasinac/feat-blog`                          | `src/features/blog/`         | 10                           |
| `@mohasinac/feat-cart`                          | `src/features/cart/`         | 13                           |
| `@mohasinac/feat-categories`                    | `src/features/categories/`   | 12                           |
| `@mohasinac/feat-checkout`                      | `src/features/checkout/`     | 5                            |
| `@mohasinac/feat-collections`                   | `src/features/collections/`  | 10                           |
| `@mohasinac/feat-consultation`                  | `src/features/consultation/` | 10                           |
| `@mohasinac/feat-corporate`                     | `src/features/corporate/`    | 10                           |
| `@mohasinac/feat-events`                        | `src/features/events/`       | 13                           |
| `@mohasinac/feat-faq`                           | `src/features/faq/`          | 9                            |
| `@mohasinac/feat-homepage`                      | `src/features/homepage/`     | 23                           |
| `@mohasinac/feat-loyalty`                       | `src/features/loyalty/`      | 14                           |
| `@mohasinac/feat-orders`                        | `src/features/orders/`       | 8                            |
| `@mohasinac/feat-payments`                      | `src/features/payments/`     | 7                            |
| `@mohasinac/feat-products`                      | `src/features/products/`     | 12                           |
| `@mohasinac/feat-promotions`                    | `src/features/promotions/`   | 9                            |
| `@mohasinac/feat-reviews`                       | `src/features/reviews/`      | 10                           |
| `@mohasinac/feat-search`                        | `src/features/search/`       | 11                           |
| `@mohasinac/feat-seller`                        | `src/features/seller/`       | 14                           |
| `@mohasinac/feat-stores`                        | `src/features/stores/`       | 14                           |
| `@mohasinac/feat-wishlist`                      | `src/features/wishlist/`     | 10                           |
| `@mohasinac/feat-auctions`                      | `src/features/auctions/`     | 9                            |
| `@mohasinac/feat-pre-orders` + `feat-preorders` | `src/features/pre-orders/`   | 12+10 → consolidate into one |
| `@mohasinac/feat-before-after`                  | `src/features/before-after/` | 11                           |
| `@mohasinac/feat-whatsapp-bot`                  | `src/features/whatsapp-bot/` | 7                            |

NOTE: `feat-preorders` and `feat-pre-orders` appear to be duplicates. Consolidate into a single
`src/features/pre-orders/` during migration. This is also an opportunity to remove one of the
two packages entirely.

---

### Phase 4 — Tooling (half day)

| Old Package                         | Decision                                     | Reason                                              |
| ----------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `@mohasinac/cli`                    | STAYS SEPARATE + re-exports via `appkit/cli` | Binary CLI must be independently installable        |
| `@mohasinac/eslint-plugin-letitrip` | STAYS SEPARATE                               | ESLint plugins cannot live inside a library package |
| `@mohasinac/create-app`             | STAYS SEPARATE                               | Scaffold CLI must be `npx`-able on its own          |

Total remaining standalone packages after consolidation: 3 (cli, eslint-plugin, create-app).

---

### Phase 5 — Deprecation Notices (half day)

For every package folded into appkit, update its `src/index.ts` and `package.json`.

`src/index.ts` deprecation pattern:

```ts
/**
 * @deprecated This package has been merged into @mohasinac/appkit.
 * Replace:  import { X } from "@mohasinac/contracts"
 * With:     import { X } from "@mohasinac/appkit/contracts"
 * This package will receive no new features. It will be unpublished at v3.0.0.
 */
export * from "@mohasinac/appkit/contracts";
```

npm deprecation command for each old package:

```bash
npm deprecate "@mohasinac/contracts@<2.0.0" "Merged into @mohasinac/appkit. Use @mohasinac/appkit/contracts instead."
```

---

### Phase 6 — Update letitrip.in (1 day)

Run codemod script `scripts/migrate-to-appkit.mjs` to bulk-update all imports:

```ts
// Before
import { getProviders } from "@mohasinac/contracts";
import { apiClient } from "@mohasinac/http";
import { Button } from "@mohasinac/ui";
import { requireAuth } from "@mohasinac/security";

// After
import { getProviders } from "@mohasinac/appkit/contracts";
import { apiClient } from "@mohasinac/appkit/http";
import { Button } from "@mohasinac/appkit/ui";
import { requireAuth } from "@mohasinac/appkit/security";
```

Then update `package.json` to replace 58 individual `@mohasinac/*` deps with one line:

```json
"@mohasinac/appkit": "^2.0.0"
```

---

## 5. letitrip.in Full File Audit

Every directory and file is tagged:

- MOVE — Generic; should live in appkit; letitrip.in imports from appkit
- DUPLICATE — Logic already exists in a package; local copy should be deleted
- STAY — Truly letitrip-only with no generic equivalent possible (e.g. Firebase Admin bootstrap, providers.config.ts)
- EXTRACT — Not yet in packages; generic enough for appkit
- EXTRACT-SHELL — The VIEW layer is generic → extract to appkit. Data layer becomes EXTRACT-DATA (see below).
- EXTRACT-DATA — Hooks, Server Actions, Zod schemas are extracted as configurable base classes/factories.
  letitrip overrides/extends them with its specific collection names, field names, and business rules.
- EXTRACT-RULE — Business rules are extracted as configurable strategy implementations.
  appkit ships a default strategy; letitrip passes its own config or subclass.
- CMS_CONTENT — Renderer goes to `appkit/features/cms`; content lives in Firestore `site_settings/{pageId}`.

### Key Insight: Everything Has a Generic Base — Nothing is Forced STAY

The previous "STAY" classification was too aggressive. Every layer — views, data, and rules —
has a generic base that ships in appkit and a letitrip-specific override that stays local.
The pattern is always: **appkit exports a base → letitrip passes config or extends the class**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  VIEW SHELL  →  EXTRACT to appkit/features/<name>/components/                   │
│  • Components that render UI given typed props (CartItemRow, OrdersView,        │
│    ProfileView, SellerDashboard, ProductDetailView…)                            │
│  • Accept column defs, filter configs, status maps, callbacks as props          │
│  • Zero hardcoded collection names or business constants                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  DATA LAYER  →  EXTRACT-DATA to appkit/features/<name>/hooks/ + actions/        │
│                                                                                 │
│  Hooks: appkit ships useOrders(endpoint), useCheckout(config), etc.             │
│  letitrip overrides only the action import and collection name:                 │
│    export const useOrders = () => useOrdersBase("/api/orders");                 │
│                                                                                 │
│  Server Actions: appkit ships createOrderAction(repo, splitFn, config).         │
│  letitrip wires the collection and passes its fee config:                       │
│    export const createOrder = createOrderAction(orderRepo, splitOrders, {       │
│      platformFeePercent: 8, currency: "INR"                                     │
│    });                                                                          │
│                                                                                 │
│  Zod schemas: appkit ships BaseOrderSchema. letitrip extends it:                │
│    export const OrderSchema = BaseOrderSchema.extend({ codAllowed: z.boolean() })│
├─────────────────────────────────────────────────────────────────────────────────┤
│  MARKETPLACE RULES  →  EXTRACT-RULE to appkit/features/<name>/strategies/       │
│                                                                                 │
│  order-splitter: appkit ships splitOrdersBySeller(items, config).               │
│  letitrip passes { feePercent: 8, codFeeFixed: 29, splitOnSeller: true }.       │
│                                                                                 │
│  OTP modals: appkit ships <ConsentModal onConfirm/> + <OtpModal fields/>.       │
│  letitrip composes them with India-specific copy via i18n keys.                 │
│                                                                                 │
│  Payout settlement: appkit ships calculateSellerPayout(order, config).          │
│  letitrip passes { platformFee, shippingFee, taxRate, payoutBuffer }.           │
│                                                                                 │
│  WhatsApp section: appkit ships <CommunityBannerSection link="" />.             │
│  letitrip passes its WhatsApp group link via SiteConfig.whatsappCommunity.      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The Config/Strategy Override Pattern

appkit never hardcodes business rules. Every rule is either:

1. **Config-driven** — pass a plain object at callsite:

```ts
// appkit
export function splitOrdersBySeller(
  items: CartItem[],
  config: SplitConfig,
): OrderGroup[];

// letitrip — passes its marketplace config
import { splitOrdersBySeller } from "@mohasinac/appkit/features/orders";
export const splitOrders = (items: CartItem[]) =>
  splitOrdersBySeller(items, { platformFeePercent: 8, codFeeFixed: 29 });
```

2. **Strategy injection** — pass a function/class that replaces the default:

```ts
// appkit — ships a no-op default strategy
export function createCheckoutAction(
  repo,
  opts: { splitFn?: SplitFn; otpFn?: OtpFn },
);

// letitrip — injects its own split + OTP
export const checkout = createCheckoutAction(orderRepo, {
  splitFn: splitOrders, // local letitrip splitter
  otpFn: sendOtpViaTwilio, // letitrip OTP provider
});
```

3. **Schema extension** — extend the base Zod schema:

```ts
// appkit
export const BaseProductSchema = z.object({ title, price, status, ... });

// letitrip
import { BaseProductSchema } from "@mohasinac/appkit/features/products";
export const ProductSchema = BaseProductSchema.extend({
  isAuction: z.boolean().default(false),
  isPreOrder: z.boolean().default(false),
  sellerId: z.string(),
});
```

This means letitrip retains its unique marketplace behaviour but **never forks UI or infrastructure code** — only configuration and extensions live locally.

### Second Insight: CMS Content Pattern

Several features currently labelled STAY are actually generic renderers whose TEXT content lives
in i18n message files. Moving the content into Firestore site settings makes the renderer
fully reusable. The same `appkit/features/cms` components can render an About page for
`letitrip`, `licorice`, or `hobson` — each app just stores different content in Firestore.

```
appkit/features/cms/
├── components/
│   ├── AboutPageView.tsx       ← hero + mission + values + stats + team (driven by SiteConfig)
│   ├── HowItWorksView.tsx      ← ordered steps[] + optional FlowDiagram (policy/guide pages)
│   ├── PolicyPageView.tsx      ← titled sections[] with rich text (privacy, terms, refund…)
│   ├── FeesTableView.tsx       ← fee category / rate table (fees page)
│   └── TrackOrderView.tsx      ← order-tracking-by-id form (standard in any e-commerce)
├── types/CmsPage.ts            ← AboutConfig, StepItem, PolicySection, FeesRow interfaces
├── api/route.ts                ← GET /api/cms/[pageId] — reads from site_settings Firestore doc
└── hooks/useCmsPage.ts         ← generic useQuery for any CMS page config
```

**Practical example — About page:**

```
Firestore: site_settings/about → { hero: { title, subtitle }, mission: "...", team: [...] }
appkit:    <AboutPageView config={siteAbout} />      ← generic; ships in appkit
letitrip:  page.tsx fetches via useCmsPage("about") ← thin page; no hardcoded copy
```

CMS_CONTENT pages also discovered in `src/app/[locale]/`:

```
privacy/, terms/, cookies/, refund-policy/, shipping-policy/  → PolicyPageView + Firestore
fees/                                                          → FeesTableView + Firestore
how-checkout-works/, how-orders-work/, how-offers-work/        → HowItWorksView + Firestore
how-reviews-work/, how-payouts-work/, how-pre-orders-work/     → HowItWorksView + Firestore
how-auctions-work/, seller-guide/                              → HowItWorksView + Firestore
help/                                                          → PolicyPageView + Firestore
```

### Third Insight: Generic Admin Utility Patterns

Several admin-only routes contain patterns useful in ANY app, not just letitrip:

| Route                  | Pattern                                             | Extract to               |
| ---------------------- | --------------------------------------------------- | ------------------------ |
| `admin/feature-flags/` | Feature flag toggle list + enable/disable action    | `appkit/features/admin`  |
| `admin/analytics/`     | Analytics dashboard shell (stats cards, charts)     | `appkit/features/admin`  |
| `admin/activity/`      | Audit log list (action, actor, timestamp, diff)     | `appkit/features/admin`  |
| `admin/sessions/`      | Active session list + revoke action                 | `appkit/features/auth`   |
| `admin/site-settings/` | Site config form shell (logo, name, social links)   | `appkit/features/cms`    |
| `admin/navigation/`    | Nav link tree editor (add/remove/reorder)           | `appkit/features/cms`    |
| `admin/newsletter/`    | Newsletter subscriber list + export                 | `appkit/features/admin`  |
| `admin/algolia/`       | Search index sync UI (trigger reindex, view status) | `appkit/features/search` |

**Practical example — orders:**

```
appkit/features/orders/
├── components/OrdersListView.tsx     ← shell: columns, filters, sort, pagination, empty state
├── components/OrderDetailView.tsx    ← shell: order summary, status timeline, item list
├── hooks/useOrders.ts                ← generic hook: GET /api/orders with SieveQuery
└── api/route.ts                      ← generic GET /api/orders handler

letitrip.in/src/features/user/
├── components/UserOrdersView.tsx     ← thin wrapper: passes letitrip columns + cancelOrder CB
├── components/OrderCard.tsx          ← letitrip-specific card (marketplace seller tags)
├── hooks/useUserOrders.ts            ← calls letitrip-specific cancelOrderAction
└── actions/cancelOrderAction.ts      ← Server Action: Firestore + payout adjustment
```

This model means appkit ships the **skeleton**; letitrip provides the **flesh**.

---

### `src/app/` (322 files)

| Path                                                                       | Tag           | Reason                                                                                                                 |
| -------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/app/[locale]/` (i18n `layout.tsx`, root `error.tsx`, `not-found.tsx`) | STAY          | Route tree root + localization bootstrap — letitrip-specific wiring                                                    |
| `src/app/[locale]/(products\|user\|seller\|orders\|events\|auctions)/**`   | EXTRACT-SHELL | Thin `page.tsx` stubs wrapping appkit views → `appkit/features/*`; any e-commerce app needs these routes               |
| `src/app/api/*/route.ts` (2-line stubs)                                    | STAY          | Must live in app; re-export appkit handlers                                                                            |
| `src/app/api/*/route.ts` (complex local routes)                            | STAY          | Products, faqs, search — migrate to appkit over time                                                                   |
| `src/app/(admin)/`                                                         | EXTRACT-SHELL | Admin `page.tsx` stubs → `appkit/features/admin`; any admin-capable app needs these routes; letitrip wires RBAC config |
| `src/app/[locale]/about/`, `fees/`, `how-*/`, `help/`                      | CMS_CONTENT   | Thin pages; content moves to Firestore; renderer to `appkit/features/cms`                                              |
| `src/app/[locale]/privacy/`, `terms/`, `cookies/`                          | CMS_CONTENT   | Policy pages → `PolicyPageView`; content in `site_settings/privacy` etc.                                               |
| `src/app/[locale]/shipping-policy/`, `refund-policy/`                      | CMS_CONTENT   | Policy pages → `PolicyPageView`; content in site settings                                                              |
| `src/app/[locale]/seller-guide/`                                           | CMS_CONTENT   | Seller onboarding guide → `HowItWorksView`; content in site settings                                                   |
| `instrumentation.ts` (root)                                                | DUPLICATE     | Pattern matches `@mohasinac/instrumentation`; replace with appkit/instrumentation                                      |

---

### `src/features/` (450 files)

The letitrip implementations sit ON TOP of the generic `appkit/features/*` layers.
All three layers are extractable. VIEW SHELL → appkit components. DATA LAYER → appkit base hooks/actions/schemas + letitrip config override. MARKETPLACE RULES → appkit strategy factories + letitrip config/injection. Nothing is forced STAY unless it is 100% letitrip-specific with no generic equivalent (project credentials, seed data, letitrip discriminated unions).

| Directory              | Files  | Tag           | Extract to appkit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Stay in letitrip                                                                                                                                                                                         |
| ---------------------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/about/`      | 11     | CMS_CONTENT   | `AboutView` shell → `appkit/features/cms/AboutPageView`; `HowCheckoutWorksView`, `HowOrdersWorkView`, `HowOffersWorkView`, `HowReviewsWorkView` → `appkit/features/cms/HowItWorksView`; `ShippingPolicyView`, `SecurityPrivacyView` → `appkit/features/cms/PolicyPageView`; `FeesView` → `appkit/features/cms/FeesTableView`; `TrackOrderView` → `appkit/features/cms/TrackOrderView`                                                                                                                                    | Letitrip-specific CMS content docs in Firestore site_settings; i18n messages in `/messages/about.json` move to Firestore                                                                                 |
| `features/admin/`      | 127    | EXTRACT-SHELL | Generic shells → `appkit/features/admin`: `FeatureFlagsView`, `ActivityLogView`, `AnalyticsDashboardView`, `SiteSettingsFormView`, `NavigationEditorView`, `NewsletterSubscriberView`; → `appkit/features/auth`: `SessionsView`, `RevokeSessionButton`; → `appkit/features/search`: `AlgoliaSyncView`                                                                                                                                                                                                                    | Domain-specific RBAC, letitrip collection names, admin action wiring                                                                                                                                     |
| `features/auth/`       | 9      | DUPLICATE     | All — compare with `appkit/features/auth`; delete local if identical                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                                                                                                                                        |
| `features/blog/`       | 8      | DUPLICATE     | All — compare with `appkit/features/blog`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                        |
| `features/cart/`       | 27     | EXTRACT-SHELL | `CartView`, `CartItemRow`, `CartSummary`, `OrderSummaryPanel`, `CheckoutSuccessView`, `PromoCodeInput`                                                                                                                                                                                                                                                                                                                                                                                                                   | `ConsentOtpModal` (India OTP), `CheckoutOtpModal`, `GuestCartMergerEffect`, `useCartMutations` (letitrip actions), `CartDocument` type                                                                   |
| `features/categories/` | 10     | DUPLICATE     | All — generic tree already in `appkit/features/categories`                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                        |
| `features/contact/`    | 4      | EXTRACT-SHELL | `ContactFormView` layout shell                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Template wiring (letitrip email templates)                                                                                                                                                               |
| `features/copilot/`    | 7      | EXTRACT-SHELL | `AdminCopilotView` (chat UI shell: input, bubble list, loading/error states) → `appkit/features/copilot`; `useCopilotChat` (generic mutation: send prompt, manage message state, conversation ID) → `appkit/features/copilot`                                                                                                                                                                                                                                                                                            | System prompt configuration, `API_ENDPOINTS.COPILOT.CHAT` wiring, letitrip knowledge base                                                                                                                |
| `features/events/`     | 40     | EXTRACT-SHELL | `EventsListView`, `EventDetailView` shell (already imports `@mohasinac/feat-events`), `EventStatusBadge`, `EventStatsBanner`                                                                                                                                                                                                                                                                                                                                                                                             | `PollVotingSection`, `SurveyEventSection`, `FeedbackEventSection` (letitrip event subtypes), survey form builder, RTDB-backed real-time voting                                                           |
| `features/faq/`        | 14     | DUPLICATE     | All — generic FAQ in `appkit/features/faq`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                        |
| `features/homepage/`   | 37     | EXTRACT-SHELL | Generic section shells: `HeroCarousel`, `BlogArticlesSection`, `FAQSection`, `StatsCounterSection`, `NewsletterSection`, `CustomerReviewsSection`, `FeaturedProductsSection` → `appkit/features/homepage`; `WhatsAppCommunitySection` → `appkit/features/homepage/SocialCommunitySection` (prop: `platform`, `ctaUrl`, `memberCount`); `FeaturedAuctionsSection` → `appkit/features/auctions`; section-type registry pattern → `appkit/features/cms` with letitrip discriminated union extending base section types      | letitrip section CMS content (Firestore docs); India-specific CTA copy                                                                                                                                   |
| `features/pre-orders/` | varies | EXTRACT-SHELL | `PreOrderListView`, `PreOrderDetailView`, `PreOrderCard` shells                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PreOrder Zod schema, `PreOrderDocument` type, pre-order Server Actions (payment hold, inventory reservation)                                                                                             |
| `features/products/`   | 28     | EXTRACT-SHELL | `ProductDetailView` shell, `ProductCard`, `RelatedProductsSection`, `ProductGallery`                                                                                                                                                                                                                                                                                                                                                                                                                                     | Seller/variant product logic, `ProductDocument`, product Server Actions, `ProductVariantSelector` (marketplace multi-seller)                                                                             |
| `features/promotions/` | 6      | DUPLICATE     | All — verify against `appkit/features/promotions`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                        |
| `features/reviews/`    | 5      | DUPLICATE     | All — verify against `appkit/features/reviews`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                        |
| `features/search/`     | 6      | DUPLICATE     | All — verify against `appkit/features/search`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                                                                                        |
| `features/seller/`     | 52     | EXTRACT-SHELL | `SellerDashboardView`, `SellerAnalyticsView`, `SellerProductsView`, `SellerProductCard`, `SellerOrdersView`, `SellerStorefrontView`, `SellerStoreView`, `SellerCouponsView`, `SellerSidebar`, `SellerPayoutsView` → `appkit/features/seller`; `SellerShippingView` → EXTRACT-DATA (configurable shipping provider); KYC flow → EXTRACT-RULE (`createKycFlow(steps, verifyFn)`); `StoreDocument` → EXTRACT-SHELL (base doc); all seller Server Actions → EXTRACT-RULE (factory with commission/payout strategy injection) | Shiprocket field config; letitrip commission rates; India KYC document types                                                                                                                             |
| `features/stores/`     | 15     | DUPLICATE     | All — verify against `appkit/features/stores`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                                                                                                                                                        |
| `features/user/`       | 38     | EXTRACT-SHELL | `ProfileView`, `UserAddressesView`, `UserOrdersView`, `UserSettingsView`, `UserNotificationsView`, `PasswordChangeForm`, `EmailVerificationCard`                                                                                                                                                                                                                                                                                                                                                                         | `ChatWindow` (RTDB-specific), `UserOffersView` (marketplace counter-offers), `BecomeSellerView` (marketplace-specific seller onboarding), `OrderDocument` type, `useUserOrders` (calls letitrip actions) |
| `features/wishlist/`   | 6      | DUPLICATE     | All — verify against `appkit/features/wishlist`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                        |

---

### `src/components/` (195 files)

| Directory                | Files | Tag          | Decision                                                                                                              |
| ------------------------ | ----- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `components/admin/`      | 8     | EXTRACT-DATA | Generic `BaseAdminList<T>` column-config shell → `appkit/features/admin`; letitrip wires domain columns + row actions |
| `components/auth/`       | 4     | DUPLICATE    | Compare with `appkit/features/auth`; delete if same                                                                   |
| `components/categories/` | 7     | DUPLICATE    | Compare with `appkit/features/categories`                                                                             |
| `components/feedback/`   | 6     | EXTRACT      | Toast, Snackbar, InlineMessage — generic; move to `appkit/ui`                                                         |
| `components/filters/`    | 12    | DUPLICATE    | Compare with `appkit/features/filters`                                                                                |
| `components/forms/`      | 17    | DUPLICATE    | Compare with `appkit/features/forms`                                                                                  |
| `components/layout/`     | 21    | DUPLICATE    | Navbar, Footer; compare with `appkit/features/layout`                                                                 |
| `components/media/`      | 8     | DUPLICATE    | MediaImage, MediaVideo; compare with `appkit/features/media`                                                          |
| `components/modals/`     | 3     | EXTRACT      | ConfirmDeleteModal, ModalBase — generic; move to `appkit/ui`                                                          |
| `components/orders/`     | 2     | EXTRACT-DATA | Base order card/detail shells → `appkit/features/orders`; letitrip extends with marketplace split fields              |
| `components/pre-orders/` | 2     | EXTRACT-DATA | Base pre-order card/detail → `appkit/features/pre-orders`; letitrip wires `PreOrderDocument` type                     |
| `components/products/`   | 9     | EXTRACT-DATA | Base product card shell → `appkit/features/products`; letitrip adds seller/variant/condition slots via render props   |
| `components/providers/`  | 3     | EXTRACT      | QueryProvider, ToastProvider wrappers — move to `appkit/next`                                                         |
| `components/semantic/`   | 3     | DUPLICATE    | Wrappers for `@mohasinac/ui` semantic elements; delete in favour of direct appkit/ui                                  |
| `components/typography/` | 5     | DUPLICATE    | Heading, Text — already in `@mohasinac/ui`; delete                                                                    |
| `components/ui/`         | 51    | DUPLICATE    | Button, Badge, Alert, Spinner — large overlap with `@mohasinac/ui`; audit; unique variants stay                       |
| `components/user/`       | 6     | EXTRACT-DATA | Base user avatar/card → `appkit/features/account`; letitrip extends with `publicProfile.socialLinks/storeId` slots    |
| `components/utility/`    | 6     | EXTRACT      | ErrorBoundary, Suspense wrappers, Skeleton variants — generic; move to `appkit/ui`                                    |

---

### `src/hooks/` (93 hooks)

NOTE: Many hooks follow a PATTERN that belongs in appkit even when their specific wiring is
letitrip-only. For example, `useAddresses` is letitrip-specific in content, but the abstract
pattern (read list + add + update + delete with SieveQuery) belongs in `appkit/react` as a
generic `useCRUDList()` factory. The letitrip hook becomes a thin wrapper.

| Hook(s)                                                                                                                                                       | Tag           | Decision                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useMediaQuery`, `useBreakpoint`, `useClickOutside`, `useKeyPress`, `useLongPress`, `useGesture`, `useSwipe`, `usePullToRefresh`, `useCountdown`, `useCamera` | DUPLICATE     | Already in `@mohasinac/react`; delete local copies; import from `appkit/react`                                                                        |
| `useAddresses`, `useAddressForm`, `useAddressSelector`, `useStoreAddressSelector`                                                                             | EXTRACT-SHELL | Pattern (CRUD list + form + selector) is generic — extract `useCRUDList` factory to `appkit/react`; letitrip hooks become thin wrappers               |
| `useAddToCart`, `useCartCount`, `useGuestCart`, `useGuestCartMerge`                                                                                           | EXTRACT-DATA  | Base cart hooks → `appkit/features/cart`; letitrip config: per-seller grouping via injected `splitFn`                                                 |
| `useAuctionDetail`, `useRealtimeBids`, `usePlaceBid`, `useFeaturedAuctions`                                                                                   | EXTRACT-DATA  | RTDB auction hooks → `appkit/features/auctions`; letitrip wires RTDB paths + `BidDocument` type                                                       |
| `useAuth`, `useAuthEvent`, `useLogout`                                                                                                                        | DUPLICATE     | Verify against `appkit/features/auth`; delete if same                                                                                                 |
| `useBecomeSeller`, `useSellerStorefront`                                                                                                                      | EXTRACT-DATA  | Seller onboarding/storefront hooks → `appkit/features/seller`; letitrip wires KYC/payout config                                                       |
| `useBottomActions`, `useNavSuggestions`                                                                                                                       | EXTRACT-SHELL | Nav/layout state hooks → `appkit/features/layout`; letitrip configures route list                                                                     |
| `useSiteSettings`                                                                                                                                             | EXTRACT-SHELL | Generic site config fetch pattern — extract to `appkit/features/cms`; letitrip wires letitrip `SiteSettingsDocument`                                  |
| `useBrands`, `useTopBrands`, `useTopCategories`                                                                                                               | EXTRACT-SHELL | Pattern (`useFeaturedList<T>`) is generic — extract factory to `appkit/react`; letitrip hooks become 1-line wrappers                                  |
| `useBulkAction`, `useBulkEvent`, `useBulkSelection`                                                                                                           | EXTRACT       | Generic bulk selection pattern; move to `appkit/features/admin`                                                                                       |
| `useCategorySelector`                                                                                                                                         | DUPLICATE     | Check against `appkit/features/categories`                                                                                                            |
| `useChat`                                                                                                                                                     | EXTRACT-DATA  | RTDB chat hook → `appkit/features/chat`; letitrip injects RTDB path config                                                                            |
| `useCheckout`                                                                                                                                                 | EXTRACT-RULE  | Factory `createCheckoutHook(splitFn, paymentFn, otpFn)` → `appkit/features/checkout`; letitrip injects Razorpay + seller-split + India OTP strategies |
| `useContactSubmit`                                                                                                                                            | EXTRACT-DATA  | Email submit hook shell → `appkit/features/cms`; letitrip configures email template ID                                                                |
| `useCouponValidate`                                                                                                                                           | EXTRACT-RULE  | Factory `createCouponValidateHook(scopeFn)` → `appkit/features/promotions`; letitrip injects seller-scoping validation strategy                       |
| `useFaqVote`                                                                                                                                                  | DUPLICATE     | Check against `appkit/features/faq`                                                                                                                   |
| `useFeaturedPreOrders`, `useFeaturedProducts`                                                                                                                 | EXTRACT-DATA  | `useFeaturedList<T>` factory → `appkit/react`; letitrip hooks become 1-line wrappers with endpoint + type                                             |
| `useHomepageReviews`, `useHomepageSections`                                                                                                                   | EXTRACT-DATA  | Homepage section/review hooks → `appkit/features/homepage`; letitrip wires section-type schema                                                        |
| `useMediaUpload`                                                                                                                                              | EXTRACT       | Generic media upload hook; move to `appkit/features/media`                                                                                            |
| `useMessage`                                                                                                                                                  | EXTRACT       | Message/toast hook; move to `appkit/ui` or `appkit/react`                                                                                             |
| `useNewsletter`                                                                                                                                               | EXTRACT       | Generic newsletter subscribe/unsubscribe pattern; move to `appkit/features/admin`                                                                     |
| `useNotifications`                                                                                                                                            | EXTRACT-DATA  | RTDB notification listener → `appkit/features/account`; letitrip wires RTDB path + `NotificationType` enum                                            |
| `usePaymentEvent`, `useRazorpay`                                                                                                                              | EXTRACT-RULE  | Payment event handlers → `appkit/providers/payment-razorpay`; letitrip injects amounts + order routing via config                                     |
| `usePendingFilters`, `usePendingTable`                                                                                                                        | EXTRACT       | Admin pending state — generic; move to `appkit/features/admin`                                                                                        |
| `useProductReviews`                                                                                                                                           | DUPLICATE     | Check against `appkit/features/reviews`                                                                                                               |
| `useProfile`, `useProfileStats`, `usePublicProfile`                                                                                                           | EXTRACT-DATA  | Profile hooks → `appkit/features/account`; letitrip extends with `publicProfile.socialLinks/storeId` fields                                           |
| `useRBAC`                                                                                                                                                     | EXTRACT-RULE  | `createRbacHook(config)` factory → `appkit/security`; letitrip calls `createRbacHook(RBAC_CONFIG)` to get its own typed hook; see Section 18          |
| `useRealtimeEvent`                                                                                                                                            | EXTRACT-DATA  | RTDB event listener → `appkit/features/events`; letitrip wires RTDB path + `EventDocument` type                                                       |
| `useRelatedProducts`                                                                                                                                          | EXTRACT-DATA  | Related products query → `appkit/features/products`; letitrip provides Sieve filter config (category + tag fields)                                    |
| `useUnsavedChanges`                                                                                                                                           | EXTRACT       | Generic "unsaved changes" guard; move to `appkit/react`                                                                                               |
| `useUrlTable`                                                                                                                                                 | EXTRACT       | URL-based table state — generic admin pattern; move to `appkit/features/admin`                                                                        |
| `useWishlistToggle`                                                                                                                                           | DUPLICATE     | Check against `appkit/features/wishlist`                                                                                                              |

---

### `src/actions/` (36 files)

Server Actions contain letitrip business logic. The PATTERN (`createApiHandler`, validated
input, error handling, response shape) is in appkit; the CONTENT is domain-specific.

However, several action patterns are generic and should be factored out:

| Action group                                                        | Tag           | Generic pattern to appkit                                                                                  | Letitrip-specific stays                                              |
| ------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `createAddressAction`, `updateAddressAction`, `deleteAddressAction` | EXTRACT-SHELL | Generic address mutation shell → `appkit/features/account`                                                 | letitrip `AddressDocument` type wiring                               |
| `subscribeNewsletterAction`                                         | EXTRACT       | Generic subscribe/unsubscribe → `appkit/features/admin`                                                    | letitrip Firestore collection name                                   |
| `submitContactAction`                                               | EXTRACT-SHELL | Generic contact form submit shell → `appkit/features/cms`                                                  | letitrip email template wiring                                       |
| `toggleWishlistAction`                                              | EXTRACT       | Generic wishlist toggle → `appkit/features/wishlist`                                                       | letitrip `WishlistDocument`                                          |
| `castFaqVoteAction`                                                 | EXTRACT       | Generic vote/increment action → `appkit/features/faq`                                                      | —                                                                    |
| `createReviewAction`, `updateReviewAction`                          | EXTRACT-SHELL | Generic review mutation shell → `appkit/features/reviews`                                                  | PII encrypt wiring; letitrip `ReviewDocument`                        |
| All checkout/payment actions                                        | EXTRACT-RULE  | Factory `createCheckoutAction(repo, { splitFn, payFn, otpFn })` → `appkit/features/checkout`               | Razorpay + seller-split + India OTP injected as letitrip strategies  |
| All seller KYC/payout actions                                       | EXTRACT-RULE  | Factory `createPayoutAction(repo, { commissionFn })` → `appkit/features/seller`                            | Marketplace commission rules injected as letitrip config             |
| All cart/coupon actions                                             | EXTRACT-RULE  | Factory `createCartAction(repo, { groupFn, couponScopeFn })` → `appkit/features/cart`                      | Per-seller grouping + coupon scoping injected as letitrip strategies |
| All auction/bid actions                                             | EXTRACT-DATA  | RTDB auction action factory → `appkit/features/auctions`; letitrip wires RTDB paths + state machine config | RTDB locking, auction state machine details                          |
| All order cancellation/refund actions                               | EXTRACT-RULE  | Factory `createOrderCancelAction(repo, { deductionFn })` → `appkit/features/orders`                        | Marketplace fee deduction strategy injected by letitrip              |

---

### `src/repositories/` (32 files)

Every repository follows the same structural pattern: `BaseRepository<T>` → domain-specific class
with PII encrypt/decrypt hooks. The STRUCTURE is generic; the COLLECTION NAMES and SCHEMA TYPES
are letitrip-specific.

| File                              | Tag           | Decision                                                                                                                                       |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.repository.ts`              | EXTRACT       | Generic Firestore base — move to `appkit/providers/db-firebase`                                                                                |
| `unit-of-work.ts`                 | EXTRACT       | Generic transaction helper — move to `appkit/providers/db-firebase`                                                                            |
| `address.repository.ts`           | EXTRACT-SHELL | Generic address CRUD — extract shell to `appkit/features/account`; letitrip wires `AddressDocument`                                            |
| `blog.repository.ts`              | EXTRACT-SHELL | Generic blog CRUD — extract shell to `appkit/features/blog`; letitrip wires `BlogPostDocument`                                                 |
| `categories.repository.ts`        | EXTRACT-SHELL | Generic category tree — extract to `appkit/features/categories`                                                                                |
| `faqs.repository.ts`              | EXTRACT-SHELL | Generic FAQ CRUD — extract to `appkit/features/faq`                                                                                            |
| `newsletter.repository.ts`        | EXTRACT-SHELL | Generic subscriber list — extract to `appkit/features/admin`                                                                                   |
| `notification.repository.ts`      | EXTRACT-SHELL | Generic notification CRUD + markRead — extract to `appkit/features/account`                                                                    |
| `review.repository.ts`            | EXTRACT-SHELL | Generic review CRUD + moderation — extract to `appkit/features/reviews`; PII encrypt/decrypt stays (see PII section)                           |
| `session.repository.ts`           | EXTRACT-SHELL | Generic session CRUD + revoke — extract to `appkit/features/auth`                                                                              |
| `wishlist.repository.ts`          | EXTRACT-SHELL | Generic wishlist toggle — extract to `appkit/features/wishlist`                                                                                |
| `product.repository.ts`           | EXTRACT-SHELL | Generic product CRUD + search — extract shell to `appkit/features/products`; letitrip extends with seller/variant fields                       |
| `store.repository.ts`             | EXTRACT-SHELL | Generic store CRUD — extract shell to `appkit/features/stores`; letitrip extends with KYC/payout fields                                        |
| `order.repository.ts`             | EXTRACT-SHELL | Generic order CRUD + status transitions — extract shell to `appkit/features/orders`; letitrip adds per-seller split                            |
| `cart.repository.ts`              | EXTRACT-RULE  | Base `CartRepository` with guest-merge + split hooks → `appkit/features/cart`; letitrip injects `guestMergeFn` + `sellerGroupFn`               |
| `bid.repository.ts`               | EXTRACT-DATA  | RTDB auction bid repository → `appkit/features/auctions`; letitrip wires RTDB paths + `BidDocument` schema                                     |
| `event.repository.ts`             | EXTRACT-DATA  | Base event CRUD + RTDB participation → `appkit/features/events`; letitrip extends with poll/survey subtypes                                    |
| `eventEntry.repository.ts`        | EXTRACT-DATA  | Event check-in repository → `appkit/features/events`; letitrip wires entry document type                                                       |
| `offer.repository.ts`             | EXTRACT-RULE  | Counter-offer chain repository → `appkit/features/offers`; letitrip injects expiry/counter-limit rules                                         |
| `payout.repository.ts`            | EXTRACT-RULE  | Payout settlement repository → `appkit/features/seller`; letitrip injects marketplace commission calculation                                   |
| `coupons.repository.ts`           | EXTRACT-RULE  | Coupon repository → `appkit/features/promotions`; letitrip injects seller-scoping validation rules                                             |
| `user.repository.ts`              | EXTRACT-DATA  | User repository with PII encrypt/decrypt → `appkit/providers/db-firebase`; letitrip extends with `storeId/storeSlug` denorm + PII field config |
| `homepage-sections.repository.ts` | EXTRACT-DATA  | Section CRUD repository → `appkit/features/cms`; letitrip wires its discriminated `SectionType` union + Firestore collection name              |
| `site-settings.repository.ts`     | EXTRACT-DATA  | SiteSettings CRUD → `appkit/features/cms`; letitrip extends with credential fields (shell builds when `appkit/features/cms` is built)          |
| `chat.repository.ts`              | EXTRACT-DATA  | RTDB chat repository → `appkit/features/chat`; letitrip injects RTDB path constants                                                            |
| `copilot-log.repository.ts`       | EXTRACT-DATA  | AI chat log repository → `appkit/features/copilot`; letitrip wires `CopilotLogDocument` type + collection name                                 |
| `failed-checkout.repository.ts`   | EXTRACT-RULE  | Failed checkout tracking → `appkit/features/checkout`; letitrip injects error classification scheme                                            |
| `sms-counter.repository.ts`       | EXTRACT-RULE  | OTP rate-limit counter → `appkit/security`; letitrip configures India limits (3/day, 10/month) via config object                               |
| `token.repository.ts`             | EXTRACT-DATA  | RTDB custom token storage → `appkit/features/auth`; letitrip wires RTDB path constants                                                         |
| `carousel.repository.ts`          | EXTRACT-DATA  | Carousel slide CRUD repository → `appkit/features/cms`; letitrip wires `CarouselSlideDocument` type + collection name                          |
| `store-address.repository.ts`     | EXTRACT-DATA  | Store pickup address CRUD → `appkit/features/stores`; letitrip extends with Shiprocket pickup address fields                                   |

---

### `src/db/` (52 files)

Schemas split into three tiers. The letitrip-specific fields are **extensions** on a
generic base type that ships in appkit. Consumer apps import the base type and `extend()`
it with their own domain fields:

```ts
// appkit: generic base
export interface BaseProductDocument { id, title, description, slug, price, currency, images, status, ... }

// letitrip: extends with marketplace fields
export interface ProductDocument extends BaseProductDocument {
  sellerId: string;          // ← marketplace: maps product to a seller
  storeId?: string;          // ← marketplace: store reference
  sellerSplit?: number;      // ← marketplace: per-seller revenue share
  condition?: ProductCondition; // ← marketplace: used goods support
  auctionConfig?: AuctionConfig; // ← marketplace: auction mode
}
```

#### Schema classification

| Schema file                 | Tag           | Generic base to appkit                                                                                                                                                          | Letitrip-specific extension stays                                                                                                                            |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users.ts`                  | EXTRACT-SHELL | `BaseUserDocument` (uid, email, displayName, photoURL, role, emailVerified, createdAt)                                                                                          | `storeId/storeSlug/storeStatus` (seller link), `publicProfile.socialLinks`, blind-index fields                                                               |
| `addresses.ts`              | EXTRACT       | `AddressDocument` (name, line1, line2, city, state, country, postal, phone, isDefault) → `appkit/features/account`                                                              | —                                                                                                                                                            |
| `orders.ts`                 | EXTRACT-SHELL | `BaseOrderDocument` (id, userId, items[], status, paymentStatus, shippingAddress, orderDate) → `appkit/features/orders`                                                         | `sellerId/sellerName` (marketplace split), `platformFee/sellerEarnings`, `OrderPayoutStatus`, `ShippingMethod` (Shiprocket), `orderType: "offer"\|"auction"` |
| `products.ts`               | EXTRACT-SHELL | `BaseProductDocument` (id, title, description, slug, price, currency, images, video, status, category, tags, seoTitle) → `appkit/features/products`                             | `sellerId/storeId/sellerName` (marketplace), `condition`, auction/preorder config, `preOrderId/auctionId`                                                    |
| `reviews.ts`                | EXTRACT       | `ReviewDocument` (id, productId, userId, rating, title, comment, images, status, helpfulCount, verified) → `appkit/features/reviews`                                            | Minor: `sellerId` denorm                                                                                                                                     |
| `blog-posts.ts`             | EXTRACT       | `BlogPostDocument` (id, title, slug, content, excerpt, coverImage, authorId, status, tags, publishedAt) → `appkit/features/blog`                                                | —                                                                                                                                                            |
| `categories.ts`             | EXTRACT       | `CategoryDocument` (id, name, slug, parentId, icon, image, sortOrder) → `appkit/features/categories`                                                                            | —                                                                                                                                                            |
| `faqs.ts`                   | EXTRACT       | `FaqDocument` (id, question, answer, category, sortOrder, voteCount) → `appkit/features/faq`                                                                                    | —                                                                                                                                                            |
| `newsletter-subscribers.ts` | EXTRACT       | `NewsletterSubscriberDocument` (email, subscribedAt, locale, status) → `appkit/features/admin`                                                                                  | —                                                                                                                                                            |
| `sessions.ts`               | EXTRACT       | `SessionDocument` (id, userId, userAgent, ip, createdAt, lastActiveAt, revokedAt) → `appkit/features/auth`                                                                      | —                                                                                                                                                            |
| `notifications.ts`          | EXTRACT       | `NotificationDocument` (id, userId, type, title, body, read, createdAt, link) → `appkit/features/account`                                                                       | letitrip-specific `type` enum values                                                                                                                         |
| `site-settings.ts`          | EXTRACT-SHELL | `BaseSiteSettingsDocument` (siteName, logo, favicon, socialLinks, contactEmail, seo) → `appkit/features/cms`                                                                    | letitrip-specific credential fields (moved to `SiteCredentialsDocument`)                                                                                     |
| `stores.ts`                 | EXTRACT-SHELL | `BaseStoreDocument` (id, name, slug, description, logo, coverImage, status) → `appkit/features/stores`                                                                          | KYC fields, payout bank details, Shiprocket config, seller commission rate                                                                                   |
| `coupons.ts`                | EXTRACT-SHELL | `BaseCouponDocument` (code, discountType, discountValue, minOrderAmount, maxUses, expiresAt) → `appkit/features/promotions`                                                     | `sellerId` scoping, marketplace-specific usage rules                                                                                                         |
| `cart.ts`                   | EXTRACT-RULE  | Base `CartDocument` (userId, items[]) → `appkit/features/cart`; letitrip extends with `sellerGroups` + guest merge fields                                                       |
| `events.ts`                 | EXTRACT-DATA  | Base `EventDocument` (id, title, date, venue, status) → `appkit/features/events`; letitrip extends with poll/survey/feedback subtype config                                     |
| `bids.ts`                   | EXTRACT-DATA  | Base `BidDocument` (id, auctionId, userId, amount, timestamp) → `appkit/features/auctions`; letitrip wires RTDB conflict resolution fields                                      |
| `payouts.ts`                | EXTRACT-RULE  | Base `PayoutDocument` (id, sellerId, orderId, amount, status) → `appkit/features/seller`; letitrip extends with `platformFee/commissionRate` marketplace rules                  |
| `offers.ts`                 | EXTRACT-RULE  | Base `OfferDocument` (id, productId, userId, offerPrice, status) → `appkit/features/offers`; letitrip adds counter-offer chain + expiry fields                                  |
| `chat.ts`                   | EXTRACT-DATA  | Base chat message schema (id, senderId, text, timestamp) → `appkit/features/chat`; letitrip wires RTDB path structure                                                           |
| `homepage-sections.ts`      | EXTRACT-DATA  | Base `HomepageSectionDocument` (id, type, sortOrder, isActive, content) → `appkit/features/cms`; letitrip extends `content` union with its own section-type discriminants       |
| `carousel-slides.ts`        | EXTRACT-DATA  | Base `CarouselSlideDocument` (id, imageUrl, title, subtitle, ctaLabel, ctaUrl, sortOrder) → `appkit/features/cms`; letitrip extends with `mobileImageUrl` + campaign tag fields |
| `copilot-logs.ts`           | EXTRACT-DATA  | Base `CopilotLogDocument` (id, userId, messages[], model, createdAt) → `appkit/features/copilot`; letitrip extends with `knowledgeBaseId` + system prompt metadata              |
| `tokens.ts`                 | EXTRACT-DATA  | Base token document → `appkit/features/auth`; letitrip wires RTDB path + token structure                                                                                        |
| `sms-counters.ts`           | EXTRACT-RULE  | OTP counter schema → `appkit/security`; letitrip configures India limit values (3/day, 10/month)                                                                                |
| `failed-checkouts.ts`       | EXTRACT-RULE  | Checkout failure tracking schema → `appkit/features/checkout`; letitrip extends with marketplace error codes                                                                    |
| `store-addresses.ts`        | EXTRACT-DATA  | Store address schema → `appkit/features/stores`; letitrip extends with Shiprocket pickup address fields                                                                         |
| `field-names.ts`            | STAY          | —                                                                                                                                                                               | Letitrip Firestore field name constants (used in Sieve filters)                                                                                              |
| `db/indices/*.json`         | STAY          | —                                                                                                                                                                               | Firestore composite index definitions                                                                                                                        |
| `db/seed-data/*.ts`         | EXTRACT-DATA  | Generic seed data factory → `appkit/seed`; letitrip provides its own seed fixtures as typed extension objects (see Section 19)                                                  |

---

### `src/lib/` (65 files)

| Path                                | Tag          | Decision                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api/api-handler.ts`            | DUPLICATE    | Already covered by `@mohasinac/next` `createApiHandler`                                                                                                                                                                                                                                                                                                  |
| `lib/api/cache-middleware.ts`       | DUPLICATE    | Compare with `@mohasinac/monitoring`                                                                                                                                                                                                                                                                                                                     |
| `lib/api/request-helpers.ts`        | DUPLICATE    | Check `@mohasinac/next` for identical helpers                                                                                                                                                                                                                                                                                                            |
| `lib/errors/` (10 files)            | DUPLICATE    | Exact copy of `@mohasinac/errors`; delete entirely; import from `appkit/errors`                                                                                                                                                                                                                                                                          |
| `lib/firebase/admin.ts`             | DUPLICATE    | Firebase Admin SDK init — already in `@mohasinac/auth-firebase`                                                                                                                                                                                                                                                                                          |
| `lib/firebase/auth-helpers.ts`      | DUPLICATE    | Check `@mohasinac/auth-firebase`                                                                                                                                                                                                                                                                                                                         |
| `lib/firebase/auth-server.ts`       | DUPLICATE    | Check `@mohasinac/auth-firebase`                                                                                                                                                                                                                                                                                                                         |
| `lib/firebase/client-config.ts`     | STAY         | Letitrip Firebase project credentials                                                                                                                                                                                                                                                                                                                    |
| `lib/firebase/config.ts`            | STAY         | Firebase client SDK init with letitrip config                                                                                                                                                                                                                                                                                                            |
| `lib/firebase/firestore-helpers.ts` | DUPLICATE    | Check `@mohasinac/db-firebase`                                                                                                                                                                                                                                                                                                                           |
| `lib/firebase/realtime-db.ts`       | DUPLICATE    | Check `@mohasinac/db-firebase/realtime`                                                                                                                                                                                                                                                                                                                  |
| `lib/firebase/realtime.ts`          | EXTRACT-DATA | RTDB helper utilities → `appkit/providers/db-firebase`; letitrip wires its path constants                                                                                                                                                                                                                                                                |
| `lib/firebase/rtdb-paths.ts`        | EXTRACT-RULE | RTDB path registry pattern → `appkit/providers/db-firebase`; letitrip registers its own paths via config object                                                                                                                                                                                                                                          |
| `lib/firebase/storage.ts`           | DUPLICATE    | Check `@mohasinac/storage-firebase`                                                                                                                                                                                                                                                                                                                      |
| `lib/monitoring/` (6 files)         | DUPLICATE    | Overlaps with `@mohasinac/monitoring`; consolidate                                                                                                                                                                                                                                                                                                       |
| `lib/security/authorization.ts`     | DUPLICATE    | Check `@mohasinac/security` `requireRole`                                                                                                                                                                                                                                                                                                                |
| `lib/security/rate-limit.ts`        | DUPLICATE    | Check `@mohasinac/security` `rateLimit`                                                                                                                                                                                                                                                                                                                  |
| `lib/seo/json-ld.ts`                | DUPLICATE    | Compare with `@mohasinac/seo`                                                                                                                                                                                                                                                                                                                            |
| `lib/validation/schemas.ts`         | DUPLICATE    | Compare with `@mohasinac/validation`                                                                                                                                                                                                                                                                                                                     |
| `lib/query/firebase-sieve.ts`       | DUPLICATE    | Check `@mohasinac/db-firebase` Sieve translation                                                                                                                                                                                                                                                                                                         |
| `lib/http/index.ts`                 | DUPLICATE    | Check `@mohasinac/http`                                                                                                                                                                                                                                                                                                                                  |
| `lib/email.ts`                      | EXTRACT-DATA | Email template builder → `appkit/providers/email-resend`; letitrip injects its template ID map                                                                                                                                                                                                                                                           |
| `lib/encryption.ts`                 | EXTRACT      | AES-256-GCM `encryptField`/`decryptField` + `isPiiEncrypted` pattern is 100% generic. Only `SETTINGS_ENCRYPTION_KEY` env var name is app-specific. Move core crypto to `appkit/security` as `encryptAtRest()`/`decryptAtRest()`; letitrip imports and re-exports with its env key wiring                                                                 |
| `lib/pii.ts`                        | EXTRACT      | PII encryption + blind-index pattern is generic (any app stores email/phone). Move `encryptPii`, `decryptPii`, `isPiiEncrypted`, `piiBlindIndex`, `encryptPiiFields`, `decryptPiiFields`, `addPiiIndices` to `appkit/security`. The `REVIEW_PII_FIELDS` / `USER_PII_FIELDS` field-name constants STAY in letitrip (they reference letitrip schema types) |
| `lib/tokens.ts`                     | EXTRACT-DATA | Firebase custom token helper → `appkit/features/auth`; letitrip wires RTDB storage path                                                                                                                                                                                                                                                                  |
| `lib/server-logger.ts`              | EXTRACT      | Generic server-side structured logger; move to `appkit/monitoring`                                                                                                                                                                                                                                                                                       |
| `lib/api-response.ts`               | EXTRACT      | Standard JSON response builder; move to `appkit/next`                                                                                                                                                                                                                                                                                                    |
| `lib/consent-otp.ts`                | EXTRACT-RULE | OTP consent flow → `appkit/security`; letitrip injects India regulatory copy + SMS provider config                                                                                                                                                                                                                                                       |
| `lib/integration-keys.ts`           | STAY         | API key config — letitrip integrations                                                                                                                                                                                                                                                                                                                   |
| `lib/payment/razorpay.ts`           | DUPLICATE    | Should be in `appkit/providers/payment-razorpay`                                                                                                                                                                                                                                                                                                         |
| `lib/shiprocket/` (3 files)         | DUPLICATE    | Should be in `appkit/providers/shipping-shiprocket`                                                                                                                                                                                                                                                                                                      |
| `lib/oauth/meta.ts`                 | EXTRACT-DATA | Meta OAuth init → `appkit/providers/auth-firebase`; letitrip wires its Meta app credentials                                                                                                                                                                                                                                                              |
| `lib/pwa/` (3 files)                | EXTRACT      | Runtime caching rules — generic PWA patterns; move to `appkit/next`                                                                                                                                                                                                                                                                                      |
| `lib/helpers/faq-variables.ts`      | STAY         | FAQ variable substitution — letitrip FAQ content                                                                                                                                                                                                                                                                                                         |

---

### `src/helpers/` (25 files → 4 remaining)

> **✅ H2 Complete (2026-04-09):** `src/helpers/data/` (7 files) and `src/helpers/ui/` (3 files) shim
> directories have been **deleted**. All callers now import directly from the respective packages.
> `src/helpers/index.ts` and `src/index.ts` no longer re-export these sub-directories.

**Deleted shim directories:**

| Deleted file                        | Was a thin shim for                                         | Now import from                            |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `helpers/data/array.helper.ts`      | `@mohasinac/utils` `groupBy`, `unique`, `sortBy`, …         | `@mohasinac/utils` directly                |
| `helpers/data/filter.helper.ts`     | `buildSieveFilters` — now in `@mohasinac/utils`             | `@mohasinac/utils` directly                |
| `helpers/data/object.helper.ts`     | `@mohasinac/utils` `deepMerge`, `pick`, `omit`, …           | `@mohasinac/utils` directly                |
| `helpers/data/pagination.helper.ts` | `@mohasinac/utils` `calculatePagination`                    | `@mohasinac/utils` directly                |
| `helpers/data/sieve.helper.ts`      | In-memory `applySieveToArray` — **deleted, no replacement** | Use `firebase-sieve.ts` (Firestore-native) |
| `helpers/data/sorting.helper.ts`    | `@mohasinac/utils` `sort`                                   | `@mohasinac/utils` directly                |
| `helpers/ui/style.helper.ts`        | `classNames` — now in `@mohasinac/ui`                       | `@mohasinac/ui` directly                   |
| `helpers/ui/color.helper.ts`        | `@mohasinac/utils` color helpers                            | `@mohasinac/utils` directly                |
| `helpers/ui/animation.helper.ts`    | `@mohasinac/utils` easings                                  | `@mohasinac/utils` directly                |

**Remaining helpers (4 files — letitrip-specific logic):**

| File                | Tag          | Decision                                                                                                                                                     |
| ------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `business-day.ts`   | EXTRACT-RULE | Business day calculator → `appkit/utils`; letitrip injects holiday calendar + business hours config                                                          |
| `guest-cart.ts`     | EXTRACT-DATA | Guest cart localStorage helpers → `appkit/features/cart`; letitrip wires its `CartItem` schema + merge strategy                                              |
| `id-generators.ts`  | EXTRACT      | Unique ID generation helpers — generic; move to `appkit/utils`                                                                                               |
| `order-splitter.ts` | EXTRACT-RULE | Order split engine `splitOrdersBySeller(items, config)` → `appkit/features/checkout`; letitrip injects `platformFeePercent`, `codFeeFixed`, seller fee rules |

---

### `src/utils/` (23 files)

> **✅ Partially complete (2026-04-09):** `src/utils/index.ts` barrel no longer re-exports from
> `@mohasinac/utils`. Callers import from the package directly. The IN-specific formatter STAY
> row is now obsolete — defaults in `@mohasinac/utils` are `INR`/`en-IN` (updated 2026-04-09),
> so no letitrip-specific locale override is needed.

| Files                                          | Tag          | Decision                                                                      |
| ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| General formatters, converters, date helpers   | ✅ COMPLETED | Barrel shims removed; all callers import from `@mohasinac/utils` directly     |
| INR currency formatter, `en-IN` locale helpers | ✅ COMPLETED | `@mohasinac/utils` defaults now set to `INR`/`en-IN`; no letitrip copy needed |

---

### `src/classes/` (10 files)

| File                | Tag       | Decision                               |
| ------------------- | --------- | -------------------------------------- |
| `CacheManager.ts`   | DUPLICATE | Identical to `@mohasinac/core`; delete |
| `EventBus.ts`       | DUPLICATE | Identical to `@mohasinac/core`; delete |
| `Logger.ts`         | DUPLICATE | Identical to `@mohasinac/core`; delete |
| `Queue.ts`          | DUPLICATE | Identical to `@mohasinac/core`; delete |
| `StorageManager.ts` | DUPLICATE | Identical to `@mohasinac/core`; delete |

These 5 files should be deleted immediately. All imports updated to `@mohasinac/appkit/core`.

---

### `src/constants/` (18 files) — ALL STAY

Letitrip-specific constants: ROUTES, API_ENDPOINTS, RBAC, COLLECTION_NAMES, THEME_CONSTANTS.

---

### `src/contexts/` (5 files) — ALL STAY

React contexts wired to letitrip auth + site settings.

---

### `src/i18n/` (4 files) — ALL STAY

next-intl configuration, locale detection, message merging.

---

### `src/config/` (1 file) — STAY

Site configuration constants.

---

### Root Config Files

| File                     | Tag       | Notes                                |
| ------------------------ | --------- | ------------------------------------ |
| `next.config.js`         | STAY      | Letitrip-specific Next.js config     |
| `tailwind.config.js`     | STAY      | Letitrip Tailwind config             |
| `tsconfig.json`          | STAY      | Path aliases                         |
| `firebase.json`          | STAY      | Firebase project config              |
| `firestore.rules`        | STAY      | Firestore security rules             |
| `storage.rules`          | STAY      | Storage security rules               |
| `database.rules.json`    | STAY      | RTDB rules                           |
| `firestore.indexes.json` | STAY      | Composite indices                    |
| `vercel.json`            | STAY      | Vercel deployment config             |
| `instrumentation.ts`     | DUPLICATE | Use `appkit/instrumentation` pattern |
| `jest.config.ts`         | STAY      | Test config                          |
| `package.json`           | STAY      | Letitrip dependencies                |

---

## 6. Starting a New App with appkit

After migration, bootstrapping a new e-commerce app (e.g. licorice, hobson):

### Step 1 — Install

```bash
npm install @mohasinac/appkit
```

### Step 2 — Register Providers

```ts
// providers.config.ts
import { registerProviders } from "@mohasinac/appkit/contracts";
import { firebaseDbProvider } from "@mohasinac/appkit/providers/db-firebase";
import { FirebaseAuthProvider } from "@mohasinac/appkit/providers/auth-firebase";
import { ResendEmailProvider } from "@mohasinac/appkit/providers/email-resend";
import { tailwindStyleAdapter } from "@mohasinac/appkit/style/tailwind";

registerProviders({
  db: firebaseDbProvider,
  auth: new FirebaseAuthProvider(),
  email: new ResendEmailProvider(process.env.RESEND_API_KEY!),
  style: tailwindStyleAdapter,
});
```

### Step 3 — Enable Features

```ts
// features.config.ts
import type { FeaturesConfig } from "@mohasinac/appkit/contracts";

export default {
  products: true,
  categories: true,
  cart: true,
  checkout: true,
  orders: true,
  blog: false,
  events: false,
} satisfies FeaturesConfig;
```

### Step 4 — Wire CLI (next.config.js)

```js
const { withFeatures } = require("@mohasinac/appkit/cli");
const features = require("./features.config").default;
module.exports = withFeatures(features)({
  /* next config */
});
```

### Step 5 — Wire i18n

```ts
// src/i18n/request.ts
import { mergeFeatureMessages } from "@mohasinac/appkit/cli";
import features from "../../features.config";
export default async function getRequestConfig({ locale }) {
  return { locale, messages: await mergeFeatureMessages(locale, features) };
}
```

### Step 6 — Add API Route Stubs

```ts
// app/api/products/route.ts
import { withProviders } from "@/providers.config";
import {
  GET as _GET,
  POST as _POST,
} from "@mohasinac/appkit/features/products";
export const GET = withProviders(_GET);
export const POST = withProviders(_POST);
```

### Step 7 — Use Components

```tsx
import { ProductsListView } from "@mohasinac/appkit/features/products";
import { Section, Heading } from "@mohasinac/appkit/ui";

export default function ProductsPage() {
  return (
    <Section>
      <Heading level={1}>Products</Heading>
      <ProductsListView />
    </Section>
  );
}
```

---

## 7. Summary Statistics

| Metric                                     | Before                                  | After                                         |
| ------------------------------------------ | --------------------------------------- | --------------------------------------------- |
| Packages to manage                         | 58                                      | 4 (appkit + cli + eslint-plugin + create-app) |
| Publish steps per release                  | 58                                      | 1 (appkit) + 3 standalone                     |
| Duplicate files to delete from letitrip.in | ~80                                     | 0                                             |
| Import lines to update in letitrip.in      | ~350                                    | Auto-migrated via codemod                     |
| Tree-shaking preserved                     | Yes                                     | Yes (sub-path exports)                        |
| New project setup time                     | ~2 hours (58 packages)                  | ~15 minutes                                   |
| Breaking change to existing consumers      | No (old packages re-export from appkit) | —                                             |

---

## 8. Risk and Mitigation

| Risk                              | Mitigation                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Circular imports inside appkit    | Layer discipline: contracts -> core -> errors -> … -> features. No upward imports.                      |
| Bundle size regression            | tsup with `splitting: true`; each sub-path is a separate chunk                                          |
| Consumer breaks during transition | Old packages re-export from appkit; no consumer code changes forced                                     |
| Firebase admin SDK tree-shaking   | Mark `firebase-admin` as external in tsup; use `serverExternalPackages` in next.config                  |
| CLI binary compatibility          | cli stays separate; its Node API is re-exported as `appkit/cli`                                         |
| PII leaking through API response  | `PiiScrubber` response middleware strips encrypted ciphertext before JSON serialisation; see Section 21 |

---

## 9. Execution Order

Week 1 — Foundation
[ ] Phase 0: Create appkit package shell, exports map, tsup config
[ ] Phase 1: Migrate primitives (contracts, core, http, errors, utils, validation, tokens, next, react, ui, security, seo, monitoring, instrumentation, css-\*)
[ ] Verify: npx tsc --noEmit passes on appkit alone

Week 2 — Providers + Features
[ ] Phase 2: Migrate providers (db-firebase, auth-firebase, email-resend, storage-firebase, payment-razorpay, search-algolia, shipping-shiprocket)
[ ] Phase 3: Migrate all feat-\* packages (30 packages); consolidate feat-preorders into pre-orders
[ ] Verify: node scripts/build-all.mjs passes

Week 3 — Consumer Migration
[ ] Phase 5: Add deprecation notices to old 55 packages (re-export from appkit)
[ ] Phase 6: Run codemod on letitrip.in (update import paths)
[ ] Delete duplicate files from letitrip.in/src/ (classes/, lib/errors/, etc.)
[ ] Run: npx tsc --noEmit and npm run build in letitrip.in
[ ] Publish: appkit@2.0.0 to npm; old packages at v1.5.0 with deprecation notice

Week 4 — Cleanup + Docs
[ ] Update letitrip.in package.json: replace all @mohasinac/\* with @mohasinac/appkit@^2.0.0
[ ] Update create-app scaffold to use appkit
[ ] Write appkit README with quickstart guide
[ ] Tag: git tag packages-v2.0.0

---

## 10. Out of Scope

The following are explicitly excluded from this migration:

- `functions/` (Firebase Functions) — separate runtime, stays completely separate
- `scripts/` in letitrip.in — deployment scripts, not application code
- `firestore.rules`, `storage.rules`, `database.rules.json` — Firebase infra config
- `jest.config.ts`, `eslint.config.mjs` — tooling config, not migrated
- `@mohasinac/eslint-plugin-letitrip` — ESLint plugins must be standalone for resolution to work
- `@mohasinac/create-app` — scaffold CLI must be independently npx-able

> NOTE: `messages/` is explicitly IN scope — see Section 11 (i18n splitting).

---

## 11. Theming System — letitrip as the Default

### Contract

letitrip's THEME_CONSTANTS becomes the **canonical default theme** for appkit. A new app
gets letitrip's full styling out of the box; it overrides only what it needs.

The chain is:

```
tailwind.config.js   ← defines CSS custom properties + color scales
   ↓
@mohasinac/tokens   ← BASE_THEME_CONSTANTS — structural classes only (layout, spacing, grid…)
   ↓
letitrip theme.ts    ← THEME_CONSTANTS = spreads BASE + adds brand values (badge, card, accent…)
   ↓
appkit/tokens        ← re-exports letitrip THEME_CONSTANTS as the DEFAULT_THEME
   ↓
consumer app         ← imports DEFAULT_THEME, optionally spreads + overrides specific keys
```

### What moves into appkit

`src/constants/theme.ts` (the full letitrip extension) moves to `appkit/src/tokens/theme.ts`
and is exported as `DEFAULT_THEME_CONSTANTS`. letitrip then imports it back:

```ts
// letitrip: src/constants/theme.ts (after migration)
import { DEFAULT_THEME_CONSTANTS } from "@mohasinac/appkit/tokens";
export const THEME_CONSTANTS = DEFAULT_THEME_CONSTANTS; // no overrides needed — letitrip IS the default
```

A new project (licorice, hobson) overrides only what differs:

```ts
// licorice: src/constants/theme.ts
import { DEFAULT_THEME_CONSTANTS } from "@mohasinac/appkit/tokens";
export const THEME_CONSTANTS = {
  ...DEFAULT_THEME_CONSTANTS,
  // Override brand accent — everything else stays letitrip-default
  accent: {
    ...DEFAULT_THEME_CONSTANTS.accent,
    primary: "bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-500",
  },
};
```

### Tailwind color extension is the only file a noob needs to touch

The single file a designer/noob edits to rebrand is `tailwind.config.js`:

```js
// tailwind.config.js — change these 2 color scales to rebrand the entire app
colors: {
  primary:   { DEFAULT: "#84e122", 50: "...", ... },   // ← change to your brand color
  secondary: { DEFAULT: "#e91e8c", 50: "...", ... },   // ← change to your dark-mode accent
}
```

All THEME_CONSTANTS entries reference only `primary-*` / `secondary-*` / `zinc-*` / `slate-*`
Tailwind utility classes — no hex values inline. Changing the two color scales rebrands the
whole UI automatically. No component changes needed.

### Breakpoint tokens

Breakpoints live in `appkit/tokens` as typed constants and Tailwind prefix strings:

```ts
// appkit/src/tokens/breakpoints.ts
export const BREAKPOINTS = {
  sm: 640, // mobile landscape + small tablet
  md: 768, // tablet portrait
  lg: 1024, // tablet landscape + small laptop
  xl: 1280, // desktop
  "2xl": 1536, // widescreen
} as const;

export const BP = {
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
  "2xl": "2xl:",
} as const;
```

Components built in appkit must include at least one `xl:` breakpoint class (ESLint rule
`lir/require-xl-breakpoints`). Consumer projects cannot accidentally break widescreen layouts
by omitting large-viewport sizing.

### Viewport-relative sizing (clamp pattern)

letitrip uses `clamp(min, preferred, max)` for all card/media dimensions so layouts scale
naturally between mobile and 4K without fixed breakpoint jumps. This pattern is codified in
`THEME_CONSTANTS.card.dimensions` and `THEME_CONSTANTS.homepage.*`. All appkit feature
shells adopt these values. Consumers override per-feature by passing a `dimensions` prop or
extending in their local `THEME_CONSTANTS`.

---

## 12. HTML Wrapper Reuse Contract

### Rule: no raw HTML tags in feature code

Every semantic HTML element has a typed wrapper in `@mohasinac/appkit/ui`. These wrappers:

- Accept `className` for Tailwind customisation
- Accept `as` prop for tag-switching (`<Heading as="div">` renders a `<div>` instead of `<h2>`)
- Forward all native HTML attributes
- Add no runtime overhead (compile to the native element)

| HTML tag    | appkit wrapper          | Notes                                              |
| ----------- | ----------------------- | -------------------------------------------------- |
| `<section>` | `<Section>`             | Adds `role="region"` by default                    |
| `<article>` | `<Article>`             |                                                    |
| `<main>`    | `<Main>`                |                                                    |
| `<aside>`   | `<Aside>`               |                                                    |
| `<nav>`     | `<Nav>`                 |                                                    |
| `<h1>…<h6>` | `<Heading level={1…6}>` | `variant` prop for visual style vs. semantic level |
| `<p>`       | `<Text>`                | `variant="lead"/"caption"/"small"`                 |
| `<span>`    | `<Span>`                |                                                    |
| `<small>`   | `<Caption>`             |                                                    |
| `<label>`   | `<Label>`               |                                                    |
| `<a>`       | `<TextLink>`            | Wraps `next/link`; handles `href` type safety      |
| `<button>`  | `<Button>`              | `variant="primary"/"outline"/"ghost"/"danger"`     |
| `<ul>`      | `<Ul>`                  |                                                    |
| `<li>`      | `<Li>`                  |                                                    |

### Theming via className + THEME_CONSTANTS

Components never hardcode color classes internally — they accept `className` and let the
consumer pass THEME_CONSTANTS values:

```tsx
// In a feature shell (appkit)
<Section className={THEME_CONSTANTS.sectionBg.subtle}>
  <Heading level={2} className={THEME_CONSTANTS.typography.heading.lg}>
    {t("title")}
  </Heading>
</Section>

// Consumer overrides just the className — no forking needed
<Section className="bg-violet-50 dark:bg-violet-950">
```

A noob developer changes ONE constant in `THEME_CONSTANTS` and every component using that
constant updates automatically across the whole app.

### Pattern for new feature shells in appkit

```tsx
// appkit/src/features/orders/components/OrdersListView.tsx
import { Section, Heading, Text } from "@mohasinac/appkit/ui";
import { THEME_CONSTANTS } from "@mohasinac/appkit/tokens";

interface OrdersListViewProps {
  className?: string; // ← consumer overrides container
  tableClassName?: string; // ← consumer overrides table
  emptyStateText?: string; // ← consumer supplies own copy
}

export function OrdersListView({
  className,
  tableClassName,
  emptyStateText,
}: OrdersListViewProps) {
  const { spacing, enhancedCard } = THEME_CONSTANTS;
  return (
    <Section className={className ?? spacing.section.md}>
      <div className={tableClassName ?? enhancedCard.base}>{/* ... */}</div>
    </Section>
  );
}
```

---

## 13. i18n Splitting Strategy

### Current state (problem)

| File               | Size   | Namespaces                         |
| ------------------ | ------ | ---------------------------------- |
| `messages/en.json` | 281 KB | 123 top-level keys in one monolith |

Every page load — even a simple product detail page — forces Next.js to parse and hydrate
the full 281 KB JSON. Cold-start performance degrades linearly as the namespace count grows.

### Target state

One file per namespace, grouped by feature domain, loaded lazily per route:

```
messages/
├── en/                           ← locale dir
│   ├── common.json               ← a11y, actions, confirm, empty, errorPages, loading, locale, roles, sort, status, table, unsavedChanges
│   ├── ui.json                   ← form, formFieldTypes, filters, listingLayout, upload, avatar, mediaEditor, camera
│   ├── nav.json                  ← nav, footer, adminNav, sellerNav, bottomActions
│   ├── auth.json                 ← auth
│   ├── homepage.json             ← homepage
│   ├── products.json             ← products, reviewCard, sort (product sort variants)
│   ├── categories.json           ← categories
│   ├── cart.json                 ← cart, checkout
│   ├── orders.json               ← orders, orderSuccess, trackOrder
│   ├── pre-orders.json           ← preOrders, preOrderDetail
│   ├── events.json               ← events, eventBanner, eventStatus, eventTypes, auctionDetail, auctions, howAuctionsWork
│   ├── seller.json               ← seller, sellerAddresses, sellerAnalytics, sellerAuctions, sellerCoupons, sellerDashboard, sellerNav, sellerOrders, sellerPayouts, sellerPayoutSettings, sellerProducts, sellerShipping, sellerStore, sellerStorefront, sellersPage, becomeSeller, sellerGuide, howPayoutsWork
│   ├── user.json                 ← userAccount, userHub, userSettings, profile, settings, addresses, notifications, messages, offers, chat, wishlist
│   ├── stores.json               ← storePage, storesPage, storeAddresses
│   ├── blog.json                 ← blog, blogCard
│   ├── reviews.json              ← reviews
│   ├── faq.json                  ← faq
│   ├── search.json               ← search
│   ├── promotions.json           ← promotions
│   ├── loyalty.json              ← (loyalty keys — to be added)
│   ├── admin.json                ← adminAlerts, adminAnalytics, adminBids, adminBlog, adminCarousel, adminCategories, adminCoupons, adminDashboard, adminEvents, adminFaqs, adminFeatureFlags, adminMedia, adminNav, adminNavigation, adminNewsletter, adminOrders, adminPayouts, adminProducts, adminReviews, adminSections, adminSessions, adminSite, adminStats, adminStores, adminUsers, adminDashboard, copilot
│   ├── cms.json                  ← about, fees, howCheckoutWorks, howOrdersWork, howOffersWork, howReviewsWork, howPreOrdersWork, help, shippingPolicy, refundPolicy, privacy, terms, cookies, securityPage, feedbackConfig
│   └── contact.json              ← contact
└── [locale]/                     ← hi/, ar/, etc. — same structure
```

### Loading mechanism

next-intl supports per-namespace lazy loading via `getMessages` with an explicit namespace
list. Each page (server component) requests only the namespaces it uses:

```ts
// src/i18n/request.ts — after split
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = hasLocale(routing.locales, requested) ? requested : "en";

  // Dynamic import: each namespace is a separate file — only loaded files are bundles
  const loadNamespace = (ns: string) =>
    import(`../../messages/${locale}/${ns}.json`)
      .then((m) => m.default)
      .catch(() => ({}));

  // Common namespaces loaded on every request (tiny files)
  const common = await Promise.all(["common", "ui", "nav"].map(loadNamespace));

  return {
    locale,
    messages: Object.assign({}, ...common),
    // Per-page namespaces are loaded via `getMessages({ locale })` in each page
  };
});
```

And each page server component adds its own namespaces:

```ts
// src/app/[locale]/orders/page.tsx
import { getMessages } from "next-intl/server";
export default async function OrdersPage() {
  await getMessages({ locale, namespaces: ["orders", "common"] });
  // ...
}
```

### Namespace → appkit package alignment

Appkit feature packages ship their own `messages/en/` directory. `mergeFeatureMessages`
already handles this. After the split, each feat-\* package ships its own per-namespace file:

```
@mohasinac/appkit/features/orders/messages/en/orders.json   ← default English; overridden by app
@mohasinac/appkit/features/seller/messages/en/seller.json
```

Consumer app messages win (they are merged AFTER appkit defaults, so any key override works).

### Migration steps

1. Write a one-time script `scripts/split-messages.mjs` that:
   - Reads `messages/en.json`
   - Groups namespaces per the table above
   - Writes one file per group to `messages/en/{group}.json`
   - Prints diff for review — no destructive deletion until verified
2. Update `src/i18n/request.ts` to use per-namespace loading
3. Update every `useTranslations("namespace")` call — no code changes needed (namespaces are
   unchanged; only the file layout changes)
4. Delete `messages/en.json` once the per-file loading is confirmed working
5. Repeat for each additional locale (hi, ar, etc.)

---

## 14. Schema Sharing Contract — Generic Base Types

### The problem with monolithic letitrip schemas

Currently `src/db/schema/products.ts` exports `ProductDocument` — a type specific to letitrip
(it includes `sellerId`, `auctionConfig`, `sellerSplit`, etc.). A `licorice` app cannot reuse
this type; it would pull in marketplace fields that don't apply to an Ayurvedic e-commerce store.

### Solution: Base → Extension pattern

appkit ships `Base*Document` types. Each app imports the base and extends it with its own
domain fields. The repository, API route, and view shell all accept the base type; they work
for any app. The extension adds fields; it doesn't break compatibility.

```ts
// appkit/src/features/products/types/index.ts
export interface BaseProductDocument {
  id: string;
  title: string;
  description: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  availableQuantity: number;
  mainImage: string;
  images: string[];
  video?: MediaVideo;
  status: "draft" | "published" | "archived";
  tags: string[];
  specifications?: { key: string; value: string }[];
  shippingInfo?: string;
  returnPolicy?: string;
  condition?: "new" | "used" | "refurbished";
  createdAt: Date;
  updatedAt: Date;
}

// letitrip/src/db/schema/products.ts
import type { BaseProductDocument } from "@mohasinac/appkit/features/products";
export interface ProductDocument extends BaseProductDocument {
  sellerId: string; // marketplace
  storeId?: string; // marketplace
  sellerName: string; // denormalised for display
  sellerEmail: string; // denormalised for PII queries
  sellerSplit?: number; // percentage seller earns; platform keeps the rest
  platformFee?: number;
  orderType?: "standard" | "preorder" | "auction" | "offer";
  auctionConfig?: AuctionConfig; // present when orderType === "auction"
  preOrderConfig?: PreOrderConfig;
}
```

### Base types that ship in appkit

| appkit base type                   | Location                     | Fields                                                                                             |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `BaseUserDocument`                 | `appkit/features/auth`       | uid, email, displayName, photoURL, role, emailVerified, createdAt, updatedAt                       |
| `BaseAddressDocument`              | `appkit/features/account`    | id, userId, name, line1, line2, city, state, country, postalCode, phone, isDefault                 |
| `BaseProductDocument`              | `appkit/features/products`   | id, title, description, slug, price, currency, stock, images, video, status, category, tags, seo\* |
| `BaseOrderDocument`                | `appkit/features/orders`     | id, userId, items[], status, paymentStatus, shippingAddress, totalPrice, currency, orderDate       |
| `BaseOrderItem`                    | `appkit/features/orders`     | productId, productTitle, quantity, unitPrice, totalPrice                                           |
| `BaseReviewDocument`               | `appkit/features/reviews`    | id, productId, userId, rating, title, comment, images, status, helpfulCount, verified              |
| `BaseBlogPostDocument`             | `appkit/features/blog`       | id, title, slug, content, excerpt, coverImage, authorId, status, tags, publishedAt                 |
| `BaseCategoryDocument`             | `appkit/features/categories` | id, name, slug, parentId, icon, image, sortOrder                                                   |
| `BaseFaqDocument`                  | `appkit/features/faq`        | id, question, answer, category, sortOrder, voteCount                                               |
| `BaseStoreDocument`                | `appkit/features/stores`     | id, name, slug, description, logo, coverImage, ownerId, status, createdAt                          |
| `BaseCouponDocument`               | `appkit/features/promotions` | code, discountType, discountValue, minOrderAmount, maxUses, usedCount, expiresAt, isActive         |
| `BaseNotificationDocument`         | `appkit/features/account`    | id, userId, type, title, body, read, createdAt, link                                               |
| `BaseSessionDocument`              | `appkit/features/auth`       | id, userId, userAgent, ip, createdAt, lastActiveAt, revokedAt                                      |
| `BaseNewsletterSubscriberDocument` | `appkit/features/admin`      | email, subscribedAt, locale, status                                                                |
| `BaseSiteSettingsDocument`         | `appkit/features/cms`        | siteName, logo, favicon, tagline, contactEmail, socialLinks, seo                                   |
| `BaseCmsPageDocument`              | `appkit/features/cms`        | pageId, sections[], updatedAt, updatedBy                                                           |

---

## 15. PII & Encryption Contract

### What moves to `appkit/security`

The PII encrypt/decrypt + blind-index pattern in `lib/pii.ts` and `lib/encryption.ts` is
fully generic — any app that stores user email or phone in Firestore needs the same tools.
The implementation (AES-256-GCM, HMAC-SHA256 blind indices) moves to appkit:

```ts
// appkit/src/security/pii.ts  (moved from letitrip lib/pii.ts)
export function encryptPii(
  plaintext: string | null | undefined,
): string | null | undefined;
export function decryptPii(
  encrypted: string | null | undefined,
): string | null | undefined;
export function isPiiEncrypted(value: string): boolean;
export function piiBlindIndex(
  value: string | null | undefined,
): string | undefined;
export function encryptPiiFields<T>(obj: T, fields: (keyof T)[]): T;
export function decryptPiiFields<T>(obj: T, fields: (keyof T)[]): T;
export function addPiiIndices<T>(obj: T, indexMap: Record<keyof T, string>): T;

// appkit/src/security/encryption.ts  (moved from letitrip lib/encryption.ts)
export function encryptAtRest(plaintext: string): string; // AES-256-GCM "enc:v1:..." prefix
export function decryptAtRest(ciphertext: string): string;
export function isEncrypted(value: string): boolean;
```

The env var names (`PII_SECRET`, `SETTINGS_ENCRYPTION_KEY`) are passed in by the consumer:

```ts
// letitrip: src/lib/pii.ts (after migration — just re-export with env wiring)
export {
  encryptPii,
  decryptPii,
  isPiiEncrypted,
  piiBlindIndex,
  encryptPiiFields,
  decryptPiiFields,
  addPiiIndices,
} from "@mohasinac/appkit/security";

// letitrip: src/lib/encryption.ts (after migration)
export {
  encryptAtRest,
  decryptAtRest,
  isEncrypted,
} from "@mohasinac/appkit/security";
```

### PII field declaration pattern

Each domain module in appkit declares which fields on its base type are PII:

```ts
// appkit/src/features/auth/pii.ts
export const USER_PII_FIELDS = [
  "email",
  "phoneNumber",
] as const satisfies (keyof BaseUserDocument)[];
export const USER_PII_INDEX_MAP = {
  email: "emailIndex",
  phoneNumber: "phoneIndex",
} as const;

// appkit/src/features/reviews/pii.ts
export const REVIEW_PII_FIELDS = [
  "userName",
  "userEmail",
] as const satisfies (keyof BaseReviewDocument)[];
```

letitrip extends these lists with its extra fields:

```ts
// letitrip/src/db/schema/users.ts
import { USER_PII_FIELDS as BASE_PII } from "@mohasinac/appkit/features/auth";
export const USER_PII_FIELDS = [...BASE_PII, "bankAccount"] as const;
```

### Repository PII integration

Once `encryptPiiFields`/`decryptPiiFields` live in appkit, the repository pattern is:

```ts
// appkit/src/providers/db-firebase/pii-repository.ts
export abstract class PiiRepository<T> extends BaseRepository<T> {
  protected abstract piiFields: readonly (keyof T)[];
  protected abstract piiIndexMap: Record<string, string>;

  protected override mapDoc<D = T>(snap: DocumentSnapshot): D {
    const raw = super.mapDoc<T>(snap);
    return decryptPiiFields(raw as Record<string, unknown>, [
      ...this.piiFields,
    ]) as unknown as D;
  }

  protected encryptForWrite(data: Partial<T>): Partial<T> {
    let encrypted = encryptPiiFields(data as Record<string, unknown>, [
      ...this.piiFields,
    ]);
    encrypted = addPiiIndices(encrypted, this.piiIndexMap);
    return encrypted as Partial<T>;
  }
}
```

Any repository that handles PII extends `PiiRepository<T>` instead of `BaseRepository<T>`.
No PII can leak in read/write paths because the base class handles it transparently.

> **Section 21** extends this contract: even if a repository correctly decrypts, a raw
> Firestore field that wasn’t declared in `piiFields` can still escape through an API
> response as an encrypted ciphertext string (`enc:v1:...`). `PiiScrubberMiddleware` in
> the response chain catches and strips any such strings before they reach the client.

---

## 16. Sieve Query System — Database-Layer Only

### Core rule

> **Filtering, sorting, and pagination ALWAYS run at the Firestore query layer.  
> In-memory processing of collections is forbidden.**

`src/helpers/data/sieve.helper.ts` (`applySieveToArray`) has been **deleted**.  
The only entry point for list queries is `applySieveToFirestore` in `src/lib/query/firebase-sieve.ts`.  
For operators Firestore cannot handle natively, delegate to Algolia — never fetch and filter in memory.

---

### 16.1 — Operator support matrix

| Sieve DSL           | AppKit name               | Firestore translation                                      | Available |
| ------------------- | ------------------------- | ---------------------------------------------------------- | --------- |
| `field==value`      | equals                    | `where(field, "==", value)`                                | ✅        |
| `field!=value`      | notEquals                 | `where(field, "!=", value)`                                | ✅        |
| `field>value`       | greaterThan               | `where(field, ">", value)`                                 | ✅        |
| `field<value`       | lessThan                  | `where(field, "<", value)`                                 | ✅        |
| `field>=value`      | greaterThanOrEqual        | `where(field, ">=", value)`                                | ✅        |
| `field<=value`      | lessThanOrEqual           | `where(field, "<=", value)`                                | ✅        |
| `field@=value`      | contains (array)          | `where(field, "array-contains", value)`                    | ✅        |
| `field_=value`      | startsWith                | `where(field, ">=", v)` + `where(field, "<=", v+"\uf8ff")` | ✅        |
| `-field` sort       | descending                | `orderBy(field, "desc")`                                   | ✅        |
| `field` sort        | ascending                 | `orderBy(field, "asc")`                                    | ✅        |
| `page` + `pageSize` | pagination                | `offset()` + `limit()`                                     | ✅        |
| `field@=*value`     | case-insensitive contains | **NOT supported** — use Algolia                            | ❌        |
| `field_-=value`     | endsWith                  | **NOT supported** — use Algolia                            | ❌        |
| `(f1\|f2)==value`   | multi-field OR            | **NOT supported** — use Algolia                            | ❌        |
| Full-text search    | —                         | **NOT supported** — use Algolia                            | ❌        |

---

### 16.2 — Per-schema `FirebaseSieveFields` configs (moves to appkit)

Every base document type shipped in appkit includes a pre-declared fields config object. Consumer projects extend it with their own marketplace fields.

```ts
// appkit/src/features/products/sieve.ts
export const PRODUCT_SIEVE_FIELDS = {
  title: { canFilter: true, canSort: true },
  category: { canFilter: true, canSort: false },
  subcategory: { canFilter: true, canSort: false },
  brand: { canFilter: true, canSort: false },
  price: { canFilter: true, canSort: true },
  status: { canFilter: true, canSort: false },
  featured: { canFilter: true, canSort: false },
  tags: { canFilter: true, canSort: false }, // @= operator → array-contains
  condition: { canFilter: true, canSort: false },
  isAuction: { canFilter: true, canSort: false },
  isPreOrder: { canFilter: true, canSort: false },
  createdAt: { canFilter: true, canSort: true },
  updatedAt: { canFilter: false, canSort: true },
} as const;

// appkit/src/features/orders/sieve.ts
export const ORDER_SIEVE_FIELDS = {
  status: { canFilter: true, canSort: false },
  paymentStatus: { canFilter: true, canSort: false },
  orderDate: { canFilter: true, canSort: true },
  totalPrice: { canFilter: true, canSort: true },
  createdAt: { canFilter: true, canSort: true },
} as const;

// appkit/src/features/reviews/sieve.ts
export const REVIEW_SIEVE_FIELDS = {
  productId: { canFilter: true, canSort: false },
  sellerId: { canFilter: true, canSort: false },
  rating: { canFilter: true, canSort: true },
  status: { canFilter: true, canSort: false },
  verified: { canFilter: true, canSort: false },
  featured: { canFilter: true, canSort: false },
  createdAt: { canFilter: true, canSort: true },
} as const;

// appkit/src/features/blog/sieve.ts
export const BLOG_SIEVE_FIELDS = {
  status: { canFilter: true, canSort: false },
  category: { canFilter: true, canSort: false },
  featured: { canFilter: true, canSort: false },
  authorId: { canFilter: true, canSort: false },
  tags: { canFilter: true, canSort: false }, // @=
  publishedAt: { canFilter: true, canSort: true },
  createdAt: { canFilter: true, canSort: true },
} as const;

// appkit/src/features/faq/sieve.ts
export const FAQ_SIEVE_FIELDS = {
  category: { canFilter: true, canSort: false },
  isActive: { canFilter: true, canSort: false },
  isPinned: { canFilter: true, canSort: false },
  showOnHomepage: { canFilter: true, canSort: false },
  showInFooter: { canFilter: true, canSort: false },
  tags: { canFilter: true, canSort: false }, // @=
  priority: { canFilter: true, canSort: true },
  order: { canFilter: true, canSort: true },
} as const;

// appkit/src/features/events/sieve.ts
export const EVENT_SIEVE_FIELDS = {
  status: { canFilter: true, canSort: false },
  type: { canFilter: true, canSort: false },
  startsAt: { canFilter: true, canSort: true },
  endsAt: { canFilter: true, canSort: true },
  createdAt: { canFilter: true, canSort: true },
} as const;
```

letitrip extends base configs with marketplace-specific fields:

```ts
// letitrip/src/repositories/product.repository.ts
import { PRODUCT_SIEVE_FIELDS } from "@mohasinac/appkit/features/products";

const FIELDS = {
  ...PRODUCT_SIEVE_FIELDS,
  sellerId: { canFilter: true, canSort: false },
  storeId: { canFilter: true, canSort: false },
  isPromoted: { canFilter: true, canSort: false },
} as const;
```

---

### 16.3 — PII blind-index integration with Sieve

Encrypted PII fields (`email`, `phoneNumber`) cannot be filtered directly because Firestore
holds ciphertext, not plaintext. The blind index field (HMAC-SHA256 of the plaintext) is
the filterable surrogate.

**Field config:**

```ts
// Users sieve config — emailIndex is the filterable stand-in for email
export const USER_SIEVE_FIELDS = {
  emailIndex: { canFilter: true, canSort: false }, // equality queries on encrypted email
  phoneIndex: { canFilter: true, canSort: false }, // equality queries on encrypted phone
  role: { canFilter: true, canSort: false },
  status: { canFilter: true, canSort: false },
  createdAt: { canFilter: true, canSort: true },
} as const;
```

**API route pattern — rewrite PII filter value before Sieve runs:**

```ts
// src/app/api/admin/users/route.ts
import { piiBlindIndex } from "@mohasinac/appkit/security";
import { USER_SIEVE_FIELDS } from "@mohasinac/appkit/features/auth";
import { applySieveToFirestore } from "@/lib/query/firebase-sieve";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  // Rewrite plaintext email to its blind index before passing to Sieve
  let filters = url.searchParams.get("filters") ?? "";
  if (rawEmail) {
    const idx = piiBlindIndex(rawEmail);
    filters = filters ? `${filters},emailIndex==${idx}` : `emailIndex==${idx}`;
  }

  const result = await applySieveToFirestore<UserDocument>({
    baseQuery: db.collection("users"),
    model: { filters, sorts: url.searchParams.get("sorts"), page: ... },
    fields: USER_SIEVE_FIELDS,
  });
  return NextResponse.json(result);
}
```

---

### 16.4 — Required Firestore composite indices

Composite indices are required whenever a Sieve query combines filter + sort on different fields,
or combines multiple `where()` clauses. All indices below map directly to filter combinations
used by `applySieveToFirestore` calls in the codebase.

These are already defined in `firestore.indexes.json`. New Sieve field combos MUST add a matching index entry before deploying.

#### Indices per collection (current state + required)

| Collection      | Fields                                      | Direction           | Required by             |
| --------------- | ------------------------------------------- | ------------------- | ----------------------- |
| `products`      | `status`, `createdAt`                       | ASC, DESC           | Default product listing |
| `products`      | `status`, `category`, `createdAt`           | ASC, ASC, DESC      | Category browse         |
| `products`      | `status`, `availableQuantity`, `createdAt`  | ASC, ASC, DESC      | In-stock filter         |
| `products`      | `sellerId`, `status`, `createdAt`           | ASC, ASC, DESC      | Seller product list     |
| `products`      | `status`, `isAuction`, `createdAt`          | ASC, ASC, DESC      | Auctions browse         |
| `products`      | `status`, `isPreOrder`, `createdAt`         | ASC, ASC, DESC      | Pre-orders browse       |
| `products`      | `status`, `isPromoted`, `createdAt`         | ASC, ASC, DESC      | Promotions browse       |
| `products`      | `status`, `category`, `price`               | ASC, ASC, ASC       | Price-sorted category   |
| `orders`        | `userId`, `orderDate`                       | ASC, DESC           | User order history      |
| `orders`        | `sellerId`, `status`, `orderDate`           | ASC, ASC, DESC      | Seller order management |
| `orders`        | `status`, `paymentStatus`, `orderDate`      | ASC, ASC, DESC      | Admin order management  |
| `orders`        | `userId`, `productId`                       | ASC, ASC            | Duplicate order check   |
| `reviews`       | `productId`, `status`, `createdAt`          | ASC, ASC, DESC      | Product reviews         |
| `reviews`       | `sellerId`, `status`, `rating`              | ASC, ASC, DESC      | Seller reviews          |
| `bids`          | `productId`, `bidDate`                      | ASC, DESC           | Auction bid history     |
| `bids`          | `productId`, `status`, `bidAmount`          | ASC, ASC, DESC      | Winning bid lookup      |
| `bids`          | `userId`, `bidDate`                         | ASC, DESC           | User bid history        |
| `payouts`       | `sellerId`, `status`, `createdAt`           | ASC, ASC, DESC      | Seller payout filter    |
| `sessions`      | `userId`, `isActive`, `expiresAt`           | ASC, ASC, DESC      | Active session check    |
| `notifications` | `userId`, `isRead`, `createdAt`             | ASC, ASC, DESC      | Unread notifications    |
| `blogPosts`     | `status`, `category`, `publishedAt`         | ASC, ASC, DESC      | Blog category listing   |
| `events`        | `status`, `startsAt`                        | ASC, ASC            | Upcoming events         |
| `faqs`          | `isActive`, `category`, `priority`, `order` | ASC, ASC, DESC, ASC | FAQ by category         |
| `coupons`       | `validity.isActive`, `validity.endDate`     | ASC, ASC            | Active coupon check     |
| `categories`    | `tier`, `isActive`, `order`                 | ASC, ASC, ASC       | Tree level listing      |

**Adding a new index:**

```json
// firestore.indexes.json — add to the "indexes" array:
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "isPromoted", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Then deploy: `.\scripts\deploy-firestore-indices.ps1`

---

### 16.5 — Firestore vs Algolia: clear responsibility split

#### `/api/search` — Firestore (startsWith prefix, not full-text)

`GET /api/search?q=nikon` uses `title_=nikon` which compiles to a Firestore range query
(`title >= "nikon"`, `title <= "nikon\uf8ff"`). This is **prefix match only** — not
typo-tolerant, not relevance-ranked, not full-text. It works well for SKU/exact-name lookups.

```
q param present → SearchRepository.search() → title_=query.q → Firestore range query (prefix)
```

For buyer-facing search that needs relevance, typos, or synonym expansion, wire up
`appkit/providers/search-algolia` and proxy through Algolia before hitting the Firestore route.

#### When to use what

| Use case                                                | Use                                          | Why                                                       |
| ------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Admin list with `status==`, `sellerId==`, `createdAt>=` | Firestore (Sieve)                            | Equality/range on indexed fields — Firestore is perfect   |
| Buyer product browse by category + price                | Firestore (Sieve)                            | `category==`, `price>=`, `price<=` are all equality/range |
| Filter by tag membership (`tags@=footwear`)             | Firestore (array-contains)                   | Direct array-contains support                             |
| Buyer search by product name (prefix `q=nikon`)         | Firestore (`_=` operator)                    | Exact prefix range query                                  |
| Buyer search with typos, relevance ranking, fuzzy       | Algolia                                      | Firestore has no relevance scoring                        |
| Full-text search across title + description             | Algolia                                      | Firestore cannot query across multiple fields with OR     |
| Case-insensitive search                                 | Algolia                                      | Firestore filter is always case-sensitive                 |
| "Did you mean?" suggestions                             | Algolia                                      | No Firestore equivalent                                   |
| Faceted search (aggregate counts per category/brand)    | Algolia                                      | No Firestore equivalent                                   |
| Querying encrypted PII (email, phone)                   | Firestore blind index (`emailIndex==<hash>`) | Use HMAC-SHA256 blind index — never search ciphertext     |

#### Algolia index — what goes in

Only the product listing surface sends data to Algolia. The index record shape is `AlgoliaProductRecord`
from `@mohasinac/search-algolia`. Index sync happens server-side on write via Firebase Functions
(Firestore trigger on `products/{id}` → `syncProductToAlgolia()`):

```
User creates/updates product
  → Firestore write
  → Firebase Function trigger
  → buildAlgoliaRecord(product)
  → algolia.saveObject(record)
```

Index objects:

- `products_index` — `AlgoliaProductRecord` (title, brand, description, tags, category, price, status)
- `categories_index` — `CategoryLike` (name, slug, path, isFeatured)
- `stores_index` — `StoreLike` (storeName, storeDescription, storeCategory, location)

**Admin data (orders, users, reviews, payouts) never goes to Algolia.**

---

### 16.6 — `buildSieveFilters` ✅ Complete (2026-04-09)

`src/helpers/data/filter.helper.ts` has been **deleted**.
`buildSieveFilters` already lives in `@mohasinac/utils` (exported via its index).
All letitrip.in callers (18 API routes + admin view components) now import it directly:

```ts
import { buildSieveFilters } from "@mohasinac/utils";

const filters = buildSieveFilters(
  ["status==", statusFilter],
  ["sellerId==", sellerId],
  ["totalPrice>=", minAmount],
);
// → "status==pending,sellerId==abc123,totalPrice>=100"
```

When appkit consolidation (Phase 0-1) is done, the import path will become:

```ts
import { buildSieveFilters } from "@mohasinac/appkit/utils";
```

No source changes needed at that point — just update package.json re-exports.

---

## 17. Dev Tooling — Turbopack + Single-Package Watcher

### Why webpack was forced on

`next dev --webpack` was the forced default for two reasons:

1. **Windows NTFS junction bug** — Turbopack cannot follow NTFS junctions, so every
   `@mohasinac/*` package resolved to its real path outside the project root and was
   auto-externalized. That broke browser/edge contexts that cannot load externals.

2. **Singleton registry** — `@mohasinac/contracts`'s `_registry` needed to be one shared
   CJS module instance. With 58 packages each with their own `dist/`, webpack needed a
   custom `externals` function to force `@mohasinac/contracts` into native `require()`.
   Turbopack has no equivalent hook.

3. **Large `as const` objects** — `EcmascriptModuleContent::new_merged` chunk generation
   bug in Turbopack for deeply-nested `as const` objects (tracked in Next.js repo).

### Why those reasons go away with `@mohasinac/appkit`

| Old problem                                | Gone because                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 58 NTFS junction targets                   | Single package — one `node_modules/@mohasinac/appkit/dist` entry, no junctions needed      |
| `_registry` singleton across packages      | `contracts` is absorbed into `appkit/contracts` — one module import path, no split         |
| Large `as const` objects across many files | Single consolidated build — Turbopack chunk budget is no longer fragmented across 58 units |
| Custom webpack `externals` function        | No longer needed — `appkit` is a single published npm tarball, no special externalization  |

### After migration: simplified next.config.js

The `webpack()` override shrinks from ~60 lines to just the essential aliases:

```js
// next.config.js — after appkit migration
webpack(config) {
  config.resolve.alias = {
    ...config.resolve.alias,
    // Keep the local HTTP shim so apiClient.baseURL auto-detects in SSR
    "@mohasinac/appkit/http$": path.resolve(__dirname, "src/lib/http/index.ts"),
    // Singleton peer dep resolution
    "@tanstack/react-query": path.resolve(__dirname, "node_modules/@tanstack/react-query"),
  };
  return config;
},
```

The 80-line `MOHASINAC_PACKAGES` array, the `mohasinacExternals` function, and the
`USE_LOCAL_PACKAGES` alias tree are all deleted.

### Dev script table (after migration)

| Script                 | Command                                                | Use                                                 |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `npm run dev`          | `next dev --turbopack`                                 | Day-to-day development (fast HMR)                   |
| `npm run dev:packages` | `cd D:\proj\packages && node scripts/watch-appkit.mjs` | Rebuild appkit on source change                     |
| `npm run build`        | `next build`                                           | Production build (Turbopack by default in Next 16+) |
| `npm run type-check`   | `tsc --noEmit`                                         | TypeScript check before push                        |

### Package watcher (`watch-appkit.mjs`)

While consuming published npm tarballs in production, during local dev you point
`@mohasinac/appkit` at the local source via `USE_LOCAL_PACKAGES=true` and run `tsup --watch`
in the appkit package. The watcher rebuilds `dist/` on every save; Next.js HMR picks it up
on the next request.

```json
// packages/appkit/package.json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --splitting",
    "dev": "tsup src/index.ts --format esm,cjs --dts --splitting --watch"
  }
}
```

```js
// packages/scripts/watch-appkit.mjs — convenience wrapper
import { execSync } from "child_process";
execSync("npm run dev", {
  cwd: new URL("../packages/appkit", import.meta.url).pathname,
  stdio: "inherit",
});
```

**Flow during local dev:**

```
Save file in packages/appkit/src/
  → tsup --watch rebuilds dist/ (~300ms)
  → Next.js HMR sees module change
  → Browser hot-reloads the changed components
```

No pnpm, no workspace symlinks, no Turbopack junction issues.

### Migration steps for next.config.js

1. Change `"dev": "next dev --webpack"` → `"dev": "next dev --turbopack"` in `package.json`
2. Delete `"dev:turbo"` script (it becomes the default `dev`)
3. Remove the `MOHASINAC_PACKAGES` array and `USE_LOCAL_PACKAGES` block from `next.config.js`
4. Remove the `mohasinacExternals` webpack function (no longer needed)
5. Remove `@mohasinac/sievejs` and all `@mohasinac/*` entries from `serverExternalPackages`
   (appkit is bundled inline; only true Node.js natives need externalization)
6. Keep `serverExternalPackages: ["crypto", "bcryptjs", "firebase-admin", "@auth/firebase-adapter"]`
7. Keep `turbopack: {}` block for Turbopack-specific config
8. Remove `build: "next build --webpack"` → `"build": "next build"`

### pnpm / workspace cleanup

`letitrip.in` is **not** a monorepo workspace — it is a standalone Next.js app that
consumes `@mohasinac/appkit` from npm. Remove workspace artifacts:

```
Delete: pnpm-workspace.yaml      (letitrip.in is not a pnpm workspace)
Delete: pnpm-lock.yaml           (npm ci is used for deployment)
Keep:   turbo.json               (used by packages/ repo, not by letitrip.in)
Keep:   package-lock.json        (npm is the package manager for letitrip.in)
```

The `packages/` repo (at `D:\proj\packages`) keeps its own `package.json` workspaces
and build system — that's where the actual development of `appkit` happens.

---

## 18. RBAC — Permission-Based Access Control

### 18.1 — Why role strings are not enough

The current letitrip system uses a hard-coded string enum:

```ts
type Role = "admin" | "seller" | "user" | "moderator";
```

This causes two recurring problems:

1. **Coupling** — `useRBAC` checks `role === "admin"` in 40+ places. Adding "support_agent" means
   hunting down every check.
2. **Coarse-grained** — a "moderator" either can or cannot manage reviews; there is no way
   to give a moderator review access but not product access without adding more role strings.
3. **No per-tenant overrides** — licorice and hobson have different admin roles; each app needs
   to maintain its own role list.

### 18.2 — Target model: Permission-centric RBAC

Roles become **named sets of permissions**. Code checks permissions, never roles directly.
Roles are app-configurable and can be extended or replaced entirely.

```
Permission  — atomic capability string  e.g. "products:write"
Role        — named bag of permissions  e.g. "seller" = ["products:read", "products:write", "orders:read"]
User        — assigned one or more roles (roles[] on UserDocument)
Guard       — function / hook that checks required permission(s) against user's resolved set
```

### 18.3 — Permission namespace conventions

Permissions follow `resource:action` format. Wildcards use `*`.

| Permission                  | Who holds it                                       |
| --------------------------- | -------------------------------------------------- |
| `*`                         | super-admin only                                   |
| `admin:access`              | Any role that can see the `/admin` panel           |
| `admin:settings`            | Can edit site settings, navigation, feature flags  |
| `admin:users`               | Can view/edit/ban user accounts                    |
| `admin:users:delete`        | Can delete user accounts (subset of `admin:users`) |
| `admin:orders`              | Can view all orders across all sellers             |
| `admin:orders:refund`       | Can issue refunds                                  |
| `admin:products`            | Can view/edit/delete any product                   |
| `admin:reviews`             | Can approve/reject/delete reviews                  |
| `admin:analytics`           | Can view analytics dashboard                       |
| `admin:activity`            | Can view audit log                                 |
| `admin:sessions`            | Can view/revoke any session                        |
| `admin:newsletter`          | Can view/export newsletter subscribers             |
| `admin:search`              | Can trigger Algolia reindex                        |
| `admin:feature-flags`       | Can toggle feature flags                           |
| `admin:cms`                 | Can edit homepage sections, carousel, CMS pages    |
| `admin:cms:navigation`      | Can edit nav links (subset of `admin:cms`)         |
| `admin:payouts`             | Can view/process all seller payouts                |
| `admin:kyc`                 | Can approve/reject seller KYC                      |
| `seller:access`             | Can see the `/seller` dashboard                    |
| `seller:products:read`      | Can view own products                              |
| `seller:products:write`     | Can create/edit own products                       |
| `seller:products:delete`    | Can delete own products                            |
| `seller:orders:read`        | Can view own orders                                |
| `seller:orders:fulfill`     | Can mark orders as shipped/fulfilled               |
| `seller:analytics`          | Can view own store analytics                       |
| `seller:coupons`            | Can manage own coupons                             |
| `seller:store`              | Can edit own store profile                         |
| `seller:payouts:read`       | Can view own payout history                        |
| `seller:shipping`           | Can configure own shipping settings                |
| `user:profile`              | Can edit own profile                               |
| `user:orders`               | Can view own orders                                |
| `user:orders:cancel`        | Can cancel own orders                              |
| `user:reviews`              | Can write/edit own reviews                         |
| `user:wishlist`             | Can manage own wishlist                            |
| `user:addresses`            | Can manage own addresses                           |
| `user:chat`                 | Can use real-time chat                             |
| `user:offers`               | Can make/counter offers                            |
| `user:auctions`             | Can bid on auctions                                |
| `content:reviews:moderate`  | Can approve/reject reviews (moderator role)        |
| `content:products:moderate` | Can approve/reject product listings                |
| `content:orders:support`    | Can read any order for support purposes            |

### 18.4 — Built-in role definitions (appkit defaults)

These ship in `appkit/security` as `DEFAULT_ROLES`. Each consumer app can override or extend.

```ts
// appkit/src/security/rbac/default-roles.ts
import type { RoleDefinition } from "./types";

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  super_admin: {
    label: "Super Admin",
    permissions: ["*"],
    inherits: [],
  },
  admin: {
    label: "Admin",
    permissions: [
      "admin:access",
      "admin:settings",
      "admin:users",
      "admin:orders",
      "admin:orders:refund",
      "admin:products",
      "admin:reviews",
      "admin:analytics",
      "admin:activity",
      "admin:sessions",
      "admin:newsletter",
      "admin:search",
      "admin:feature-flags",
      "admin:cms",
      "admin:payouts",
      "admin:kyc",
    ],
    inherits: ["moderator"],
  },
  moderator: {
    label: "Moderator",
    permissions: [
      "admin:access",
      "admin:reviews",
      "admin:products",
      "content:reviews:moderate",
      "content:products:moderate",
      "content:orders:support",
    ],
    inherits: [],
  },
  seller: {
    label: "Seller",
    permissions: [
      "seller:access",
      "seller:products:read",
      "seller:products:write",
      "seller:products:delete",
      "seller:orders:read",
      "seller:orders:fulfill",
      "seller:analytics",
      "seller:coupons",
      "seller:store",
      "seller:payouts:read",
      "seller:shipping",
    ],
    inherits: ["user"],
  },
  user: {
    label: "User",
    permissions: [
      "user:profile",
      "user:orders",
      "user:orders:cancel",
      "user:reviews",
      "user:wishlist",
      "user:addresses",
      "user:chat",
      "user:offers",
      "user:auctions",
    ],
    inherits: [],
  },
  support_agent: {
    label: "Support Agent",
    permissions: [
      "admin:access",
      "admin:orders",
      "content:orders:support",
      "admin:users",
    ],
    inherits: [],
  },
};
```

### 18.5 — Core types (ships in `appkit/security`)

```ts
// appkit/src/security/rbac/types.ts

export type Permission = string; // "resource:action" or "*"

export interface RoleDefinition {
  label: string;
  permissions: Permission[];
  /** Resolved at runtime — union of own permissions + all inherited permissions */
  inherits?: string[]; // other role keys
}

export interface RbacConfig {
  /** App-defined roles — merges with or replaces DEFAULT_ROLES */
  roles: Record<string, RoleDefinition>;
  /**
   * How to resolve permissions when a user has multiple roles.
   * default: "union" — user gets the union of all roles' permissions
   */
  multiRoleStrategy?: "union" | "intersection";
}

export interface ResolvedUser {
  uid: string;
  roles: string[];
  /** Flat resolved permission set (after role inheritance + multi-role union) */
  permissions: Set<Permission>;
}
```

### 18.6 — Permission resolver

```ts
// appkit/src/security/rbac/resolver.ts

export function resolvePermissions(
  userRoles: string[],
  config: RbacConfig,
): Set<Permission> {
  const { roles, multiRoleStrategy = "union" } = config;

  function getPermissionsForRole(
    roleKey: string,
    visited = new Set<string>(),
  ): Set<Permission> {
    if (visited.has(roleKey)) return new Set();
    visited.add(roleKey);

    const def = roles[roleKey];
    if (!def) return new Set();

    const own = new Set<Permission>(def.permissions);

    // Handle wildcard — super_admin gets everything
    if (own.has("*")) return new Set(["*"]);

    for (const inherited of def.inherits ?? []) {
      for (const p of getPermissionsForRole(inherited, visited)) {
        own.add(p);
      }
    }
    return own;
  }

  const sets = userRoles.map((r) => getPermissionsForRole(r));

  if (multiRoleStrategy === "intersection") {
    return sets.reduce(
      (acc, set) => new Set([...acc].filter((p) => set.has(p))),
    );
  }

  // union (default)
  return sets.reduce(
    (acc, set) => new Set([...acc, ...set]),
    new Set<Permission>(),
  );
}

export function hasPermission(
  permissions: Set<Permission>,
  required: Permission,
): boolean {
  return permissions.has("*") || permissions.has(required);
}

export function hasAllPermissions(
  permissions: Set<Permission>,
  required: Permission[],
): boolean {
  return required.every((p) => hasPermission(permissions, p));
}

export function hasAnyPermission(
  permissions: Set<Permission>,
  required: Permission[],
): boolean {
  return required.some((p) => hasPermission(permissions, p));
}
```

### 18.7 — `createRbacHook` factory (ships in `appkit/security`)

```ts
// appkit/src/security/rbac/hook.ts
"use client";

export function createRbacHook(config: RbacConfig) {
  return function useRBAC() {
    const { user } = useAuthSession(); // from appkit/features/auth
    const permissions = useMemo(
      () =>
        user ? resolvePermissions(user.roles, config) : new Set<Permission>(),
      [user],
    );

    return {
      can: (permission: Permission) => hasPermission(permissions, permission),
      canAll: (permissions_: Permission[]) =>
        hasAllPermissions(permissions, permissions_),
      canAny: (permissions_: Permission[]) =>
        hasAnyPermission(permissions, permissions_),
      role: user?.roles ?? [],
      permissions,
      isAdmin: hasPermission(permissions, "admin:access"),
      isSeller: hasPermission(permissions, "seller:access"),
    };
  };
}
```

Letitrip wires it once and exports its own typed hook:

```ts
// letitrip: src/hooks/useRBAC.ts
import { createRbacHook } from "@mohasinac/appkit/security";
import { RBAC_CONFIG } from "@/constants/rbac";

export const useRBAC = createRbacHook(RBAC_CONFIG);

// letitrip: src/constants/rbac.ts
import { DEFAULT_ROLES } from "@mohasinac/appkit/security";
import type { RbacConfig } from "@mohasinac/appkit/security";

export const RBAC_CONFIG: RbacConfig = {
  roles: {
    ...DEFAULT_ROLES,
    // Letitrip extension — auction manager sees auctions admin UI
    auction_manager: {
      label: "Auction Manager",
      permissions: [
        "admin:access",
        "admin:products",
        "admin:orders",
        "admin:analytics",
        "content:products:moderate",
      ],
      inherits: [],
    },
  },
};
```

### 18.8 — Server-side guard (API routes + Server Actions)

```ts
// appkit/src/security/rbac/server.ts
import type { RbacConfig } from "./types";
import { resolvePermissions, hasPermission } from "./resolver";
import { AuthorizationError } from "@mohasinac/appkit/errors";

export function createRequirePermission(config: RbacConfig) {
  return async function requirePermission(
    user: { uid: string; roles: string[] } | null,
    permission: Permission,
  ): Promise<void> {
    if (!user) throw new AuthenticationError("Not authenticated");
    const perms = resolvePermissions(user.roles, config);
    if (!hasPermission(perms, permission)) {
      throw new AuthorizationError(`Missing permission: ${permission}`);
    }
  };
}
```

Letitrip wires once:

```ts
// src/lib/auth/require-permission.ts
import { createRequirePermission } from "@mohasinac/appkit/security";
import { RBAC_CONFIG } from "@/constants/rbac";

export const requirePermission = createRequirePermission(RBAC_CONFIG);

// Usage in Server Action:
await requirePermission(authUser, "admin:payouts");
```

### 18.9 — `<Can>` component (ships in `appkit/security`)

```tsx
// appkit/src/security/rbac/Can.tsx
"use client";

interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: "all" | "any";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: CanProps) {
  const { can, canAll, canAny } = useRbacContext(); // provided by RbacProvider

  const allowed = permission
    ? can(permission)
    : mode === "all"
      ? canAll(permissions ?? [])
      : canAny(permissions ?? []);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

Usage:

```tsx
<Can permission="admin:payouts">
  <PayoutsTable />
</Can>

<Can permissions={["seller:products:write", "seller:store"]} mode="any">
  <SellerQuickActions />
</Can>
```

### 18.10 — Admin pages and their required permissions

Every admin page guard is declared here. The `appkit/features/admin` layout reads the permission
map and redirects to `/admin/unauthorized` if the user lacks it.

```ts
// appkit/src/features/admin/permission-map.ts
export const ADMIN_PAGE_PERMISSIONS: Record<string, Permission> = {
  "/admin": "admin:access",
  "/admin/dashboard": "admin:analytics",
  "/admin/users": "admin:users",
  "/admin/orders": "admin:orders",
  "/admin/products": "admin:products",
  "/admin/reviews": "admin:reviews",
  "/admin/payouts": "admin:payouts",
  "/admin/kyc": "admin:kyc",
  "/admin/analytics": "admin:analytics",
  "/admin/activity": "admin:activity",
  "/admin/sessions": "admin:sessions",
  "/admin/newsletter": "admin:newsletter",
  "/admin/search": "admin:search",
  "/admin/feature-flags": "admin:feature-flags",
  "/admin/site-settings": "admin:settings",
  "/admin/navigation": "admin:cms:navigation",
  "/admin/cms": "admin:cms",
  "/admin/carousel": "admin:cms",
  "/admin/homepage-sections": "admin:cms",
  "/admin/copilot": "admin:settings",
  "/admin/reports": "admin:analytics",
};
```

The admin layout sidebar is also permission-filtered — nav items with `permission` that the
user doesn't hold are hidden (not just disabled):

```tsx
// appkit/src/features/admin/components/AdminSidebar.tsx
const NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    permission: "admin:analytics",
  },
  { label: "Users", href: "/admin/users", permission: "admin:users" },
  { label: "Orders", href: "/admin/orders", permission: "admin:orders" },
  { label: "Products", href: "/admin/products", permission: "admin:products" },
  { label: "Reviews", href: "/admin/reviews", permission: "admin:reviews" },
  { label: "Payouts", href: "/admin/payouts", permission: "admin:payouts" },
  { label: "KYC", href: "/admin/kyc", permission: "admin:kyc" },
  {
    label: "Analytics",
    href: "/admin/analytics",
    permission: "admin:analytics",
  },
  { label: "Audit Log", href: "/admin/activity", permission: "admin:activity" },
  { label: "Sessions", href: "/admin/sessions", permission: "admin:sessions" },
  {
    label: "Newsletter",
    href: "/admin/newsletter",
    permission: "admin:newsletter",
  },
  { label: "Search", href: "/admin/search", permission: "admin:search" },
  {
    label: "Feature Flags",
    href: "/admin/feature-flags",
    permission: "admin:feature-flags",
  },
  {
    label: "Site Settings",
    href: "/admin/site-settings",
    permission: "admin:settings",
  },
  {
    label: "Navigation",
    href: "/admin/navigation",
    permission: "admin:cms:navigation",
  },
  { label: "CMS Pages", href: "/admin/cms", permission: "admin:cms" },
  { label: "Carousel", href: "/admin/carousel", permission: "admin:cms" },
  {
    label: "Homepage",
    href: "/admin/homepage-sections",
    permission: "admin:cms",
  },
  { label: "AI Copilot", href: "/admin/copilot", permission: "admin:settings" },
];
```

### 18.11 — Seller pages and their required permissions

```ts
// appkit/src/features/seller/permission-map.ts
export const SELLER_PAGE_PERMISSIONS: Record<string, Permission> = {
  "/seller": "seller:access",
  "/seller/dashboard": "seller:analytics",
  "/seller/products": "seller:products:read",
  "/seller/products/new": "seller:products:write",
  "/seller/products/[id]": "seller:products:write",
  "/seller/orders": "seller:orders:read",
  "/seller/orders/[id]": "seller:orders:read",
  "/seller/analytics": "seller:analytics",
  "/seller/coupons": "seller:coupons",
  "/seller/store": "seller:store",
  "/seller/payouts": "seller:payouts:read",
  "/seller/shipping": "seller:shipping",
};
```

The seller layout sidebar is identically permission-filtered:

```tsx
const SELLER_NAV_ITEMS: SellerNavItem[] = [
  {
    label: "Dashboard",
    href: "/seller/dashboard",
    permission: "seller:analytics",
  },
  {
    label: "Products",
    href: "/seller/products",
    permission: "seller:products:read",
  },
  { label: "Orders", href: "/seller/orders", permission: "seller:orders:read" },
  {
    label: "Analytics",
    href: "/seller/analytics",
    permission: "seller:analytics",
  },
  { label: "Coupons", href: "/seller/coupons", permission: "seller:coupons" },
  { label: "Store", href: "/seller/store", permission: "seller:store" },
  {
    label: "Payouts",
    href: "/seller/payouts",
    permission: "seller:payouts:read",
  },
  {
    label: "Shipping",
    href: "/seller/shipping",
    permission: "seller:shipping",
  },
];
```

### 18.12 — Middleware route guard pattern

```ts
// appkit/src/security/rbac/middleware.ts
export function createRbacMiddleware(
  config: RbacConfig,
  pageMap: Record<string, Permission>,
) {
  return async function rbacMiddleware(
    request: NextRequest,
  ): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Find the most specific matching route
    const requiredPermission = Object.entries(pageMap)
      .filter(([route]) => matchesRoute(pathname, route))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1]; // longest match wins

    if (!requiredPermission) return NextResponse.next();

    const user = await getSessionUser(request); // from appkit/features/auth
    if (!user) return redirectToLogin(request);

    const perms = resolvePermissions(user.roles, config);
    if (!hasPermission(perms, requiredPermission)) {
      return redirectToUnauthorized(request, requiredPermission);
    }

    return NextResponse.next();
  };
}
```

Letitrip's `middleware.ts`:

```ts
// letitrip.in/src/middleware.ts
import { createRbacMiddleware } from "@mohasinac/appkit/security";
import { RBAC_CONFIG } from "@/constants/rbac";
import { ADMIN_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/admin";
import { SELLER_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/seller";

const guard = createRbacMiddleware(RBAC_CONFIG, {
  ...ADMIN_PAGE_PERMISSIONS,
  ...SELLER_PAGE_PERMISSIONS,
});

export async function middleware(request: NextRequest) {
  return guard(request);
}

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*"],
};
```

### 18.13 — UserDocument roles field

```ts
// appkit: BaseUserDocument
export interface BaseUserDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  /** One or more role keys from the app's RbacConfig */
  roles: string[];
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`roles` is an array (not a single string) from the start.

- Admin assigns roles via the `/admin/users` page (sets `user.roles`).
- A seller who completes KYC gets `"seller"` appended to their roles array.
- Roles can be revoked by removing from array.

Firestore security rules check `request.auth.token.roles` (synced via custom claims):

```
// firestore.rules
function hasPermission(permission) {
  // For rules, we only gate on role strings (simpler).
  // Fine-grained permission checks stay in the app layer.
  let roles = request.auth.token.roles;
  return (
    roles.hasAny(["super_admin", "admin"]) ||
    (permission == "seller:access" && roles.hasAny(["seller"])) ||
    (permission == "user:access"   && roles.hasAny(["user", "seller", "admin"]))
  );
}
```

Custom claims are synced after every role change via a Firestore trigger in `functions/`:

```ts
// functions/src/triggers/sync-roles-claim.ts
export const syncRolesClaim = onDocumentUpdated(
  "users/{uid}",
  async (event) => {
    const before = event.data?.before.data() as UserDocument;
    const after = event.data?.after.data() as UserDocument;
    if (JSON.stringify(before.roles) === JSON.stringify(after.roles)) return;

    await admin.auth().setCustomUserClaims(after.uid, { roles: after.roles });
  },
);
```

### 18.14 — Summary: what ships in `appkit/security` vs stays in letitrip

| Item                                                             | appkit/security             | letitrip                                        |
| ---------------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `Permission` type                                                | ✅                          | —                                               |
| `RoleDefinition` / `RbacConfig` types                            | ✅                          | —                                               |
| `DEFAULT_ROLES` (5 built-in roles)                               | ✅                          | —                                               |
| `resolvePermissions()`                                           | ✅                          | —                                               |
| `hasPermission()` / `hasAllPermissions()` / `hasAnyPermission()` | ✅                          | —                                               |
| `createRbacHook()` factory                                       | ✅                          | —                                               |
| `createRequirePermission()` factory                              | ✅                          | —                                               |
| `createRbacMiddleware()` factory                                 | ✅                          | —                                               |
| `<Can>` component                                                | ✅                          | —                                               |
| `<RbacProvider>` context                                         | ✅                          | —                                               |
| `ADMIN_PAGE_PERMISSIONS` map                                     | ✅ (appkit/features/admin)  | —                                               |
| `SELLER_PAGE_PERMISSIONS` map                                    | ✅ (appkit/features/seller) | —                                               |
| `RBAC_CONFIG` (merged roles + letitrip extensions)               | —                           | ✅ `src/constants/rbac.ts`                      |
| `useRBAC` hook (wired to letitrip config)                        | —                           | ✅ `src/hooks/useRBAC.ts`                       |
| `requirePermission` (wired to letitrip config)                   | —                           | ✅ `src/lib/auth/require-permission.ts`         |
| Letitrip custom roles (auction_manager, etc.)                    | —                           | ✅                                              |
| Firebase custom claims sync trigger                              | —                           | ✅ `functions/src/triggers/sync-roles-claim.ts` |
| Firestore security rules                                         | —                           | ✅ `firestore.rules`                            |

---

## 19. Seed Data — Move into appkit

### 19.1 — Why seed data belongs in the package

Current state: `letitrip.in/src/db/seed-data/*.ts` contains hand-crafted fixture objects
that are tightly typed to letitrip schemas. When a new project (licorice, hobson) is
scaffolded, it starts from zero — the developer hand-crafts fixtures again from scratch.

The **generic structure** of every fixture is the same:

- Categories tree
- Products list
- Homepage sections (hero, blog, faq, stats)
- Carousel slides
- FAQ list
- Reviews

Only the **content values** (names, prices, images, copy) and **extra fields** (marketplace
`sellerId`, auction config) are letitrip-specific.

### 19.2 — Target structure in appkit

```
appkit/src/seed/
├── index.ts                  ← runSeed(config) entry point
├── types.ts                  ← SeedConfig, SeedFixture<T>, SeedResult
├── runner.ts                 ← batched Firestore writes with dry-run support
├── factories/
│   ├── category.factory.ts   ← makeCategory(overrides?) → CategoryDocument
│   ├── product.factory.ts    ← makeProduct(overrides?) → BaseProductDocument
│   ├── user.factory.ts       ← makeUser(overrides?) → BaseUserDocument
│   ├── order.factory.ts      ← makeOrder(overrides?) → BaseOrderDocument
│   ├── review.factory.ts     ← makeReview(overrides?) → ReviewDocument
│   ├── blog-post.factory.ts  ← makeBlogPost(overrides?) → BlogPostDocument
│   ├── faq.factory.ts        ← makeFaq(overrides?) → FaqDocument
│   ├── carousel.factory.ts   ← makeCarouselSlide(overrides?) → CarouselSlideDocument
│   ├── homepage-section.factory.ts ← makeHomepageSection(type, overrides?)
│   └── store.factory.ts      ← makeStore(overrides?) → BaseStoreDocument
├── defaults/
│   ├── categories.ts         ← DEFAULT_CATEGORIES: CategoryDocument[]
│   ├── faqs.ts               ← DEFAULT_FAQS: FaqDocument[]
│   └── homepage-sections.ts  ← DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionDocument[]
└── scripts/
    └── run-seed.ts           ← CLI entry: ts-node run-seed.ts --env=dev
```

### 19.3 — SeedConfig type

```ts
// appkit/src/seed/types.ts

export interface SeedCollection<T> {
  collection: string; // Firestore collection name
  data: T[]; // fixture records
  idField?: keyof T; // field to use as doc ID (default: "id")
  merge?: boolean; // Firestore set({ merge: true }) — default: false (overwrite)
}

export interface SeedConfig {
  /** Collections to seed in order */
  collections: SeedCollection<unknown>[];
  /** Firestore project — defaults to process.env.FIREBASE_PROJECT_ID */
  projectId?: string;
  /** Write nothing; just log what would be written */
  dryRun?: boolean;
  /** Called after each successful batch write */
  onProgress?: (collectionName: string, written: number, total: number) => void;
}

export interface SeedResult {
  collections: string[];
  totalDocuments: number;
  durationMs: number;
}
```

### 19.4 — Factory pattern (faker-free)

Factories produce **structurally valid** documents with minimal values. They do not depend
on `@faker-js/faker` to keep the package lightweight — consumers pass their own fixture
arrays or use the factory `overrides` pattern:

```ts
// appkit/src/seed/factories/product.factory.ts
import type { BaseProductDocument } from "../contracts";
import { Timestamp } from "firebase-admin/firestore";

let _seq = 1;
export function makeProduct(
  overrides: Partial<BaseProductDocument> = {},
): BaseProductDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `product-${n}`,
    title: overrides.title ?? `Product ${n}`,
    description: overrides.description ?? "",
    slug: overrides.slug ?? `product-${n}`,
    price: overrides.price ?? 100,
    currency: overrides.currency ?? "INR",
    images: overrides.images ?? [],
    status: overrides.status ?? "published",
    category: overrides.category ?? "",
    tags: overrides.tags ?? [],
    seoTitle: overrides.seoTitle ?? `Product ${n}`,
    createdAt: overrides.createdAt ?? Timestamp.now(),
    updatedAt: overrides.updatedAt ?? Timestamp.now(),
    ...overrides,
  };
}
```

### 19.5 — Runner

```ts
// appkit/src/seed/runner.ts
import { getFirestore } from "firebase-admin/firestore";
import type { SeedConfig, SeedResult } from "./types";

const BATCH_SIZE = 400; // Firestore max is 500

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  const db = getFirestore();
  const start = Date.now();
  let totalDocuments = 0;

  for (const {
    collection,
    data,
    idField = "id",
    merge = false,
  } of config.collections) {
    config.onProgress?.(collection, 0, data.length);
    let written = 0;

    while (written < data.length) {
      const slice = data.slice(written, written + BATCH_SIZE);
      if (!config.dryRun) {
        const batch = db.batch();
        for (const doc of slice) {
          const ref = db
            .collection(collection)
            .doc(String((doc as Record<string, unknown>)[idField]));
          batch.set(ref, doc, { merge });
        }
        await batch.commit();
      }
      written += slice.length;
      totalDocuments += slice.length;
      config.onProgress?.(collection, written, data.length);
    }
  }

  return {
    collections: config.collections.map((c) => c.collection),
    totalDocuments,
    durationMs: Date.now() - start,
  };
}
```

### 19.6 — Letitrip extends with marketplace fixtures

```ts
// letitrip: scripts/seed-data/letitrip-seed.ts
import { runSeed, makeProduct, makeStore, DEFAULT_CATEGORIES, DEFAULT_FAQS } from "@mohasinac/appkit/seed";
import type { ProductDocument } from "@/db/schemas/products";

const SELLERS = [
  { id: "seller-1", storeId: "store-1", sellerSplit: 85 },
  { id: "seller-2", storeId: "store-2", sellerSplit: 80 },
];

// Extend base factory with marketplace fields
function makeLetitrip Product(n: number, seller: typeof SELLERS[0]): ProductDocument {
  return {
    ...makeProduct({ id: `product-${n}`, title: `Handmade Item ${n}`, price: 299 + n * 50 }),
    sellerId: seller.id,
    storeId: seller.storeId,
    sellerSplit: seller.sellerSplit,
    condition: "new",
  };
}

await runSeed({
  dryRun: process.argv.includes("--dry-run"),
  onProgress: (col, written, total) => console.log(`${col}: ${written}/${total}`),
  collections: [
    { collection: "categories",                data: DEFAULT_CATEGORIES },
    { collection: "faqs",                      data: DEFAULT_FAQS },
    { collection: "products",                  data: SELLERS.flatMap((s, i) =>
        Array.from({ length: 10 }, (_, n) => makeLetitrip Product(i * 10 + n, s)) ) },
    { collection: "stores",                    data: SELLERS.map((s) => makeStore({ id: s.storeId })) },
    { collection: "homepage_sections",         data: DEFAULT_HOMEPAGE_SECTIONS },
  ],
});
```

### 19.7 — What ships in appkit vs stays in letitrip

| Item                                                                    | appkit/seed | letitrip                |
| ----------------------------------------------------------------------- | ----------- | ----------------------- |
| `runSeed()` runner                                                      | ✅          | —                       |
| `SeedConfig` / `SeedCollection` / `SeedResult` types                    | ✅          | —                       |
| All `make*()` factories                                                 | ✅          | —                       |
| `DEFAULT_CATEGORIES`, `DEFAULT_FAQS`, `DEFAULT_HOMEPAGE_SECTIONS`       | ✅          | —                       |
| Marketplace fixture arrays (products with `sellerId`, stores, carousel) | —           | ✅ `scripts/seed-data/` |
| Letitrip-specific field extensions on factory output                    | —           | ✅                      |
| `letitrip-seed.ts` runner script                                        | —           | ✅                      |

Sub-path export: `@mohasinac/appkit/seed` — this sub-path is **server-only** (Firebase Admin
SDK); never imported in browser code.

---

## 20. Mobile-First UX System

### 20.1 — Core principle: full width, no wasted space

The current codebase has inconsistent spacing — some pages use `max-w-7xl mx-auto px-4`,
others use `container`, others have no constraint at all. The result is layout drift across
breakpoints and excessive whitespace on mobile.

**Rule**: All layouts follow a **three-zone model**:

```
┌──────────────────────────────────────────────────────────────┐
│  BLEED ZONE      — full 100vw: hero images, section stripes  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CONTENT ZONE  — max-w-screen-xl (1280px) centered     │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  TIGHT ZONE — max-w-3xl (768px) for prose, forms │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

No component may add uncommanded horizontal margin or padding outside of these zones.
The zones are enforced via `THEME_CONSTANTS.layout.*` classes — never inline Tailwind.

### 20.2 — Layout zone tokens

```ts
// THEME_CONSTANTS.layout (moves to appkit/tokens as DEFAULT_THEME_CONSTANTS.layout)
layout: {
  bleed:   "w-full",                                     // 100vw
  content: "w-full max-w-screen-xl mx-auto px-4 sm:px-6 xl:px-8",  // ≤1280px
  tight:   "w-full max-w-3xl mx-auto px-4 sm:px-6",    // ≤768px — forms, articles
  section: "py-10 sm:py-14 xl:py-20",                   // vertical rhythm
  sectionSm: "py-6 sm:py-10",                           // compact sections
  gap:     "gap-4 sm:gap-6 xl:gap-8",                   // grid/flex gap
  stack:   "space-y-4 sm:space-y-6",                    // vertical stack
}
```

Usage enforced by `THEME_CONSTANTS` — nothing hardcoded:

```tsx
// ✅ correct
<Section className={THEME_CONSTANTS.layout.content}>
  <ProductGrid />
</Section>

// ❌ wrong — hardcoded px-4 that breaks on wide screens
<div className="px-4 max-w-7xl mx-auto">
```

### 20.3 — Mobile-first grid system

All product/card grids must define all four breakpoints:

```ts
// THEME_CONSTANTS.grid
grid: {
  products:   "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 xl:gap-6",
  cards:      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6",
  wide:       "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8",
  admin:      "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4",
  // Two-column page layout (sidebar + content)
  sidebar:    "grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6 xl:gap-8",
  // Three-column (filters + content + aside)
  withFilter: "grid grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[260px_1fr_200px] gap-4 xl:gap-6",
}
```

Rule: **no `cols-1` only grid** unless it is a `tight` zone form. Every list view must be
at least `cols-2` on mobile.

### 20.4 — Touch targets and tap-safe sizing

All interactive elements must meet WCAG 2.5.5 (44×44 CSS px minimum touch target):

```ts
// THEME_CONSTANTS.touch
touch: {
  min:    "min-h-[44px] min-w-[44px]",
  button: "h-11 px-5 py-2.5",         // 44px height
  icon:   "h-11 w-11 flex items-center justify-center",
  input:  "h-11 px-3 py-2",
  tab:    "h-12 px-4",
  chip:   "h-9 px-3",                  // small but acceptable for secondary chips
}
```

All `<Button>`, `<Input>`, `<Tab>`, `<Chip>` components in `appkit/ui` use these token values.
No hardcoded `h-8` or `py-1` on primary interactive surfaces.

### 20.5 — Bottom navigation (mobile)

Mobile web apps lose users when key actions are at the top. A sticky bottom nav bar is the
primary mobile navigation surface. It ships in `appkit/features/layout`:

```tsx
// appkit/src/features/layout/components/BottomNav.tsx
// Visible only below lg: breakpoint — laptop+ uses sidebar/topnav
<nav className={THEME_CONSTANTS.layout.bottomNav}>
  <BottomNavItem href={ROUTES.HOME} icon="home" label="Home" />
  <BottomNavItem href={ROUTES.SEARCH} icon="search" label="Search" />
  <BottomNavItem
    href={ROUTES.CART}
    icon="cart"
    label="Cart"
    badge={cartCount}
  />
  <BottomNavItem href={ROUTES.WISHLIST} icon="heart" label="Saved" />
  <BottomNavItem href={ROUTES.ACCOUNT} icon="person" label="Account" />
</nav>
```

```ts
// THEME_CONSTANTS.layout.bottomNav
bottomNav: "fixed bottom-0 inset-x-0 z-50 flex justify-around items-center h-16 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 lg:hidden safe-bottom",
```

`safe-bottom` maps to `padding-bottom: env(safe-area-inset-bottom)` for iPhone notch safety.

The top nav is hidden on mobile (`hidden lg:flex`). The bottom nav replaces it.

### 20.6 — No whitespace policy

"Whitespace" in this context means **unintentional blank vertical space** caused by:

- `mb-*` on the last child of a section
- `mt-*` on the first child of a section
- Sections with their own `py-*` compounding with a parent `gap-*`

Rules:

1. Section components own their vertical padding (`py-*`). Children use **no** top/bottom margin.
2. Stacks use `space-y-*` token from `THEME_CONSTANTS.layout.stack` — never mixed `mt-`/`mb-`.
3. Cards own their internal padding. Grids own `gap-*`. No double-spacing.
4. Below-the-fold sections: `sectionSm` instead of `section` for secondary content (filters,
   related products, review list) — reduces scrolling distance on mobile.

```ts
// THEME_CONSTANTS.layout (additions)
noBleed:   "pb-0 mb-0",  // kill trailing space from child inside a section
firstChild: "mt-0 pt-0", // kill top margin from first element in a zone
lastChild:  "mb-0 pb-0", // kill bottom margin from last element in a zone
```

### 20.7 — Typography scale (mobile-first)

```ts
// THEME_CONSTANTS.text
text: {
  h1:      "text-2xl sm:text-3xl xl:text-4xl font-bold tracking-tight leading-tight",
  h2:      "text-xl sm:text-2xl xl:text-3xl font-semibold tracking-tight",
  h3:      "text-lg sm:text-xl xl:text-2xl font-semibold",
  h4:      "text-base sm:text-lg font-semibold",
  body:    "text-sm sm:text-base leading-relaxed",
  bodyLg:  "text-base sm:text-lg leading-relaxed",
  small:   "text-xs sm:text-sm",
  label:   "text-xs font-medium uppercase tracking-wide",
  price:   "text-lg sm:text-xl font-bold tabular-nums",
  priceLg: "text-2xl sm:text-3xl font-bold tabular-nums",
  muted:   "text-zinc-500 dark:text-zinc-400",
  error:   "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
}
```

`<Heading>`, `<Text>`, `<Label>` in `appkit/ui` map to these tokens via the `variant` prop.
No raw `text-*` utilities outside of `THEME_CONSTANTS.text.*`.

### 20.8 — Card system

All cards follow a consistent anatomy:

```
┌──────────────────────────────┐
│  IMAGE      aspect-[3/4]     │  ← always aspect-ratio, never fixed h-[px]
│  BADGE     (top-left)        │
│  WISHLIST  (top-right)       │
├──────────────────────────────┤
│  TAG LINE   text.small muted │
│  TITLE      text.h4          │
│  PRICE      text.price       │
│  CTA STRIP  [Add to Cart]    │   ← min-h-[44px]
└──────────────────────────────┘
```

```ts
// THEME_CONSTANTS.card
card: {
  base:      "relative flex flex-col overflow-hidden rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800",
  hover:     "transition-shadow duration-200 hover:shadow-md",
  image:     "relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800",
  imageWide: "relative aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800",
  body:      "flex flex-col flex-1 gap-1 p-3 sm:p-4",
  footer:    "px-3 pb-3 sm:px-4 sm:pb-4",
  badge:     "absolute top-2 left-2 z-10",
  action:    "absolute top-2 right-2 z-10",
}
```

### 20.9 — Motion tokens

Animation is only allowed if it respects `prefers-reduced-motion`. All motion tokens include
the `motion-safe:` prefix:

```ts
// THEME_CONSTANTS.motion
motion: {
  fadeIn:     "motion-safe:animate-fade-in",
  slideUp:    "motion-safe:animate-slide-up",
  scaleIn:    "motion-safe:animate-scale-in",
  skeleton:   "motion-safe:animate-pulse",
  transition: "motion-safe:transition-all motion-safe:duration-200",
  transitionSlow: "motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-in-out",
}
```

Custom keyframes defined once in `tailwind.config.js`:

```js
keyframes: {
  "fade-in":  { from: { opacity: 0 }, to: { opacity: 1 } },
  "slide-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
  "scale-in": { from: { opacity: 0, transform: "scale(0.97)" }, to: { opacity: 1, transform: "scale(1)" } },
},
animation: {
  "fade-in":  "fade-in 0.15s ease-out",
  "slide-up": "slide-up 0.2s ease-out",
  "scale-in": "scale-in 0.15s ease-out",
},
```

### 20.10 — Dark mode

All `THEME_CONSTANTS.*` values include paired `dark:` variants. The dark mode strategy is
`class` (not `media`) — toggled by adding `dark` to `<html>`. letitrip stores the preference
in `localStorage` via `useTheme()` from `appkit/react`.

```ts
// Rule: every bg/text/border entry in THEME_CONSTANTS includes a dark: pair
card.base:  "... bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
text.muted: "text-zinc-500 dark:text-zinc-400"
layout.bottomNav: "... bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
```

### 20.11 — Page-level mobile UX rules

These apply to every page component in `letitrip.in` and every appkit feature shell:

| Rule                                             | Implementation                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| No horizontal scroll at any breakpoint           | `overflow-x-hidden` on `<body>` + `w-full max-w-[100vw]` on root                   |
| Images never overflow their container            | All `<MediaImage>` use `fill` + `object-cover`; never `width` without `max-w-full` |
| Sticky header height ≤ 56px on mobile            | `h-14` on mobile (`h-16` on lg+)                                                   |
| Bottom nav safe area                             | `pb-[env(safe-area-inset-bottom)]` on bottom nav + `pb-20 lg:pb-0` on main content |
| Search visible above the fold                    | Search bar is the first interactive element on list/category pages                 |
| Filters accessible from mobile                   | Filter button opens bottom-sheet drawer on mobile; sidebar panel on lg+            |
| PDP (product detail) buy action sticky on mobile | `<BuyBar>` fixed to bottom above bottom-nav on mobile; hidden on desktop           |
| Checkout one-column on mobile                    | Checkout summary rendered below form on mobile; sidebar on lg+                     |
| No text < 12px                                   | `text-xs` (12px) is the minimum; `text-[10px]` is banned                           |
| Loading states always show skeleton              | No blank white areas during data fetching — Skeleton component everywhere          |

### 20.12 — `<BuyBar>` — sticky mobile purchase action

```tsx
// appkit/src/features/products/components/BuyBar.tsx
// Visible only on mobile (below lg:) — sticks above the bottom nav
<div
  className={cn(
    "fixed bottom-16 inset-x-0 z-40 flex gap-2 px-4 py-3",
    "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm",
    "border-t border-zinc-100 dark:border-zinc-800",
    "lg:hidden",
    "safe-bottom",
  )}
>
  <WishlistButton
    productId={productId}
    className={THEME_CONSTANTS.touch.icon}
  />
  <AddToCartButton
    productId={productId}
    className={cn(
      THEME_CONSTANTS.touch.button,
      "flex-1 bg-primary-600 text-white",
    )}
  />
</div>
```

### 20.13 — Filter drawer (mobile bottom sheet → desktop sidebar)

Filters are a major UX problem on mobile if implemented as a sidebar. The correct pattern:

```tsx
// appkit/src/features/filters/components/FilterPanel.tsx
// Mobile: bottom sheet drawer triggered by "Filter" button
// Desktop (lg+): inline left sidebar

<>
  {/* Mobile trigger */}
  <Button onClick={openDrawer} className="lg:hidden flex items-center gap-2">
    <FilterIcon /> Filters {activeCount > 0 && <Badge>{activeCount}</Badge>}
  </Button>

  {/* Desktop sidebar */}
  <aside
    className={cn(
      "hidden lg:block w-[260px] shrink-0",
      THEME_CONSTANTS.layout.stack,
    )}
  >
    <FilterContent filters={filters} onChange={onChange} />
  </aside>

  {/* Mobile bottom sheet */}
  <BottomSheet
    open={isOpen}
    onClose={closeDrawer}
    title="Filters"
    className="lg:hidden"
  >
    <FilterContent filters={filters} onChange={onChange} />
    <div className="flex gap-3 p-4 border-t">
      <Button variant="outline" onClick={clearAll} className="flex-1">
        Clear all
      </Button>
      <Button onClick={closeDrawer} className="flex-1">
        Show results
      </Button>
    </div>
  </BottomSheet>
</>
```

`<BottomSheet>` is a new component in `appkit/ui` — slides up from the bottom on mobile:

```ts
// THEME_CONSTANTS.drawer
drawer: {
  overlay:  "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
  sheet:    "fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-white dark:bg-zinc-900 max-h-[90dvh] overflow-y-auto",
  handle:   "mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700",
  header:   "sticky top-0 flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900",
}
```

### 20.14 — Theme completeness checklist

Every new feature shell added to appkit MUST include all of the following before merge:

- [ ] All layout zones use `THEME_CONSTANTS.layout.*` — no inline `px-*`/`py-*`/`max-w-*`
- [ ] All grids define `grid-cols` for `default`, `sm:`, `lg:`, `xl:`
- [ ] All interactive elements use `THEME_CONSTANTS.touch.*` — no `h-8` on buttons
- [ ] All text uses `THEME_CONSTANTS.text.*` or `<Heading>`/`<Text>` components
- [ ] All cards use `THEME_CONSTANTS.card.*`
- [ ] All motion uses `THEME_CONSTANTS.motion.*` with `motion-safe:` prefix
- [ ] All colours have `dark:` counterpart
- [ ] Loading state uses `<Skeleton>` — no blank areas
- [ ] Mobile filter/search is accessible without scrolling
- [ ] Bottom nav and `<BuyBar>` account for `pb-20 lg:pb-0` main content offset
- [ ] No text below `text-xs` (12px)
- [ ] `overflow-x-hidden` safe — no element escapes the `bleed` zone horizontally

### 20.15 — Summary: what ships in appkit vs letitrip

| Item                                                                  | appkit                          | letitrip                              |
| --------------------------------------------------------------------- | ------------------------------- | ------------------------------------- |
| `THEME_CONSTANTS.layout` (zones, grid, gap, stack, bottomNav, drawer) | ✅ as `DEFAULT_THEME_CONSTANTS` | Override if needed                    |
| `THEME_CONSTANTS.touch`                                               | ✅                              | —                                     |
| `THEME_CONSTANTS.text`                                                | ✅                              | —                                     |
| `THEME_CONSTANTS.card`                                                | ✅                              | —                                     |
| `THEME_CONSTANTS.motion`                                              | ✅                              | —                                     |
| `<BottomNav>`, `<BottomSheet>`                                        | ✅ appkit/features/layout       | —                                     |
| `<BuyBar>`                                                            | ✅ appkit/features/products     | —                                     |
| `FilterPanel` (drawer on mobile, sidebar on desktop)                  | ✅ appkit/features/filters      | —                                     |
| `<Skeleton>`                                                          | ✅ appkit/ui                    | —                                     |
| `useTheme()` (dark mode toggle)                                       | ✅ appkit/react                 | —                                     |
| Tailwind keyframes + `safe-bottom` plugin                             | ✅ appkit/style/tailwind preset | letitrip `tailwind.config.js` extends |
| Brand colour overrides (`primary`, `secondary`)                       | —                               | ✅ `tailwind.config.js` colors        |
| `THEME_CONSTANTS` (letitrip extension)                                | —                               | ✅ `src/constants/theme.ts`           |

---

## 21. PII Middleware + Request/Response Chain

### 21.1 — The problem: PII survives to the client

Even with `PiiRepository` decrypting on read, there are multiple escape paths where
encrypted ciphertext (`enc:v1:...`) or decrypted PII reaches the browser:

| Escape path                                                   | Root cause                                   |
| ------------------------------------------------------------- | -------------------------------------------- |
| API route reads Firestore directly (not via repo)             | No `decryptPiiFields` call                   |
| Server Action returns the full document                       | Forgets to strip PII fields before returning |
| Admin API `/api/users` returns `email`, `phone` in plaintext  | No redaction for non-owner callers           |
| Client-side hook passes full document to a log/analytics call | `logger.info({ user })` leaks email          |
| Error response includes Firestore document in `details` field | `handleApiError` wraps raw DB error          |
| SSR page passes full `user` object as `initialData` prop      | Serialised into `__NEXT_DATA__`              |

The fix is a **layered middleware chain** at the API boundary that:

1. Strips any surviving `enc:v1:*` ciphertexts from response bodies (safety net)
2. Redacts PII fields from responses that are not authorised to receive them
3. Provides a single place to add audit logging, rate limiting, auth, and CORS

### 21.2 — Response chain overview

```
Firestore document
  ↓  PiiRepository.mapDoc()          [decrypt PII fields]
  ↓  BusinessLogic / Repository      [return typed document]
  ↓  API Route Handler               [assemble response body]
  ↓  PiiScrubberMiddleware           [strip any remaining enc:v1:* strings]
  ↓  PiiRedactorMiddleware           [redact declared PII fields for non-owners]
  ↓  AuditLogMiddleware              [log request + response shape, never values]
  ↓  NextResponse.json(body)         [serialise to wire]
  ↓  Client
```

### 21.3 — Request chain overview

```
Incoming NextRequest
  ↓  CorsMiddleware                  [set Access-Control-Allow-* headers]
  ↓  RateLimitMiddleware             [Upstash / in-memory sliding window]
  ↓  AuthMiddleware                  [verify Firebase ID token → attach user to context]
  ↓  RbacMiddleware                  [check permission for route]
  ↓  RequestContextMiddleware        [build RequestContext: user, ip, locale, traceId]
  ↓  ValidationMiddleware            [parse + validate body/query via Zod schema]
  ↓  Route Handler                   [receives validated input + context]
```

### 21.4 — `createApiMiddleware` chain builder

All middleware is composed via a single factory. Route handlers receive a fully-typed context.

```ts
// appkit/src/next/middleware/chain.ts

export type Middleware<Ctx extends BaseRequestContext = BaseRequestContext> = (
  request: NextRequest,
  ctx: Ctx,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

export interface BaseRequestContext {
  traceId: string;
  ip: string;
  locale: string;
  startedAt: number;
}

export interface AuthRequestContext extends BaseRequestContext {
  user: ResolvedUser; // from RBAC resolver: { uid, roles, permissions }
}

export function createApiMiddleware<
  TInput,
  TCtx extends BaseRequestContext = AuthRequestContext,
>(config: {
  schema?: ZodSchema<TInput>;
  permission?: Permission;
  middlewares?: Middleware<TCtx>[];
}) {
  return function handler(
    routeFn: (
      input: TInput,
      ctx: TCtx,
      req: NextRequest,
    ) => Promise<NextResponse>,
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const ctx = buildBaseContext(request) as TCtx;

      // Run all middlewares in order; each calls next() to proceed
      const chain = [
        rateLimitMiddleware,
        authMiddleware,
        config.permission ? rbacMiddleware(config.permission) : passthrough,
        requestContextMiddleware,
        ...(config.middlewares ?? []),
      ];

      return runChain(chain, ctx, request, async () => {
        const input = config.schema
          ? config.schema.parse(await parseInput(request))
          : ({} as TInput);
        const raw = await routeFn(input, ctx, request);
        return applyResponseMiddleware(raw); // PII scrub + redact
      });
    };
  };
}
```

Usage in a route handler:

```ts
// letitrip: src/app/api/users/[id]/route.ts
import { createApiMiddleware } from "@mohasinac/appkit/next";
import { userQuerySchema } from "@/db/schema/users";

export const GET = createApiMiddleware({
  schema: userQuerySchema,
  permission: "admin:users",
})(async (input, ctx) => {
  const repo = getUserRepository();
  const user = await repo.findById(input.id);
  // No manual PII scrubbing needed — middleware handles it
  return NextResponse.json({ success: true, user });
});
```

### 21.5 — `PiiScrubberMiddleware` (safety net)

Walks the entire response JSON tree and replaces any string matching `enc:v1:*` with
`"[encrypted]"`. This is the **last resort** — if a repository forgets to decrypt, the
raw ciphertext never reaches the client.

```ts
// appkit/src/next/middleware/pii-scrubber.ts

const ENC_PREFIX = "enc:v1:";

function scrubValue(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(ENC_PREFIX)) {
    return "[encrypted]";
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        scrubValue(v),
      ]),
    );
  }
  return value;
}

export async function piiScrubberMiddleware(
  _request: NextRequest,
  _ctx: BaseRequestContext,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const response = await next();

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.json();
  const scrubbed = scrubValue(body);

  return NextResponse.json(scrubbed, {
    status: response.status,
    headers: response.headers,
  });
}
```

### 21.6 — `PiiRedactorMiddleware` — field-level redaction for non-owners

The scrubber handles leaked ciphertexts. The redactor handles legitimate-but-sensitive
**decrypted plaintext** — e.g. an admin listing users should NOT receive full email addresses
unless the caller has `admin:users` with explicit PII read permission.

```ts
// appkit/src/next/middleware/pii-redactor.ts

export interface PiiRedactionRule {
  /** Fields to redact from the top-level object or items[] */
  fields: string[];
  /** If true, replace value with masked version instead of removing */
  mask?: boolean;
  /** Only redact if the caller does NOT have this permission */
  unless?: Permission;
}

export function createPiiRedactorMiddleware(rules: PiiRedactionRule[]) {
  return async function piiRedactorMiddleware(
    _req: NextRequest,
    ctx: AuthRequestContext,
    next: () => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const response = await next();
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return response;

    const body = (await response.json()) as Record<string, unknown>;

    for (const { fields, mask = true, unless } of rules) {
      if (unless && hasPermission(ctx.user.permissions, unless)) continue; // caller is authorised
      const redact = (obj: Record<string, unknown>) =>
        fields.reduce(
          (acc, field) => ({
            ...acc,
            [field]:
              field in acc
                ? mask
                  ? maskPii(String(acc[field]))
                  : undefined
                : acc[field],
          }),
          obj,
        );

      // Handle both single object and paginated { data: [] } responses
      if (Array.isArray(body.data)) {
        body.data = (body.data as Record<string, unknown>[]).map(redact);
      } else {
        Object.assign(body, redact(body));
      }
    }

    return NextResponse.json(body, {
      status: response.status,
      headers: response.headers,
    });
  };
}

function maskPii(value: string): string {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local[0]}***@${domain}`;
  }
  if (/^\+?\d{7,}$/.test(value)) {
    return value.slice(0, 3) + "***" + value.slice(-2);
  }
  return "***";
}
```

Usage:

```ts
// letitrip: src/app/api/users/route.ts
const userListRedactor = createPiiRedactorMiddleware([
  { fields: ["email", "phone"], mask: true,  unless: "admin:users:pii" },
  { fields: ["bankAccount"],    mask: false, unless: "admin:payouts" },
]);

export const GET = createApiMiddleware({
  permission: "admin:users",
  middlewares: [userListRedactor],
})(async (input, ctx) => { ... });
```

### 21.7 — `RequestContextMiddleware` — typed context for every handler

Every handler receives a `RequestContext` containing:

```ts
// appkit/src/next/middleware/request-context.ts

export interface RequestContext extends AuthRequestContext {
  traceId: string; // UUID generated per request
  ip: string; // from x-forwarded-for or request.ip
  locale: string; // from Accept-Language or cookie
  startedAt: number; // Date.now()
  user: ResolvedUser; // uid + roles + resolved permissions
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
}

export async function requestContextMiddleware(
  request: NextRequest,
  ctx: Partial<RequestContext>,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> {
  ctx.traceId = crypto.randomUUID();
  ctx.ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  ctx.locale =
    request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ??
    "en";
  ctx.startedAt = Date.now();
  ctx.isAuthenticated = !!ctx.user;
  ctx.isAdmin = hasPermission(
    ctx.user?.permissions ?? new Set(),
    "admin:access",
  );
  ctx.isSeller = hasPermission(
    ctx.user?.permissions ?? new Set(),
    "seller:access",
  );

  const response = await next();

  // Attach trace ID to response for client correlation
  response.headers.set("x-trace-id", ctx.traceId);
  return response;
}
```

### 21.8 — `AuthMiddleware`

```ts
// appkit/src/next/middleware/auth.ts

export async function authMiddleware(
  request: NextRequest,
  ctx: Partial<AuthRequestContext>,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const token = extractBearerToken(request);
  if (!token) throw new AuthenticationError("Missing auth token");

  const { auth } = getProviders();
  if (!auth) throw new Error("Auth provider not registered");

  const authUser = await auth.verifyToken(token);

  // Load full user doc to get roles array (custom claims may be stale)
  const userRepo = getUserRepository();
  const userDoc = await userRepo.findById(authUser.uid);
  if (!userDoc) throw new AuthenticationError("User not found");

  ctx.user = {
    uid: authUser.uid,
    roles: userDoc.roles,
    permissions: resolvePermissions(userDoc.roles, getRbacConfig()),
  };

  return next();
}
```

### 21.9 — `ValidationMiddleware`

```ts
// appkit/src/next/middleware/validation.ts

export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async function validationMiddleware(
    request: NextRequest,
    _ctx: BaseRequestContext,
    next: () => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const raw =
      request.method === "GET"
        ? Object.fromEntries(new URL(request.url).searchParams)
        : await request.json().catch(() => ({}));

    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new ValidationError("Invalid request", result.error.flatten());
    }

    // Attach parsed input to request for downstream use
    (request as NextRequest & { parsedBody: T }).parsedBody = result.data;

    return next();
  };
}
```

### 21.10 — `AuditLogMiddleware`

Logs every write operation (POST, PATCH, DELETE) to the `audit_log` Firestore collection.
Never logs response bodies or PII values — only the shape.

```ts
// appkit/src/next/middleware/audit-log.ts

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export async function auditLogMiddleware(
  request: NextRequest,
  ctx: AuthRequestContext,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const response = await next();

  if (!WRITE_METHODS.has(request.method)) return response;

  const entry: AuditLogEntry = {
    traceId: ctx.traceId,
    actorUid: ctx.user?.uid ?? "anonymous",
    actorRoles: ctx.user?.roles ?? [],
    method: request.method,
    path: new URL(request.url).pathname,
    statusCode: response.status,
    ip: ctx.ip,
    timestamp: Timestamp.now(),
    // Log keys only, never values
    requestKeys: await extractKeys(request),
    responseKeys: await extractResponseKeys(response),
  };

  // Fire-and-forget — never await in request path
  writeAuditLog(entry).catch((e) =>
    serverLogger.error("audit log write failed", e),
  );

  return response;
}
```

### 21.11 — `RateLimitMiddleware`

```ts
// appkit/src/next/middleware/rate-limit.ts

export function createRateLimitMiddleware(preset: RateLimitPreset) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    ctx: BaseRequestContext,
    next: () => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const identifier = ctx.ip + ":" + new URL(request.url).pathname;
    const result = await rateLimit(identifier, preset); // from appkit/security

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: result.reset },
        { status: 429, headers: { "Retry-After": String(result.reset) } },
      );
    }

    const response = await next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    return response;
  };
}
```

### 21.12 — `CorsMiddleware`

```ts
// appkit/src/next/middleware/cors.ts

export interface CorsConfig {
  allowedOrigins: string[]; // ["https://letitrip.in", "https://admin.letitrip.in"]
  allowedMethods?: string[]; // default: ["GET","POST","PATCH","DELETE","OPTIONS"]
  allowCredentials?: boolean; // default: true
  maxAge?: number; // seconds — default: 86400 (24h preflight cache)
}

export function createCorsMiddleware(config: CorsConfig): Middleware {
  return async function corsMiddleware(request, _ctx, next) {
    const origin = request.headers.get("origin") ?? "";
    const isAllowed = config.allowedOrigins.some(
      (o) => o === "*" || o === origin,
    );

    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(isAllowed ? origin : "", config),
      });
    }

    const response = await next();
    if (isAllowed) {
      for (const [k, v] of Object.entries(buildCorsHeaders(origin, config))) {
        response.headers.set(k, v);
      }
    }
    return response;
  };
}
```

### 21.13 — Pre-built middleware presets

Rather than configuring each middleware from scratch, appkit ships named presets:

```ts
// appkit/src/next/presets.ts

export const apiPresets = {
  /** Public read endpoint: CORS + rate-limit only */
  public: createApiMiddleware({
    middlewares: [
      corsMiddleware,
      createRateLimitMiddleware(RateLimitPresets.api),
    ],
  }),

  /** Authenticated read: CORS + rate-limit + auth */
  authenticated: createApiMiddleware({
    middlewares: [
      corsMiddleware,
      createRateLimitMiddleware(RateLimitPresets.api),
    ],
  }),

  /** Write endpoint: rate-limit (strict) + auth + audit */
  write: createApiMiddleware({
    middlewares: [
      createRateLimitMiddleware(RateLimitPresets.write),
      auditLogMiddleware,
    ],
  }),

  /** Admin: rate-limit + auth + rbac(admin:access) + audit + PII scrub */
  admin: (permission: Permission) =>
    createApiMiddleware({
      permission,
      middlewares: [
        createRateLimitMiddleware(RateLimitPresets.admin),
        auditLogMiddleware,
        piiScrubberMiddleware,
      ],
    }),

  /** Seller: rate-limit + auth + rbac(seller:access) + audit */
  seller: (permission: Permission) =>
    createApiMiddleware({
      permission,
      middlewares: [
        createRateLimitMiddleware(RateLimitPresets.api),
        auditLogMiddleware,
      ],
    }),
} as const;
```

Letitrip route handlers become one-liners:

```ts
// src/app/api/admin/users/route.ts
export const GET = apiPresets.admin("admin:users")(async (input, ctx) => {
  const users = await getUserRepository().findAll({ page: input.page });
  return NextResponse.json({ success: true, ...users });
});

// src/app/api/seller/products/route.ts
export const POST = apiPresets.seller("seller:products:write")(async (
  input,
  ctx,
) => {
  const product = await createProductAction(input, ctx.user.uid);
  return NextResponse.json({ success: true, product });
});
```

### 21.14 — Next.js `middleware.ts` — edge middleware

The Next.js edge middleware (runs before the request hits the server) handles:

1. RBAC route guard (redirect unauthorised users)
2. Locale detection
3. Session cookie refresh

It does **not** run PII scrubbing — that happens in API routes where JSON is being constructed.

```ts
// letitrip: src/middleware.ts
import { createRbacMiddleware } from "@mohasinac/appkit/security";
import { createLocaleMiddleware } from "@mohasinac/appkit/next";
import { RBAC_CONFIG } from "@/constants/rbac";
import { ADMIN_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/admin";
import { SELLER_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/seller";

const rbacGuard = createRbacMiddleware(RBAC_CONFIG, {
  ...ADMIN_PAGE_PERMISSIONS,
  ...SELLER_PAGE_PERMISSIONS,
});

const localeGuard = createLocaleMiddleware({
  locales: ["en", "hi"],
  defaultLocale: "en",
});

export async function middleware(request: NextRequest) {
  // Run locale first (sets accept-language cookie if missing)
  const localeResponse = await localeGuard(request);
  if (localeResponse.status !== 200) return localeResponse;

  // Then RBAC guard
  return rbacGuard(request);
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon).*)", // all pages
    "/api/admin/:path*", // API guard for admin routes
    "/api/seller/:path*", // API guard for seller routes
  ],
};
```

### 21.15 — PII in `__NEXT_DATA__` (SSR serialisation)

A silent PII leak: Server Components and `getServerSideProps` can serialise entire Firestore
documents into `__NEXT_DATA__` in the HTML. The rule is:

```
✅ Pass to client: id, displayName, photoURL, role[], locale, storeName — public fields only
❌ Never pass to client: email, phone, bankAccount, any PII field — even decrypted
```

Enforcement pattern — explicit projection type:

```ts
// appkit/src/features/auth/types.ts
/** Safe-to-serialise user shape — never contains PII */
export interface PublicUserProps {
  uid: string;
  displayName: string;
  photoURL: string | null;
  roles: string[];
  storeId?: string;
  storeName?: string;
}

export function toPublicUser(user: BaseUserDocument): PublicUserProps {
  return {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL ?? null,
    roles: user.roles,
    storeId: (user as Record<string, unknown>).storeId as string | undefined,
    storeName: (user as Record<string, unknown>).storeName as
      | string
      | undefined,
  };
}
```

SSR pages always call `toPublicUser()` before passing to client components:

```tsx
// app/[locale]/seller/page.tsx (Server Component)
const user = await getUserFromSession(request);
return <SellerDashboardView user={toPublicUser(user)} />; // safe serialisation
```

### 21.16 — Summary: full middleware inventory

| Middleware                                    | Layer         | Ships in                          | Letitrip wires                        |
| --------------------------------------------- | ------------- | --------------------------------- | ------------------------------------- |
| `CorsMiddleware`                              | Request       | `appkit/next`                     | Allowed origins list                  |
| `RateLimitMiddleware`                         | Request       | `appkit/next` + `appkit/security` | Preset selection per route            |
| `AuthMiddleware`                              | Request       | `appkit/next`                     | Auth provider via `getProviders()`    |
| `RbacMiddleware`                              | Request       | `appkit/security`                 | `RBAC_CONFIG` + permission per route  |
| `RequestContextMiddleware`                    | Request       | `appkit/next`                     | — (automatic)                         |
| `ValidationMiddleware`                        | Request       | `appkit/next`                     | Zod schema per route                  |
| `AuditLogMiddleware`                          | Response      | `appkit/next`                     | — (automatic on write routes)         |
| `PiiScrubberMiddleware`                       | Response      | `appkit/security`                 | — (automatic, safety net)             |
| `PiiRedactorMiddleware`                       | Response      | `appkit/security`                 | Per-route field + permission rules    |
| `createApiMiddleware` chain                   | Both          | `appkit/next`                     | Select middlewares via config         |
| `apiPresets.*`                                | Both          | `appkit/next`                     | Pick preset; pass permission + schema |
| Edge `RbacMiddleware` (Next.js middleware.ts) | Edge          | `appkit/security`                 | Page permission map                   |
| Edge `LocaleMiddleware`                       | Edge          | `appkit/next`                     | Locales list                          |
| `toPublicUser()` / `toPublicStore()`          | Serialisation | `appkit/features/*`               | Called in all SSR pages               |

---

## 22. Comprehensive Seed Data (Extends Section 19)

Section 19 defined the seed runner and factory pattern. This section adds **full test
coverage** — every factory must exercise all optional fields, every PII field must be
encrypted before reaching Firestore, and retrieval helpers must prove the round-trip
returns decrypted plaintext.

### 22.1 — Factory completeness matrix

Every factory must have **at least two fixture variants**: a minimal fixture (only required
fields) and a full fixture (all optional fields populated). This makes it possible to
assert that optional rendering paths never crash on `undefined`.

| Factory               | Required fields                                 | Optional fields (must have fixture)                                 | PII fields                |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| `makeUser`            | uid, displayName, roles, emailVerified          | photoURL, storeId, storeName, publicProfile                         | email, phone              |
| `makeStore`           | id, slug, name, status                          | logo, coverImage, description, commissionRate, bankAccount          | ownerEmail, accountNumber |
| `makeProduct`         | id, slug, title, price, currency, status        | images, video, tags, seoTitle, condition, auctionConfig, preOrderId | —                         |
| `makeOrder`           | id, userId, items[], status, paymentStatus      | shippingAddress, sellerId, platformFee, sellerEarnings, orderType   | —                         |
| `makeAddress`         | id, userId, line1, city, state, country, postal | line2, isDefault                                                    | phone                     |
| `makeReview`          | id, productId, userId, rating                   | title, comment, images, status, helpfulCount, verified              | —                         |
| `makeBlogPost`        | id, slug, title, content, authorId, status      | excerpt, coverImage, tags, publishedAt                              | —                         |
| `makeCategory`        | id, slug, name                                  | parentId, icon, image, sortOrder                                    | —                         |
| `makeFaq`             | id, question, answer, category                  | sortOrder, voteCount                                                | —                         |
| `makeCarouselSlide`   | id, imageUrl, sortOrder                         | title, subtitle, ctaLabel, ctaUrl, mobileImageUrl                   | —                         |
| `makeHomepageSection` | id, type, sortOrder, isActive, content          | — (content varies by type)                                          | —                         |
| `makeCartItem`        | productId, quantity, price                      | storeId, sellerId, variantId                                        | —                         |
| `makeCart`            | id, userId, items[]                             | sellerGroups, guestId                                               | —                         |
| `makeBid`             | id, auctionId, userId, amount, timestamp        | isWinning, retracted                                                | —                         |
| `makeNotification`    | id, userId, type, title                         | body, read, link, createdAt                                         | —                         |
| `makeSession`         | id, userId, userAgent, ip, createdAt            | lastActiveAt, revokedAt                                             | —                         |
| `makeCoupon`          | id, code, discountType, discountValue           | minOrderAmount, maxUses, expiresAt, sellerId                        | —                         |
| `makePayout`          | id, sellerId, orderId, amount, status           | platformFee, commissionRate, settledAt                              | bankAccount (PII)         |

### 22.2 — Full factory implementation contract

Each factory file exports **three objects**: a minimal factory, a full factory, and a
named `*_FIXTURES` constant used by default seed data.

```ts
// appkit/src/seed/factories/user.factory.ts

import type { BaseUserDocument } from "../../contracts";
import { Timestamp } from "firebase-admin/firestore";

let _seq = 1;

/** Minimal valid user — only required fields */
export function makeUser(
  overrides: Partial<BaseUserDocument> = {},
): BaseUserDocument {
  const n = _seq++;
  return {
    uid: `user-${n}`,
    displayName: `User ${n}`,
    roles: ["user"],
    emailVerified: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

/** Full user with all optional fields populated — for rendering tests */
export function makeFullUser(
  overrides: Partial<BaseUserDocument> = {},
): BaseUserDocument {
  return makeUser({
    photoURL: "https://example.com/avatar.jpg",
    publicProfile: {
      bio: "Test user bio",
      socialLinks: { instagram: "https://instagram.com/test" },
      website: "https://example.com",
    },
    ...overrides,
  });
}

/** Named fixtures used by DEFAULT seed data */
export const USER_FIXTURES = {
  admin: makeFullUser({
    uid: "admin-user-1",
    roles: ["admin"],
    emailVerified: true,
  }),
  seller: makeFullUser({
    uid: "seller-user-1",
    roles: ["seller"],
    emailVerified: true,
  }),
  buyer: makeUser({
    uid: "buyer-user-1",
    roles: ["user"],
    emailVerified: true,
  }),
};
```

### 22.3 — PII encryption in seed data

Seed data **must not write plaintext PII** to Firestore. The seed runner calls
`encryptPiiFields(doc, piiFields)` from `appkit/security` before every write.

```ts
// appkit/src/seed/runner.ts — extended SeedCollection type

import { encryptPiiFields } from "../security/pii";

export interface SeedCollectionWithPii<T> extends SeedCollection<T> {
  /**
   * Field names that contain PII — AES-256-GCM encrypted before write;
   * HMAC-SHA256 blind index written to `<field>Index` alongside.
   */
  piiFields?: Array<keyof T & string>;
}

// Inside runSeed() — wraps every doc write:
async function writeDoc<T extends Record<string, unknown>>(
  db: Firestore,
  collection: string,
  doc: T,
  piiFields: string[],
  merge: boolean,
): Promise<void> {
  const secured = piiFields.length
    ? await encryptPiiFields(doc, piiFields)
    : doc;
  await db.collection(collection).doc(String(doc.id)).set(secured, { merge });
}
```

Letitrip wires PII fields per collection:

```ts
// letitrip: scripts/seed-data/letitrip-seed.ts
await runSeed({
  collections: [
    {
      collection: "users",
      data: [USER_FIXTURES.admin, USER_FIXTURES.seller, USER_FIXTURES.buyer],
      piiFields: ["email", "phone"],
    },
    {
      collection: "stores",
      data: STORE_FIXTURES,
      piiFields: ["ownerEmail", "accountNumber"],
    },
    {
      collection: "addresses",
      data: ADDRESS_FIXTURES,
      piiFields: ["phone"],
    },
  ],
});
```

After `encryptPiiFields`, the Firestore document looks like:

```json
{
  "uid": "buyer-user-1",
  "displayName": "User 1",
  "email": "enc:v1:AES256GCM:...",
  "emailIndex": "hmac-sha256:...",
  "phone": "enc:v1:AES256GCM:...",
  "phoneIndex": "hmac-sha256:..."
}
```

### 22.4 — PII round-trip assertion utility

```ts
// appkit/src/seed/test-utils.ts

import { encryptPiiFields, decryptPiiFields } from "../security/pii";

export async function assertPiiRoundTrip<T extends Record<string, unknown>>(
  doc: T,
  piiFields: Array<keyof T & string>,
): Promise<void> {
  const encrypted = await encryptPiiFields(doc, piiFields);

  for (const field of piiFields) {
    const val = encrypted[field] as string;
    if (!val.startsWith("enc:v1:")) {
      throw new Error(
        `assertPiiRoundTrip: field "${field}" was NOT encrypted. Got: ${val}`,
      );
    }
  }

  const decrypted = await decryptPiiFields(encrypted, piiFields);

  for (const field of piiFields) {
    if (decrypted[field] !== doc[field]) {
      throw new Error(
        `assertPiiRoundTrip: field "${field}" round-trip mismatch. ` +
          `Expected "${String(doc[field])}", got "${String(decrypted[field])}"`,
      );
    }
  }
}
```

Usage in tests:

```ts
// tests/seed/pii-roundtrip.test.ts
import { makeFullUser } from "@mohasinac/appkit/seed";
import { assertPiiRoundTrip } from "@mohasinac/appkit/seed/test-utils";

const user = makeFullUser({
  email: "test@example.com",
  phone: "+919876543210",
});
await assertPiiRoundTrip(user, ["email", "phone"]);
```

### 22.5 — `seedForTest()` — Firestore emulator seed helper

Integration tests need a fresh, predictable dataset in the Firestore emulator.
`seedForTest()` wraps `runSeed()` targeting the emulator and returns typed collection handles:

```ts
// appkit/src/seed/test-utils.ts

export interface TestSeedHandles {
  users: BaseUserDocument[];
  products: BaseProductDocument[];
  stores: BaseStoreDocument[];
  orders: BaseOrderDocument[];
  categories: CategoryDocument[];
  faqs: FaqDocument[];
}

export async function seedForTest(
  overrides?: Partial<Record<keyof TestSeedHandles, unknown[]>>,
): Promise<TestSeedHandles> {
  const users = (overrides?.users ??
    Object.values(USER_FIXTURES)) as BaseUserDocument[];
  const products = (overrides?.products ??
    Array.from({ length: 5 }, (_, i) =>
      makeProduct({ id: `p-${i}` }),
    )) as BaseProductDocument[];
  const stores = (overrides?.stores ?? [makeStore()]) as BaseStoreDocument[];
  const orders = (overrides?.orders ?? []) as BaseOrderDocument[];

  await runSeed({
    projectId: process.env.FIRESTORE_EMULATOR_PROJECT_ID ?? "demo-test",
    collections: [
      { collection: "users", data: users, piiFields: ["email", "phone"] },
      { collection: "products", data: products },
      { collection: "stores", data: stores, piiFields: ["ownerEmail"] },
      { collection: "orders", data: orders },
      { collection: "categories", data: DEFAULT_CATEGORIES },
      { collection: "faqs", data: DEFAULT_FAQS },
    ],
  });

  return {
    users,
    products,
    stores,
    orders,
    categories: DEFAULT_CATEGORIES,
    faqs: DEFAULT_FAQS,
  };
}
```

### 22.6 — Seed script commands

```json
{
  "seed": "ts-node --esm scripts/seed-data/letitrip-seed.ts",
  "seed:dry": "ts-node --esm scripts/seed-data/letitrip-seed.ts --dry-run",
  "seed:reset": "ts-node --esm scripts/seed-data/letitrip-seed.ts --clear-first"
}
```

### 22.7 — Summary

| Concern                                        | Where it lives                                 |
| ---------------------------------------------- | ---------------------------------------------- |
| Factories (`make*()` with min + full variants) | `appkit/src/seed/factories/`                   |
| `USER_FIXTURES`, `STORE_FIXTURES`, etc.        | `appkit/src/seed/factories/<name>.factory.ts`  |
| PII encryption in runner                       | `appkit/src/seed/runner.ts`                    |
| `assertPiiRoundTrip()`                         | `appkit/src/seed/test-utils.ts`                |
| `seedForTest()` emulator helper                | `appkit/src/seed/test-utils.ts`                |
| Letitrip marketplace fixture arrays            | `letitrip: scripts/seed-data/letitrip-seed.ts` |
| PII fields config per collection               | `letitrip: scripts/seed-data/letitrip-seed.ts` |

---

## 23. Dynamic Fluid Grid System

### 23.1 — The problem with fixed breakpoint columns

The current grid uses `sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. This is
**viewport-width based**, not **container-width based**. When a filter sidebar opens and
steals 280px, the product grid stays at 4 columns because the viewport did not change.
Cards become too narrow, images crop, text wraps badly.

The fix is a **fluid CSS grid** backed by `ResizeObserver`. The grid always fills
available container width with as many columns as will fit at a minimum item width.

**Formula**:

$$columns = \left\lfloor \frac{containerWidth + gap}{minItemWidth + gap} \right\rfloor$$

No fixed breakpoints. Works automatically when filter sidebar opens or closes.

### 23.2 — CSS-only path (preferred for server-rendered content)

```css
/* Generated as Tailwind custom utilities */
.fluid-grid-card {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.fluid-grid-admin {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.fluid-grid-wide {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.fluid-grid-thumb {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
```

Added to `tailwind.config.js` via `plugin(({ addUtilities }) => ...)`.

Usage — no breakpoints needed:

```tsx
// ✅ fluid — adapts when filter sidebar opens
<ul className="fluid-grid-card gap-4">
  {products.map((p) => (
    <ProductCard key={p.id} product={p} />
  ))}
</ul>
```

**Filter sidebar example:**

```
Container 1200px → floor((1200+16)/(220+16)) = 5 cols
Sidebar opens   → container shrinks to 920px
                 → floor((920+16)/(220+16)) = 3 cols   ← automatic, no JS
Sidebar closes  → container back to 1200px → 5 cols    ← automatic
```

### 23.3 — `useContainerGrid` hook (for skeleton loaders)

When you need to know the column count (e.g. to render the right number of skeleton
cards), use `useContainerGrid`:

```ts
// appkit/src/react/hooks/useContainerGrid.ts
"use client";
import { useRef, useState, useEffect } from "react";

export interface UseContainerGridOptions {
  minItemWidth: number;
  gap?: number;
  minCols?: number;
  maxCols?: number;
}

export function useContainerGrid({
  minItemWidth,
  gap = 16,
  minCols = 1,
  maxCols = Infinity,
}: UseContainerGridOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const [cols, setCols] = useState(minCols);

  useEffect(() => {
    if (!containerRef.current) return;
    const compute = (width: number) => {
      const raw = Math.floor((width + gap) / (minItemWidth + gap));
      setCols(Math.min(maxCols, Math.max(minCols, raw)));
    };
    const ro = new ResizeObserver(([e]) => compute(e.contentRect.width));
    ro.observe(containerRef.current);
    compute(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [minItemWidth, gap, minCols, maxCols]);

  return { containerRef, cols };
}
```

Usage in a grid with correctly-counted skeletons:

```tsx
function ProductGrid({ products, isLoading }: Props) {
  const { containerRef, cols } = useContainerGrid({
    minItemWidth: 220,
    gap: 16,
  });

  return (
    <ul
      ref={containerRef as React.RefObject<HTMLUListElement>}
      className="fluid-grid-card gap-4"
    >
      {isLoading
        ? Array.from({ length: cols * 2 }).map((_, i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))
        : products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
    </ul>
  );
}
```

### 23.4 — Fluid grid token table

| CSS class          | Min item width | `useContainerGrid` minItemWidth | Use case                     |
| ------------------ | -------------- | ------------------------------- | ---------------------------- |
| `fluid-grid-card`  | 220px          | 220                             | Product cards, store cards   |
| `fluid-grid-admin` | 260px          | 260                             | Admin stat cards, user cards |
| `fluid-grid-wide`  | 300px          | 300                             | Blog cards, event cards      |
| `fluid-grid-thumb` | 160px          | 160                             | Image gallery thumbnails     |

```ts
// appkit/src/tokens/layout.ts
export const FLUID_GRID_MIN_WIDTHS = {
  card: 220,
  admin: 260,
  wide: 300,
  thumb: 160,
  form: 280, // form fields (Section 25)
  tabItem: 100, // tab strip items (Section 24)
  chip: 80, // filter chip
} as const;
```

### 23.5 — Rule: no `grid-cols-*` in component JSX

```
✅  className="fluid-grid-card gap-4"
✅  className={THEME_CONSTANTS.grid.admin}   ← only in THEME_CONSTANTS definition file
❌  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
```

ESLint rule `lir/no-hardcoded-grid-cols` (new): flags any `grid-cols-[1-9]` class in
JSX that is not inside `src/constants/theme.ts` or `tailwind.config.js`.

---

## 24. Dynamic Horizontal Scroller and Tab Strip

### 24.1 — The problem

A tab strip with a fixed item count breaks at narrow widths: items either overflow hidden
(no scroll cue) or compress below the minimum tap target. Arrows must be considered in
the available-width budget.

**Formula for visible items**:

$$visible = \left\lfloor \frac{containerWidth - 2 \times (arrowWidth + gap)}{minItemWidth + gap} \right\rfloor$$

Where `arrowWidth = 36px`. If `visible >= total`, no arrows are shown.

### 24.2 — `useVisibleItems` hook

```ts
// appkit/src/react/hooks/useVisibleItems.ts
"use client";
import { useRef, useState, useEffect, useCallback } from "react";

export function useVisibleItems({
  total,
  minItemWidth,
  arrowWidth = 36,
  gap = 8,
}: {
  total: number;
  minItemWidth: number;
  arrowWidth?: number;
  gap?: number;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const [visibleCount, setVisibleCount] = useState(total);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const compute = (width: number) => {
      // Check if all items fit without arrows
      const allFit = total * minItemWidth + (total - 1) * gap <= width;
      if (allFit) {
        setVisibleCount(total);
        return;
      }
      // Reserve space for both arrows
      const usable = width - 2 * (arrowWidth + gap);
      setVisibleCount(
        Math.max(1, Math.floor((usable + gap) / (minItemWidth + gap))),
      );
    };
    const ro = new ResizeObserver(([e]) => compute(e.contentRect.width));
    ro.observe(containerRef.current);
    compute(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [total, minItemWidth, arrowWidth, gap]);

  const hasOverflow = visibleCount < total;
  const scrollLeft = useCallback(
    () => setScrollOffset((o) => Math.max(0, o - visibleCount)),
    [visibleCount],
  );
  const scrollRight = useCallback(
    () =>
      setScrollOffset((o) => Math.min(total - visibleCount, o + visibleCount)),
    [visibleCount, total],
  );

  return {
    containerRef,
    visibleCount,
    hasOverflow,
    scrollLeft,
    scrollRight,
    setScrollOffset,
    scrollOffset,
    canScrollLeft: scrollOffset > 0,
    canScrollRight: scrollOffset + visibleCount < total,
  };
}
```

### 24.3 — `HorizontalScroller` component

```tsx
// appkit/src/ui/components/HorizontalScroller.tsx
"use client";
import { useVisibleItems } from "../../react/hooks/useVisibleItems";
import { FLUID_GRID_MIN_WIDTHS } from "../../tokens/layout";

export function HorizontalScroller<T>({
  items,
  renderItem,
  minItemWidth = FLUID_GRID_MIN_WIDTHS.tabItem,
  gap = 8,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  minItemWidth?: number;
  gap?: number;
  className?: string;
}) {
  const {
    containerRef,
    visibleCount,
    hasOverflow,
    scrollLeft,
    scrollRight,
    scrollOffset,
    canScrollLeft,
    canScrollRight,
  } = useVisibleItems({ total: items.length, minItemWidth, gap });

  const visible = items.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={`relative flex items-center ${className ?? ""}`}
      role="region"
    >
      {hasOverflow && (
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          aria-label="Scroll left"
        >
          ‹
        </Button>
      )}
      <div className="flex flex-1 overflow-hidden" style={{ gap: `${gap}px` }}>
        {visible.map((item, i) => (
          <div
            key={scrollOffset + i}
            className="flex-none"
            style={{ minWidth: `${minItemWidth}px` }}
          >
            {renderItem(item, scrollOffset + i)}
          </div>
        ))}
      </div>
      {hasOverflow && (
        <Button
          variant="ghost"
          size="icon"
          onClick={scrollRight}
          disabled={!canScrollRight}
          aria-label="Scroll right"
        >
          ›
        </Button>
      )}
    </div>
  );
}
```

### 24.4 — `TabStrip` component

The `TabStrip` always keeps the active tab in the visible window:

```tsx
// appkit/src/ui/components/TabStrip.tsx
"use client";
import { useEffect } from "react";
import { useVisibleItems } from "../../react/hooks/useVisibleItems";

export function TabStrip({
  tabs,
  activeKey,
  onChange,
  minTabWidth = 100,
}: {
  tabs: Array<{
    key: string;
    label: string;
    badge?: number;
    disabled?: boolean;
  }>;
  activeKey: string;
  onChange: (key: string) => void;
  minTabWidth?: number;
}) {
  const {
    containerRef,
    visibleCount,
    hasOverflow,
    scrollLeft,
    scrollRight,
    setScrollOffset,
    scrollOffset,
    canScrollLeft,
    canScrollRight,
  } = useVisibleItems({
    total: tabs.length,
    minItemWidth: minTabWidth,
    gap: 0,
  });

  // Keep active tab scrolled into view
  useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === activeKey);
    if (idx < scrollOffset) setScrollOffset(idx);
    else if (idx >= scrollOffset + visibleCount)
      setScrollOffset(idx - visibleCount + 1);
  }, [activeKey, scrollOffset, visibleCount, tabs, setScrollOffset]);

  const visible = tabs.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      role="tablist"
      className="flex items-end border-b border-zinc-200 dark:border-zinc-700"
    >
      {hasOverflow && (
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          aria-label="Previous tabs"
          className="flex-none h-12 w-9 flex items-center justify-center text-zinc-500 disabled:opacity-30"
        >
          ‹
        </button>
      )}
      {visible.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={tab.key === activeKey}
          aria-disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.key)}
          style={{ minWidth: `${minTabWidth}px` }}
          className={[
            "flex-1 h-12 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
            tab.key === activeKey
              ? "border-primary text-primary"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            tab.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[10px] bg-primary/10 text-primary">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
      {hasOverflow && (
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          aria-label="Next tabs"
          className="flex-none h-12 w-9 flex items-center justify-center text-zinc-500 disabled:opacity-30"
        >
          ›
        </button>
      )}
    </div>
  );
}
```

### 24.5 — Filter chip row (mobile)

Filter chips with `minItemWidth = 80`, `arrowWidth = 36`, `gap = 8`:

```
Container 360px:
  allFit?  8 chips × 80 + 7 × 8 = 696 > 360 → no
  usable = 360 - 2×(36+8) = 272px
  visible = floor((272+8)/(80+8)) = 3 chips shown, arrows appear
```

```tsx
<HorizontalScroller
  items={categoryFilters}
  minItemWidth={80}
  renderItem={(f, i) => (
    <Button
      key={f.id}
      variant={active === f.id ? "primary" : "outline"}
      size="sm"
      onClick={() => setActive(f.id)}
    >
      {f.label}
    </Button>
  )}
/>
```

---

## 25. Dynamic Form Layouts

### 25.1 — The problem with fixed two-column forms

`grid grid-cols-2 gap-4` on a 360px screen produces ~162px inputs — useless for typing.
The solution: `flex flex-wrap` + `min-w-[280px] flex-1` per field group. The browser
naturally wraps when 2 × 280 + gap > container, giving a single-column layout on mobile
with no media queries needed.

**Effective column count at given widths** (minField = 280px, gap = 16px):

| Container | Columns |
| --------- | ------- |
| 360px     | 1       |
| 600px     | 2       |
| 900px     | 3       |
| 1200px    | 4       |

### 25.2 — `FormGrid` + `FormField` components

```tsx
// appkit/src/ui/components/FormGrid.tsx

export function FormGrid({
  children,
  minFieldWidth = 280,
  gap = 16,
  className,
}: {
  children: React.ReactNode;
  minFieldWidth?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap ${className ?? ""}`}
      style={{ gap: `${gap}px` }}
    >
      {children}
    </div>
  );
}

export function FormField({
  children,
  span = "auto",
  className,
}: {
  children: React.ReactNode;
  /** "auto"=fluid | "full"=always 100% width | "half"=fixed 50% */
  span?: "auto" | "full" | "half";
  className?: string;
}) {
  const spanClass =
    span === "full"
      ? "w-full"
      : span === "half"
        ? "w-1/2 min-w-[280px]"
        : "flex-1 min-w-[280px]";

  return (
    <div className={`${spanClass} flex flex-col gap-1.5 ${className ?? ""}`}>
      {children}
    </div>
  );
}
```

Usage:

```tsx
<FormGrid>
  <FormField>
    <Label>First name</Label>
    <Input name="firstName" />
  </FormField>
  <FormField>
    <Label>Last name</Label>
    <Input name="lastName" />
  </FormField>
  <FormField span="full">
    <Label>Bio</Label>
    <Textarea name="bio" rows={4} />
  </FormField>
  <FormField>
    <Label>PIN code</Label>
    <Input name="pinCode" maxLength={6} />
  </FormField>
  <FormField>
    <Label>Country</Label>
    <Select name="country" options={COUNTRIES} />
  </FormField>
</FormGrid>
```

### 25.3 — Text wrapping and paragraph rules

1. **Prose text** — always `break-words overflow-wrap-anywhere` (provided by `<Text>` wrapper)
2. **Non-wrappable values** (prices, phone numbers, codes) — `tabular-nums whitespace-nowrap`
   in their own flex child so a number never breaks mid-digit
3. **Headings** — always wrap; Hindi text uses `hyphens-auto lang="hi"`
4. **Consecutive prose paragraphs** — `<Text>` blocks inside `<Article>` use `space-y-4`

```ts
// THEME_CONSTANTS.text additions
text: {
  ...existing,
  prose:   "text-sm sm:text-base leading-relaxed break-words",
  noBreak: "tabular-nums whitespace-nowrap",
  code:    "font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-1 rounded",
}
```

### 25.4 — `DescriptionField` — inline vs paragraph layout

```tsx
// appkit/src/ui/components/DescriptionField.tsx
export function DescriptionField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const isLong = value.length > 80;
  return (
    <div
      className={`flex flex-col gap-1 ${isLong ? "w-full" : "flex-1 min-w-[280px]"}`}
    >
      <dt className={THEME_CONSTANTS.text.label}>{label}</dt>
      <dd
        className={
          isLong ? THEME_CONSTANTS.text.prose : THEME_CONSTANTS.text.body
        }
      >
        {value}
      </dd>
    </div>
  );
}
```

### 25.5 — Form layout tokens

```ts
// THEME_CONSTANTS.form
form: {
  grid:        "flex flex-wrap gap-4",
  field:       "flex-1 min-w-[280px] flex flex-col gap-1.5",
  fieldWide:   "w-full flex flex-col gap-1.5",
  fieldHalf:   "w-1/2 min-w-[280px] flex flex-col gap-1.5",
  label:       "text-sm font-medium text-zinc-700 dark:text-zinc-300",
  hint:        "text-xs text-zinc-500 dark:text-zinc-400",
  error:       "text-xs text-red-600 dark:text-red-400",
  section:     "space-y-6",
  sectionHead: "text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-2 border-zinc-200 dark:border-zinc-700",
}
```

---

## 26. Wrapper and Utils Audit

### 26.1 — Why raw HTML elements are violations

The `@mohasinac/appkit/ui` package ships **semantic HTML wrappers** for every common
element. These wrappers apply `THEME_CONSTANTS` tokens consistently, enforce
accessibility requirements (ARIA, focus rings), allow theming to cascade from a single
token change, and prevent inconsistent one-off Tailwind class choices.

**Exception rule**: Wrapper definition files (`appkit/src/ui/components/*.tsx`) are the
ONLY files allowed to use raw HTML elements. All consumer code (`letitrip/src/**`,
`feat-*/src/**`) must use wrappers exclusively.

### 26.2 — Wrapper inventory

| Raw HTML                  | Replacement              | Package             | Notes                                               |
| ------------------------- | ------------------------ | ------------------- | --------------------------------------------------- |
| `<h1>` – `<h6>`           | `<Heading level={n}>`    | `appkit/ui`         | `as` prop for semantic vs visual level              |
| `<p>`                     | `<Text>`                 | `appkit/ui`         | `variant`: body / bodyLg / small / muted            |
| `<span>` (styled)         | `<Span>`                 | `appkit/ui`         | Inline text with variant                            |
| `<label>`                 | `<Label>`                | `appkit/ui`         | Wires `htmlFor` from `<Input>` context              |
| `<small>`                 | `<Caption>`              | `appkit/ui`         | Semantic `<small>` with text.small style            |
| `<a>` (internal)          | `<TextLink>` or `<Link>` | `appkit/ui`         | Uses `next-intl` navigation                         |
| `<button>`                | `<Button>`               | `appkit/ui`         | Variants: primary / secondary / ghost / destructive |
| `<button>` (icon only)    | `<IconButton>`           | `appkit/ui`         | Requires `aria-label` — throws in dev without it    |
| `<input>`                 | `<Input>`                | `appkit/ui`         | Registered with RHF via context                     |
| `<textarea>`              | `<Textarea>`             | `appkit/ui`         | —                                                   |
| `<select>`                | `<Select>`               | `appkit/ui`         | —                                                   |
| `<form>`                  | `<Form>`                 | `appkit/ui`         | Wires `react-hook-form` context                     |
| `<ul>` / `<ol>`           | `<Ul>` / `<Ol>`          | `appkit/ui`         | —                                                   |
| `<li>`                    | `<Li>`                   | `appkit/ui`         | —                                                   |
| `<img>`                   | `<MediaImage>`           | `appkit/feat-media` | Always `next/image` with aspect ratio               |
| `<video>`                 | `<MediaVideo>`           | `appkit/feat-media` | —                                                   |
| `<section>`               | `<Section>`              | `appkit/ui`         | Applies layout zone tokens                          |
| `<article>`               | `<Article>`              | `appkit/ui`         | Applies prose layout                                |
| `<nav>`                   | `<Nav aria-label="...">` | `appkit/ui`         | Requires `aria-label`                               |
| `<main>`                  | `<Main>`                 | `appkit/ui`         | `role="main"` — one per page                        |
| `<aside>`                 | `<Aside>`                | `appkit/ui`         | —                                                   |
| `<header>`                | `<Header>`               | `appkit/ui`         | —                                                   |
| `<footer>`                | `<Footer>`               | `appkit/ui`         | —                                                   |
| `<table>`                 | `<DataTable>`            | `appkit/ui`         | Generic typed `DataTable<T extends object>`         |
| `<dialog>`                | `<Modal>`                | `appkit/ui`         | Focus trap, ESC to close, scroll lock               |
| `<details>` / `<summary>` | `<Accordion>`            | `appkit/ui`         | —                                                   |

### 26.3 — Semantic HTML usage guide

| Use case                                  | Element / Wrapper                        | Rule                                                |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------------------- |
| Page hero, product description, blog body | `<Article>`                              | When content is independently distributable         |
| Sidebar, related products, filter panel   | `<Aside>`                                | Supplementary to main content                       |
| Page section with a heading               | `<Section>` + `<Heading>`                | Section must have a visible or `aria-label` heading |
| Top nav bar                               | `<Nav aria-label="Main navigation">`     | Named so screen readers can distinguish             |
| Footer links                              | `<Nav aria-label="Footer navigation">`   | Each group of links = its own `<Nav>`               |
| Breadcrumb                                | `<Nav aria-label="Breadcrumb">` + `<Ol>` | Standard accessible breadcrumb                      |
| Page-level wrapper                        | `<Main>`                                 | Only one per page                                   |
| Card title + meta                         | `<Header>` inside `<Article>`            | —                                                   |
| Card CTA, price, timestamp                | `<Footer>` inside `<Article>`            | —                                                   |
| Feature list                              | `<Ul>` + `<Li>`                          | Never `<div>` for a list                            |
| Product specs, key-value pairs            | `<dl>` + `<dt>` + `<dd>`                 | Raw `<dl>` is acceptable here                       |

### 26.4 — Tooltip enforcement

Every interactive element with no visible text label (icon buttons, icon-only nav items)
**must** have either an `aria-label` attribute (minimum) or a `<Tooltip>` wrapper
(preferred — adds visual discovery for sighted users).

```tsx
// appkit/src/ui/components/Tooltip.tsx

export interface TooltipProps {
  label: string;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  label,
  children,
  side = "top",
  delay = 400,
}: TooltipProps) {
  // Injects aria-label into child if not already present
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>
        {React.cloneElement(children, {
          "aria-label": children.props["aria-label"] ?? label,
        })}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        side={side}
        className={THEME_CONSTANTS.tooltip.content}
      >
        {label}
        <TooltipPrimitive.Arrow className={THEME_CONSTANTS.tooltip.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  );
}
```

```ts
// THEME_CONSTANTS.tooltip
tooltip: {
  content: "z-50 px-2 py-1 text-xs font-medium rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm",
  arrow:   "fill-zinc-900 dark:fill-zinc-100",
}
```

Usage:

```tsx
// ✅ correct
<Tooltip label="Add to wishlist">
  <IconButton onClick={handleWishlist} icon="heart" />
</Tooltip>

// ❌ wrong — no accessible label
<button onClick={handleWishlist}><HeartIcon /></button>
```

### 26.5 — New ESLint rules required

| Rule                                 | Code     | Catches                                                            |
| ------------------------------------ | -------- | ------------------------------------------------------------------ |
| `lir/no-unlabelled-icon-button`      | A11Y-001 | `<IconButton>` without `aria-label` and without `<Tooltip>` parent |
| `lir/require-tooltip-on-icon-button` | A11Y-002 | `<IconButton>` outside a `<Tooltip>` wrapper                       |
| `lir/no-hardcoded-grid-cols`         | STYL-003 | `grid-cols-[1-9]` outside `theme.ts` / `tailwind.config.js`        |

Both A11Y rules live in `packages/eslint-plugin-letitrip/src/rules/`.

### 26.6 — Audit grep commands

```powershell
# Raw HTML violations in src/
Select-String -Recurse -Path "src/**/*.tsx" `
  -Pattern "<(h[1-6]|p\b|button|input|textarea|select|form|img|video|ul|ol|li|section|article|nav|main|aside|header|footer)\b"

# Hardcoded grid column classes
Select-String -Recurse -Path "src/**/*.tsx" -Pattern "grid-cols-[1-9]"

# Icon buttons without aria-label
Select-String -Recurse -Path "src/**/*.tsx" -Pattern "<IconButton(?![^>]*aria-label)"

# Direct fetch() in components / hooks
Select-String -Recurse -Path "src/**/*.ts","src/**/*.tsx" -Pattern "\bfetch\("

# console.log in production code
Select-String -Recurse -Path "src/**/*.ts","src/**/*.tsx" -Pattern "console\.(log|warn|error)"
```

Acceptable exemptions (exclude from results):

- `appkit/src/ui/components/` — wrapper definitions
- `*.test.ts`, `*.spec.ts` — tests
- `scripts/seed-data/` — seed scripts
- `tailwind.config.js`, `src/constants/theme.ts` — token definitions

### 26.7 — Audit script

```ts
// scripts/audit-violations.ts
// Run: ts-node scripts/audit-violations.ts > violations.json
import { execSync } from "child_process";

const PATTERNS = [
  {
    name: "raw_html",
    regex:
      "<(h[1-6]|p\\b|button|input|textarea|select|form|ul|ol|li|section|article|nav|main|aside|header|footer)\\b",
  },
  { name: "raw_media", regex: "<(img|video)\\b" },
  { name: "hardcoded_grid", regex: "grid-cols-[1-9]" },
  { name: "unlabelled_icon", regex: "<IconButton(?![^>]*aria-label)" },
  { name: "direct_fetch", regex: "\\bfetch\\(" },
  { name: "console_log", regex: "console\\.(log|warn|error)" },
] as const;

const EXEMPT = [
  "appkit/src/ui/components/",
  ".test.ts",
  ".spec.ts",
  "seed-data/",
  "tailwind.config",
  "theme.ts",
];

const results: Record<string, string[]> = {};
for (const { name, regex } of PATTERNS) {
  try {
    const lines = execSync(
      `grep -rn --include="*.tsx" --include="*.ts" -E "${regex}" src/`,
      { encoding: "utf8", cwd: process.cwd() },
    )
      .split("\n")
      .filter(Boolean);
    results[name] = lines.filter((l) => !EXEMPT.some((e) => l.includes(e)));
  } catch {
    results[name] = []; // grep exits 1 when no matches
  }
}

console.log(JSON.stringify(results, null, 2));
```

### 26.8 — Summary

| Category                                             | Wrapper                                                       | Package                   | ESLint rule                     |
| ---------------------------------------------------- | ------------------------------------------------------------- | ------------------------- | ------------------------------- |
| Typography (h1–h6, p, span, label)                   | `Heading`, `Text`, `Span`, `Label`, `Caption`                 | `appkit/ui`               | `lir/no-raw-html-elements`      |
| Interactive (button, a, input, select, form)         | `Button`, `IconButton`, `TextLink`, `Input`, `Select`, `Form` | `appkit/ui`               | `lir/no-raw-html-elements`      |
| Media (img, video)                                   | `MediaImage`, `MediaVideo`                                    | `appkit/feat-media`       | `lir/no-raw-media-elements`     |
| Semantic layout (section, article, nav, main, aside) | `Section`, `Article`, `Nav`, `Main`, `Aside`                  | `appkit/ui`               | `lir/no-raw-html-elements`      |
| Lists (ul, ol, li)                                   | `Ul`, `Ol`, `Li`                                              | `appkit/ui`               | `lir/no-raw-html-elements`      |
| Overlay (dialog, details)                            | `Modal`, `Accordion`                                          | `appkit/ui`               | `lir/no-raw-html-elements`      |
| Icon-only buttons                                    | `<Tooltip><IconButton /></Tooltip>`                           | `appkit/ui`               | `lir/no-unlabelled-icon-button` |
| Fluid grid                                           | `fluid-grid-*` CSS or `useContainerGrid`                      | `appkit/react` + tailwind | `lir/no-hardcoded-grid-cols`    |
| Dynamic tabs / scroller                              | `HorizontalScroller`, `TabStrip`                              | `appkit/ui`               | —                               |
| Dynamic forms                                        | `FormGrid`, `FormField`                                       | `appkit/ui`               | —                               |

---

## 27. Cron Jobs via Firebase Functions

### 27.1 — The problem: cron logic scattered in API routes

Letitrip currently has scheduled tasks (auction expiry, payout settlement, review
moderation sweeps, cart cleanup, OTP counter reset) written as API routes triggered by
Vercel cron. These:

- Cannot be unit-tested independently of HTTP
- Have no retry semantics or dead-letter logging
- Cannot be extracted to a shared package because they import `next/server`
- Violate the rule that Firebase triggers must live in `functions/` (Rule 35)

All cron jobs must move to **`functions/src/scheduled/`** using Firebase Cloud Functions
v2 `onSchedule`. Generic cron contracts live in `appkit/contracts`; the Firebase
implementation lives in `appkit/providers/functions-firebase`.

### 27.2 — Contracts: `IScheduledJob` and `ICronProvider`

```ts
// appkit/src/contracts/cron.ts

export interface JobContext {
  /** ISO 8601 scheduled time — when the job was supposed to fire */
  scheduleTime: string;
  /** Unique invocation ID — use for idempotency guard */
  jobName: string;
}

export interface JobResult {
  processed: number;
  errors: number;
  /** Human-readable summary for logging */
  summary: string;
}

export type ScheduledJobFn = (ctx: JobContext) => Promise<JobResult>;

export interface IScheduledJob {
  /** Unique job identifier — used as the Cloud Function name */
  name: string;
  /** Cron expression (unix cron, 5-field) */
  schedule: string;
  /** IANA timezone — default "Asia/Kolkata" */
  timezone?: string;
  /** The job implementation */
  handler: ScheduledJobFn;
}

export interface ICronProvider {
  /**
   * Register a scheduled job so the provider can wire it to the
   * underlying scheduler (Firebase Scheduler / Vercel Cron / node-cron).
   */
  register(job: IScheduledJob): void;
  /** Return all registered jobs — used by the Firebase Functions entry point */
  getJobs(): IScheduledJob[];
}
```

### 27.3 — Firebase implementation: `FirebaseCronProvider`

```ts
// appkit/src/providers/functions-firebase/cron-provider.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import type { ICronProvider, IScheduledJob } from "../../contracts/cron";

export class FirebaseCronProvider implements ICronProvider {
  private readonly _jobs: IScheduledJob[] = [];

  register(job: IScheduledJob): void {
    this._jobs.push(job);
  }

  getJobs(): IScheduledJob[] {
    return [...this._jobs];
  }

  /**
   * Materialize all registered jobs as Cloud Functions v2 exports.
   * Call this once in functions/src/index.ts:
   *
   *   export const { auctions_expire, payouts_settle } = cronProvider.toFunctions();
   */
  toFunctions(): Record<string, ReturnType<typeof onSchedule>> {
    const exports: Record<string, ReturnType<typeof onSchedule>> = {};

    for (const job of this._jobs) {
      exports[job.name] = onSchedule(
        {
          schedule: job.schedule,
          timeZone: job.timezone ?? "Asia/Kolkata",
          retryCount: 3,
          memory: "256MiB",
        },
        async (event) => {
          const ctx = { scheduleTime: event.scheduleTime, jobName: job.name };
          try {
            const result = await job.handler(ctx);
            logger.info(`[cron/${job.name}] done`, result);
          } catch (err) {
            logger.error(`[cron/${job.name}] error`, { err });
            throw err; // re-throw triggers Cloud Function retry
          }
        },
      );
    }

    return exports;
  }
}

export const cronProvider = new FirebaseCronProvider();
```

### 27.4 — Job registry in appkit

Generic job implementations (the logic) live in `appkit`; they receive repositories via
constructor injection so they are fully testable.

```
appkit/src/jobs/
├── index.ts
├── auction-expiry.job.ts       ← marks auctions as expired, triggers winner notification
├── cart-cleanup.job.ts         ← deletes abandoned carts older than 30 days
├── otp-counter-reset.job.ts    ← resets SMS OTP counters at midnight
├── payout-settlement.job.ts    ← batches ready payouts → payment provider
├── review-moderation.job.ts    ← auto-approves reviews older than 48h with no flags
├── session-cleanup.job.ts      ← deletes expired/revoked sessions
└── subscription-renewal.job.ts ← sends renewal reminders 3 days before expiry
```

Example job implementation:

```ts
// appkit/src/jobs/auction-expiry.job.ts

import type { ScheduledJobFn } from "../contracts/cron";
import type { IRepository } from "../contracts/repository";
import type { AuctionDocument } from "../features/auctions/types";
import { Timestamp } from "firebase-admin/firestore";

export function createAuctionExpiryJob(
  auctionRepo: IRepository<AuctionDocument>,
): ScheduledJobFn {
  return async ({ scheduleTime, jobName }) => {
    const now = Timestamp.now();

    // Find auctions that ended but are still "live"
    const { data: expiring } = await auctionRepo.findAll({
      filters: `status==live,endTime<=${scheduleTime}`,
      perPage: 500,
    });

    let processed = 0;
    let errors = 0;

    for (const auction of expiring) {
      try {
        await auctionRepo.update(auction.id, {
          status:
            auction.highestBidAmount > 0
              ? "ended_with_winner"
              : "ended_no_winner",
          closedAt: now,
        });
        processed++;
      } catch {
        errors++;
      }
    }

    return {
      processed,
      errors,
      summary: `Expired ${processed} auctions (${errors} errors)`,
    };
  };
}
```

### 27.5 — Letitrip `functions/src/index.ts` wiring

```ts
// letitrip: functions/src/index.ts

import {
  cronProvider,
  FirebaseCronProvider,
} from "@mohasinac/appkit/providers/functions-firebase";
import { createAuctionExpiryJob } from "@mohasinac/appkit/jobs/auction-expiry";
import { createCartCleanupJob } from "@mohasinac/appkit/jobs/cart-cleanup";
import { createOtpCounterResetJob } from "@mohasinac/appkit/jobs/otp-counter-reset";
import { createPayoutSettlementJob } from "@mohasinac/appkit/jobs/payout-settlement";
import { createReviewModerationJob } from "@mohasinac/appkit/jobs/review-moderation";
import { createSessionCleanupJob } from "@mohasinac/appkit/jobs/session-cleanup";
import { getFirebaseRepoForFunctions } from "./firebase-init";

// Wire repositories (Firebase Admin SDK, not client SDK)
const auctionRepo = getFirebaseRepoForFunctions<AuctionDocument>("auctions");
const cartRepo = getFirebaseRepoForFunctions<CartDocument>("carts");
const reviewRepo = getFirebaseRepoForFunctions<ReviewDocument>("reviews");
const sessionRepo = getFirebaseRepoForFunctions<SessionDocument>("sessions");
const payoutRepo = getFirebaseRepoForFunctions<PayoutDocument>("payouts");

// Register all scheduled jobs
cronProvider.register({
  name: "auctions_expire",
  schedule: "*/5 * * * *",
  handler: createAuctionExpiryJob(auctionRepo),
});
cronProvider.register({
  name: "carts_cleanup",
  schedule: "0 2 * * *",
  handler: createCartCleanupJob(cartRepo),
});
cronProvider.register({
  name: "otps_reset",
  schedule: "0 0 * * *",
  handler: createOtpCounterResetJob(),
});
cronProvider.register({
  name: "payouts_settle",
  schedule: "0 6 * * *",
  handler: createPayoutSettlementJob(payoutRepo),
});
cronProvider.register({
  name: "reviews_auto_approve",
  schedule: "0 */4 * * *",
  handler: createReviewModerationJob(reviewRepo),
});
cronProvider.register({
  name: "sessions_cleanup",
  schedule: "0 3 * * *",
  handler: createSessionCleanupJob(sessionRepo),
});

// Export materialised Cloud Functions
export const {
  auctions_expire,
  carts_cleanup,
  otps_reset,
  payouts_settle,
  reviews_auto_approve,
  sessions_cleanup,
} = cronProvider.toFunctions();

// Also export Firestore triggers (existing)
export * from "./triggers/onOrderCreate";
export * from "./triggers/onUserCreate";
```

### 27.6 — Job diagram

```
Firebase Scheduler
  │  (fires at cron time)
  ▼
Cloud Function: onSchedule(schedule, tz)
  │
  ├─► FirebaseCronProvider.toFunctions()
  │       │
  │       └─► IScheduledJob.handler(ctx: JobContext)
  │                │   in: { scheduleTime, jobName }
  │                │
  │                ├─► IRepository.findAll({ filters })   [read from Firestore]
  │                ├─► IRepository.update(id, patch)      [write back]
  │                └─► returns JobResult { processed, errors, summary }
  │
  └─► logger.info / logger.error
        └─► Cloud Logging (visible in Firebase Console)
```

### 27.7 — Job schedule table

| Job name               | Schedule      | Purpose                                  |
| ---------------------- | ------------- | ---------------------------------------- |
| `auctions_expire`      | `*/5 * * * *` | Mark auctions past `endTime` as ended    |
| `carts_cleanup`        | `0 2 * * *`   | Delete carts abandoned > 30 days         |
| `otps_reset`           | `0 0 * * *`   | Reset daily/monthly OTP counters         |
| `payouts_settle`       | `0 6 * * *`   | Batch-process approved payout requests   |
| `reviews_auto_approve` | `0 */4 * * *` | Auto-approve unflagged reviews > 48h old |
| `sessions_cleanup`     | `0 3 * * *`   | Remove expired/revoked session documents |
| `subscription_renewal` | `0 9 * * *`   | Send renewal reminder emails             |

### 27.8 — What ships where

| Item                                                        | Stays in letitrip            | Moves to appkit                          |
| ----------------------------------------------------------- | ---------------------------- | ---------------------------------------- |
| `ICronProvider`, `IScheduledJob`, `JobContext`, `JobResult` | —                            | ✅ `appkit/contracts/cron`               |
| `FirebaseCronProvider` + `cronProvider` singleton           | —                            | ✅ `appkit/providers/functions-firebase` |
| Generic job factories (`createAuctionExpiryJob`, etc.)      | —                            | ✅ `appkit/jobs/`                        |
| Job wiring (`functions/src/index.ts`)                       | ✅                           | —                                        |
| Firestore triggers (`onOrderCreate`, `onUserCreate`)        | ✅ `functions/src/triggers/` | —                                        |
| Schedule values (cron strings)                              | ✅ `functions/src/index.ts`  | —                                        |

---

## 28. README and Index File Systematic Update

### 28.1 — The problem: stale or missing documentation

After extraction, each package in `appkit` has either no README, an outdated placeholder,
or documentation that references the old `@lir/*` scope. At the same time, `src/index.ts`
barrel files in letitrip are missing newly-added exports.

### 28.2 — README template for every `appkit/*` package

Each package README must follow this exact structure:

```markdown
# @mohasinac/appkit/<name>

> One-line description of the package's purpose.

## Installation

This package is part of `@mohasinac/appkit`. Import via sub-path:

import { ... } from "@mohasinac/appkit/<name>";

## What's in this package

| Export        | Type     | Description |
| ------------- | -------- | ----------- |
| `FooClass`    | class    | ...         |
| `createFoo()` | function | ...         |

## Diagrams

### Component: `FooComponent`

[ASCII diagram — see Section 33]

### Function: `createFoo(input) → output`

[input/output description — see Section 33]

## Usage example

[Minimal working example]

## Letitrip wiring

[How the consumer project configures this package]

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
```

### 28.3 — Packages requiring README update

| Package                               | Current state          | Action                               |
| ------------------------------------- | ---------------------- | ------------------------------------ |
| `appkit/ui`                           | Missing component list | Add full component table + diagrams  |
| `appkit/security`                     | No PII docs            | Add PII encrypt/decrypt + RBAC usage |
| `appkit/seed`                         | New package            | Full README                          |
| `appkit/jobs`                         | New package            | Full README with job table           |
| `appkit/providers/functions-firebase` | New package            | README with cron wiring              |
| `appkit/features/reviews`             | No PII / modal docs    | Add public profile + modals          |
| `appkit/features/events`              | No rich-text docs      | Add rich-text editor notes           |
| `appkit/features/blog`                | No rich-text docs      | Add rich-text editor notes           |
| `appkit/react`                        | Missing hooks list     | Add full hook table                  |
| `appkit/contracts`                    | missing job contracts  | Add `ICronProvider` section          |

### 28.4 — `src/index.ts` barrel update checklist

For every feature barrel (`src/features/<name>/index.ts`) verify:

1. All new hooks are re-exported
2. All new action functions are re-exported
3. All new types are re-exported
4. Sub-path `appkit/<name>` maps to the barrel

Script to find missing re-exports:

```powershell
# For each feature, list files not referenced by index.ts
Get-ChildItem -Recurse -Path "src/features" -Include "*.ts","*.tsx" |
  Where-Object { $_.Name -ne "index.ts" } |
  ForEach-Object {
    $rel = $_.FullName.Replace($PWD.Path + "\", "").Replace("\", "/")
    $name = [System.IO.Path]::GetFileNameWithoutExtension($rel)
    $indexed = Select-String -Path ($_.Directory.FullName + "\index.ts") -Pattern $name -Quiet
    if (-not $indexed) { Write-Host "MISSING from index: $rel" }
  }
```

---

## 29. Rich Text: Events and Blog Extraction

### 29.1 — What needs rich text support

| Feature    | Content fields needing rich text               | PII risk                 |
| ---------- | ---------------------------------------------- | ------------------------ |
| Blog post  | `content` (full article body)                  | Low — public content     |
| Event      | `description` (event details), `agenda` blocks | Low                      |
| Product    | `description` (seller-written)                 | Low                      |
| Review     | `comment` (buyer text)                         | Medium — could embed PII |
| FAQ answer | `answer`                                       | Low                      |
| Store      | `about` (seller bio)                           | Low                      |

### 29.2 — Rich text contract

```ts
// appkit/src/contracts/rich-text.ts

/**
 * Portable rich text node tree — ProseMirror-compatible JSON.
 * Stored as a JSON blob in Firestore. Rendered via RichTextRenderer.
 */
export interface RichTextDoc {
  type: "doc";
  content: RichTextNode[];
}

export type RichTextNode =
  | { type: "paragraph"; content?: InlineNode[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3 | 4 }; content?: InlineNode[] }
  | { type: "bulletList"; content: ListItemNode[] }
  | { type: "orderedList"; attrs: { order: number }; content: ListItemNode[] }
  | { type: "blockquote"; content: RichTextNode[] }
  | {
      type: "codeBlock";
      attrs: { language?: string };
      content: [{ type: "text"; text: string }];
    }
  | { type: "image"; attrs: { src: string; alt?: string; title?: string } }
  | { type: "horizontalRule" };

export type InlineNode =
  | { type: "text"; text: string; marks?: Mark[] }
  | { type: "hardBreak" };

export type ListItemNode = { type: "listItem"; content: RichTextNode[] };

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "link"; attrs: { href: string; target?: "_blank" | "_self" } };
```

### 29.3 — `RichTextEditor` component

```
┌─────────────────────────────────────────────────────────────────┐
│  TOOLBAR                                                        │
│  [B] [I] [U] [S] [—] [H1] [H2] [•] [1.] ["] [</>] [IMG] [🔗] │
├─────────────────────────────────────────────────────────────────┤
│  CONTENT AREA (ProseMirror editable div)                        │
│                                                                 │
│  Type here... (placeholder when empty)                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  CHARACTER COUNT: 0 / maxLength    [CLEAR]                      │
└─────────────────────────────────────────────────────────────────┘

Input:
  value: RichTextDoc | null
  onChange: (doc: RichTextDoc) => void
  placeholder?: string
  maxLength?: number
  readOnly?: boolean
  toolbar?: ToolbarConfig   — which buttons to show
  className?: string

Output (onChange):
  RichTextDoc — full ProseMirror JSON tree
```

```ts
// appkit/src/ui/components/rich-text/RichTextEditor.tsx
export interface RichTextEditorProps {
  value: RichTextDoc | null;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  toolbar?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    headings?: boolean;
    lists?: boolean;
    blockquote?: boolean;
    code?: boolean;
    image?: boolean;
    link?: boolean;
  };
  className?: string;
}
```

### 29.4 — `RichTextRenderer` component (read-only)

```
Input:
  doc: RichTextDoc
  className?: string
  sanitize?: boolean   — strip <script> / on* handlers (default: true)

Output:
  Rendered HTML through safe mapping (no dangerouslySetInnerHTML)
  Each node type → semantic wrapper:
    paragraph  → <Text>
    heading    → <Heading level={n}>
    image      → <MediaImage>
    link       → <TextLink>
    bulletList → <Ul><Li>
    codeBlock  → <pre><code>
```

XSS protection: `renderProseMirrorNode` only traverses known node types; unknown types
are dropped. No `dangerouslySetInnerHTML` — each node is mapped to a React element.

### 29.5 — PII scan in rich text content

Rich text `content` fields must be scanned before storage for accidentally embedded PII
(e.g. a buyer writes their phone number in a review comment). The scan runs in the API
route before writing:

```ts
// appkit/src/features/reviews/api/route.ts (POST)

import { scanRichTextForPii } from "@mohasinac/appkit/security";

const body = await req.json();
const piiWarnings = await scanRichTextForPii(body.comment); // returns [{ field, pattern }]

if (piiWarnings.length && !body.piiAcknowledged) {
  return NextResponse.json(
    { error: "pii_detected", warnings: piiWarnings },
    { status: 422 },
  );
}
// If user acknowledged, store comment but flag it: piiReported: true
```

`scanRichTextForPii` extracts all text nodes from a `RichTextDoc` and runs regex patterns
for common PII: phone numbers (`\+?[\d\s\-]{10,}`), email patterns, Aadhaar format, UPI IDs.

### 29.6 — Blog post schema (updated)

```ts
// appkit/src/features/blog/types/index.ts

export interface BlogPostDocument {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** ProseMirror JSON — stored as Firestore map */
  content: RichTextDoc;
  coverImage: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  readTimeMinutes: number; // computed on save: wordCount / 200
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  seoTitle?: string;
  seoDescription?: string;
}
```

### 29.7 — Event schema (updated)

```ts
// appkit/src/features/events/types/index.ts

export interface EventDocument {
  id: string;
  title: string;
  slug: string;
  /** ProseMirror JSON */
  description: RichTextDoc;
  /** Optional structured agenda blocks */
  agenda: AgendaBlock[];
  coverImage: string | null;
  startDate: Timestamp;
  endDate: Timestamp;
  venue: EventVenue | null;
  isOnline: boolean;
  meetingUrl?: string;
  status: "draft" | "published" | "cancelled" | "completed";
  maxAttendees: number | null;
  currentAttendees: number;
  registrationDeadline: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AgendaBlock {
  time: string; // "10:00 AM"
  title: string;
  /** ProseMirror JSON — optional rich description */
  description?: RichTextDoc;
  speakerName?: string;
  speakerAvatar?: string;
}
```

### 29.8 — Form: `BlogPostForm` and `EventForm`

Both forms use the `RichTextEditor` for content fields and follow the `FormGrid`/`FormField`
fluid layout (Section 25). They are registered in `appkit/features/blog` and
`appkit/features/events` respectively.

```
BlogPostForm:
  ┌─────────────────────────────┬────────────────────────────┐
  │ Title (full width)                                       │
  ├─────────────────────────────┴────────────────────────────┤
  │ Excerpt (full width, Textarea)                           │
  ├──────────────────────────────────────────────────────────┤
  │ Content (RichTextEditor, full width, maxLength=50000)    │
  ├──────────────────────────────────────────────────────────┤
  │ Cover Image (MediaUpload)   │ Tags (TokenInput)          │
  ├─────────────────────────────┼────────────────────────────┤
  │ Status (Select)             │ Publish Date (DatePicker)  │
  ├─────────────────────────────┼────────────────────────────┤
  │ SEO Title                   │ SEO Description            │
  └─────────────────────────────┴────────────────────────────┘
  Actions: [Save Draft]  [Publish]  [Preview]
```

```
EventForm:
  ┌──────────────────────────────────────────────────────────┐
  │ Title (full width)                                       │
  ├──────────────────────────────────────────────────────────┤
  │ Description (RichTextEditor, full width)                 │
  ├─────────────────────────────┬────────────────────────────┤
  │ Start Date+Time             │ End Date+Time              │
  ├─────────────────────────────┼────────────────────────────┤
  │ Venue Name                  │ Venue City                 │
  ├─────────────────────────────┼────────────────────────────┤
  │ Online? (Toggle)            │ Meeting URL (if online)    │
  ├─────────────────────────────┼────────────────────────────┤
  │ Max Attendees               │ Registration Deadline      │
  ├──────────────────────────────────────────────────────────┤
  │ Agenda Builder (repeatable blocks with RichTextEditor)   │
  └──────────────────────────────────────────────────────────┘
  Actions: [Save Draft]  [Publish]  [Cancel]
```

---

## 30. Review System — Public Profiles, Modals, Seller/Admin Actions

### 30.1 — Component inventory

```
ReviewCard
  ├── ViewReviewModal  (side drawer)
  ├── EditReviewModal  (side drawer — buyer only, within edit window)
  └── ReviewActionMenu (seller/admin context menu on card)
      ├── ApproveAction
      ├── RejectAction
      ├── FlagAction
      └── RequestEditAction

UserPublicProfileModal (side drawer — opened by clicking reviewer avatar/name)
  ├── UserStats panel
  ├── UserReviewList
  └── UserActivitySummary
```

### 30.2 — `ReviewCard` component diagram

```
┌──────────────────────────────────────────────────────────────┐
│  [AVATAR] Display Name  ·  Verified Buyer badge              │
│           [★★★★☆]  4.0                 Date: 12 Apr 2026    │
├──────────────────────────────────────────────────────────────┤
│  "Title of the review"                                       │
│  Body text of the review comment. Long text wraps to the     │
│  next line using Text wrapper (break-words).                 │
├──────────────────────────────────────────────────────────────┤
│  [📷 3 images]   [👍 12 helpful]   [···] More               │
│                                        └─ context menu:      │
│                                           seller: [Respond]  │
│                                           admin:  [Approve]  │
│                                                   [Reject]   │
│                                                   [Flag]     │
│                                           buyer:  [Edit]     │
│                                                   [Delete]   │
└──────────────────────────────────────────────────────────────┘

Click avatar/name → opens UserPublicProfileModal
Click "3 images"  → opens image gallery lightbox
Click [···]       → right-aligned dropdown menu (role-aware)
Click card body   → opens ViewReviewModal
```

```
Input (ReviewCardProps):
  review:        ReviewDocument
  currentUser:   PublicUserProps | null
  userRole:      "buyer" | "seller" | "admin" | "guest"
  onApprove:     (id: string) => Promise<void>   — admin/seller
  onReject:      (id: string, reason: string) => Promise<void>
  onFlag:        (id: string) => Promise<void>
  onEdit:        (review: ReviewDocument) => void  — buyer
  onDelete:      (id: string) => Promise<void>     — buyer
  onViewProfile: (userId: string) => void

Output (events emitted):
  onApprove / onReject / onFlag / onEdit / onDelete / onViewProfile
```

### 30.3 — `ViewReviewModal` (side drawer)

```
┌──────────────────────────────┐  ← 480px wide side drawer, slides in from right
│  ✕   Review Details          │
├──────────────────────────────┤
│  [AVATAR] Name  Verified ✓   │
│  [★★★★☆]  4.0  12 Apr 2026  │
├──────────────────────────────┤
│  product: "Handmade Bag"     │  ← links to product page
├──────────────────────────────┤
│  "Title"                     │
│                              │
│  Full review text. Long body │
│  with proper wrapping.       │
├──────────────────────────────┤
│  [IMAGE 1] [IMAGE 2]         │  ← tap to open lightbox
├──────────────────────────────┤
│  👍 12 people found helpful  │
│  [Mark as Helpful]           │
├──────────────────────────────┤
│  Seller Response (if any):   │
│  "Thank you for your..."     │
└──────────────────────────────┘

Input:  reviewId: string  (loaded inside modal)
Output: onClose: () => void
```

### 30.4 — `EditReviewModal` (side drawer)

```
┌──────────────────────────────┐
│  ✕   Edit Your Review        │
├──────────────────────────────┤
│  Rating:  [★][★][★][★][☆]   │  ← interactive star picker
├──────────────────────────────┤
│  Title:   [________________] │
├──────────────────────────────┤
│  Comment: [RichTextEditor  ] │  ← PII scan on submit
│           [                ] │
│           [________________] │
├──────────────────────────────┤
│  Images:  [current images  ] │
│           [+ Add more]       │
├──────────────────────────────┤
│  [Cancel]          [Save]    │
└──────────────────────────────┘

Input:
  review: ReviewDocument    — pre-filled form values
  onSave: (patch: Partial<ReviewDocument>) => Promise<void>
  onClose: () => void

Validation:
  rating required (1-5)
  comment: min 10 chars, max 2000 chars
  PII scan before submit (scanRichTextForPii)
  edit window: within 30 days of original submission
```

### 30.5 — `UserPublicProfileModal` (side drawer)

```
┌──────────────────────────────┐
│  ✕   User Profile            │
├──────────────────────────────┤
│  [AVATAR 80px]               │
│  Display Name                │
│  Member since: Jan 2024      │
│  📍 City (if public)         │
├──────────────────────────────┤
│  STATS                       │
│  ┌─────┬────────┬──────────┐ │
│  │ 23  │  4.6★  │  156     │ │
│  │revws│avg rat │helpful   │ │
│  └─────┴────────┴──────────┘ │
├──────────────────────────────┤
│  RECENT REVIEWS (3 shown)    │
│  ┌──────────────────────────┐│
│  │ [Product] ★★★★☆  Apr 26 ││
│  │ "Short comment preview..."││
│  └──────────────────────────┘│
│  [View all reviews]          │
├──────────────────────────────┤
│  Activity badges:            │
│  [Verified Buyer] [Top Reviewer] [500+ purchases] │
└──────────────────────────────┘

Input:
  userId: string     — loaded inside modal
  onClose: () => void

Data loaded:
  user:    PublicUserProps   — from /api/users/:id/public (no PII)
  stats:   UserReviewStats   — { totalReviews, avgRating, helpfulCount }
  reviews: ReviewDocument[]  — last 3 published reviews
```

### 30.6 — `ReviewActionMenu` (role-aware context menu)

```
Input:
  review:      ReviewDocument
  actorRole:   "buyer" | "seller" | "admin"
  actorUid:    string
  onApprove:   () => Promise<void>
  onReject:    (reason: string) => Promise<void>
  onFlag:      () => Promise<void>
  onRespond:   () => void          — opens seller response textarea inline
  onEdit:      () => void          — buyer only, opens EditReviewModal
  onDelete:    () => Promise<void> — buyer: own reviews only; admin: any

Menu items by role:
  guest:  (no menu)
  buyer (own review):  [Edit Review] [Delete Review]
  seller (their product): [Respond to Review] [Flag Review]
  admin:  [Approve] [Reject (with reason)] [Flag] [Delete]
```

### 30.7 — `UserReviewStats` type

```ts
// appkit/src/features/reviews/types/index.ts

export interface UserReviewStats {
  userId: string;
  totalReviews: number;
  publishedReviews: number;
  avgRating: number; // 0.0–5.0, 1 decimal
  helpfulCount: number; // sum of helpfulCount across all reviews
  verifiedPurchaseCount: number;
  memberSinceYear: number;
}
```

### 30.8 — `/api/users/:id/public` endpoint

Returns `PublicUserProps` + `UserReviewStats`. Guarantees no PII escapes (PiiScrubber
middleware automatically strips any `enc:v1:` that might slip through).

```
GET /api/users/:id/public
→ { user: PublicUserProps, stats: UserReviewStats }

No auth required — public profile is opt-in (user.publicProfile.isPublic must be true)
If isPublic === false → 404 (not 403, to prevent user enumeration)
```

### 30.9 — Seed data for reviews

Review seed fixtures must include realistic metrics — not random:

```ts
// appkit/src/seed/factories/review.factory.ts

export const REVIEW_FIXTURES = {
  five_star_verified: makeReview({
    rating: 5,
    title: "Exactly as described",
    verified: true,
    comment:
      "Received in perfect condition. Packaging was excellent. Seller communicated proactively about shipping.",
    helpfulCount: 34,
    status: "published",
  }),
  three_star_mixed: makeReview({
    rating: 3,
    title: "Good but delivery was late",
    comment:
      "Product quality is good, but it arrived 5 days after the estimated date. Seller did apologise.",
    helpfulCount: 8,
    status: "published",
  }),
  one_star_flagged: makeReview({
    rating: 1,
    title: "Not what I ordered",
    comment: "Received completely wrong item. Still waiting for resolution.",
    helpfulCount: 2,
    status: "flagged",
  }),
};
```

---

## 31. Category Cards — Enhanced Information Architecture

### 31.1 — Current vs target layout

```
CURRENT (small, text-only):
┌──────────┐
│  [icon]  │
│ Category │
└──────────┘

TARGET (large, rich data):
┌─────────────────────────────────────┐
│  [COVER IMAGE — aspect-[4/3]]       │
│  ┌─────────────────────────────┐    │
│  │ [🏷 ICON]  Category Name   │    │  ← overlaid on image bottom
│  │  1,240 products · ₹99+      │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Top sub-categories (3 chips):      │
│  [Handmade] [Vintage] [Upcycled]    │
└─────────────────────────────────────┘
```

### 31.2 — `CategoryCard` component

```
Input (CategoryCardProps):
  category:       CategoryDocument
  productCount:   number
  minPrice:       number | null     — lowest price in category
  topChildren:    CategoryDocument[]  — up to 3 sub-categories
  priority?:      boolean            — next/image priority hint

Output (events):
  onClick: (category: CategoryDocument) => void

Dimensions:
  Card min-height: 180px  (was 80px — too small)
  Image: aspect-[4/3]     — taller gives richer visual
  Overlay: gradient black/60 → transparent from bottom
  Text on image: white, font-semibold, text-shadow
  Price badge: top-right, "From ₹99" in small Badge component
```

### 31.3 — `CategoryDocument` additions (seed-relevant fields)

```ts
// appkit/src/features/categories/types/index.ts (additions)

export interface CategoryDocument {
  // existing...
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  icon: string | null;
  image: string | null;

  // NEW — computed/denormalized fields for card display
  productCount: number; // updated by cron or trigger on product write
  minPrice: number | null; // cheapest product in category
  topChildrenIds: string[]; // up to 3 sub-category IDs for chip strip
  coverImage: string | null; // optional distinct hero image (vs icon)
  description: string | null; // 1-2 sentence description for hover/detail
}
```

### 31.4 — Seed data: real category values

```ts
// appkit/src/seed/defaults/categories.ts

export const DEFAULT_CATEGORIES: CategoryDocument[] = [
  {
    id: "cat-handmade",
    name: "Handmade & Crafts",
    slug: "handmade-crafts",
    parentId: null,
    icon: "✂️",
    image: "/seed/cat-handmade.jpg",
    productCount: 1240,
    minPrice: 99,
    topChildrenIds: ["cat-jewellery", "cat-pottery", "cat-textiles"],
    coverImage: "/seed/cat-handmade-cover.jpg",
    description:
      "Unique handcrafted items made by skilled artisans across India.",
    sortOrder: 1,
  },
  {
    id: "cat-vintage",
    name: "Vintage & Antiques",
    slug: "vintage-antiques",
    parentId: null,
    icon: "🕰",
    image: "/seed/cat-vintage.jpg",
    productCount: 340,
    minPrice: 250,
    topChildrenIds: ["cat-vintage-maps", "cat-coins", "cat-ceramics"],
    coverImage: "/seed/cat-vintage-cover.jpg",
    description: "Curated vintage pieces with character and history.",
    sortOrder: 2,
  },
  {
    id: "cat-jewellery",
    name: "Jewellery",
    slug: "jewellery",
    parentId: "cat-handmade",
    icon: "💍",
    image: null,
    productCount: 430,
    minPrice: 149,
    topChildrenIds: [],
    coverImage: null,
    description: null,
    sortOrder: 1,
  },
  // ... 15 more categories following same pattern
];
```

---

## 32. Theme and Card Visual Bug Fixes

### 32.1 — Known visual bugs inventory

| Bug                                            | Component      | Root cause                                                       | Fix                                                                    |
| ---------------------------------------------- | -------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Store card text invisible                      | `StoreCard`    | White text on white background; card bg not set                  | Add `bg-white dark:bg-zinc-900` to card; overlay gradient on image     |
| Store card fixed height clips name             | `StoreCard`    | `h-[220px]` hard-coded                                           | Replace with `aspect-[4/3]` image + auto-height body section           |
| Product card dark theme — price text invisible | `ProductCard`  | Hardcoded `text-zinc-900` ignores dark mode                      | Use `THEME_CONSTANTS.text.price` (includes dark variant)               |
| Pre-order card duplicate tags                  | `PreOrderCard` | Both `orderType: "pre-order"` badge AND a "Pre-Order" label chip | Remove the chip label; keep the `orderType` badge only                 |
| Auction countdown flickers                     | `AuctionCard`  | `useCountdown` re-renders full card on every tick                | Memo the countdown output; only re-render the `<time>` element         |
| Category card overflow-hidden clips long names | `CategoryCard` | `overflow-hidden` on card + `whitespace-nowrap` on name          | Use `line-clamp-2` instead                                             |
| Empty state on `StoreCard` thumbnail           | `StoreCard`    | Falls back to the store `coverImage` but it can be null          | Show placeholder with store initials when both logo and cover are null |

### 32.2 — `StoreCard` fixed layout

```
CURRENT (broken):               TARGET (fixed):
┌──────────────────┐            ┌──────────────────────────────────┐
│ [fixed h=220px]  │            │ [COVER IMAGE — aspect-[5/3]]     │
│ (clips at 220px) │            │  ┌────────────────────────────┐  │
│ text invisible   │            │  │ [LOGO 48px] Store Name    │  │  ← overlay
└──────────────────┘            │  │ ⭐ 4.3 · 120 products     │  │
                                │  └────────────────────────────┘  │
                                ├────────────────────────────────────┤
                                │  [chip] Category tag               │
                                │  "Short store description..."      │
                                │  [Visit Store ›]                   │
                                └────────────────────────────────────┘

StoreCard min-height: none — auto from content
StoreCard body bg: bg-white dark:bg-zinc-900   ← CRITICAL FIX
Image overlay: bg-gradient-to-t from-black/70 to-transparent
Store name: text-white font-bold text-shadow (on image)
```

### 32.3 — `ProductCard` theme fix

```ts
// BEFORE (broken in dark mode):
<span className="text-zinc-900 font-bold">₹{price}</span>

// AFTER (token-safe):
<span className={THEME_CONSTANTS.text.price}>₹{price}</span>
// THEME_CONSTANTS.text.price = "text-zinc-900 dark:text-white font-bold tabular-nums"
```

All hardcoded color classes on `ProductCard` text elements must be replaced with
`THEME_CONSTANTS.text.*` variants. Audit checklist for `ProductCard`:

| Element                  | Current class                | Replace with                                   |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| Product title            | `text-zinc-800`              | `THEME_CONSTANTS.text.h4`                      |
| Brand / category         | `text-zinc-500`              | `THEME_CONSTANTS.text.muted`                   |
| Price                    | `text-zinc-900 font-bold`    | `THEME_CONSTANTS.text.price`                   |
| Original price (crossed) | `text-zinc-400 line-through` | `THEME_CONSTANTS.text.muted + " line-through"` |
| Discount badge           | `text-green-600`             | `THEME_CONSTANTS.text.success`                 |
| Status badge             | `text-red-600`               | `THEME_CONSTANTS.text.error`                   |

### 32.4 — Pre-order card cleanup

```
BEFORE — duplicate information:
┌──────────────────────────────┐
│  [PRE-ORDER] badge   ← good  │
│  Product Title               │
│  [Pre-Order] chip    ← REMOVE│  ← same info twice
│  [Handmade] chip             │
│  Delivery: March 2026        │
└──────────────────────────────┘

AFTER — clean:
┌──────────────────────────────┐
│  [PRE-ORDER] badge           │
│  Product Title               │
│  [Handmade] chip             │
│  Delivery: March 2026        │
│  ₹1,299  [Pre-Order Now]     │
└──────────────────────────────┘
```

Removal rule: any chip/tag whose text matches the card's primary badge label must be
filtered out before rendering. Implemented as:

```ts
const displayTags = product.tags.filter(
  (tag) =>
    tag.toLowerCase() !== product.orderType?.toLowerCase().replace("-", " "),
);
```

### 32.5 — Auction card flicker fix

```ts
// BEFORE — full card re-renders every second:
function AuctionCard({ auction }) {
  const timeLeft = useCountdown(auction.endTime);
  return <div>...{timeLeft}...</div>;  // whole card re-renders
}

// AFTER — only the time element re-renders:
const AuctionCountdown = React.memo(function AuctionCountdown({ endTime }: { endTime: Timestamp }) {
  const timeLeft = useCountdown(endTime);
  return <time dateTime={endTime.toDate().toISOString()}>{timeLeft}</time>;
});

function AuctionCard({ auction }) {
  // Card does not subscribe to countdown — AuctionCountdown does
  return <div>...<AuctionCountdown endTime={auction.endTime} />...</div>;
}
```

---

## 33. Realistic Seed Data Metrics

### 33.1 — The problem with sequential/random seed values

The current factories produce `"Product 1"`, `price: 100`, `rating: undefined`. This
makes the seeded UI look unfinished — page headings say "Product 1", price filters show
`₹100` for everything, star ratings are absent.

Goal: seed data that produces a **UI that looks like a real marketplace** from day one.

### 33.2 — Product fixture sets (realistic)

```ts
// appkit/src/seed/defaults/products.ts

export const DEFAULT_PRODUCTS: Array<Partial<BaseProductDocument>> = [
  {
    id: "prod-001",
    slug: "handwoven-silk-dupatta-blue",
    title: "Handwoven Silk Dupatta — Royal Blue",
    description: richText(
      "Pure Banarasi silk dupatta with traditional zari work.",
    ),
    price: 1299,
    currency: "INR",
    status: "published",
    category: "cat-handmade",
    tags: ["silk", "dupatta", "banarasi"],
    images: ["/seed/prod-001-1.jpg", "/seed/prod-001-2.jpg"],
    condition: "new",
  },
  {
    id: "prod-002",
    slug: "terracotta-diyas-set-12",
    title: "Hand-Painted Terracotta Diyas (Set of 12)",
    description: richText(
      "Eco-friendly terracotta diyas hand-painted by Rajasthan artisans.",
    ),
    price: 349,
    currency: "INR",
    status: "published",
    category: "cat-handmade",
    tags: ["diya", "terracotta", "festive"],
    images: ["/seed/prod-002-1.jpg"],
    condition: "new",
  },
  // ... 18 more realistic products
];
```

### 33.3 — Store fixture set

```ts
export const DEFAULT_STORES = [
  {
    id: "store-kalakar",
    slug: "kalakar-crafts",
    name: "Kalakar Crafts",
    status: "active",
    description: "Preserving traditional crafts of Rajasthan since 2019.",
    logo: "/seed/store-kalakar-logo.jpg",
    coverImage: "/seed/store-kalakar-cover.jpg",
    productCount: 47,
    avgRating: 4.6,
    reviewCount: 128,
    category: "Handmade & Crafts",
  },
  {
    id: "store-vintage-vault",
    slug: "vintage-vault",
    name: "Vintage Vault Mumbai",
    status: "active",
    description: "Curated vintage finds from across Maharashtra.",
    logo: "/seed/store-vintage-logo.jpg",
    coverImage: "/seed/store-vintage-cover.jpg",
    productCount: 23,
    avgRating: 4.8,
    reviewCount: 56,
    category: "Vintage & Antiques",
  },
];
```

### 33.4 — User fixture set (public-safe)

```ts
export const USER_FIXTURES = {
  admin: makeFullUser({
    uid: "uid-admin-001",
    displayName: "Arjun Mehta",
    roles: ["admin"],
    emailVerified: true,
    publicProfile: { bio: "Marketplace admin", isPublic: true },
  }),
  seller_kalakar: makeFullUser({
    uid: "uid-seller-001",
    displayName: "Priya Sharma",
    roles: ["seller"],
    emailVerified: true,
    storeId: "store-kalakar",
    publicProfile: {
      bio: "Preserving Indian craft traditions.",
      isPublic: true,
    },
  }),
  buyer_1: makeFullUser({
    uid: "uid-buyer-001",
    displayName: "Rahul Verma",
    roles: ["user"],
    emailVerified: true,
    publicProfile: {
      bio: "Passionate about handmade products.",
      isPublic: true,
    },
  }),
  // email/phone stored encrypted in Firestore — NOT in this fixture
  // piiFields: ["email", "phone"] handles encryption in runSeed
};
```

### 33.5 — Review fixture set (realistic ratings)

```ts
export const DEFAULT_REVIEWS = [
  makeReview({
    id: "rev-001",
    productId: "prod-001",
    userId: "uid-buyer-001",
    rating: 5,
    title: "Absolutely beautiful fabric",
    comment:
      "The silk quality is exceptional. Intricate zari work is exactly as shown in photos. Very happy!",
    helpfulCount: 34,
    verified: true,
    status: "published",
  }),
  makeReview({
    id: "rev-002",
    productId: "prod-001",
    userId: "uid-buyer-002",
    rating: 4,
    title: "Good quality, slight colour difference",
    comment:
      "The product is well-made but the colour on screen appears slightly more vibrant. Still happy with the purchase.",
    helpfulCount: 12,
    verified: true,
    status: "published",
  }),
  makeReview({
    id: "rev-003",
    productId: "prod-002",
    userId: "uid-buyer-003",
    rating: 5,
    title: "Perfect for Diwali gifts",
    comment:
      "Bought 3 sets. Packaging was beautiful, arrived safely. Gifted to family — everyone loved them.",
    helpfulCount: 22,
    verified: true,
    status: "published",
  }),
];
```

---

## 34. Component Diagrams and Function Signatures Reference

### 34.1 — Purpose

Every component in `appkit/ui` and every exported function in `appkit/*` must have:

1. An **ASCII box diagram** showing its visual layout (for UI components)
2. A plain-text **input → output signature** with all props/parameters documented

These live in each package's `README.md` under a `## Diagrams` section.

### 34.2 — Standard diagram template

```
ComponentName
─────────────
Visual layout (ASCII art showing actual UI structure):

┌────────────────────────────────┐
│  [visual elements]             │
└────────────────────────────────┘

Input props:
  propName:   TypeName    — description
  optProp?:   TypeName    — description (default: value)

Output / events:
  onEvent:    (arg: Type) => void   — when it fires

State (internal):
  isOpen:     boolean     — controls modal visibility

Notes:
  - Any important behavior notes
  - Accessibility: what ARIA attrs are set
```

### 34.3 — Core component diagrams

#### `Button`

```
┌─────────────────────────────────────┐
│  [icon?]  Label text  [trailing?]   │   ← h-11 (44px min touch target)
└─────────────────────────────────────┘
  └── loading state:  [⟳ spinner] Label text  (disabled during load)

Input:
  variant:   "primary"|"secondary"|"ghost"|"destructive"|"outline"
  size:      "sm"|"md"|"lg"|"icon"
  loading?:  boolean    — shows spinner, disables clicks
  disabled?: boolean
  icon?:     ReactNode  — leading icon
  trailing?: ReactNode  — trailing icon (e.g. chevron)
  onClick?:  () => void
  type?:     "button"|"submit"|"reset"
  tooltip?:  string     — rendered as <Tooltip> wrapper if provided

Output: none (onClick prop)
ARIA:  aria-disabled when disabled/loading; aria-busy when loading
```

#### `ProductCard`

```
┌─────────────────────────────────────┐
│  [WISHLIST btn top-right]           │
│  [BADGE top-left: "Sale"/"New"]     │
│                                     │
│  IMAGE  aspect-[3/4]                │
│  (next/image, object-cover)         │
│                                     │
├─────────────────────────────────────┤
│  Category tag  (text.small muted)   │
│  Product Title (text.h4, 2 lines)   │
│  ⭐ 4.3  (12 reviews)               │
│  ₹1,299  ~~₹1,999~~  35% off       │
│  [Add to Cart]   [Quick View]       │
└─────────────────────────────────────┘

Input:
  product:      ProductDocument
  onWishlist?:  (id: string) => void
  onAddToCart?: (product: ProductDocument) => void
  isWishlisted?:boolean
  priority?:    boolean   — next/image priority

Output: onWishlist, onAddToCart click events
Notes:
  - Uses fluid-grid-card min width 220px (Section 23)
  - Dark mode: all text via THEME_CONSTANTS.text.*
  - Image fallback: zinc-100/800 bg + product icon placeholder
```

#### `StoreCard`

```
┌─────────────────────────────────────┐
│  [COVER IMAGE aspect-[5/3]]         │
│  ├── gradient overlay bottom 40%    │
│  │   [LOGO 48px circle]             │
│  │   Store Name (white bold)        │
│  │   ⭐ 4.6 · 128 reviews          │
│  └────────────────────────────────  │
├─────────────────────────────────────┤
│  bg-white dark:bg-zinc-900  ← FIXED │
│  [Handmade & Crafts] chip           │
│  "Short description 2 lines max"    │
│  47 products   [Visit Store ›]      │
└─────────────────────────────────────┘

Input:
  store:    BaseStoreDocument (+ productCount, avgRating, reviewCount, category)
  onClick?: (store: BaseStoreDocument) => void

Notes:
  - coverImage null → solid bg-zinc-100 placeholder with store initial
  - logo null → colored circle with initials (initial-avatar pattern)
  - body bg MUST be white/zinc-900 (previously unset — text invisible bug)
```

#### `CategoryCard`

```
┌─────────────────────────────────────┐
│  [COVER/IMAGE aspect-[4/3]]         │
│  ├── gradient overlay               │
│  │   [ICON 32px]  Category Name    │
│  │   1,240 products · From ₹99     │
│  └────────────────────────────────  │
├─────────────────────────────────────┤
│  Sub-categories (chip strip):       │
│  [Jewellery] [Pottery] [Textiles]   │
└─────────────────────────────────────┘

Input:
  category:     CategoryDocument
  productCount: number
  minPrice:     number | null
  topChildren:  CategoryDocument[]
  onClick?:     (category: CategoryDocument) => void

Notes:
  - Name: line-clamp-2 (not whitespace-nowrap)
  - Chips: HorizontalScroller with minItemWidth=80 (Section 24)
```

#### `ReviewCard`

```
┌─────────────────────────────────────────┐
│ [AVT] Name  [Verified✓]  [···] menu     │
│       [★★★★☆] 4.0        12 Apr 2026   │
├─────────────────────────────────────────┤
│ "Review Title"  (text.h4)               │
│ Comment text wrapping across lines.     │
│ Uses Text wrapper with break-words.     │
├─────────────────────────────────────────┤
│ [📷 3]  [👍 12 helpful]                 │
│ Seller response: "Thank you..."  ↓      │
└─────────────────────────────────────────┘

Input:
  review:        ReviewDocument
  currentUser:   PublicUserProps | null
  actorRole:     "guest"|"buyer"|"seller"|"admin"
  actorUid:      string
  onApprove:     (id) => Promise<void>
  onReject:      (id, reason) => Promise<void>
  onViewProfile: (userId) => void
  onEdit:        (review) => void
  onDelete:      (id) => Promise<void>

Events:
  Avatar/name click → onViewProfile(review.userId)
  Card body click   → opens ViewReviewModal
  ··· menu          → ReviewActionMenu (role-aware)
```

#### `HorizontalScroller<T>`

```
┌──────────────────────────────────────────────────┐
│ [‹ btn]  [item1] [item2] [item3]  [› btn]        │
│  ↑ shown only when items overflow                │
└──────────────────────────────────────────────────┘

Arrows hidden when all items fit:
┌──────────────────────────────────────────────────┐
│  [item1] [item2] [item3] [item4] [item5]         │
└──────────────────────────────────────────────────┘

Input:
  items:         T[]
  renderItem:    (item: T, index: number) => ReactNode
  minItemWidth?: number  (default: 100)
  gap?:          number  (default: 8)

Internal state:
  visibleCount:  computed via ResizeObserver
  scrollOffset:  integer — index of first visible item
  hasOverflow:   boolean — whether arrows are shown

Output: none (renderItem callback renders each item)
```

#### `TabStrip`

```
┌────────────────────────────────────────────────────┐
│ [‹]  [Tab 1]  [Tab 2 ●active]  [Tab 3]  [›]       │
│              └─ border-b-2 primary ─┘              │
└────────────────────────────────────────────────────┘

Arrows visible only when tabs overflow container:
┌──────────────────────────────────────────────────┐
│  [Tab 1]  [Tab 2]  [Tab 3]  [Tab 4]  [Tab 5]    │
└──────────────────────────────────────────────────┘

Input:
  tabs:         Array<{ key, label, badge?, disabled? }>
  activeKey:    string
  onChange:     (key: string) => void
  minTabWidth?: number (default: 100)

Behaviour:
  - Active tab always kept in visible window (auto-scroll)
  - Badge shows count bubble next to label
  - Disabled tab: opacity-40, cursor-not-allowed
  - role="tablist" + role="tab" + aria-selected ARIA
```

#### `FormGrid` + `FormField`

```
Container: flex flex-wrap gap-4

┌──────────────────┬──────────────────┐  ← 600px+: 2 cols
│  FormField auto  │  FormField auto  │    (each min-w-[280px])
├──────────────────┴──────────────────┤
│  FormField span="full"              │  ← always 100% width
├──────────────────┬──────────────────┤
│  FormField half  │  FormField half  │  ← fixed 50%
└──────────────────┴──────────────────┘

At 360px:
┌──────────────────────────────────────┐
│  FormField auto (100% — wraps alone) │
├──────────────────────────────────────┤
│  FormField auto                      │
└──────────────────────────────────────┘

Input (FormGrid):
  minFieldWidth?: number  (default: 280)
  gap?:           number  (default: 16)

Input (FormField):
  span?: "auto"|"full"|"half"   (default: "auto")
```

#### `useContainerGrid`

```
Input:
  minItemWidth: number     — minimum width of one column in px
  gap?:         number     — gap between columns (default: 16)
  minCols?:     number     — never go below this (default: 1)
  maxCols?:     number     — never exceed this (default: Infinity)

Output:
  containerRef: RefObject<HTMLElement>   — attach to grid container
  cols:         number                   — current computed column count

Mechanism:
  ResizeObserver on containerRef
  → compute = floor((width + gap) / (minItemWidth + gap))
  → clamp to [minCols, maxCols]
  → setState(cols) → triggers skeleton re-render
```

#### `useVisibleItems`

```
Input:
  total:        number   — total number of items
  minItemWidth: number   — min width per item in px
  arrowWidth?:  number   — width of each arrow button (default: 36)
  gap?:         number   — gap between items (default: 8)

Output:
  containerRef:   RefObject<HTMLElement>
  visibleCount:   number   — how many items fit
  hasOverflow:    boolean  — whether arrows should show
  scrollOffset:   number   — index of first visible item
  canScrollLeft:  boolean
  canScrollRight: boolean
  scrollLeft:     () => void
  scrollRight:    () => void
  setScrollOffset:(n: number) => void  — for tab active-keep-in-view

Algorithm:
  1. allFit = total*minItemWidth + (total-1)*gap <= containerWidth
  2. if allFit → visibleCount = total, no arrows
  3. else → usable = containerWidth - 2*(arrowWidth + gap)
            visibleCount = max(1, floor((usable + gap) / (minItemWidth + gap)))
```

#### `piiScrubberMiddleware`

```
Input:
  request:  NextRequest
  ctx:      BaseRequestContext
  next:     () => Promise<NextResponse>

Output:
  NextResponse (same status, same headers, body with enc:v1:* replaced)

Algorithm:
  1. Await next() → get response
  2. Check content-type — skip if not application/json
  3. Parse response.json()
  4. Deep-walk every value:
     - string starting with "enc:v1:" → replace with "[encrypted]"
     - array → map recursively
     - object → entries map recursively
  5. Return NextResponse.json(scrubbed, { status, headers })

Notes:
  Safety net only — not a substitute for PiiRepository.decryptPiiFields()
```

#### `runSeed`

```
Input:
  config: SeedConfig {
    collections: SeedCollectionWithPii<unknown>[] — each has:
      collection: string     — Firestore collection name
      data:       unknown[]  — documents to write
      piiFields?: string[]   — fields to encrypt before write
      idField?:   string     — field used as doc ID (default: "id")
      merge?:     boolean    — Firestore merge flag (default: false)
    projectId?:  string      — override Firestore project
    dryRun?:     boolean     — log only, no writes
    onProgress?: (col, written, total) => void
  }

Output:
  Promise<SeedResult> {
    collections:    string[]  — names of seeded collections
    totalDocuments: number    — total docs written
    durationMs:     number    — wall clock time
  }

Algorithm per collection:
  1. For each doc: if piiFields.length → encryptPiiFields(doc, piiFields)
  2. Batch write to Firestore (BATCH_SIZE = 400)
  3. Call onProgress after each batch
  4. Return SeedResult
```

#### `createAuctionExpiryJob`

```
Input:
  auctionRepo: IRepository<AuctionDocument>

Output (returns):
  ScheduledJobFn = async (ctx: JobContext) => JobResult

When called (by Firebase Scheduler every 5 minutes):
  ctx.in:  { scheduleTime: ISO string, jobName: "auctions_expire" }

Algorithm:
  1. findAll({ filters: "status==live,endTime<={scheduleTime}", perPage: 500 })
  2. For each auction:
     - highestBidAmount > 0 → status = "ended_with_winner"
     - else                 → status = "ended_no_winner"
     - closedAt = Timestamp.now()
     - auctionRepo.update(id, patch)
  3. Return { processed, errors, summary }
```

---

### 34.4 — Listing Layout Modes

All product/store/event lists support three switch-able layout modes: **Card Grid**, **Fluid Grid**, and **List**.
The active mode is stored in the URL (`?view=card|fluid|list`) via `useUrlTable`.

---

#### Card Grid (fixed columns)

Uses CSS `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` — fixed breakpoint steps.

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ [image]    │ │ [image]    │ │ [image]    │ │ [image]    │
│            │ │            │ │            │ │            │
│ Title      │ │ Title      │ │ Title      │ │ Title      │
│ ⭐ 4.2    │ │ ⭐ 4.5    │ │ ⭐ 3.9    │ │ ⭐ 4.7    │
│ ₹1,299    │ │ ₹2,499    │ │ ₹899      │ │ ₹3,199    │
│ [Add Cart] │ │ [Add Cart] │ │ [Add Cart] │ │ [Add Cart] │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ ...        │ │ ...        │ │ ...        │ │ ...        │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

---

#### Fluid Grid (`useContainerGrid` — auto column count)

Columns fill based on container width. Minimum column width = 220 px. Gap = 16 px.

```
Container 900 px → cols = floor((900 + 16) / (220 + 16)) = 3 cols
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ [image 3/4]    │ │ [image 3/4]    │ │ [image 3/4]    │
│                │ │                │ │                │
│ Title 2 lines  │ │ Title 2 lines  │ │ Title 2 lines  │
│ ⭐ 4.2 (12)   │ │ ⭐ 4.5 (30)   │ │ ⭐ 3.9 (5)    │
│ ₹1,299 ~~₹2k~~│ │ ₹2,499        │ │ ₹899 35% off  │
└────────────────┘ └────────────────┘ └────────────────┘

Container 460 px → cols = floor((460 + 16) / (220 + 16)) = 2 cols
┌──────────────────┐ ┌──────────────────┐
│ [image 3/4]      │ │ [image 3/4]      │
│ Title            │ │ Title            │
│ ⭐ 4.2   ₹1,299 │ │ ⭐ 4.5   ₹2,499 │
└──────────────────┘ └──────────────────┘

Container 230 px → cols = 1 (minCols clamp)
┌──────────────────────────────────────┐
│ [image aspect-[3/4]]                 │
│ Title                                │
│ ⭐ 4.2   ₹1,299                     │
└──────────────────────────────────────┘
```

---

#### List Mode (compact rows)

Horizontal rows. Image thumbnail 72 × 72 px, all text inline.
Ideal for search results, admin panels, and "previously viewed" strips.

```
Mobile (< 640 px) — 2-line stack per row:
┌─────────────────────────────────────────────────────┐
│ [72px │ Title (h4 truncate)           ₹1,299      ] │
│  img] │ Category · ⭐ 4.3 (12)   [Add Cart]  [♥]  │
├───────┼─────────────────────────────────────────────┤
│ [72px │ Another Product               ₹2,499      ] │
│  img] │ Electronics · ⭐ 4.5 (30)  [Add Cart]  [♥] │
├───────┼─────────────────────────────────────────────┤
│ [72px │ Short Product Name            ₹899       ] │
│  img] │ Handmade · ⭐ 3.9 (5)     [Add Cart]  [♥]  │
└─────────────────────────────────────────────────────┘

Desktop (≥ 640 px) — single-row per item:
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [72px img] │ Title (h4, flex-1, truncate)  │ Category  │ ⭐ 4.3 │ ₹1,299 │[↗]│
├────────────┼───────────────────────────────┼───────────┼────────┼────────┼────┤
│ [72px img] │ Another Product (flex-1)       │ Fashion   │ ⭐ 4.0 │ ₹899  │[↗]│
├────────────┼───────────────────────────────┼───────────┼────────┼────────┼────┤
│ [72px img] │ Blue Ceramic Vase              │ Handmade  │ ⭐ 4.8 │ ₹3,199│[↗]│
└─────────────────────────────────────────────────────────────────────────────────┘

Column widths (desktop):
  thumbnail   : w-[72px] h-[72px]  flex-shrink-0  rounded-lg  object-cover
  title       : flex-1   min-w-0   truncate       font-medium
  category    : w-[110px] text-sm muted   hidden sm:block
  rating      : w-[72px]  text-sm         hidden sm:block
  price       : w-[80px]  text-sm font-semibold text-right
  action      : w-[36px]  flex-shrink-0  (icon button → quick-view or open detail)

Row classes:
  flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60
  border-b border-zinc-100 dark:border-zinc-800 last:border-0
```

**ViewToggle component** (switches between modes):

```
Desktop:
┌──────────────────────┐
│  [⊞ Card] [⊟ List]  │  ← icon buttons with aria-label, active = primary bg
└──────────────────────┘

Mobile: hidden (always shows card mode on < sm)

Input:
  view:     "card" | "fluid" | "list"
  onChange: (view: "card" | "fluid" | "list") => void

Each toggle button:
  <IconButton aria-label="Card view" icon={<GridIcon />} variant={"primary" if active else "ghost"} />
```

---

## 35 — Tooltip Integration + Side Modal Responsiveness

### 35.1 Goals

| Item                               | Requirement                                               |
| ---------------------------------- | --------------------------------------------------------- |
| Tooltip on Button                  | Show on hover; never block click                          |
| Tooltip on form fields             | Show on hover/focus-visible; never block typing or tap    |
| SideModal desktop width            | 60 % of viewport width                                    |
| SideModal mobile width             | 100 % of viewport width (full-sheet)                      |
| SideModal overflow                 | Form content scrolls independently inside modal body      |
| Viewport 200 px (small but usable) | Shrink modal via `min(60vw, 280px)` → graceful at ~180 px |
| Viewport ≤ 128 px                  | Render `<TooSmallScreen>` guard — no app content          |

---

### 35.2 Tooltip Design Rules

**Core rule: Tooltips are _informational ornaments_, never interactive blockers.**

```
Tooltip trigger taxonomy
─────────────────────────
Button         → trigger = "hover"  (pointer device) + "focus-visible" (keyboard)
                 placement = "top" (default) — never obscures the button label
                 delay = 500 ms open, 0 ms close (snap away on mouse-leave)

TextInput      → trigger = "focus-visible" ONLY
                 placement = "right" on desktop (doesn't overlap text cursor)
                 placement = "top"   on mobile  (keyboard would cover right)
                 delay = 800 ms open (let user start typing first)
                 auto-dismiss after 4 s (don't fight with user typing)

SelectInput /  → trigger = "hover" on label element ONLY (not on the dropdown)
Combobox         placement = "top"
                 delay = 300 ms (fast — user is browsing, not acting)

Checkbox /     → trigger = "hover" on label text
Radio            placement = "top"
                 delay = 300 ms

FileInput      → trigger = "hover" on label/button wrapper (never on native input)
                 placement = "top"
```

**What a tooltip MUST NOT do**

- Cover the element being hovered (always offset 8 px minimum)
- Appear on `pointerdown` / `touchstart` — only on hover settle + focus-visible
- Appear when the element is `disabled` (misleading; show disabled reason inline instead)
- Have `pointer-events: auto` inside its popover (tooltips are read-only)
- Trap keyboard focus (use `role="tooltip"` + `aria-describedby`, no `tabindex`)

---

### 35.3 `Tooltip` Component Contract

```
Tooltip — Input/Output
────────────────────────────────────────────────────────────────────
IN  children      ReactElement         — the trigger element (cloned with ref+event handlers)
IN  content       string | ReactNode   — tooltip body text or rich node
IN  placement?    "top"|"right"|"bottom"|"left"  (default: "top")
IN  delay?        number               — ms before open (default: 500)
IN  autoDismiss?  number               — ms to auto-close; 0 = never (default: 0)
IN  disabled?     boolean              — skip all tooltip logic entirely
IN  className?    string               — extra classes for the tooltip bubble
OUT wraps trigger with invisible popover anchor; tooltip mounts in portal

ASCII layout (placement="top"):
       ┌──────────────────────────┐
       │  tooltip content text    │
       └───────────┬──────────────┘
                   │ 8px offset (CSS arrow)
            ┌──────┴──────┐
            │   trigger   │
            └─────────────┘
```

```tsx
// src/components/Tooltip.tsx  (or @mohasinac/ui)
"use client";

import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/helpers";

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  delay?: number; // hover settle delay   (default 500 ms)
  autoDismiss?: number; // 0 = never            (default 0)
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  children,
  content,
  placement = "top",
  delay = 500,
  autoDismiss = 0,
  disabled = false,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>();
  const tooltipId = useId();

  const clearTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(dismissTimer.current);
  };

  const computeCoords = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const OFFSET = 8;
      switch (placement) {
        case "top":
          return { top: rect.top - OFFSET, left: rect.left + rect.width / 2 };
        case "bottom":
          return {
            top: rect.bottom + OFFSET,
            left: rect.left + rect.width / 2,
          };
        case "right":
          return { top: rect.top + rect.height / 2, left: rect.right + OFFSET };
        case "left":
          return { top: rect.top + rect.height / 2, left: rect.left - OFFSET };
      }
    },
    [placement],
  );

  const open = useCallback(
    (el: HTMLElement) => {
      clearTimers();
      openTimer.current = setTimeout(() => {
        setCoords(computeCoords(el));
        setVisible(true);
        if (autoDismiss > 0) {
          dismissTimer.current = setTimeout(
            () => setVisible(false),
            autoDismiss,
          );
        }
      }, delay);
    },
    [computeCoords, delay, autoDismiss],
  );

  const close = useCallback(() => {
    clearTimers();
    setVisible(false);
  }, []);

  if (disabled || !isValidElement(children)) return children;

  const trigger = cloneElement(
    children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
    {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
      },
      "aria-describedby": tooltipId,
      onMouseEnter(e: React.MouseEvent<HTMLElement>) {
        open(e.currentTarget);
        (children.props as React.HTMLAttributes<HTMLElement>).onMouseEnter?.(e);
      },
      onMouseLeave(e: React.MouseEvent<HTMLElement>) {
        close();
        (children.props as React.HTMLAttributes<HTMLElement>).onMouseLeave?.(e);
      },
      onFocus(e: React.FocusEvent<HTMLElement>) {
        // Only on keyboard focus (focus-visible polyfill approach)
        if (!(e.target as HTMLElement).matches(":focus-visible")) return;
        open(e.currentTarget);
        (children.props as React.HTMLAttributes<HTMLElement>).onFocus?.(e);
      },
      onBlur(e: React.FocusEvent<HTMLElement>) {
        close();
        (children.props as React.HTMLAttributes<HTMLElement>).onBlur?.(e);
      },
    },
  );

  // Placement-based transform
  const transformMap: Record<string, string> = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    right: "translate(0, -50%)",
    left: "translate(-100%, -50%)",
  };

  const bubble = visible
    ? createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: transformMap[placement],
            pointerEvents: "none", // ← CRITICAL: never intercept clicks
            zIndex: 9999,
          }}
          className={cn(
            "max-w-[220px] rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs text-white",
            "shadow-lg dark:bg-zinc-700",
            className,
          )}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {trigger}
      {bubble}
    </>
  );
}
```

---

### 35.4 `Button` — Tooltip as Default Prop

```tsx
// @mohasinac/ui   Button.tsx  — add `tooltip` prop
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string; // if provided, auto-wraps with <Tooltip>
  tooltipPlacement?: "top" | "right" | "bottom" | "left";
  // ... existing props
}

export function Button({
  tooltip,
  tooltipPlacement = "top",
  ...props
}: ButtonProps) {
  const btn = <button {...props} />;
  if (!tooltip) return btn;
  return (
    <Tooltip content={tooltip} placement={tooltipPlacement} delay={500}>
      {btn}
    </Tooltip>
  );
}
```

Usage — zero extra markup at call site:

```tsx
<Button tooltip="Save your changes">Save</Button>
<Button tooltip="Permanently delete this item" tooltipPlacement="bottom">Delete</Button>
```

---

### 35.5 Form Field — Tooltip Integration

**Rule**: Form field tooltips describe the field's _purpose_ or _constraints_ — they are NOT validation error messages (those appear inline below the field).

```
TextInput with tooltip (placement="right" — does NOT overlap cursor):

  ┌──────────────────────────────────────────────────────────────┐
  │  label text                                                  │
  │  ┌───────────────────────────────────────┐    ┌──────────┐  │
  │  │  input text cursor here……             │    │ hint txt │  │
  │  └───────────────────────────────────────┘ ←8→└──────────┘  │
  │                                                tooltip bubble │
  └──────────────────────────────────────────────────────────────┘
  (tooltip appears on focus-visible, auto-dismisses after 4 s)
```

```tsx
// FormField.tsx — add `hint` prop (tooltip trigger on label hover)
interface FormFieldProps {
  label: string;
  hint?: string; // short tooltip text; appears on label hover / input focus-visible
  error?: string;
  children: React.ReactElement; // the actual input/select/textarea
}

export function FormField({ label, hint, error, children }: FormFieldProps) {
  const id = useId();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const input = cloneElement(children, { id });

  const labelEl = hint ? (
    <Tooltip
      content={hint}
      placement={isMobile ? "top" : "right"}
      delay={300} // fast on label hover — user is reading, not acting
    >
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
    </Tooltip>
  ) : (
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
    </label>
  );

  // For text inputs, also attach tooltip to the input itself on focus-visible
  const inputWithHint = hint ? (
    <Tooltip
      content={hint}
      placement={isMobile ? "top" : "right"}
      delay={800} // longer delay — user may already be typing
      autoDismiss={4000} // auto-close so it doesn't fight with input
    >
      {input}
    </Tooltip>
  ) : (
    input
  );

  return (
    <div className="flex flex-col gap-1">
      {labelEl}
      {inputWithHint}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

---

### 35.6 Side Modal — Responsive Width Contract

```
SideModal width rules
──────────────────────────────────────────────────────────────────
Viewport class   Width rule                           Expressed as CSS
─────────────    ──────────────────────────────────   ─────────────────────────────────
Desktop ≥ 640px  60 % of viewport                    w-[60vw]  min-w-[280px]
Mobile  < 640px  100 % of viewport                   w-full
Very-small<180px Shrink below 280px min; just reflow  min-w-0 (no hard floor)
≤ 128 px (any)   Don't show app — show TooSmallScreen guard instead
```

ASCII diagram:

```
Desktop (≥ 640 viewport):

┌───────────────────────────────────────────────────────────────────────────┐
│  Page content (40%)          │  SideModal (60%)                           │
│                              │ ┌─────────────────────────────────────────┐│
│                              │ │  Header + title  [X close]              ││
│                              │ │─────────────────────────────────────────││
│                              │ │  Body (overflow-y: auto)                ││
│                              │ │  ┌─────────────────────────────────┐    ││
│                              │ │  │ form fields...                  │    ││
│                              │ │  │ ...                             │    ││
│                              │ │  └─────────────────────────────────┘    ││
│                              │ │─────────────────────────────────────────││
│                              │ │  Footer: Cancel / Submit                ││
│                              │ └─────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────────┘

Mobile (< 640 viewport) — bottom sheet:

┌──────────────────────────┐
│  Page content            │
│                          │
│                          │
├──────────────────────────┤  ←  drag handle
│  SideModal (100% width)  │
│  Header + title  [X]     │
│──────────────────────────│
│  Body (overflow-y: auto) │
│  form fields...          │
│  ...                     │
│──────────────────────────│
│  Footer: Cancel/Submit   │
└──────────────────────────┘

Very small (128×128) — TooSmallScreen:

┌────────────────┐
│  ⚠️            │
│  Screen too    │
│  small         │
│  Need ≥ 180px  │
└────────────────┘
```

---

### 35.7 `SideModal` Component Contract

```
SideModal — Input/Output
────────────────────────────────────────────────────────
IN  isOpen        boolean          — controlled open state
IN  onClose       () => void       — close handler
IN  title         string           — modal header text
IN  children      ReactNode        — modal body (form content)
IN  footer?       ReactNode        — sticky footer slot (buttons)
IN  width?        "default"|"full" — override (default auto by breakpoint)
OUT renders portal overlay + slide-in panel; body scroll locked while open
OUT calls onClose on backdrop click, Escape key, or explicit close button
```

```tsx
// src/components/SideModal.tsx  (or @mohasinac/ui)
"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/helpers";

interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "default" | "full";
}

export function SideModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "default",
}: SideModalProps) {
  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel
          sm: full-width bottom-sheet approach  (translate-x + w-full)
          md+: right-aligned 60 % panel          (w-[60vw] min-w-[280px])
          On very small viewports (< 180px): min-w-0 shrinks gracefully
      */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-modal-title"
        className={cn(
          // positioning: always on the right, full height
          "absolute right-0 top-0 flex h-full flex-col bg-white dark:bg-zinc-900 shadow-2xl",
          // width tiers
          width === "full"
            ? "w-full"
            : [
                "w-full", // mobile default: 100%
                "sm:w-[60vw]", // desktop: 60vw
                "sm:min-w-[280px]", // never squeeze below 280px on sm+
                "min-w-0", // but on sub-sm just reflow freely
              ],
          // slide-in animation
          "translate-x-0 transition-transform duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-zinc-700">
          <h2 id="side-modal-title" className="text-base font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* Body — independent scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Footer — sticky */}
        {footer && (
          <div className="border-t px-4 py-3 dark:border-zinc-700">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
```

---

### 35.8 `TooSmallScreen` Guard

**Rule**: If `window.innerWidth ≤ 128 || window.innerHeight ≤ 128` render a full-screen fallback instead of the app. This must be the outermost client guard — before any layout renders.

```
TooSmallScreen — Input/Output
──────────────────────────────────────────
IN  minWidth   number   — threshold in px (default 128)
IN  minHeight  number   — threshold in px (default 128)
IN  children   ReactNode
OUT renders children if screen is large enough
OUT renders TooSmallScreen fallback if screen is too small
```

```tsx
// src/components/TooSmallScreen.tsx
"use client";

import { useEffect, useState } from "react";

const MIN_W = 128;
const MIN_H = 128;

export function TooSmallScreen({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    const check = () =>
      setTooSmall(window.innerWidth <= MIN_W || window.innerHeight <= MIN_H);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (tooSmall) {
    return (
      <div
        style={{
          // inline styles intentional — Tailwind may not load at this viewport
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          color: "#fafafa",
          padding: "1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "0.75rem",
        }}
      >
        <span style={{ fontSize: "2rem" }}>⚠️</span>
        <strong style={{ marginTop: "0.5rem" }}>Screen too small</strong>
        <span style={{ marginTop: "0.25rem", color: "#a1a1aa" }}>
          You need a wider screen to use this application.
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
```

Mount once in root layout — wraps everything:

```tsx
// src/app/[locale]/layout.tsx
import { TooSmallScreen } from "@/components/TooSmallScreen";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TooSmallScreen>
          {/* QueryProvider, AuthProvider, etc. */}
          {children}
        </TooSmallScreen>
      </body>
    </html>
  );
}
```

---

### 35.9 Viewport Shrink Behaviour at 200 px

The `SideModal` at a 200 px wide viewport behaves as follows:

```
viewport: 200px wide

w-full          → panel width = 200px               (full-width mobile rule)
sm:w-[60vw]     → NOT active (sm = 640px breakpoint)
sm:min-w-[280px]→ NOT active
min-w-0         → floor = 0px (just reflow)

Result: 200px panel. Content inside uses normal block flow.
Form fields stack vertically. No horizontal overflow caused by the modal itself.

If form fields themselves have min-width (e.g. an input with min-w-[280px]):
→ That input overflows the 200px container and scrolls horizontally
→ FIX: all form inputs inside SideModal must use `w-full` (explicit full-width)
       and avoid any hard min-width wider than `100%` of their parent.
```

**Rule added to FormField**: `children` rendered inside a `SideModal` inherit `width: 100%` via the `<div className="contents">` wrapper — native inputs must not have `min-w-*` wider than their container.

---

### 35.10 Summary Table

| Item                       | Implementation                                                            | Location                                       |
| -------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `Tooltip` component        | Portal-based, `pointer-events: none`, delay+autoDismiss                   | `@mohasinac/ui` / `src/components/Tooltip.tsx` |
| Button tooltip             | `tooltip?` prop on `Button`; wraps with `<Tooltip>`                       | `@mohasinac/ui Button.tsx`                     |
| FormField hint tooltip     | `hint?` prop; label hover (fast) + input focus-visible (slow+autoDismiss) | `src/components/FormField.tsx`                 |
| Tooltip mobile placement   | Auto-swaps `right` → `top` on `sm` breakpoint                             | `FormField` + `useMediaQuery`                  |
| `SideModal` width          | `w-full` mobile, `sm:w-[60vw] sm:min-w-[280px]` desktop                   | `src/components/SideModal.tsx`                 |
| `SideModal` body overflow  | `flex-1 min-h-0 overflow-y-auto` — independent scroll region              | `SideModal` body div                           |
| Very-small viewport reflow | `min-w-0` — no hard floor below sm breakpoint                             | `SideModal` className                          |
| `TooSmallScreen` guard     | Checks `window.innerWidth/Height ≤ 128`; inline styles (no Tailwind dep)  | `src/components/TooSmallScreen.tsx`            |
| Root layout mount          | `<TooSmallScreen>` wraps entire `<body>` content                          | `src/app/[locale]/layout.tsx`                  |

---

## 36 — Locale, Currency & Regional Defaults (India / ₹ / +91)

### 36.1 Policy

**Current scope**: English only, India only, INR only, +91 only.
All regional values derive from a single constant — `LOCALE_CONFIG` in
`src/constants/config.ts`. No value is hardcoded anywhere else.
When a second locale or currency is added, only `LOCALE_CONFIG` and
`src/i18n/routing.ts` need to change.

---

### 36.2 `LOCALE_CONFIG` — Single Source of Truth

**File**: `src/constants/config.ts` (exported via `src/constants/index.ts`)

```ts
export const LOCALE_CONFIG = {
  DEFAULT_LOCALE: "en-IN", // BCP 47 — used by all Intl formatters
  DEFAULT_CURRENCY: "INR", // ISO 4217
  CURRENCY_SYMBOL: "₹", // Unicode symbol for display
  DEFAULT_COUNTRY: "India",
  DEFAULT_CITY: "Mumbai",
  DEFAULT_COUNTRY_CODE: "IN", // ISO 3166-1 alpha-2
  DEFAULT_PHONE_CODE: "+91", // ITU-T dialling prefix
  TIMEZONE: "Asia/Kolkata", // must match BUSINESS_DAY_CONFIG.TIMEZONE
  SUPPORTED_LOCALES: ["en"] as const, // mirrors src/i18n/routing.ts locales
} as const;
```

---

### 36.3 Changes Applied

| File                                                      | What changed                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/constants/config.ts`                                 | Added `LOCALE_CONFIG` block (new export)                                                                                                    |
| `src/constants/site.ts`                                   | `contact.phone` → `"+91 22 4567 8900"` · `contact.address` → `"Mumbai, Maharashtra, India"`                                                 |
| `src/lib/monitoring/analytics.ts`                         | 3× `currency: "USD"` → `currency: "INR"` (view_item, add_to_cart, purchase GA4 events)                                                      |
| `src/features/user/components/PublicProfileView.tsx`      | 2× `"en-US"` → `"en-IN"` in `formatNumber()` calls                                                                                          |
| `src/features/products/components/ProductReviews.tsx`     | 1× `"en-US"` → `"en-IN"` in `formatNumber()` call                                                                                           |
| `src/features/seller/components/SellerStorefrontView.tsx` | 2× `"en-US"` → `"en-IN"` in `formatNumber()` calls                                                                                          |
| `packages/utils/src/number.formatter.ts`                  | Default `currency="USD"` → `"INR"` · default `locale="en-US"` → `"en-IN"` (both `formatCurrency` and `formatNumber`)                        |
| `packages/utils/src/date.formatter.ts`                    | Default `locale="en-US"` → `"en-IN"` on all 5 functions: `formatDate`, `formatDateTime`, `formatTime`, `formatMonthYear`, `formatDateRange` |

**Already correct — no change needed:**

- `src/constants/seo.ts` — `locale: "en_IN"` ✓
- `src/i18n/routing.ts` — `localePrefix: "never"` · `"en"` URL slug kept (no URL-level locale prefix; formatter uses `en-IN`) ✓
- `src/lib/validation/schemas.ts` — `currency.default("INR")`, `country.default("India")`, 6-digit postal code ✓
- `src/db/schema/site-settings.ts` — `+91` prefix on all phone defaults ✓
- `src/constants/config.ts` — `BUSINESS_DAY_CONFIG.TIMEZONE: "Asia/Kolkata"` ✓
- `src/constants/address.ts` — full `INDIAN_STATES` list ✓

---

### 36.4 How to Add a Second Locale in Future

```
Step 1 — LOCALE_CONFIG
  Add locale tag to SUPPORTED_LOCALES array.

Step 2 — src/i18n/routing.ts
  Add locale to `locales` array.
  If URL prefix wanted, set `localePrefix: "as-needed"`.

Step 3 — messages/
  Add  messages/<locale>.json  with full translation keys.

Step 4 — Formatter callers
  Callers that pass explicit locale strings must be updated.
  Callers using default args will inherit whatever the package default is — consider
  passing LOCALE_CONFIG.DEFAULT_LOCALE explicitly at those call sites at that point.
```

---

### 36.5 Note on `formatCurrency` Call Sites

Callers that previously passed no arguments (e.g. `formatCurrency(product.price)`)
now format as **₹ Indian Rupee** automatically. Callers that already passed explicit
`("INR", "en-IN")` args (e.g. `ProductTableColumns.tsx`) are unchanged — still correct.

`Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })` produces
`₹1,00,000` (Indian numbering system with lakh/crore groupings), which is correct
for the Indian market.

---

## 37. Architecture Rules Reference

This section is the **canonical rule index** for all active architectural constraints across the `appkit` + `letitrip.in` codebase. ESLint rules are enforced automatically; manual rules require code-review enforcement.

---

### 37.1 — ESLint Rules (auto-enforced)

All rules live in `packages/eslint-plugin-letitrip/index.js` and are active in `.eslintrc` via `plugin:letitrip/recommended`.

#### Architecture (ARCH)

| Code     | Rule name                 | Level | Description                                                                                                                 |
| -------- | ------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001 | `no-deep-barrel-import`   | error | Import from package root (`@mohasinac/appkit/ui`), never from deep internal path (`@mohasinac/appkit/ui/components/Button`) |
| ARCH-002 | `no-cross-feature-import` | error | `feat-*` packages must not import from other `feat-*` packages; use `contracts` interfaces only                             |
| ARCH-003 | `no-fat-page`             | warn  | Page components (files inside `app/`) must stay ≤ 150 lines                                                                 |
| ARCH-004 | `no-tier1-feature-import` | error | Shell layer (feat-layout / feat-forms) must not import from domain feature packages                                         |

#### Firebase (FIREBASE)

| Code         | Rule name                           | Level | Description                                                              |
| ------------ | ----------------------------------- | ----- | ------------------------------------------------------------------------ |
| FIREBASE-001 | `no-firebase-client-in-ui`          | error | No Firebase client SDK imports inside `components/` or `hooks/`          |
| FIREBASE-002 | `no-firebase-client-in-ui`          | error | No `initializeApp()` / `getFirestore()` / `getAuth()` in UI files        |
| FIREBASE-003 | `no-firebase-admin-outside-backend` | error | Admin SDK only in `app/api/`, `actions/`, `repositories/`                |
| FIREBASE-004 | `no-direct-firestore-query`         | error | No raw `collection()` / `getDocs()` in API routes — use repository layer |

#### Services / Data Layer (SVC)

| Code    | Rule name                       | Level | Description                                                               |
| ------- | ------------------------------- | ----- | ------------------------------------------------------------------------- |
| SVC-001 | `no-fetch-in-ui`                | error | No `fetch()` calls in components or pages — use `apiClient` inside a hook |
| SVC-002 | `no-apiclient-outside-services` | error | `apiClient` only in hooks / context providers, never in components        |
| SVC-003 | `no-hardcoded-api-path`         | warn  | No `/api/...` literal strings — use `API_ENDPOINTS` constants             |

#### Components (COMP)

| Code     | Rule name              | Level | Description                                                                                   |
| -------- | ---------------------- | ----- | --------------------------------------------------------------------------------------------- |
| COMP-001 | `no-raw-html-elements` | error | No `<div>` without using `<Div>`, no `<p>` without `<Text>`, no `<h1-h6>` without `<Heading>` |
| COMP-002 | `no-raw-html-elements` | error | No raw `<section>` — use `<Section>`                                                          |
| COMP-003 | `no-raw-html-elements` | error | No raw `<article>` — use `<Article>`                                                          |
| COMP-004 | `no-raw-html-elements` | error | No raw `<nav>` — use `<Nav>`                                                                  |
| COMP-005 | `no-raw-html-elements` | error | No raw `<ul>` / `<ol>` / `<li>` — use `<Ul>` / `<Ol>` / `<Li>`                                |
| COMP-006 | `no-raw-html-elements` | error | No raw `<footer>` / `<header>` — use `<Footer>` / `<Header>`                                  |
| COMP-007 | `no-raw-html-elements` | error | No raw `<main>` — use `<Main>`                                                                |
| COMP-008 | `no-raw-html-elements` | error | No raw `<aside>` — use `<Aside>`                                                              |
| COMP-009 | `no-raw-html-elements` | error | No raw `<button>` — use `<Button>` or `<IconButton>`                                          |

#### Media (MEDIA)

| Code      | Rule name               | Level | Description                                            |
| --------- | ----------------------- | ----- | ------------------------------------------------------ |
| MEDIA-001 | `no-raw-media-elements` | error | No raw `<img>` — use `<MediaImage>` or `<MediaAvatar>` |
| MEDIA-002 | `no-raw-media-elements` | error | No raw `<video>` — use `<MediaVideo>`                  |
| MEDIA-003 | `no-raw-media-elements` | error | No raw `<a>` anchor — use `<TextLink>`                 |

#### Styling (STYL)

| Code     | Rule name                | Level | Description                                                               |
| -------- | ------------------------ | ----- | ------------------------------------------------------------------------- |
| STYL-001 | `require-xl-breakpoints` | warn  | Responsive classes must include `xl:` variant for widescreen layouts      |
| STYL-002 | `no-inline-static-style` | warn  | No `style={{ color: "red" }}` with static values — use Tailwind classes   |
| STYL-003 | `no-hardcoded-grid-cols` | warn  | No `grid-cols-N` literals — use `FLUID_GRID` tokens or `useContainerGrid` |

#### i18n (I18N)

| Code     | Rule name                      | Level | Description                                                                                |
| -------- | ------------------------------ | ----- | ------------------------------------------------------------------------------------------ |
| I18N-001 | `use-i18n-navigation`          | error | Use `next-intl` `Link` / `useRouter` — not `next/navigation`                               |
| I18N-002 | `use-i18n-navigation`          | error | Use `next-intl` `redirect` — not `next/navigation` redirect                                |
| I18N-003 | `no-module-scope-translations` | error | `useTranslations()` calls only inside component function bodies, never at module top-level |

#### Constants (CNST)

| Code     | Rule name                 | Level | Description                                                                           |
| -------- | ------------------------- | ----- | ------------------------------------------------------------------------------------- |
| CNST-001 | `no-hardcoded-route`      | warn  | No `/products/...` inline strings — use `ROUTES` constants                            |
| CNST-002 | `no-raw-date`             | warn  | No `new Date()` in React components — use date helpers from `@mohasinac/appkit/utils` |
| CNST-003 | `no-hardcoded-collection` | error | No Firestore collection name strings inline — use `COLLECTION_NAMES`                  |

#### Quality (QUAL)

| Code     | Rule name                    | Level | Description                                                                   |
| -------- | ---------------------------- | ----- | ----------------------------------------------------------------------------- |
| QUAL-001 | `no-console`                 | warn  | `console.log` forbidden — use `logger` (client) / `serverLogger` (API routes) |
| QUAL-002 | `no-alert`                   | error | `alert()` / `confirm()` forbidden — use `useMessage()` / `ConfirmDeleteModal` |
| QUAL-003 | `no-debug-statement`         | warn  | `debugger` forbidden                                                          |
| QUAL-004 | `no-firebase-trigger-in-api` | error | Firestore trigger logic must live in `functions/src/` not in API routes       |

#### Accessibility (A11Y)

| Code     | Rule name                        | Level | Description                                                               |
| -------- | -------------------------------- | ----- | ------------------------------------------------------------------------- |
| A11Y-001 | `no-unlabelled-icon-button`      | error | `<IconButton>` must always have an `aria-label` prop                      |
| A11Y-002 | `require-tooltip-on-icon-button` | warn  | `<IconButton>` should be wrapped in a `<Tooltip>` with matching `content` |

---

### 37.2 — Manual / Code-Review Rules

These rules are not enforced by ESLint but are required by architecture:

#### File Organization

- Pages: `src/app/[locale]/*/page.tsx` — RSC only, ≤ 150 lines, passes `initialData` to a `*View.tsx`
- Feature modules: `src/features/<name>/` — components/, hooks/, types/, constants/, index.ts
- Shared: `src/components/`, `src/hooks/`, `src/utils/` — Tier 1 only
- No feature may import from another feature (ARCH-002)
- No `src/services/` directory — deleted; all data in hooks + actions

#### Naming Conventions

| Pattern                     | Convention                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| React components            | `PascalCase.tsx`                                                         |
| Hooks                       | `use<Name>.ts` (camelCase)                                               |
| Utility functions           | `camelCase.ts`                                                           |
| Constants                   | `UPPER_SNAKE_CASE`                                                       |
| TypeScript types/interfaces | `PascalCase` with `I` prefix for interfaces                              |
| Firestore repositories      | `<Name>Repository` class in `src/repositories/<name>.repository.ts`      |
| Server actions              | `<verb><Resource>Action` in `src/actions/<name>.actions.ts`              |
| API routes                  | `src/app/api/<name>/route.ts` — exports `GET`, `POST`, `PATCH`, `DELETE` |

#### Imports and Exports

- Always import from barrel file (`@/components`, `@/hooks`, `@/features/products`)
- Never import from deep internal path (`@/components/ui/Button.tsx`)
- Feature `index.ts` must re-export all public components, hooks, types
- No circular dependencies between features

#### Forms

- Always use `react-hook-form` + `zodResolver`
- Schema in `src/db/schema/<name>.schema.ts`
- No custom form state management (`useState` for individual fields)
- Validation errors shown via field-level `formState.errors`

#### State Management

- Server state: TanStack Query `useQuery` (reads) + `useMutation` (mutations)
- URL state: `useUrlTable` — filter, sort, page always in URL for shareable links
- UI state: `useState` (local) or `useContext` (cross-component)
- No Redux, MobX, or Zustand (not in stack)

#### Security

- Rate limiting on all public API routes via `rateLimit()` from `@mohasinac/security`
- Auth verification via `requireAuth()` on protected routes
- RBAC via `requireRole()` / `<Can>` component
- No direct Firestore access outside repositories
- PII fields (email, phone) always encrypted before write via `encryptPiiFields()`
- Environment variables never logged or returned in responses

#### Encoding (Rule 28-B)

- All files written by PowerShell or Python to `src/`, `messages/`, or `scripts/seed-data/` **must** use explicit UTF-8-no-BOM encoding
- After any programmatic write: verify with `Get-Content -Encoding UTF8` and check for mojibake characters
- If garbled characters appear (`ãÆ`, `â€™`, `Ã©`, `ï¿½`): stop and fix immediately with `replace_string_in_file`

#### Build Verification

After every session of changes:

1. `npx tsc --noEmit` — 0 type errors
2. `npm run build` — production build passes
3. `npm run lint` — 0 lint errors
4. Push to `main` → Vercel deploy green

---

### 37.3 — Wrapper Component Contract

All presentational wrappers in `@mohasinac/appkit/ui` follow this contract:

| Wrapper        | HTML                         | Usage context                           |
| -------------- | ---------------------------- | --------------------------------------- |
| `<Div>`        | `<div>`                      | Generic layout container                |
| `<Section>`    | `<section>`                  | Page-level content regions              |
| `<Article>`    | `<article>`                  | Self-contained content cards            |
| `<Main>`       | `<main>`                     | Page main content area (one per page)   |
| `<Aside>`      | `<aside>`                    | Sidebar / supplementary content         |
| `<Nav>`        | `<nav>`                      | Navigation landmarks                    |
| `<Header>`     | `<header>`                   | Page or section header                  |
| `<Footer>`     | `<footer>`                   | Page or section footer                  |
| `<Ul>`         | `<ul>`                       | Unordered list                          |
| `<Ol>`         | `<ol>`                       | Ordered list                            |
| `<Li>`         | `<li>`                       | List item                               |
| `<Heading>`    | `<h1>`–`<h6>`                | Headings (level prop)                   |
| `<Text>`       | `<p>`                        | Body paragraphs                         |
| `<Label>`      | `<label>`                    | Form labels                             |
| `<Caption>`    | `<figcaption>` / `<caption>` | Captions / figure descriptions          |
| `<Span>`       | `<span>`                     | Inline text fragments                   |
| `<TextLink>`   | next/link + `<a>`            | All hyperlinks (internal + external)    |
| `<Button>`     | `<button>`                   | Clickable actions with label            |
| `<IconButton>` | `<button>`                   | Icon-only actions (aria-label required) |

**Rule**: The `<Div>` wrapper should be used for all layout divs that would benefit from future theme application (e.g. cards, containers, panels). Raw `<div>` may still be used for purely structural wrappers inside component internals where no styling key needs to flow through.

---

## 38. letitrip.in Migration Roadmap

This section describes the **complete migration plan** that gets `letitrip.in` from its current state (using `@mohasinac/*` v1.4.x individual packages) to using `@mohasinac/appkit@2.0.0`.

**Current state**: Zero migration work done. All 58 `@mohasinac/*` v1.4.x imports are still active.

---

### 38.1 — Pre-Migration Checklist

Before running any codemod or file deletion:

- [ ] `@mohasinac/appkit` published to npm at `2.0.0`
- [ ] `letitrip.in/package.json` updated: `"@mohasinac/appkit": "^2.0.0"` added
- [ ] Old `@mohasinac/*` v1.4.x entries still present (parallel until migration complete)
- [ ] `npm install` on letitrip.in clean
- [ ] `npx tsc --noEmit` baseline passing before migration starts
- [ ] Git branch: `feat/appkit-migration` created from `main`

---

### 38.2 — Phase 40: Import Codemod (automated)

Run the codemod script to rewrite all `@mohasinac/<old-package>` imports to `@mohasinac/appkit/<subpath>`:

```bash
node scripts/migrate-to-appkit.mjs --dry-run   # preview changes
node scripts/migrate-to-appkit.mjs --apply     # apply changes
npx tsc --noEmit                               # must pass 0 errors
```

**Import mapping table** (automated by the codemod):

| Old import                       | New import                              |
| -------------------------------- | --------------------------------------- |
| `@mohasinac/contracts`           | `@mohasinac/appkit/contracts`           |
| `@mohasinac/core`                | `@mohasinac/appkit/core`                |
| `@mohasinac/http`                | `@mohasinac/appkit/http`                |
| `@mohasinac/ui`                  | `@mohasinac/appkit/ui`                  |
| `@mohasinac/react`               | `@mohasinac/appkit/react`               |
| `@mohasinac/next`                | `@mohasinac/appkit/next`                |
| `@mohasinac/errors`              | `@mohasinac/appkit/errors`              |
| `@mohasinac/validation`          | `@mohasinac/appkit/validation`          |
| `@mohasinac/security`            | `@mohasinac/appkit/security`            |
| `@mohasinac/tokens`              | `@mohasinac/appkit/tokens`              |
| `@mohasinac/monitoring`          | `@mohasinac/appkit/monitoring`          |
| `@mohasinac/seo`                 | `@mohasinac/appkit/seo`                 |
| `@mohasinac/db-firebase`         | `@mohasinac/appkit/db-firebase`         |
| `@mohasinac/auth-firebase`       | `@mohasinac/appkit/auth-firebase`       |
| `@mohasinac/email-resend`        | `@mohasinac/appkit/email-resend`        |
| `@mohasinac/storage-firebase`    | `@mohasinac/appkit/storage-firebase`    |
| `@mohasinac/payment-razorpay`    | `@mohasinac/appkit/payment-razorpay`    |
| `@mohasinac/search-algolia`      | `@mohasinac/appkit/search-algolia`      |
| `@mohasinac/shipping-shiprocket` | `@mohasinac/appkit/shipping-shiprocket` |
| `@mohasinac/feat-auth`           | `@mohasinac/appkit/feat-auth`           |
| `@mohasinac/feat-products`       | `@mohasinac/appkit/feat-products`       |
| `@mohasinac/feat-categories`     | `@mohasinac/appkit/feat-categories`     |
| `@mohasinac/feat-cart`           | `@mohasinac/appkit/feat-cart`           |
| `@mohasinac/feat-orders`         | `@mohasinac/appkit/feat-orders`         |
| `@mohasinac/feat-blog`           | `@mohasinac/appkit/feat-blog`           |
| `@mohasinac/feat-reviews`        | `@mohasinac/appkit/feat-reviews`        |
| `@mohasinac/feat-faq`            | `@mohasinac/appkit/feat-faq`            |
| `@mohasinac/feat-search`         | `@mohasinac/appkit/feat-search`         |
| `@mohasinac/feat-admin`          | `@mohasinac/appkit/feat-admin`          |
| `@mohasinac/feat-events`         | `@mohasinac/appkit/feat-events`         |
| `@mohasinac/feat-auctions`       | `@mohasinac/appkit/feat-auctions`       |
| `@mohasinac/feat-media`          | `@mohasinac/appkit/feat-media`          |
| `@mohasinac/feat-account`        | `@mohasinac/appkit/feat-account`        |
| `@mohasinac/feat-stores`         | `@mohasinac/appkit/feat-stores`         |
| `@mohasinac/feat-checkout`       | `@mohasinac/appkit/feat-checkout`       |
| `@mohasinac/feat-wishlist`       | `@mohasinac/appkit/feat-wishlist`       |
| `@mohasinac/feat-loyalty`        | `@mohasinac/appkit/feat-loyalty`        |
| `@mohasinac/feat-payments`       | `@mohasinac/appkit/feat-payments`       |
| `@mohasinac/feat-collections`    | `@mohasinac/appkit/feat-collections`    |
| `@mohasinac/feat-pre-orders`     | `@mohasinac/appkit/feat-pre-orders`     |
| `@mohasinac/feat-seller`         | `@mohasinac/appkit/feat-seller`         |
| `@mohasinac/feat-consultation`   | `@mohasinac/appkit/feat-consultation`   |
| `@mohasinac/feat-homepage`       | `@mohasinac/appkit/feat-homepage`       |
| `@mohasinac/feat-filters`        | `@mohasinac/appkit/feat-filters`        |
| `@mohasinac/feat-forms`          | `@mohasinac/appkit/feat-forms`          |
| `@mohasinac/feat-layout`         | `@mohasinac/appkit/feat-layout`         |

---

### 38.3 — Phase 41: DUPLICATE File Cleanup

Files marked `DUPLICATE` in Section 5 must be **deleted** after the codemod passes.

**Verification workflow per file**:

1. Check all importers: `grep -r "from.*<filename>" src/` — must be 0 results
2. Delete file
3. `npx tsc --noEmit` — still passes
4. Commit deletion

**Categories of duplicates** (per Section 5 audit):

| Category                | Example files                                              | Count   |
| ----------------------- | ---------------------------------------------------------- | ------- |
| Generic utility hooks   | `useDebounce.ts`, `useLocalStorage.ts`, `useMediaQuery.ts` | ~8      |
| Generic UI primitives   | `Button.tsx`, `Badge.tsx`, `Spinner.tsx`                   | ~12     |
| Semantic wrappers       | `Heading.tsx`, `Text.tsx`, `Section.tsx`                   | ~9      |
| Provider/registry stubs | `providers.config.ts` duplicated logic                     | ~3      |
| RBAC helpers            | `can.ts`, `usePermission.ts`                               | ~4      |
| TypeScript type aliases | Types that match `contracts` interfaces exactly            | ~11     |
| **Total**               |                                                            | **~47** |

---

### 38.4 — Phase 42–48: Feature-by-Feature Migration

Each feature migration follows this 5-step pattern:

```
1. Identify local components          → src/features/<name>/components/
2. Compare with appkit equivalents    → @mohasinac/appkit/feat-<name>
3. Replace local component with appkit import
4. Pass letitrip-specific config as props (no forking)
5. Delete redundant local file
```

| Phase | Feature                | Files to migrate                                                                          | Spec           |
| ----- | ---------------------- | ----------------------------------------------------------------------------------------- | -------------- |
| 42    | Products               | `ProductCard`, `ProductDetailView`, `ProductListView`, `QuickViewModal`, `ProductFilters` | Section 39     |
| 43    | Categories + Stores    | `CategoryCard`, `CategoryTreeView`, `StoreCard`, `StoreDetailView`                        | Section 40     |
| 44    | Orders + Checkout      | `OrderCard`, `OrderDetailView`, `OrderStatusTimeline`, `CheckoutStepper`                  | Section 41     |
| 45    | Auctions + Pre-Orders  | `AuctionCard`, `LiveBidView`, `BidHistoryDrawer`, `PreOrderCard`                          | Sections 42/43 |
| 46    | Users + Account + Auth | `ProfileView`, `ProfileEditForm`, `AddressBook`, `AuthModal`                              | Section 44     |
| 47    | Events + Blog          | `EventCard`, `EventDetailView`, `BlogCard`, `BlogPostView`                                | Sections 45/46 |
| 48    | Admin + CMS            | `AdminLayout`, `DataTable` usage, admin views                                             | Section 47     |

---

### 38.5 — Phase 49: Final Build Verification

After all migrations complete:

```powershell
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Tests
npm test

# 4. Production build
npm run build

# 5. Remove old package deps from package.json
# Delete all @mohasinac/* v1.4.x entries (replaced by appkit@2.0.0)

# 6. Final npm install
npm install

# 7. Repeat steps 1-4

# 8. Deploy
git add . ; git commit -m "feat: complete appkit migration" ; git push origin main
```

---

## 39. Products — UX Design & Component Diagrams

### 39.1 — Overview

The Products domain covers the buyer-facing product discovery, detail, and cart-add flows.

**Components**: `ProductCard`, `ProductDetailView`, `ProductListView`, `QuickViewModal`, `ProductFilters`, `ProductImageGallery`, `ProductBadge`

---

### 39.2 — ProductCard (grid mode)

```
┌──────────────────────────────────────┐
│  [♥ wishlist btn — top right]        │
│  [BADGE — "Sale" / "New" — top left] │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  IMAGE  aspect-[3/4]          │   │
│  │  (next/image object-cover)    │   │
│  └──────────────────────────────┘    │
│                                      │
│  Handmade Ceramics   ← category tag  │
│  Blue Ocean Vase     ← h4 2-lines    │
│  ⭐ 4.3  (12 reviews)               │
│  ₹1,299  ~~₹1,999~~  35% off        │
│                                      │
│  [Add to Cart ←→]  [Quick View ⊞]   │
└──────────────────────────────────────┘

States:
  default    → shadow-sm
  hover      → shadow-md, image scale 1.03
  wishlist   → heart icon filled (primary color)
  out-of-stock → overlay "Out of Stock" + cart btn disabled
  loading    → Skeleton shimmer (same card shape)
```

### 39.3 — ProductDetailView

```
Desktop (lg+):
┌────────────────────────────────────────────────────────────────┐
│ [BACK]  Breadcrumb: Home / Ceramics / Blue Ocean Vase          │
├─────────────────────────────┬──────────────────────────────────┤
│  GALLERY                    │  PRODUCT INFO                    │
│  ┌───────────────────────┐  │  Category: Handmade Ceramics     │
│  │ Main image aspect-[1] │  │  Blue Ocean Vase    h1           │
│  └───────────────────────┘  │  ⭐ 4.3 · 12 reviews · [Write]  │
│  [thumb][thumb][thumb][+2]  │  ₹1,299  ~~₹1,999~~  35% off    │
│                             │  ─────────────────────────────── │
│                             │  Quantity: [−] 2 [+]             │
│                             │  Variants: [Blue] [Green] [Red]  │
│                             │  ─────────────────────────────── │
│                             │  [Add to Cart]  [Buy Now]        │
│                             │  [♥ Wishlist]  [📤 Share]       │
│                             │  ─────────────────────────────── │
│                             │  Delivery: Estimated 3-5 days    │
│                             │  Sold by: [Store Name]           │
└─────────────────────────────┴──────────────────────────────────┘
│ TABS: [Description] [Specifications] [Reviews (12)] [Q&A (3)] │
│ ──────────────────────────────────────────────────────────────│
│ Tab content area                                               │
└────────────────────────────────────────────────────────────────┘
│  Similar Products  (HorizontalScroller)                        │
│  [ProductCard] [ProductCard] [ProductCard] [ProductCard] →     │
└────────────────────────────────────────────────────────────────┘

Mobile: gallery (full-width aspect-[1]) → info stacked below → sticky BuyBar at bottom
```

### 39.4 — QuickViewModal

```
┌──────────────────────────────────────────────────────────────┐
│  [X close]                                                    │
├───────────────────────┬──────────────────────────────────────┤
│  IMAGE aspect-[1]     │  Product Name (h2)                   │
│  [thumb strip]        │  Category  ⭐ 4.3 (12)              │
│                       │  ₹1,299  ~~₹1,999~~                  │
│                       │  Variants: [Blue ●] [Green] [Red]    │
│                       │  Qty: [−] 1 [+]                      │
│                       │  [Add to Cart]  [View Full Details →] │
└───────────────────────┴──────────────────────────────────────┘

Modal: SideModal on desktop (w-[60vw] max-w-2xl), full-screen drawer on mobile
```

### 39.5 — ProductFilters (sidebar + mobile drawer)

```
Desktop sidebar (w-64, sticky):
┌───────────────────────────┐
│ Filters            [Clear] │
│ ─────────────────────────  │
│ ▼ Category                │
│   ☑ Ceramics (12)         │
│   ☐ Textiles (8)          │
│   ☐ Jewellery (25)        │
│ ─────────────────────────  │
│ ▼ Price Range             │
│ [₹0 ────●──────── ₹5000]  │
│   ₹500         ₹3,000      │
│ ─────────────────────────  │
│ ▼ Rating                  │
│   ⭐⭐⭐⭐⭐ (5)  ○         │
│   ⭐⭐⭐⭐  (4+) ●         │
│ ─────────────────────────  │
│ ▼ Availability            │
│   ☑ In stock only         │
└───────────────────────────┘

Mobile: FilterDrawer (bottom sheet) with [Apply Filters] CTA
```

---

## 40. Categories & Stores — UX Design

### 40.1 — CategoryCard (browse grid)

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │
│  │  IMAGE aspect-[4/3]           │   │
│  │  ── gradient overlay ──       │   │
│  │  [ICON 32px]  Category Name  │   │
│  │  1,240 items · From ₹99      │   │
│  └──────────────────────────────┘    │
│  Sub-categories (chip strip):        │
│  [Earrings] [Necklaces] [Rings] →    │
└──────────────────────────────────────┘
```

### 40.2 — CategoryTreeView (nested nav)

```
All Categories
├── Handmade & Crafts
│   ├── Ceramics
│   ├── Textiles → active (bold, primary-color dot)
│   └── Jewellery (25)
├── Electronics
│   ├── Phones
│   └── Accessories
└── Fashion (collapse/expand chevron)
```

### 40.3 — StoreCard

```
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │
│  │  COVER IMAGE aspect-[5/3]    │    │
│  │  ── gradient overlay 40% ──  │    │
│  │  [LOGO 48px circle]          │    │
│  │  Store Name   (white bold)   │    │
│  │  ⭐ 4.6 · 128 reviews        │    │
│  └──────────────────────────────┘    │
│  bg-white dark:bg-zinc-900           │
│  [Handmade & Crafts]  chip           │
│  "Short description max 2 lines"     │
│  47 products  [Visit Store →]        │
└──────────────────────────────────────┘
```

### 40.4 — StoreDetailView

```
┌────────────────────────────────────────────────────────────────┐
│  COVER IMAGE (aspect-[5/2] full-width)                         │
│  ──────────────────────────────────────────────────────────── │
│  [LOGO 80px] Store Name (h1)  ⭐ 4.6  128 reviews             │
│  [Handmade & Crafts]  [Follow]  [Message]  [Share]            │
├────────────────────────────────────────────────────────────────┤
│  TABS: [Products] [About] [Reviews]                            │
│  ─────────────────────────────────────────────────────────── │
│  Products tab: FilterPanel + ProductListView (same as /products)│
└────────────────────────────────────────────────────────────────┘
```

---

## 41. Orders & Checkout — UX Design

### 41.1 — OrderCard (list item)

```
┌──────────────────────────────────────────────────────────────┐
│ Order #ORD-2893  ·  12 Apr 2026  ·  [SHIPPED ●green badge]   │
├─────────┬────────────────────────────────────────────────────┤
│ [72px]  │  Blue Ocean Vase (×1)           ₹1,299             │
│ [img]   │  Hand-printed Cotton Kurti (×2) ₹2,498             │
│         │  + 1 more item                                      │
├─────────┴────────────────────────────────────────────────────┤
│  Total: ₹3,797  (incl. ₹79 delivery)    [Track Order] [Help] │
└──────────────────────────────────────────────────────────────┘
```

### 41.2 — OrderDetailView + StatusTimeline

```
┌────────────────────────────────────────────────────────────────┐
│ Order #ORD-2893   [SHIPPED ●green]   12 Apr 2026               │
├─────────────────────────────────────────────────────────────── │
│ Status Timeline:                                               │
│  ●──────●──────●──────○──────○                                 │
│  Placed  Paid  Shipped  Delivered  Returned                    │
│  12 Apr  12 Apr 13 Apr   (Expected)                            │
├─────────────────────────────────────────────────────────────── │
│ Items ordered:                                                 │
│  [img 48px] Blue Ocean Vase (×1)  ₹1,299  [Write Review]      │
│  [img 48px] Kurti (×2)           ₹2,498  [Write Review]       │
├─────────────────────────────────────────────────────────────── │
│ Delivery address | Payment method | Seller: [Store Name]       │
└────────────────────────────────────────────────────────────────┘
```

### 41.3 — CheckoutStepper

```
┌────────────────────────────────────────────────────────────────┐
│ Checkout   Step 1 ●── Step 2 ──○  Step 3 ──○                  │
│            Address      Payment     Review                      │
├────────────────────────────────────────────────────────────────┤
│ STEP 1: Delivery Address                                       │
│   [Saved Address Card ●] [+ Add New Address]                   │
│   [Continue to Payment →]                                      │
├────────────────────────────────────────────────────────────────┤
│ ORDER SUMMARY (sticky right on desktop / collapsed on mobile)  │
│  Blue Vase (×1)  ₹1,299                                        │
│  Delivery        ₹79                                           │
│  ─────────────────────                                         │
│  Total           ₹1,378                                        │
└────────────────────────────────────────────────────────────────┘
```

---

## 42. Auctions — UX Design

### 42.1 — AuctionCard

```
┌──────────────────────────────────────┐
│  [image aspect-[3/4]]                │
│  [LIVE badge — pulsing green dot]    │
│  ─────────────────────────────────── │
│  Antique Brass Lamp   (h4)           │
│  Current Bid: ₹4,500                 │
│  [⏱ 02h 14m 33s]  ← countdown      │
│  23 bids                             │
│  [Bid Now ₹4,600+]                  │
└──────────────────────────────────────┘

Ended state:
│  [ENDED badge — zinc/grey]           │
│  Final Bid: ₹5,200                   │
│  Winner: user@***.com (masked)       │
│  [See Results]                       │
```

### 42.2 — LiveBidView (real-time)

```
Desktop:
┌────────────────────────────────────────────────────────────────┐
│  [GALLERY left]           [BID PANEL right]                    │
│  aspect-[1] image         Antique Brass Lamp (h2)              │
│  + thumb strip            Started: ₹1,000  Reserve: ₹3,000    │
│                           Current Highest: ₹4,500 (user:abc)  │
│                           ─────────────────────────────────    │
│                           [⏱ 02:14:33]  ← LIVE countdown      │
│                           ─────────────────────────────────    │
│                           Your Bid:  [₹ ──────] (min ₹4,600)  │
│                           [Place Bid]  [Set Auto-Bid]          │
│                           ─────────────────────────────────    │
│                           Bid History   (last 5 bids)          │
│                           ● user:xyz   ₹4,500  2m ago         │
│                           ● user:abc   ₹4,200  5m ago         │
│                           ● user:def   ₹4,000  8m ago         │
│                           [View Full History ↓]                │
└────────────────────────────────────────────────────────────────┘

Mobile: gallery → bid panel → bid history (stacked, sticky BuyBar for Place Bid)
```

### 42.3 — BidHistoryDrawer

```
┌────────────────────────────────────────────────┐
│  Bid History — Antique Brass Lamp        [✕]   │
├────────────────────────────────────────────────┤
│  [AVT] user:xyz   ₹4,500   2 min ago  ← WINNING│
│  [AVT] user:abc   ₹4,200   5 min ago           │
│  [AVT] user:def   ₹4,000   8 min ago           │
│  [AVT] user:ghi   ₹3,800  12 min ago           │
│  [AVT] user:jkl   ₹3,500  20 min ago           │
│  ──────────────────────────────────────────────│
│  Total bids: 23   Reserve met: ✓ Yes           │
└────────────────────────────────────────────────┘
```

---

## 43. Pre-Orders — UX Design

### 43.1 — PreOrderCard

```
┌──────────────────────────────────────┐
│  [image aspect-[3/4]]                │
│  [PRE-ORDER badge — amber]           │
│  ─────────────────────────────────── │
│  Handwoven Silk Saree   (h4)         │
│  Expected: May 2026                  │
│  ₹4,999  (10% deposit: ₹499)        │
│  [Pre-Order Now]                     │
└──────────────────────────────────────┘
```

### 43.2 — PreOrderDetailView

```
┌────────────────────────────────────────────────────────────────┐
│  [gallery]              [PRE-ORDER INFO]                       │
│                         Handwoven Silk Saree  (h1)             │
│                         Expected shipping: May 2026             │
│                         Available units: 50 left (of 200)      │
│                         ─────────────────────────────────────  │
│                         Deposit: ₹499 (10% of ₹4,999)         │
│                         Balance: ₹4,500 on shipping            │
│                         ─────────────────────────────────────  │
│                         [Pre-Order Now — Pay ₹499 Deposit]     │
│   FAQ: What is a pre-order? ↓                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 44. Users & Account — UX Design

### 44.1 — ProfileView (public)

```
┌────────────────────────────────────────────────────────────────┐
│ [AVATAR 96px]  Display Name  ⭐ 4.7 seller rating             │
│ Joined: March 2024   47 sales   [Message]  [Follow]            │
├────────────────────────────────────────────────────────────────┤
│ TABS: [Listings (12)] [Reviews (30)] [About]                   │
│ Listings tab: ProductListView in fluid-grid mode               │
└────────────────────────────────────────────────────────────────┘
```

### 44.2 — AccountDashboard (private)

```
Desktop sidebar layout:
┌──────────────────┬─────────────────────────────────────────────┐
│ SIDEBAR          │ CONTENT AREA                                │
│ [AVT] Name       │ My Orders (recent 3)                        │
│                  │  ─────────────────────────────────────────  │
│ My Orders        │ [OrderCard] [OrderCard] [OrderCard]         │
│ Wishlist         │  [View All Orders →]                        │
│ Reviews          │  ─────────────────────────────────────────  │
│ Addresses        │ My Addresses                                 │
│ Payment Methods  │  [AddressCard ●default] [AddressCard]       │
│ Notifications    │  [+ Add Address]                            │
│ Profile Settings │                                             │
│ ─────────────── │  ─────────────────────────────────────────  │
│ Log Out           │ Recent Reviews                              │
└──────────────────┴─────────────────────────────────────────────┘

Mobile: tab-strip at top (My Orders / Wishlist / Profile / Settings)
```

### 44.3 — AuthModal (login / sign-up)

```
┌────────────────────────────────────────┐
│       Log in to LetItRip         [✕]   │
├────────────────────────────────────────┤
│  [Continue with Google  ▶]             │
│  ── or ────────────────────────────── │
│  Email    [_____________________]       │
│  Password [_____________________] [👁]  │
│  [Forgot password?]                    │
│  [Log In]                              │
│  ────────────────────────────────────  │
│  Don't have an account? [Sign Up]      │
└────────────────────────────────────────┘
```

---

## 45. Events — UX Design

### 45.1 — EventCard

```
┌──────────────────────────────────────┐
│  [image aspect-[16/9]]               │
│  [ONLINE / IN-PERSON badge]          │
│  ─────────────────────────────────── │
│  Pottery Workshop Series  (h4)       │
│  📅 Sat, 24 May 2026 · 2:00 PM      │
│  📍 Delhi / Online                   │
│  Hosted by: [AVT] Craft Corner       │
│  [Free] / [₹299 / seat]             │
│  [Register Now]  [♥ Save]           │
└──────────────────────────────────────┘
```

### 45.2 — EventDetailView

```
┌────────────────────────────────────────────────────────────────┐
│  HERO IMAGE (aspect-[16/9] full-width)                         │
│  ─────────────────────────────────── ─────────────────────────│
│  [ONLINE]  Pottery Workshop Series  (h1)                       │
│  📅 Sat, 24 May 2026 · 2:00 PM IST   📍 Delhi (Online)        │
│  Hosted by: [AVT 32px] Craft Corner Store  [Follow]            │
├───────────────────────────────────┬────────────────────────────┤
│  DESCRIPTION (rich text)          │  REGISTRATION PANEL        │
│  About this event...              │  ₹299 / seat               │
│  ─────────────────────────────── │  Seats left: 12 of 50      │
│  AGENDA (timeline)               │  [Register Now]             │
│  10:00 Intro                     │  ─────────────────────────  │
│  11:00 Hands-on session          │  Date: 24 May 2026          │
│  13:00 Lunch break               │  Time: 2:00 PM – 5:00 PM   │
│  ─────────────────────────────── │  Mode: Online (Zoom link    │
│  PARTICIPANTS (avatar strip)     │  sent after registration)   │
│  [AVT][AVT][AVT] +12 going       │                             │
└───────────────────────────────────┴────────────────────────────┘
│  PollSection (if event has polls)                              │
│  More Events by Craft Corner  (HorizontalScroller)            │
└────────────────────────────────────────────────────────────────┘
```

### 45.3 — PollVotingSection

```
┌────────────────────────────────────────────────────────────────┐
│  POLL: Which slot works best for you?          [Closes: 3 days]│
├────────────────────────────────────────────────────────────────┤
│  ○ Morning (9 AM – 12 PM)   ██████████████░░░░░  62%  (31)    │
│  ○ Afternoon (2 PM – 5 PM)  ███████░░░░░░░░░░░░  38%  (19)    │
│  [Vote]                             Total votes: 50            │
└────────────────────────────────────────────────────────────────┘

After voting:
│  ● Morning (9 AM – 12 PM)   ██████████████░░░░░  62%  (31) ✓  │ ← your vote
│  ○ Afternoon (2 PM – 5 PM)  ███████░░░░░░░░░░░░  38%  (19)    │
```

---

## 46. Blog — UX Design

### 46.1 — BlogCard (grid)

```
┌──────────────────────────────────────┐
│  [image aspect-[16/9]]               │
│  ─────────────────────────────────── │
│  [Tag: Craft Tips]                   │
│  How to Care for Handmade Ceramics   │ ← h4, 2 lines
│  By Priya S. · 5 min read · 3d ago  │
│  Short excerpt, max 2 lines, then... │
│  [Read More →]                       │
└──────────────────────────────────────┘
```

### 46.2 — BlogListView (list mode)

```
┌────────────────────────────────────────────────────────────────┐
│ [120px img] │ How to Care for Handmade Ceramics (h3)           │
│             │ By Priya S. · 5 min read · 3 days ago · Craft   │
│             │ Short excerpt text showing here in one line...   │
├─────────────┼──────────────────────────────────────────────────┤
│ [120px img] │ 5 Indian Textiles You Should Know (h3)           │
│             │ By Admin · 8 min read · 1 week ago · Textiles    │
│             │ Short excerpt...                                  │
└────────────────────────────────────────────────────────────────┘
```

### 46.3 — BlogPostView

```
┌────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Blog / Craft Tips / How to Care for...            │
│  [Tag: Craft Tips]                                             │
│  How to Care for Handmade Ceramics     ← h1                    │
│  By [AVT] Priya S. · 12 Apr 2026 · 5 min read                 │
│  ─────────────────────────────────────────────────────────── │
│  HERO IMAGE (aspect-[16/9])                                    │
│  ─────────────────────────────────────────────────────────── │
│  BODY (RichText renderer — ProseMirror output)                 │
│  ...rich text content...                                       │
│  ─────────────────────────────────────────────────────────── │
│  Tags: [Ceramics] [Care] [Handmade]                           │
│  ─────────────────────────────────────────────────────────── │
│  Related Posts  (HorizontalScroller)                          │
│  [BlogCard] [BlogCard] [BlogCard] →                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 47. Admin — UX Design

### 47.1 — AdminLayout

```
┌─────────────────────────────────────────────────────────────────┐
│ TOPBAR: [☰ Menu]  LetItRip Admin     [🔔 3]  [AVT] Admin Name  │
├────────────┬────────────────────────────────────────────────────┤
│ SIDEBAR    │ CONTENT AREA                                        │
│ ─────────  │                                                    │
│ Dashboard  │  (page-specific DataTable or form)                 │
│ ─────────  │                                                    │
│ Products   │                                                    │
│  ├ List    │                                                    │
│  ├ Add     │                                                    │
│  └ Pending │                                                    │
│ Orders     │                                                    │
│ Users      │                                                    │
│ Stores     │                                                    │
│ Reviews    │                                                    │
│ Events     │                                                    │
│ Blog       │                                                    │
│ FAQs       │                                                    │
│ ─────────  │                                                    │
│ Settings   │                                                    │
│ Logs       │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

### 47.2 — Admin DataTable (generic)

```
┌────────────────────────────────────────────────────────────────┐
│ [🔍 Search]  [Filter ▼]  [Sort by ▼]  [+ Add New]  [Export]   │
├─────────────────────────────────────────────────────────────── │
│ □ │ ID     │ Name              │ Status   │ Price  │ Actions   │
├───┼─────────┼───────────────────┼──────────┼────────┼──────────┤
│ □ │ PRD-001 │ Blue Ocean Vase   │ ●active  │ ₹1,299 │ [✎][🗑]  │
│ □ │ PRD-002 │ Kurti Print       │ ●active  │ ₹999   │ [✎][🗑]  │
│ □ │ PRD-003 │ Antique Lamp      │ ○draft   │ ₹4,500 │ [✎][🗑]  │
├───┴─────────┴───────────────────┴──────────┴────────┴──────────┤
│ [◀ Prev]   Page 1 of 12   [Next ▶]          Showing 1-20/240  │
└────────────────────────────────────────────────────────────────┘

Features:
  - Bulk select (checkbox column) → Bulk actions menu
  - Column sorting (click header)
  - URL-synced pagination + filters (useUrlTable)
  - Row-level action menu ([✎] edit, [🗑] delete with ConfirmDeleteModal)
  - Status badge color: active=green, draft=zinc, suspended=red, pending=amber
```

### 47.3 — Admin Form Pattern

```
┌────────────────────────────────────────────────────────────────┐
│ ← Back to list     Edit Product: Blue Ocean Vase               │
├────────────────────────────────────────────────────────────────┤
│  FORM (react-hook-form + zodResolver)                          │
│  ┌────────────────────┬───────────────────────────────────┐   │
│  │ Title (full)       │ [                               ]  │   │
│  ├────────────────────┼───────────────────────────────────┤   │
│  │ Category (half)    │ Price (half)                       │   │
│  │ [Select ▼]         │ [₹ ──────]                        │   │
│  ├────────────────────┴───────────────────────────────────┤   │
│  │ Description (full — rich text editor)                  │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Images               (drag-and-drop upload zone)        │   │
│  │ [🖼 existing] [🖼 existing]  [+ Upload Image]           │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ Status    [Active ▼]   Stock [──────] units            │   │
│  └────────────────────────────────────────────────────────┘   │
│  [Cancel]                                  [Save Changes]      │
└────────────────────────────────────────────────────────────────┘
```
