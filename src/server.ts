// Server-only public exports
// isAuthError - Pure util — detects auth errors from caught exceptions (usable in server actions).
export { isAuthError } from "./utils/auth-error";

// [SERVER-ONLY] safeRead — wraps optional reads whose failure must not break a page.
// D2 Fix 4 — cross-resource search. Exported from `server.ts` because it takes
// a Firestore handle and runs only server-side; `_internal/` is not an
// exported subpath, and a consumer page must not reach into it.
export { searchEverything } from "./_internal/server/features/search/search-everything";
export type {
  SearchHit,
  SearchGroup,
  SearchSource,
  SearchEverythingResult,
} from "./_internal/server/features/search/search-everything";
export { SEARCH_SOURCES } from "./_internal/server/features/search/search-sources";
export { SCOPED_SCAN_BUDGET } from "./_internal/server/features/search/search-everything";
/*
 * `buildTokensIndex` is server-only for the same reason `encryptPiiFields`
 * is: it feeds `BaseRepository.buildTokensIndexFor`, which runs inside the
 * write-hook chain that also calls `hmacBlindIndex` (a `node:crypto` HMAC).
 * `seed-cli.mjs`'s own `encryptSeedPii` needs this exported here because the
 * seed CLI writes directly to Firestore and does not go through any
 * repository's `createWithId` — see the 🛑 on `PayoutRepository`'s
 * `buildTokensIndexFor` for why that bypass is the one that matters.
 */
export {
  buildTokensIndex,
  tokensIndexQueryValue,
  BLIND_INDEX_KEY_VERSION_FIELD,
  CURRENT_BLIND_INDEX_KEY_VERSION,
} from "./security/blind-index-tokens";
// Tier 2 — viewer-scoped sources. Server-only by construction: they build an
// owner clause from a session, and a client that could construct them could
// construct somebody else's.
export {
  scopedSourcesFor,
  scopedScanTotal,
  assertWithinScopedBudget,
} from "./_internal/server/features/search/scoped-sources";
export type { SearchViewer } from "./_internal/server/features/search/scoped-sources";
// D12 — part + composition reads. Every one is by document id or ONE
// indexed equality; none needs a composite index.
export {
  getPartByKey,
  getModelsUsingPart,
  getCompositionById,
  getPartsForComposition,
  getCompositionsForCategory,
  listPartsBySlot,
} from "./_internal/server/features/parts/data";
/*
 * The BEY reads. `getBeyBySlug` is a direct doc read (`id === slug`);
 * `getProductsContainingBey` is ONE `array-contains` over the denormalised
 * `assortmentBeyIds`, because Firestore cannot `array-contains` a field nested
 * inside objects in an array.
 */
export {
  getBeyBySlug,
  getBeysForCategory,
  getProductsContainingBey,
} from "./_internal/server/features/beys/data";
export { renderBeyOg } from "./_internal/server/features/beys/og";
/*
 * D13's last item — "which models can I build from the parts I hold".
 * Exported because its only caller is a consumer route; the matcher it is built
 * on (`matchSlotToHoldings`) stays internal, since a caller reaching for the
 * matcher directly would be re-deriving the rollup's (part, colourway) rule.
 */
/* D5 — the city OG card. No money on it, by rule (Root Cause #93). */
export { renderCityOg, type CityOgData } from "./_internal/server/features/products/og";
export {
  listBuildableModels,
  BUILDABLE_HOLDINGS_LIMIT,
  BUILDABLE_CANDIDATE_LIMIT,
  type BuildableModel,
  type BuildableResult,
  type BuildableSlot,
} from "./_internal/server/features/parts/buildable";
export {
  renderPartOg,
  renderPartClassificationOg,
} from "./_internal/server/features/parts/og";
// D13 — assembly and part-out. Both run in a real transaction that RE-READS.
export {
  assembleFromComponents,
  partOutToComponents,
  planAssembly,
  assertAssemblyInput,
  MAX_ASSEMBLY_COMPONENTS,
} from "./_internal/server/features/parts/assembly";
export type {
  AssemblyComponent,
  AssembleInput,
  PartOutInput,
  AssemblyResult,
  AssemblyPlan,
  StockWrite,
} from "./_internal/server/features/parts/assembly";
// Persists DEGRADED_READ rows via the installed reporter; returns typed fallback on error.
export {
  safeRead,
  installDegradedReadReporter,
} from "./errors/safe-read";
export type { DegradedReadReport } from "./errors/safe-read";

// [SERVER-ONLY] serverErrorsRepository — Firestore-backed persistent log for 5xx + selected 4xx.
// Used by routeHandler, wrapJobHandler (workstream 14), and the safeRead reporter.
export {
  ServerErrorsRepository,
  serverErrorsRepository,
} from "./features/server-errors/repository/server-errors.repository";
export {
  SERVER_ERRORS_COLLECTION,
  SERVER_ERROR_FIELDS,
  SERVER_ERROR_STACK_MAX_BYTES,
  SERVER_ERROR_RETENTION_DAYS,
} from "./features/server-errors/schemas/firestore";
export type {
  ServerErrorDocument,
  ServerErrorSource,
} from "./features/server-errors/schemas/firestore";

/*
 * [SERVER-ONLY] gatewayEvents — the durable inbox for payment-gateway webhooks.
 *
 * Exported from `server.ts` ONLY, never `index.ts`. The repository's import
 * chain reaches `firebase-admin` through `providers/db-firebase`, and a symbol
 * reachable from the main barrel drags that into the CLIENT bundle — which
 * fails the Turbopack production build on every page (Root Cause #6/#24), since
 * `firebase-admin/app` is a static top-level import.
 */
export {
  GatewayEventsRepository,
  gatewayEventsRepository,
} from "./features/gateway-events/repository/gateway-events.repository";
export type {
  GatewayEventClaimInput,
  GatewayEventClaimResult,
  GatewayEventSettleInput,
} from "./features/gateway-events/repository/gateway-events.repository";
export {
  GATEWAY_EVENTS_COLLECTION,
  GATEWAY_EVENT_FIELDS,
  GATEWAY_EVENT_RETENTION_DAYS,
  GATEWAY_EVENT_LEASE_SECONDS,
  GATEWAY_EVENT_MAX_ATTEMPTS,
  GATEWAY_EVENT_PAYLOAD_MAX_BYTES,
  GATEWAY_EVENT_ERROR_MAX_BYTES,
  createGatewayEventId,
} from "./features/gateway-events/schemas/firestore";
export type {
  GatewayEventDocument,
  GatewayEventKind,
  GatewayEventStatus,
} from "./features/gateway-events/schemas/firestore";
export {
  ingestGatewayEvent,
  settleGatewayEvent,
  statusForDispatch,
  resolveDuplicateDelivery,
  redactGatewayPayload,
} from "./_internal/server/features/gateway-events";
export type {
  IngestGatewayEventInput,
  SettleGatewayEventInput,
  DuplicateAction,
  DuplicateResolution,
} from "./_internal/server/features/gateway-events";

/*
 * [SERVER-ONLY] paymentCases — the one operator queue for money at risk.
 *
 * Same reason as gatewayEvents above: the repository's chain reaches
 * `firebase-admin`, so this must never appear in `index.ts`.
 */
export {
  PaymentCasesRepository,
  paymentCasesRepository,
} from "./features/payment-cases/repository/payment-cases.repository";
export type {
  OpenCaseInput,
  OpenCaseResult,
  ResolveCaseInput,
} from "./features/payment-cases/repository/payment-cases.repository";
export {
  PAYMENT_CASES_COLLECTION,
  PAYMENT_CASE_FIELDS,
  PAYMENT_CASE_KINDS,
  PAYMENT_CASE_STATUSES,
  PAYMENT_CASE_ACTIVE_STATUSES,
  PAYMENT_CASE_SEVERITY_RANK,
  PAYMENT_CASE_RESOLUTION_MIN,
  createPaymentCaseId,
} from "./features/payment-cases/schemas/firestore";
export type {
  PaymentCaseDocument,
  PaymentCaseKind,
  PaymentCaseStatus,
  PaymentCaseSeverity,
} from "./features/payment-cases/schemas/firestore";
export {
  ingestDispute,
  reconcileDisputes,
  DISPUTE_EVENT_PREFIX,
} from "./_internal/server/features/payment-cases";
export type { DisputeWebhookEntity } from "./_internal/server/features/payment-cases";

/*
 * [SERVER-ONLY] obligations — deadlines with money consequences.
 *
 * The REPOSITORY is server-only (its chain reaches firebase-admin). The pure
 * `deadlinesFor` / `resolveDueAt` helpers and the policy registry go in the
 * MAIN barrel instead, because a buyer page rendering "Dispatch by Thu 3 Nov"
 * is exactly the point of them being pure — see `index.ts`.
 */
export {
  ObligationsRepository,
  obligationsRepository,
} from "./features/obligations/repository/obligations.repository";
export type {
  OpenObligationInput,
  CloseObligationInput,
} from "./features/obligations/repository/obligations.repository";

/*
 * [SERVER-ONLY] protectionClaims — Phase 6. The first callers
 * `adjudicateClaim()` and `protectionAvailability()` have ever had: we charge
 * 2% / 3% for cover whose entire decision layer sat uncalled (D11).
 */
export {
  ProtectionClaimsRepository,
  protectionClaimsRepository,
} from "./features/protection-claims/repository/protection-claims.repository";
export type { FileClaimInput } from "./features/protection-claims/repository/protection-claims.repository";
export {
  PROTECTION_CLAIMS_COLLECTION,
  PROTECTION_CLAIM_FIELDS,
  PROTECTION_CLAIM_ACTIVE_STATUSES,
  PROTECTION_CLAIM_DETAIL_MIN,
  PROTECTION_CLAIM_DETAIL_MAX,
  ALL_PROTECTION_CLAIM_STATUSES,
  ALL_PROTECTION_CLAIM_REASONS,
  REASON_TO_KIND,
  createProtectionClaimId,
} from "./features/protection-claims/schemas/firestore";
export type {
  ProtectionClaimDocument,
  ProtectionClaimStatus,
  ProtectionClaimReason,
} from "./features/protection-claims/schemas/firestore";
export {
  fileProtectionClaimAction,
  adjudicateProtectionClaimAction,
  getMyProtectionClaimsAction,
  canClaimProtection,
} from "./_internal/server/features/protection-claims";
export type { FileProtectionClaimInput } from "./_internal/server/features/protection-claims";

// [SERVER-ONLY] ActionResult envelope + wrapAction helper for "use server" functions.
// Mirrors the routeHandler envelope so client wrappers consume both surfaces uniformly.
export {
  wrapAction,
  isOk,
  unwrap,
} from "./_internal/shared/types/action-result";
export type { ActionResult } from "./_internal/shared/types/action-result";

// [SERVER-ONLY] Registration seam for recording server-action failures.
// Must be called once from src/instrumentation.ts — see the module docstring
// for why it is a hook rather than a direct import, and why it is registered
// server-side rather than from a client bootstrap.
export {
  setActionErrorReporter,
  hasActionErrorReporter,
} from "./_internal/shared/types/action-error-reporter";
export type {
  ActionErrorReport,
  ActionErrorReporter,
} from "./_internal/shared/types/action-error-reporter";

// [SERVER-ONLY] P-1 manual payment proof server actions.
export {
  attachPaymentProofAction,
  adminVerifyPaymentAction,
  adminRequestProofReuploadAction,
  adminRejectPaymentAsFraudAction,
  raiseOrderDisputeAction,
  // Buyer pays one of their own EMI instalments — the counterpart to the
  // seller's markEmiInstallmentPaid, which was the only writer before.
  submitEmiInstallmentPaymentAction,
  // Buyer return request. Was reachable only through `server-entry.ts`, which
  // is the bare `@mohasinac/appkit` specifier — not `/server`, where every
  // other order action lives and where a consumer would look for it.
  requestReturnAction,
} from "./_internal/server/features/orders/actions";

// [SERVER-ONLY] Cloud Function handler wrappers — persist exceptions to
// serverErrors (source: "function") before re-throwing so retry semantics
// are preserved. Apply at the consumer's runtime adapter boundary.
export {
  wrapJobHandler,
  wrapScheduleHandler,
  wrapTriggerHandler,
  wrapCallableHandler,
} from "./_internal/server/jobs/core/wrapJobHandler";

// [SERVER-ONLY] Log analysis — shared by CLI (`scripts/analyze-logs.mjs`) and
// the `/admin/maintenance/analysis` admin route.
export { analyzeLogs } from "./_internal/server/features/maintenance/analyze";
export type {
  AnalyzeOptions,
  AnalyzeReport,
} from "./_internal/server/features/maintenance/analyze";

// [SERVER-ONLY] Maintenance data loaders for /admin/maintenance/* server components.
export {
  listServerErrors,
  getServerErrorById,
  findRelatedClientErrors,
  getMaintenanceDashboardCounts,
} from "./_internal/server/features/maintenance/data";
export type { MaintenanceDashboardCounts } from "./_internal/server/features/maintenance/data";

// [SERVER-ONLY] Google Cloud Logging reader for /admin/maintenance/cloud-logs.
// Bounded single-page reads (Vercel Hobby 10s ceiling) — see cloud-logs-data.ts.
export { listCloudLogEntries } from "./_internal/server/features/maintenance/cloud-logs-data";
export type {
  CloudLogEntry,
  ListCloudLogEntriesOpts,
  ListCloudLogEntriesResult,
} from "./_internal/server/features/maintenance/cloud-logs-data";

// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ADDRESS_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// BID_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// CART_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// COUPON_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_CATEGORIES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_FAQS - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// NOTIFICATION_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PAYOUT_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PRODUCT_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// SESSION_COLLECTION - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// SESSION_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// STORE_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// USER_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addressesSeedData - Model for addresses seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// assertPiiRoundTrip - Shared export for assert pii round trip.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bidsSeedData - Model for bids seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogPostsSeedData - Model for blog posts seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselSlidesSeedData - Model for carousel slides seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cartsSeedData - Model for carts seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoriesSeedData - Model for categories seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// couponsSeedData - Model for coupons seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventEntriesSeedData - Model for event entries seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventsSeedData - Model for events seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqSeedData - Model for faq seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// formatSeedPrice - Helper for format seed price.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// generateMergedFirestoreIndexFile - Helper for generate merged firestore index file.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSeedLocale - Helper for get seed locale.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// homepageSectionsSeedData - Model for homepage sections seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeAddress - Shared export for make address.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeBid - Shared export for make bid.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeBlogPost - Shared export for make blog post.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCarouselSlide - Shared export for make carousel slide.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCart - Shared export for make cart.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCartItem - Model for make cart item.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCategory - Shared export for make category.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCoupon - Shared export for make coupon.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFaq - Shared export for make faq.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullAddress - Shared export for make full address.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullCart - Shared export for make full cart.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullCoupon - Shared export for make full coupon.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullNotification - Shared export for make full notification.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullPayout - Shared export for make full payout.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullProduct - Shared export for make full product.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullStore - Shared export for make full store.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullUser - Shared export for make full user.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeNotification - Shared export for make notification.
export { sendNotification } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY] enqueueJob — writes a `jobs/{jobId}` doc + returns a bulk-event
// custom token. The only way a Vercel route may start heavy work; actual
// processing runs in the `onJobCreated` Firebase Function (CLAUDE.md Rule #6).
export { enqueueJob } from "./features/jobs/actions/enqueue-job";
export type { EnqueueJobInput, EnqueueJobResult } from "./features/jobs/actions/enqueue-job";
export {
  JOBS_COLLECTION,
  JobStatusValues,
} from "./features/jobs/schemas/firestore";
export type { JobStatus, JobDocument, JobResult } from "./features/jobs/schemas/firestore";
// [SERVER-ONLY] Manual trigger for the daily status digest — shares one
// implementation with the `dailyStatusDigest` scheduled Firebase Function.
export { triggerDailyStatusDigest, triggerDeploymentDigest } from "./_internal/server/features/admin/daily-digest-actions";
export type { DailyStatusDigestResult, DailyStatusDigestSummary } from "./_internal/server/jobs/core/dailyStatusDigest";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// recordAdminAction - single write-site for the admin audit trail (adminAuditLog collection).
export { recordAdminAction } from "./_internal/server/features/audit-log/actions";
export type { RecordAdminActionInput } from "./_internal/server/features/audit-log/actions";
export {
  AdminAuditActionValues,
  ADMIN_AUDIT_LOG_COLLECTION,
  ADMIN_AUDIT_LOG_FIELDS,
} from "./features/audit-log/schemas/firestore";
export type { AdminAuditAction, AdminAuditLogDocument } from "./features/audit-log/schemas/firestore";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeOrder - Shared export for make order.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makePayout - Shared export for make payout.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeProduct - Shared export for make product.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeReview - Shared export for make review.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeRevokedSession - Shared export for make revoked session.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeSeedPhone - Shared export for make seed phone.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeSession - Shared export for make session.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeStore - Shared export for make store.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeUser - Shared export for make user.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeWinningBid - Shared export for make winning bid.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// mergeFirestoreIndices - Helper for merge firestore indices.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// notificationsSeedData - Model for notifications seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ordersSeedData - Model for orders seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// payoutsSeedData - Model for payouts seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// registerSeedLocale - Helper for register seed locale.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewsSeedData - Model for reviews seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// runSeed - Helper for run seed. Sourced directly from the runner module.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// seedForTest - Shared export for seed for test.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sessionsSeedData - Model for sessions seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// siteSettingsSeedData - Model for site settings seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeAddressesSeedData - Model for store addresses seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storesSeedData - Model for stores seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// usersSeedData - Model for users seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ApiErrors - Shared export for api errors.
export { ApiErrors } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_ROUTE_MAP - Constant used across modules.
export { DEFAULT_ROUTE_MAP } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ErrorView - Component for error view.
export { ErrorView } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// GlobalError - Model for global error.
export { GlobalError } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// NotFoundView - Component for not found view.
export { NotFoundView } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// UnauthorizedView - Component for unauthorized view.
export { UnauthorizedView } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildBaseContext - Helper for build base context.
export { buildBaseContext } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiErrorHandler - Helper for create api error handler.
export { createApiErrorHandler } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiHandler - Helper for create api handler.
export { createApiHandler } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiHandlerFactory - Helper for create api handler factory.
export { createApiHandlerFactory } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiMiddleware - Helper for create api middleware.
export { createApiMiddleware } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createRouteHandler - Helper for create route handler.
export { createRouteHandler } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createRouteMap - Helper for create route map.
export { createRouteMap } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// errorResponse - Model for error response.
export { errorResponse } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBooleanParam - Helper for get boolean param.
export { getBooleanParam } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getNumberParam - Helper for get number param.
export { getNumberParam } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOptionalSessionCookie - Helper for get optional session cookie.
export { getOptionalSessionCookie } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRequiredSessionCookie - Helper for get required session cookie.
export { getRequiredSessionCookie } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSearchParams - Helper for get search params.
export { getSearchParams } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStringParam - Helper for get string param.
export { getStringParam } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// invalidateCache - Shared export for invalidate cache.
export { invalidateCache } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// piiScrubberMiddleware - Shared export for pii scrubber middleware.
export { piiScrubberMiddleware } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// runChain - Helper for run chain.
export { runChain } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// successResponse - Model for success response.
export { successResponse } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// withCache - Shared export for with cache.
export { withCache } from "./next/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createMiddlewareAuthChain - Helper for create middleware auth chain.
export { createMiddlewareAuthChain } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSessionCookie - Helper for create session cookie.
export { createSessionCookie } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSessionCookieFromToken - Helper for create session cookie from token.
export { createSessionCookieFromToken } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// firebaseAuthProvider - Component for firebase auth provider.
export { firebaseAuthProvider } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// firebaseSessionProvider - Component for firebase session provider.
export { firebaseSessionProvider } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserFromRequest - Helper for get user from request.
export { getUserFromRequest } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireAuthFromRequest - Model for require auth from request.
export { requireAuthFromRequest } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireAuthUser - Shared export for require auth user.
export { requireAuthUser } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireRoleFromRequest - Model for require role from request.
export { requireRoleFromRequest } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireRoleUser - Shared export for require role user.
export { requireRoleUser } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeUserTokens - Shared export for revoke user tokens.
export { revokeUserTokens } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyIdToken - Shared export for verify id token.
export { verifyIdToken } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifySessionCookie - Shared export for verify session cookie.
export { verifySessionCookie } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// applySieveToFirestore - Helper for apply sieve to firestore.
export { applySieveToFirestore } from "./providers/db-firebase/index";
// [SERVER-ONLY]-Server-only — Firebase Admin SDK providers (firestore, auth, storage, realtime db).
export {
  getAdminDb,
  getAdminAuth,
  getAdminStorage,
  getAdminRealtimeDb,
} from "./providers/db-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildFirebaseClientConfig - Helper for build firebase client config.
export { buildFirebaseClientConfig } from "./providers/db-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// normalizeFirebaseConfigValue - Helper for normalize firebase config value.
export { normalizeFirebaseConfigValue } from "./providers/db-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// prepareForFirestore - Shared export for prepare for firestore.
export { prepareForFirestore } from "./providers/db-firebase/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createResendProvider - Helper for create resend provider.
export { createResendProvider } from "./providers/email-resend/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PhonePeProvider - Component for phonepe provider.
export { PhonePeProvider } from "./providers/payment-phonepe/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// RazorpayProvider - IPaymentProvider over Razorpay's client-side-modal gateway.
export { RazorpayProvider } from "./providers/payment-razorpay/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyRazorpayWebhookSignature - HMAC-SHA256 over the RAW webhook body. SDK-free module.
export { verifyWebhookSignature as verifyRazorpayWebhookSignature } from "./providers/payment-razorpay/signature";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// paiseToRupees - Shared export for paise to rupees. // audit-money-units-ok: names the boundary conversion function itself
export { paiseToRupees } from "./core/money";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// rupeesToPaise - Shared export for rupees to paise. // audit-money-units-ok: names the boundary conversion function itself
export { rupeesToPaise } from "./core/money";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// resolveKeys - resolves integration credentials (PhonePe etc.) from Firestore site settings, falling back to env vars. Used by providers.config.ts to construct PhonePeProvider when siteSettings.payment.phonepeEnabled is true.
export { resolveKeys } from "./core/integration-keys";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ManualPaymentProvider - the default IPaymentProvider implementation (no gateway).
export { ManualPaymentProvider } from "./providers/payment-manual/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ManualShippingProvider - the default (and only) IShippingProvider implementation.
export { ManualShippingProvider } from "./providers/shipping-manual/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createAddressForUser - Helper for create address for user.
export { createAddressForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteAddressForUser - Helper for delete address for user.
export { deleteAddressForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAddressByIdForUser - Helper for get address by id for user.
export { getAddressByIdForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAddressesForUser - Helper for list addresses for user.
export { listAddressesForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// setDefaultAddressForUser - Helper for set default address for user.
export { setDefaultAddressForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateAddressForUser - Helper for update address for user.
export { updateAddressForUser } from "./features/account/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminBidsGET - Shared export for admin bids get.
export { adminBidsGET } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCouponsGET - Shared export for admin coupons get.
export { adminCouponsGET } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCreateCoupon - Shared export for admin create coupon.
export { adminCreateCoupon } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCreateProduct - Shared export for admin create product.
export { adminCreateProduct } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteCoupon - Shared export for admin delete coupon.
export { adminDeleteCoupon } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteProduct - Shared export for admin delete product.
export { adminDeleteProduct } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteUser - Shared export for admin delete user.
export { adminDeleteUser } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminProductsGET - Shared export for admin products get.
export { adminProductsGET } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminReviewsGET - Shared export for admin reviews get.
export { adminReviewsGET } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateCoupon - Shared export for admin update coupon.
export { adminUpdateCoupon } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateOrder - Shared export for admin update order.
export { adminUpdateOrder } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdatePayout - Shared export for admin update payout.
export { adminUpdatePayout } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateProduct - Shared export for admin update product.
export { adminUpdateProduct } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateStoreStatus - Model for admin update store status.
export { adminUpdateStoreStatus } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateUser - Shared export for admin update user.
export { adminUpdateUser } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteNotification - Helper for delete notification.
export { deleteNotification } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAdminAnalytics - Helper for get admin analytics.
export { getAdminAnalytics } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAdminDashboardStats - Helper for get admin dashboard stats.
export { getAdminDashboardStats } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSiteSettings - Helper for get site settings.
export { getSiteSettings } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUnreadNotificationCount - Helper for get unread notification count.
export { getUnreadNotificationCount } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminBids - Helper for list admin bids.
export { listAdminBids } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminBlog - Helper for list admin blog.
export { listAdminBlog } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminCoupons - Helper for list admin coupons.
export { listAdminCoupons } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminOrders - Helper for list admin orders.
export { listAdminOrders } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminPayouts - Helper for list admin payouts.
export { listAdminPayouts } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminProducts - Helper for list admin products.
export { listAdminProducts } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminSessions - Helper for list admin sessions.
export { listAdminSessions } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminStores - Helper for list admin stores.
export { listAdminStores } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminUsers - Helper for list admin users.
export { listAdminUsers } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listNotifications - Helper for list notifications.
export { listNotifications } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markAllNotificationsRead - Shared export for mark all notifications read.
export { markAllNotificationsRead } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markNotificationRead - Shared export for mark notification read.
export { markNotificationRead } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeSession - Shared export for revoke session.
export { revokeSession } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeUserSessions - Shared export for revoke user sessions.
export { revokeUserSessions } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateSiteSettings - Helper for update site settings.
export { updateSiteSettings } from "./features/admin/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// GET - Constant used across modules.
export { GET } from "./features/auctions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bidsGET - Shared export for bids get.
export { bidsGET } from "./features/auctions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBidById - Helper for get bid by id.
export { getBidById } from "./features/auctions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBidsByProduct - Helper for list bids by product.
export { listBidsByProduct } from "./features/auctions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// placeBid - Shared export for place bid.
export { placeBid } from "./features/auctions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT - Constant used across modules.
export { CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT } from "./features/auth/checkout-value-otp";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// authMeGET - Shared export for auth me get.
export { authMeGET } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createPasswordResetToken - Helper for create password reset token.
export { createPasswordResetToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createVerificationToken - Helper for create verification token.
export { createVerificationToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteToken - Helper for delete token.
export { deleteToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// generateToken - Helper for generate token.
export { generateToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getPublicUserProfile - Helper for get public user profile.
export { getPublicUserProfile } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getProfileStoreProducts - Helper for get store products for public profile view.
export { getProfileStoreProducts } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerReviews - Helper for get seller reviews.
export { getSellerReviews } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserProfile - Helper for get user profile.
export { getUserProfile } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserSessions - Helper for get user sessions.
export { getUserSessions } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markPasswordResetTokenAsUsed - Shared export for mark password reset token as used.
export { markPasswordResetTokenAsUsed } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateUserProfile - Helper for update user profile.
export { updateUserProfile } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyEmailToken - Shared export for verify email token.
export { verifyEmailToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyPasswordResetToken - Shared export for verify password reset token.
export { verifyPasswordResetToken } from "./features/auth/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogGET - Shared export for blog get.
export { blogGET } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogSlugGET - Shared export for blog slug get.
export { blogSlugGET } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createBlogPost - Helper for create blog post.
export { createBlogPost } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createBlogPostSchema - Helper for create blog post schema.
export { createBlogPostSchema } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteBlogPost - Helper for delete blog post.
export { deleteBlogPost } from "./features/blog/server";
// SB-UNI-C — getBrandBySlug deleted with features/brands/. Use
// categoriesRepository.findBySlugAndType(slug, "brand") instead.
// getBlogPostById - Helper for get blog post by id.
export { getBlogPostById } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBlogPostBySlug - Helper for get blog post by slug.
export { getBlogPostBySlug } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedBlogPosts - Helper for get featured blog posts.
export { getFeaturedBlogPosts } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestBlogPosts - Helper for get latest blog posts.
export { getLatestBlogPosts } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBlogPosts - Helper for list blog posts.
export { listBlogPosts } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateBlogPost - Helper for update blog post.
export { updateBlogPost } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateBlogPostSchema - Helper for update blog post schema.
export { updateBlogPostSchema } from "./features/blog/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addItemToCart - Helper for add item to cart.
// assertCanAddNewItems - the lane gate every add-to-cart entry point must run.
export {
  addItemToCart,
  assertCanAddNewItems,
  addGroupLineToCart,
  updateCartGroupMembers,
  GROUP_LINE_MAX_MEMBERS,
  type AddGroupLineToCartInput,
} from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// clearCart - Shared export for clear cart.
export { clearCart } from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCart - Helper for get cart.
export { getCart } from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// mergeGuestCart - Helper for merge guest cart.
export { mergeGuestCart } from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// removeCartItem - Helper for remove cart item.
export { removeCartItem } from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateCartItem - Helper for update cart item.
export { updateCartItem } from "./features/cart/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// POST - Constant used across modules.
export { POST } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoriesGET - Shared export for categories get.
export { categoriesGET } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemDELETE - Shared export for category item delete.
export { categoryItemDELETE } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemGET - Shared export for category item get.
export { categoryItemGET } from "./features/categories/server";
// categoryDescriptionTemplateGET - the seller form's inherited-template read.
export { categoryDescriptionTemplateGET } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemPATCH - Shared export for category item patch.
export { categoryItemPATCH } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createCategory - Helper for create category.
export { createCategory } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteCategory - Helper for delete category.
export { deleteCategory } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// fetchCategoryTree - Shared export for fetch category tree.
export { fetchCategoryTree } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryById - Helper for get category by id.
export { getCategoryById } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryBySlug - Helper for get category by slug.
export { getCategoryBySlug } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryChildren - Helper for get category children.
export { getCategoryChildren } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBrandCategories - Helper for list brand categories.
export { listBrandCategories } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listCategories - Helper for list categories.
export { listCategories } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listTopLevelCategories - Helper for list top level categories.
export { listTopLevelCategories } from "./features/categories/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateCategory - Helper for update category.
export { updateCategory } from "./features/categories/server";
// [SERVER-ONLY] Tier PP — high-value checkout OTP gate.
export {
  sendCheckoutValueOtp,
  verifyCheckoutValueOtp,
  isCheckoutValueOtpVerified,
} from "./features/checkout/server";
export { FailedCheckoutRepository, failedCheckoutRepository } from "./features/checkout/server";
/*
 * Shipping reconciliation. Public on the SERVER entry only: it writes a points
 * ledger entry and an order, so it must never be reachable from a client
 * bundle. The consumer owns the seller's dispatch route, which is the second
 * place a parcel is marked shipped.
 */
export { reconcileOrderShipping } from "./_internal/server/features/shipping/reconcile";
/*
 * D45's self-shipped half. Server entry only: it writes an order, appends to
 * the points ledger, and `approveShippingReimbursement` throws on a `"system"`
 * approver — none of which belongs anywhere a client bundle can reach.
 */
export {
  submitShippingEvidence,
  approveShippingReimbursement,
} from "./_internal/server/features/shipping/reimbursement";
export type {
  SubmitShippingEvidenceInput,
  ApproveShippingReimbursementInput,
} from "./_internal/server/features/shipping/reimbursement";
/*
 * Cancel an order and settle the refund it owes (D14). SERVER ENTRY ONLY, for
 * the same reason as its neighbour above: it calls the payment provider and
 * writes to `orders` and `paymentCases`.
 *
 * Public because the consumer owns the seller/admin order PATCH route, which is
 * the one cancel path that can reach a DISPATCHED order — the two buyer paths
 * refuse that case before it gets here. There is no `./_internal/*` subpath, so
 * a consumer route cannot reach it any other way.
 */
export { cancelOrderWithRefund } from "./_internal/server/features/orders/cancellation-refund";
export type {
  CancelWithRefundOptions,
  CancelWithRefundResult,
} from "./_internal/server/features/orders/cancellation-refund";
/**
 * `admin_adjustment`'s first human writer (D48).
 *
 * Public for the same reason `cancelOrderWithRefund` above is: the consumer
 * owns `POST /api/admin/points`, and **there is no `./_internal/*` subpath**, so
 * a consumer route cannot reach it any other way.
 *
 * 🛑 Export the ACTION, not the repository's `append`. `append` would let a
 * route write any kind with any actor; this function fixes the kind, applies
 * the credit-only expiry, writes the `adminAuditLog` row and notifies the
 * buyer. A route reaching past it would silently skip three of those.
 */
export { adjustUserPoints } from "./_internal/server/features/points/adjust";
export { pointsRepository, PointsRepository } from "./features/points/repository/points.repository";
export type { FailedCheckoutMeta, FailedPaymentMeta } from "./features/checkout/server";
// [SERVER-ONLY] Email primitives — table-based, inline-styled components
// that render email-client-compatible HTML via renderToStaticMarkup. Use
// these instead of authoring raw <table>/<tr>/<td> in email templates.
export {
  EmailButton,
  EmailColumn,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailImage,
  EmailLink,
  EmailRow,
} from "./features/email";
export type {
  EmailButtonProps,
  EmailColumnProps,
  EmailContainerProps,
  EmailDividerProps,
  EmailDocProps,
  EmailFooterProps,
  EmailHeaderProps,
  EmailImageProps,
  EmailLinkProps,
  EmailRowProps,
  EmailTone,
} from "./features/email";
/*
 * Four senders were removed from this barrel 2026-09 along with their
 * implementations: `sendContactEmail` (the contact form is a record now, read
 * from /admin/contact and the daily digest), `sendSiteSettingsChangedEmail`
 * (adminAuditLog already records it, queryably), and
 * `sendVerificationEmailWithLink` / `sendPasswordResetEmailWithLink` (dead
 * since auth mail moved to the Firebase client SDK).
 */
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sendEmail - Shared export for send email. Takes a REQUIRED guard context.
export { sendEmail } from "./features/contact/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sendOrderConfirmationEmail - Shared export for send order confirmation email.
export { sendOrderConfirmationEmail } from "./features/contact/server";
export type { OrderConfirmationEmailParams, SendEmailGuard } from "./features/contact/server";
/*
 * `guardSend` is deliberately NOT exported here.
 *
 * It lives in `_internal/`, and `audit-appkit-reexports` correctly refuses to
 * let `_internal/` symbols leak through a public barrel. That is the right
 * answer for this one on its merits too: every sender that needs the guard is
 * inside appkit, and the two entry points that consumers DO call —
 * `sendEmail(opts, guard)` and `sendNotification()` — apply it themselves. A
 * consumer holding `guardSend` could only use it to build a fourth send path
 * outside the two the audit knows how to check.
 *
 * `SendEmailGuard` (the context type) is exported alongside `sendEmail` from
 * `./features/contact/server`, which is what a caller actually needs.
 */
// [SERVER-ONLY]-Firestore-backed cooldown for the Firebase-sent auth mails
// (password reset / verification), which never reach this app's server and so
// cannot be covered by guardSend.
export {
  authMailCooldownRepository,
  messageBudgetRepository,
} from "./features/messaging/repository/message-budget.repository";
export type {
  MessageAudience,
  MessageChannel,
  SendDecision,
  SendGuardContext,
} from "./_internal/shared/features/messaging/config";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventById - Shared export for admin get event by id.
export { adminGetEventById } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventEntries - Shared export for admin get event entries.
export { adminGetEventEntries } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventStats - Shared export for admin get event stats.
export { adminGetEventStats } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminListEvents - Shared export for admin list events.
export { adminListEvents } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateEventEntry - Model for admin update event entry.
export { adminUpdateEventEntry } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// changeEventStatus - Model for change event status.
export { changeEventStatus } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createEvent - Helper for create event.
export { createEvent } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteEvent - Helper for delete event.
export { deleteEvent } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// enterEvent - Model for enter event.
export { enterEvent } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventIdGET - Shared export for event id get.
export { eventIdGET } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventLeaderboard - Helper for get event leaderboard.
export { getEventLeaderboard } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventPollResults - Helper for get event poll results (per-option vote tally).
export { getEventPollResults } from "./features/events/server";
export type { PollResultEntry, SpinResultEntry } from "./features/events/index";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventSpinResults - Last N winning spins for a spin_wheel event, most recent first.
export { getEventSpinResults } from "./features/events/server";
// getUserSpinResultsForEvent - The CALLER'S OWN spins for an event, unmasked. Companion to the masked public feed above.
export { getUserSpinResultsForEvent } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getPublicEventById - Helper for get public event by id.
export { getPublicEventById } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPublicEvents - Helper for list public events.
export { listPublicEvents } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRelatedEvents - Helper for get related events (tag overlap).
export { getRelatedEvents } from "./features/events/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateEvent - Helper for update event.
export { updateEvent } from "./features/events/server";
// [SERVER-ONLY] SB9-H — manual trigger + spin actions
export {
  triggerEventRaffleAction,
  assignSpinPrizeAction,
  // resolveEventIdAction — slug-or-id → canonical doc id, so the spin route can
  // scope a guest's identity hash to a stable key (see the action's own note).
  resolveEventIdAction,
} from "./_internal/server/features/raffle/actions";
/*
 * [SERVER-ONLY] The ONE reason → {status, code} map for the two event
 * prize-draw cores, shared by both API routes and both Firebase handlers.
 * Four hand-written copies disagreed before this (Root Cause #85).
 */
export {
  reasonToHttp,
  EVENT_DRAW_REASON,
  type EventDrawReason,
  type EventDrawHttpMapping,
} from "./_internal/server/jobs/core/event-draw-reasons";
// [SERVER-ONLY] S-SBUNI-RULES — refund action (Razorpay + manual paths)
export {
  processRefundAction,
  type ProcessRefundInput,
} from "./_internal/server/features/refunds/actions";
// [SERVER-ONLY] Shared fee calculator — platform/gateway/GST/COD handling/addon fee math.
export {
  computeCheckoutFees,
  computePayoutDeduction,
  computeCodHandlingFee,
  computeGiftWrapFee,
  computeShipmentProtectionFee,
  computeSaleProtectionFee,
} from "./_internal/shared/fees/calculator";
// C5e buyer protections — the pure three-tier gate plus the one fee pair
// every money path must agree on. Public API because the capture route
// (/api/payment/create-order) is one of the three sites that must agree.
// The realised-price search tool (C1 + the search-first redirect). SERVER
// only: it reads Firestore through two repositories, so it must never reach
// client.ts (verify-entries would catch firebase-admin, but the import chain
// is the thing to keep clean — Root Cause #6).
export { searchPriceIndex, getPriceIndexBandsForIds, PRICE_INDEX_SEARCH_LIMIT, PRICE_INDEX_MIN_QUERY_LENGTH } from "./_internal/server/features/price-index/search";
export type {
  PriceIndexSearchResponse,
  PriceIndexSearchResult,
  PriceIndexSearchResultBand,
} from "./_internal/server/features/price-index/search";
/*
 * The MARKET half of the same tool, and a separate export because it is a
 * separate AUTHENTICATED endpoint — the competitor-derived band must not ride
 * the public, edge-cached sold response. The full argument is in that module's
 * own header; the short version is that merging them would either poison a
 * public cache with viewer-dependent content or cost the sold half its cache.
 */
export { getPriceIndexMarketForIds } from "./_internal/server/features/price-index/market";
export type { PriceIndexMarketRow } from "./_internal/server/features/price-index/market";
export {
  protectionAvailability,
  computeProtectionFees,
  adjudicateClaim,
  badgesFor,
  showsRiskNotice,
  showsSafetyBadge,
  returnDestination,
  rtoDestination,
  PROTECTION_KINDS,
} from "./_internal/shared/features/shipping/protections";
export type {
  ProtectionKind,
  ProtectionAvailability,
  ProtectionTierInput,
  ProtectionUnavailableReason,
  ClaimFinding,
  ClaimOutcome,
} from "./_internal/shared/features/shipping/protections";
export type {
  FeeCommissionRates,
  CheckoutFees,
  PayoutDeduction,
  CodHandlingFeeRates,
  GiftWrapFeeRates,
  ShipmentProtectionFeeRates,
  SaleProtectionFeeRates,
} from "./_internal/shared/fees/calculator";
// [SERVER-ONLY] Payout refund deduction action
export {
  applyRefundDeductionAction,
  type ApplyRefundDeductionInput,
  type ApplyRefundDeductionResult,
} from "./_internal/server/features/payouts/actions";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createFaq - Helper for create faq.
export { createFaq } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteFaq - Helper for delete faq.
export { deleteFaq } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqCreateSchema - Model for faq create schema.
export { faqCreateSchema } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqUpdateSchema - Model for faq update schema.
export { faqUpdateSchema } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFaqById - Helper for get faq by id.
export { getFaqById } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listFaqs - Helper for list faqs.
export { listFaqs } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPublicFaqs - Helper for list public faqs.
export { listPublicFaqs } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateFaq - Helper for update faq.
export { updateFaq } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// voteFaq - Shared export for vote faq.
export { voteFaq } from "./features/faq/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createChecklistItem - Admin creates a tester checklist catalog item.
export { createChecklistItem } from "./features/tester/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateChecklistItem - Admin updates a tester checklist catalog item.
export { updateChecklistItem } from "./features/tester/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteChecklistItem - Admin deletes a tester checklist catalog item.
export { deleteChecklistItem } from "./features/tester/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// checklistItemCreateSchema - Zod schema for creating a tester checklist item.
export { checklistItemCreateSchema } from "./features/tester/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// checklistItemUpdateSchema - Zod schema for updating a tester checklist item.
export { checklistItemUpdateSchema } from "./features/tester/server";
// [SERVER-ONLY]-Server-only — filters isTestData:true tester-sandbox documents out of public
// listing responses unless the viewer is a tester or admin. Use in every public store/product/
// category/blog/event list-and-detail route.
export {
  canViewTestData,
  filterTestDataForViewer,
  filterSingleTestData,
} from "./_internal/server/features/tester/visibility";
export type { ViewerLike, TestDataFlagged } from "./_internal/server/features/tester/visibility";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselGET - Shared export for carousel get.
export { carouselGET } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselItemDELETE - Shared export for carousel item delete.
export { carouselItemDELETE } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselItemGET - Shared export for carousel item get.
export { carouselItemGET } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselItemPATCH - Shared export for carousel item patch.
export { carouselItemPATCH } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselPOST - Shared export for carousel post.
export { carouselPOST } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createCarouselSlide - Helper for create carousel slide.
export { createCarouselSlide } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createHomepageSection - Helper for create homepage section.
export { createHomepageSection } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSectionSchema - Helper for create section schema.
export { createSectionSchema } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteCarouselSlide - Helper for delete carousel slide.
export { deleteCarouselSlide } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteHomepageSection - Helper for delete homepage section.
export { deleteHomepageSection } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCarouselSlideById - Helper for get carousel slide by id.
export { getCarouselSlideById } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getHomepageSectionById - Helper for get homepage section by id.
export { getHomepageSectionById } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listActiveCarouselSlides - Helper for list active carousel slides.
export { listActiveCarouselSlides } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAllCarouselSlides - Helper for list all carousel slides.
export { listAllCarouselSlides } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listEnabledHomepageSections - Helper for list enabled homepage sections.
export { listEnabledHomepageSections } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listHomepageSections - Helper for list homepage sections.
export { listHomepageSections } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reorderCarouselSlides - Shared export for reorder carousel slides.
export { reorderCarouselSlides } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reorderHomepageSections - Shared export for reorder homepage sections.
export { reorderHomepageSections } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateCarouselSlide - Helper for update carousel slide.
export { updateCarouselSlide } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateHomepageSection - Helper for update homepage section.
export { updateHomepageSection } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateSectionSchema - Helper for update section schema.
export { updateSectionSchema } from "./features/homepage/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaArray - Shared export for finalize staged media array.
export { finalizeStagedMediaArray } from "./features/media/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaField - Shared export for finalize staged media field.
export { finalizeStagedMediaField } from "./features/media/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaObject - Shared export for finalize staged media object.
export { finalizeStagedMediaObject } from "./features/media/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaObjectArray - Shared export for finalize staged media object array.
export { finalizeStagedMediaObjectArray } from "./features/media/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaUrl - Shared export for finalize staged media url.
export { finalizeStagedMediaUrl } from "./features/media/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cancelOrderForUser - Shared export for cancel order for user.
export { cancelOrderForUser } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cancelOrderItemsForUser - Cancels a subset of line items on an order and continues with the rest.
export { cancelOrderItemsForUser } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOrderByIdForUser - Helper for get order by id for user.
export { getOrderByIdForUser } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOrderTrackingHandler - Helper for get order tracking handler.
export { getOrderTrackingHandler } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getTrackingInfo - Helper for get tracking info.
export { getTrackingInfo } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// issuePartialRefund - Shared export for issue partial refund.
export { issuePartialRefund } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listOrdersForUser - Helper for list orders for user.
export { listOrdersForUser } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// previewCancellationRefund - Shared export for preview cancellation refund.
export { previewCancellationRefund } from "./features/orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// preOrdersGET - Shared export for pre orders get.
export { preOrdersGET } from "./features/pre-orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// preOrdersPOST - Shared export for pre orders post.
export { preOrdersPOST } from "./features/pre-orders/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedAuctions - Helper for get featured auctions.
export { getFeaturedAuctions } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedPreOrders - Helper for get featured pre orders.
export { getFeaturedPreOrders } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedProducts - Helper for get featured products.
export { getFeaturedProducts } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestAuctions - Helper for get latest auctions.
export { getLatestAuctions } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestPreOrders - Helper for get latest pre orders.
export { getLatestPreOrders } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestProducts - Helper for get latest products.
export { getLatestProducts } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getProductById - Helper for get product by id.
export { getProductById } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRelatedProducts - Helper for get related products.
export { getRelatedProducts } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreStorefrontProducts - Helper for get store storefront products.
export { getStoreStorefrontProducts } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAuctions - Helper for list auctions.
export { listAuctions } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPreOrders - Helper for list pre orders.
export { listPreOrders } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listProducts - Helper for list products.
export { listProducts } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemDELETE - Shared export for product item delete.
export { productItemDELETE } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemGET - Shared export for product item get.
export { productItemGET } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemPATCH - Shared export for product item patch.
export { productItemPATCH } from "./features/products/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getPromotions - Helper for get promotions.
export { getPromotions } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// promotionsGET - Shared export for promotions get.
export { promotionsGET } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerCreateCoupon - Shared export for seller create coupon.
export { sellerCreateCoupon } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerDeleteCoupon - Shared export for seller delete coupon.
export { sellerDeleteCoupon } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerUpdateCoupon - Shared export for seller update coupon.
export { sellerUpdateCoupon } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// validateCoupon - Helper for validate coupon.
export { validateCoupon } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// validateCouponForCart - Helper for validate coupon for cart.
export { validateCouponForCart } from "./features/promotions/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteReview - Shared export for admin delete review.
export { adminDeleteReview } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateReview - Shared export for admin update review.
export { adminUpdateReview } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createReview - Helper for create review.
export { createReview } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteReview - Helper for delete review.
export { deleteReview } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getHomepageReviews - Helper for get homepage reviews.
export { getHomepageReviews } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getReviewById - Helper for get review by id.
export { getReviewById } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminReviews - Helper for list admin reviews.
export { listAdminReviews } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listReviewsByProduct - Helper for list reviews by product.
export { listReviewsByProduct } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listReviewsBySeller - Helper for list reviews by seller.
export { listReviewsBySeller } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemDELETE - Shared export for review item delete.
export { reviewItemDELETE } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemGET - Shared export for review item get.
export { reviewItemGET } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemPATCH - Shared export for review item patch.
export { reviewItemPATCH } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateReview - Helper for update review.
export { updateReview } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// voteReviewHelpful - Shared export for vote review helpful.
export { voteReviewHelpful } from "./features/reviews/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// acceptCounterOffer - Shared export for accept counter offer.
export { acceptCounterOffer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// becomeSeller - Shared export for become seller.
export { becomeSeller } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bulkSellerOrder - Shared export for bulk seller order.
export { bulkSellerOrder } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// checkoutOffer - Shared export for checkout offer.
export { checkoutOffer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// counterOfferByBuyer - Shared export for counter offer by buyer.
export { counterOfferByBuyer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSellerProduct - Helper for create seller product.
export { createSellerProduct } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createStore - Helper for create store.
export { createStore } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// customShipOrder - Shared export for custom ship order.
export { customShipOrder } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerAnalytics - Helper for get seller analytics.
export { getSellerAnalytics } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerPayoutSettings - Helper for get seller payout settings.
export { getSellerPayoutSettings } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerShipping - Helper for get seller shipping.
export { getSellerShipping } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerStore - Helper for get seller store.
export { getSellerStore } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBuyerOffers - Helper for list buyer offers.
export { listBuyerOffers } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerCoupons - Helper for list seller coupons.
export { listSellerCoupons } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerMyProducts - Helper for list seller my products.
export { listSellerMyProducts } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerOffers - Helper for list seller offers.
export { listSellerOffers } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerOrders - Helper for list seller orders.
export { listSellerOrders } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerPayouts - Helper for list seller payouts.
export { listSellerPayouts } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeOffer - Shared export for make offer.
export { makeOffer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requestPayout - Shared export for request payout.
export { requestPayout } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// respondToOffer - Shared export for respond to offer.
export { respondToOffer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerCouponsGET - Shared export for seller coupons get.
export { sellerCouponsGET } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerDeleteProduct - Shared export for seller delete product.
export { sellerDeleteProduct } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerProductsGET - Shared export for seller products get.
export { sellerProductsGET } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerStoreGET - Shared export for seller store get.
export { sellerStoreGET } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerUpdateProduct - Shared export for seller update product.
export { sellerUpdateProduct } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updatePayoutSettings - Helper for update payout settings.
export { updatePayoutSettings } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateStore - Helper for update store.
export { updateStore } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// withdrawOffer - Shared export for withdraw offer.
export { withdrawOffer } from "./features/seller/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createStoreAddressForSeller - Helper for create store address for seller.
export { createStoreAddressForSeller } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteStoreAddressForSeller - Helper for delete store address for seller.
export { deleteStoreAddressForSeller } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreAuctions - Helper for get store auctions.
export { getStoreAuctions } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreBySlug - Helper for get store by slug.
export { getStoreBySlug } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreProducts - Helper for get store products.
export { getStoreProducts } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreReviews - Helper for get store reviews.
export { getStoreReviews } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listStoreAddressesForSeller - Helper for list store addresses for seller.
export { listStoreAddressesForSeller } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listStores - Helper for list stores.
export { listStores } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeAuctionsGET - Shared export for store auctions get.
export { storeAuctionsGET } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeProductsGET - Shared export for store products get.
export { storeProductsGET } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeReviewsGET - Shared export for store reviews get.
export { storeReviewsGET } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeSlugGET - Shared export for store slug get.
export { storeSlugGET } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateStoreAddressForSeller - Helper for update store address for seller.
export { updateStoreAddressForSeller } from "./features/stores/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addToWishlist - Helper for add to wishlist.
export { addToWishlist } from "./features/wishlist/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getWishlistForUser - Helper for get wishlist for user.
export { getWishlistForUser } from "./features/wishlist/server";
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// removeFromWishlist - Helper for remove from wishlist.
export { removeFromWishlist } from "./features/wishlist/server";

// -- Repositories ------------------------------------------------------------
// siteSettingsRepository - Shared export for site settings repository.
export { siteSettingsRepository } from "./repositories/index";
// storeRepository - Shared export for store repository.
export { storeRepository } from "./repositories/index";
// orderRepository - Shared export for order repository (needed by consumer Firebase Functions, e.g. invoice PDF generation).
export { orderRepository } from "./repositories/index";
// taxCodesRepository (B3) — resolved by deriveTaxonomy on every product write
// that names a taxonomy field, so it is a server-only read on a hot path.
export { taxCodesRepository } from "./repositories/index";
export type { OrderDocument } from "./features/orders/index";
export type { OrderDocumentItem } from "./features/orders/index";
// SB-UNI-V — bundlesRepository deleted; use categoriesRepository with categoryType:"bundle".

// -- Monitoring --------------------------------------------------------------
// serverLogger - Structured server-side logger.
export { serverLogger } from "./monitoring/index";

// -- Error handling utilities ------------------------------------------------
// withRetry - Exponential-backoff retry for idempotent async operations.
export { withRetry } from "./http/retry";
// safeFireAndForget - Runs non-critical promises without blocking the caller.
export { safeFireAndForget } from "./utils/safe-fire-forget";

// -- Security / Rate limiting ------------------------------------------------
// applyRateLimit - Apply rate limiting middleware.
export { applyRateLimit } from "./security/index";
// rateLimitByIdentifier - Rate limit by a string identifier.
export { rateLimitByIdentifier } from "./security/index";
// RateLimitPresets - Preset configurations for common rate-limit scenarios.
export { RateLimitPresets } from "./security/index";
// getClientIP - Extract the caller's IP from x-forwarded-for/x-real-ip.
export { getClientIP } from "./security/index";
// hashGuestIdentity - Deterministic, non-reversible hash of a guest caller's IP scoped to an entity (never persists the raw IP).
export { hashGuestIdentity } from "./security/index";
// maskPublicEventEntry - Redact PII from event entries before public exposure.
export { maskPublicEventEntry } from "./security/index";
// PII encryption/masking (server-only -- crypto module via node:module, must never leak into a client bundle; see appkit Export Rules in CLAUDE.md)
export { encryptValue } from "./security/index";
export { decryptValue } from "./security/index";
export { hmacBlindIndex } from "./security/index";
export { encryptPiiFields } from "./security/index";
export { decryptPiiFields } from "./security/index";
export { encryptPii } from "./security/index";
export { decryptPii } from "./security/index";
export { isPiiEncrypted } from "./security/index";
export { piiBlindIndex } from "./security/index";
export { piiIndicesFor } from "./security/index";
export { reserveUserSlug, userSlugBase, USER_SLUGS_COLLECTION } from "./features/auth/actions/user-slug";
export { resolveProfileUser } from "./features/auth/actions/profile-actions";
export { getPiiConfigError } from "./security/index";
export { encryptPayoutDetails } from "./security/index";
export { decryptPayoutDetails } from "./security/index";
export { encryptShippingConfig } from "./security/index";
export { decryptShippingConfig } from "./security/index";
export { maskName } from "./security/index";
export { maskEmail } from "./security/index";
export { maskPublicReview } from "./security/index";
export { maskPublicBid } from "./security/index";
export { maskOfferForSeller } from "./security/index";
export { ENC_PREFIX } from "./security/index";
export { HMAC_PREFIX } from "./security/index";

// -- Instrumentation ---------------------------------------------------------
// createInstrumentation - Factory for Next.js instrumentation hooks.
export { createInstrumentation } from "./instrumentation/index";

// -- SEO ---------------------------------------------------------------------
// SEO_CONFIG - Shared SEO defaults for server-rendered metadata.
export { SEO_CONFIG } from "./seo/index";
// createSeoConfig - Merge consumer SEO overrides with appkit defaults.
export { createSeoConfig } from "./seo/index";
// generateMetadata - Build page metadata in server contexts.
export { generateMetadata } from "./seo/index";
// generateProfileMetadata - Build profile metadata in server contexts.
export { generateProfileMetadata } from "./seo/index";
// generateProductMetadata - Build product metadata in server contexts.
export { generateProductMetadata } from "./seo/index";
// generateCategoryMetadata - Build category metadata in server contexts.
export { generateCategoryMetadata } from "./seo/index";
// generateBlogMetadata - Build blog metadata in server contexts.
export { generateBlogMetadata } from "./seo/index";
// generateAuctionMetadata - Build auction metadata in server contexts.
export { generateAuctionMetadata } from "./seo/index";
// generateSearchMetadata - Build search metadata in server contexts.
export { generateSearchMetadata } from "./seo/index";
// organizationJsonLd - Build organization structured data in server contexts.
export { organizationJsonLd } from "./seo/index";
// searchBoxJsonLd - Build search box structured data in server contexts.
export { searchBoxJsonLd } from "./seo/index";
export type {
	SeoConfig,
	ProductSeoInput,
	CategorySeoInput,
	BlogSeoInput,
	AuctionSeoInput,
} from "./seo/index";

// -- i18n / messages ---------------------------------------------------------
// mergeFeatureMessages - Merge per-feature message files into a single bundle.
export { mergeFeatureMessages } from "./cli/index";


// -- Social Feed (server-only: fetches from platform APIs using credentials) --
export {
  fetchInstagramPosts,
  fetchFacebookPosts,
  fetchTikTokPosts,
  fetchDeviantArtPosts,
} from "./features/homepage/lib/social-feed-fetcher";
export type {
  SocialPost,
  SocialPlatform,
  SocialPostType,
  SocialFeedLayout,
  SocialFeedSectionConfig,
} from "./features/homepage/schemas";

// -- Google Reviews (server-only: calls Google Places API) --------------------
export { fetchGoogleReviews } from "./features/homepage/lib/google-reviews-fetcher";
export type { GoogleReview, GoogleReviewsResult } from "./features/homepage/lib/google-reviews-fetcher";
export { GoogleReviewsSection } from "./features/homepage/components/GoogleReviewsSection";
export type { GoogleReviewsSectionProps } from "./features/homepage/components/GoogleReviewsSection";

// ---------------------------------------------------------------------------
// SSR Rearchitecture (Arch-S1+) — request-scoped data layers + OG renderers.
// Mirrors the exports in server-entry.ts so consumers can use the explicit
// `@mohasinac/appkit/server` subpath (preferred for SSR route files).
// ---------------------------------------------------------------------------

// Data layers — each wrapped in React.cache for request-scoped dedup
export {
  getProductForDetail,
  listSitemapProducts,
  computeRelatedItems,
  toProductItem,
  type SitemapProduct,
  type RelatedItemsResult,
} from "./_internal/server/features/products/index";
// The single public-listing query — every SSR listing view and /api/products
// share it so their filter semantics cannot drift (Root Cause #30).
export {
  listPublicProducts,
  parsePublicProductParams,
  defaultAvailabilityForListingTypes,
  PUBLIC_PRODUCT_MAX_PAGE_SIZE,
  ANY_STATUS,
  type PublicProductListInput,
  type PublicProductListResult,
  type PublicProductListOptions,
  type PublicProductExecutor,
  type PublicProductQuery,
} from "./_internal/server/features/products/index";
// S-SBUNI-3/4 2026-05-13 — bundle data/metadata/og layer.
export {
  getBundleForDetail,
  listBundleMembers,
  listFeaturedBundles,
  getRelatedBundles,
  resolveBundleMemberIds,
  resolveBundleOriginalTotal,
  findBundleMemberStores,
  resolveBundleCategorySlugs,
  buildBundleMetadata,
  renderBundleOg,
  renderBundleOgImage,
  addBundleToCartAction,
  type BundleDataOptions,
  type BundleMetadataOptions,
  type BundleOgData,
} from "./_internal/server/features/bundles/index";
export { getGroupsForProduct, getGroupsWithItemsForProduct, getGroupsForCategory, getGroupsForBrand } from "./_internal/server/features/grouped/index";
// Public /groups/{slug} page — data, metadata and OG.
export {
  getGroupedListingForDetail,
  getGroupedListingWithItems,
  buildGroupedListingMetadata,
  renderGroupedListingOg,
  type GroupedListingWithItems,
  type GroupedListingMetadataOptions,
} from "./_internal/server/features/grouped/index";
// Allow-list projection for group members — see § "Public Data Projections".
export {
  toPublicGroupMember,
  toPublicGroupMembers,
  type PublicGroupMember,
} from "./_internal/server/features/products/group-members";
export { getAuctionForDetail, getProductFeaturesForAuction } from "./_internal/server/features/auctions/index";
export { getPreOrderForDetail, getProductFeaturesForPreOrder } from "./_internal/server/features/pre-orders/index";
export { getStoreForDetail, listStoreProductsInitial, listStoreAuctionsInitial, listStorePreOrdersInitial, listSitemapStores } from "./_internal/server/features/stores/index";
export { getDefaultStoreTabPath } from "./_internal/server/features/stores/tabs";

// Public-store allow-list projection — the ONLY sanctioned way a StoreDocument
// may reach a client component or an HTTP response. See adapters.ts header.
export {
  toStoreDetail,
  toStoreListItem,
  PUBLIC_STORE_FIELDS,
  PRIVATE_STORE_FIELDS,
  type ToStoreDetailOptions,
  type ToStoreListItemOptions,
  type StoreProjectionSource,
} from "./_internal/server/features/stores/adapters";
export { getBrandForDetail } from "./_internal/server/features/brands/index";
export {
  getFranchiseForDetail,
  listActiveFranchises,
  renderFranchiseOg,
} from "./_internal/server/features/franchises/index";
export { getBlogPostForDetail } from "./_internal/server/features/blog/index";
export { getEventForDetail } from "./_internal/server/features/events/index";
export { getSublistingCategoryForDetail } from "./_internal/server/features/sublisting-categories/index";
export { getCategoryForDetail, listRootCategories, listFeaturedCategories, listMenuCategories, getCategoryTree, listSitemapCategories } from "./_internal/server/features/categories/index";

// OG image renderers — high-level (renderXOg) + low-level primitive (renderXOgImage)
export { renderProductOg, renderProductOgImage, type ProductOgData, type OgOptions } from "./_internal/server/features/products/og";
export { renderAuctionOg, renderAuctionOgImage, type AuctionOgData } from "./_internal/server/features/auctions/og";
export { renderPreOrderOg, renderPreOrderOgImage, type PreOrderOgData } from "./_internal/server/features/pre-orders/og";
export { renderStoreOg, renderStoreOgImage, type StoreOgData } from "./_internal/server/features/stores/og";
// The one derivation of a product's denormalized store fields. Exported because
// the consumer's admin create route writes products directly rather than through
// adminCreateProduct, and a second hand-rolled copy is how these drift.
export {
  resolveStoreFields,
  resolveStoreFieldsMany,
  type ProductStoreFields,
} from "./_internal/server/features/stores/denormalize";
export { renderBrandOg, renderBrandOgImage, type BrandOgData } from "./_internal/server/features/brands/og";
export { renderCategoryOg, renderCategoryOgImage, type CategoryOgData } from "./_internal/server/features/categories/og";
export { renderBlogOg, renderBlogOgImage, type BlogOgData } from "./_internal/server/features/blog/og";
export { renderEventOg, renderEventOgImage, type EventOgData } from "./_internal/server/features/events/og";
export { renderSublistingCategoryOg, renderSublistingCategoryOgImage, type SublistingCategoryOgData } from "./_internal/server/features/sublisting-categories/og";
export { renderProfileOg, renderPrivateProfileOgImage, renderUserProfileOgImage, type UserProfileOgData } from "./_internal/server/features/profile/og";
export { renderReviewOg, renderReviewOgImage, type ReviewOgData } from "./_internal/server/features/reviews/og";
export { renderFaqOg, renderFaqOgImage, type FaqOgData } from "./_internal/server/features/faqs/og";
export { renderScamOg, renderScamOgImage, type ScamOgData } from "./_internal/server/features/scams/og";
export { getScammerForDetail, getScammerProfilePageData as getScammerProfilePageDataCached } from "./_internal/server/features/scams/data";

// Adapters
export { orderDocumentToOrder } from "./_internal/server/features/orders/adapters";
// Offers had NO adapter at all — all three routes returned raw OfferDocuments
// with live Date objects. `offerDocumentToOffer` gates buyer identity behind
// an explicit flag so a route that forgets `maskOfferForSeller` under-shares
// rather than leaking.
export { offerDocumentToOffer, offerToChainRound } from "./_internal/server/features/offers/adapters";
export type { Offer, OfferAdapterOptions, OfferChainRound, OfferTimelineEntry } from "./_internal/server/features/offers/adapters";

// Listing-type capability registry — SB-UNI X1.
export {
  LISTING_TYPE_CAPABILITIES,
  capabilityFor,
  canAddToCart,
  canBid,
  supportsShipping,
  requiresVendorVerified,
  requiresJurisdictionCheck,
  hasInstantFulfillment,
  assertNever,
} from "./_internal/shared/listing-types/capabilities";
export type { ListingTypeCapability } from "./_internal/shared/listing-types/capabilities";
export { LISTING_TYPE_REGISTRY, pluginFor, detectListingTypeFromSlug } from "./_internal/shared/listing-types/_registry";
/*
 * 🛑 `ALL_LISTING_TYPES` / `isListingType` are deliberately NOT re-exported
 * here. `index.ts` already exports both, and `server-entry.ts` does
 * `export * from "./index"` — which is what the bare `@mohasinac/appkit`
 * specifier resolves to (`exports["."] → dist/server-entry.js`). So a Server
 * Component already reaches them from the bare entry, and adding a second path
 * through `server.ts` would be an `_internal/` symbol leaking through a third
 * public barrel for no reader. `audit-appkit-reexports` caught exactly that.
 */
export type { ListingTypePlugin } from "./_internal/shared/listing-types/_registry";

// Media context guards — shared by /api/media/sign + legacy /api/media/upload.
export {
  applyMediaContextGuards,
  CONTEXT_LIMITS,
} from "./_internal/server/features/media/contextGuards";
export type { GuardResult, GuardError, GuardSuccess } from "./_internal/server/features/media/contextGuards";

// Media upload limits — shared by /api/media/sign + /api/media/finalize + /api/media/upload.
export {
  MEGABYTE,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
  MAX_LABEL,
  MAX_BYTES,
  ALLOWED_IMAGE_MIMES,
  IMAGE_ACCEPT_ATTR,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_DOC_MIMES,
  ALLOWED_MIMES,
  ALLOWED_TYPES_LABEL,
  MIME_TO_EXT,
  PDF_MAGIC,
  VIDEO_CONVERSION_HINTS,
  classifyMime,
  isAllowedMime,
  maxBytesFor,
  getConversionHint,
  PRODUCT_MAX_IMAGES,
  PRODUCT_MAX_VIDEOS,
  PRODUCT_IMAGE_INDEX_MAX,
} from "./_internal/shared/media/limits";
export type {
  MediaKind,
  AllowedImageMime,
  AllowedVideoMime,
  AllowedDocMime,
  AllowedMime,
} from "./_internal/shared/media/limits";

// ── RBAC server helpers ───────────────────────────────────────────────────────
// getServerPermissions, checkPermission, makeAdminSectionLayout
export {
  getServerPermissions,
  checkPermission,
  checkAnyPermission,
  makeAdminSectionLayout,
} from "./_internal/server/features/auth/permissions";
export type {
  ResolvedPermissions,
  AdminSectionLayoutOpts,
} from "./_internal/server/features/auth/permissions";
export {
  getStoreCapabilities,
  storeHasCapability,
} from "./_internal/server/features/auth/capabilities";

// ── Soft ban helpers ──────────────────────────────────────────────────────────
export { isSoftBanned, getBanSummary } from "./features/auth/server/checkSoftBan";
export type { UserSoftBan } from "./features/auth/schemas/firestore";
export type { BannedAction } from "./features/auth/permissions/constants";

// -- SEO builders (sitemap / robots / manifest / og-image) --
export { buildSitemap, buildRobots, buildManifest, buildDefaultOgImage, DEFAULT_OG_SIZE, resolveOgImageUrl } from "./_internal/server/features/seo";
export type { SitemapOptions, RobotsOptions, ManifestOptions, DefaultOgOptions } from "./_internal/server/features/seo";


// -- Action gate + nav route helpers (server-side) --
export { checkActionAllowed } from "./features/admin/utils/checkActionAllowed";
export { getDisabledRoutes } from "./features/admin/utils/getDisabledRoutes";
export { getSiteSettingsGlobal } from "./features/admin/utils/getSiteSettingsGlobal";
// Same React.cache dedup, for the FAQ list the homepage reads twice per render
// (once for the section, once for its JSON-LD).
export { getHomepageFaqsCached } from "./features/faq/utils/getHomepageFaqsCached";
// Which PAGE paths a write makes stale — the input to revalidatePath(). Long
// detail-route TTLs are only safe because this exists.
export {
  revalidateTargetsFor,
  type RevalidateHints,
} from "./_internal/shared/cache/revalidate-targets";
// Null-safe wrapper — returns null on Firestore failure instead of throwing.
export { getSiteSettingsSafe } from "./_internal/server/features/site-settings/safe-settings";

// Public site-settings allow-list projection — the ONLY sanctioned shape for
// an unauthenticated site-settings response. See adapters.ts header.
export {
  toPublicSiteSettings,
  PUBLIC_SITE_SETTINGS_FIELDS,
  PRIVATE_SITE_SETTINGS_FIELDS,
  type ToPublicSiteSettingsOptions,
} from "./_internal/server/features/site-settings/adapters";
// Firebase Identity Toolkit REST helper (signInWithPassword / signInWithCustomToken).
export { callFirebaseIdentityToolkit } from "./_internal/server/features/auth/firebase-identity";

// -- Site-settings domain actions (updateActionConfig / updateNavConfig) --
export { updateActionConfigDomain, updateNavConfigDomain } from "./_internal/server/features/site-settings/actions";

// ── Classified listing — data + adapters + metadata + OG ─────────────────────
export { getClassifiedForDetail } from "./_internal/server/features/classified/data";
// OG-coverage-followup 2026-05-23 — prize-draws OG renderer.
export {
  getPrizeDrawForDetail,
  renderPrizeDrawOg,
  renderPrizeDrawOgImage,
  type PrizeDrawOgData,
} from "./_internal/server/features/prize-draws/index";
// OG-coverage-followup 2026-05-23 — item-requests OG renderer.
export {
  getItemRequestForDetail,
  renderItemRequestOg,
  renderItemRequestOgImage,
  type ItemRequestDataOptions,
  type ItemRequestOgData,
} from "./_internal/server/features/item-requests/index";
export { toClientClassified, type ClassifiedClientShape } from "./_internal/server/features/classified/adapters";
export { buildClassifiedMetadata, type ClassifiedMetadataOptions } from "./_internal/server/features/classified/metadata";
export { renderClassifiedOg, renderClassifiedOgImage, renderClassifiedOgFromDoc, type ClassifiedOgData } from "./_internal/server/features/classified/og";
export { renderCatalogueItemOg, renderCatalogueItemOgImage, type CatalogueItemOgData } from "./_internal/server/features/catalogue/og";

// ── Digital-code listing — data + adapters + metadata + OG ───────────────────
export { getDigitalCodeForDetail } from "./_internal/server/features/digital-code/data";
export { toClientDigitalCode, type DigitalCodeClientShape } from "./_internal/server/features/digital-code/adapters";
export { buildDigitalCodeMetadata, type DigitalCodeMetadataOptions } from "./_internal/server/features/digital-code/metadata";
export { renderDigitalCodeOg, renderDigitalCodeOgImage, renderDigitalCodeOgFromDoc, type DigitalCodeOgData } from "./_internal/server/features/digital-code/og";
/*
 * The digital-CONTENT pool: the half of this feature that had no writer at all
 * until 2026-09-14, so every digital-code purchase delivered nothing.
 *
 * Server-only, and that is structural rather than tidy — `pool` and `download`
 * both reach `getAdminDb`/`getAdminStorage`, and `upload` mints signed URLs.
 * None of it may appear in `index.ts` or `client.ts` (the Turbopack
 * client-bundle trap, Root Cause #6/#24).
 */
export {
  addPoolEntries,
  listPoolEntries,
  deletePoolEntry,
  recountPool,
  assertCanUploadContentKind,
  DIGITAL_CONTENT_PREFIX,
  type AddPoolEntryInput,
} from "./_internal/server/features/digital-code/pool";
export {
  signDigitalContentUpload,
  finalizeDigitalContentUpload,
  contentKindForMime,
  type SignedDigitalContent,
  type FinalizedDigitalContent,
} from "./_internal/server/features/digital-code/upload";
/**
 * D9 — chat. The one writer path for conversations and messages; every
 * mutation runs through the Admin SDK here, never a client Firestore write
 * (`firestore.rules` is `allow read, write: if false` on every document).
 */
export {
  createOrOpenConversation,
  openConversationWithSeller,
  listConversationsForUser,
  listMessagesForConversation,
  sendMessage,
  markConversationRead,
  blockConversationParticipant,
  softDeleteOwnMessage,
  mintChatEventToken,
  getUnreadConversationCount,
  deleteAllMessages as deleteAllConversationMessages,
  listAllAttachmentUrls as listConversationAttachmentUrls,
  stripPii as stripChatPii,
  type SendMessageInput,
} from "./_internal/server/features/messages/actions";
export {
  resolveCodeAssetForOrder,
  codeAssetHeaders,
  CODE_DOWNLOAD_STATUSES,
  type CodeAssetResolution,
} from "./_internal/server/features/digital-code/download";

// ── Statutory business documents — admin-only, encrypted at rest ────────────
export {
  resolveBusinessDocument,
  type BusinessDocumentResolution,
} from "./_internal/server/features/business-documents/download";
export {
  businessDocumentsRepository,
  BusinessDocumentsRepository,
} from "./features/business-documents/repository/business-documents.repository";

// ── Live-item listing — data + adapters + metadata + OG ──────────────────────
export { getLiveItemForDetail } from "./_internal/server/features/live/data";
export { toClientLiveItem, type LiveItemClientShape } from "./_internal/server/features/live/adapters";
export { buildLiveItemMetadata, type LiveItemMetadataOptions } from "./_internal/server/features/live/metadata";
export { renderLiveItemOg, renderLiveItemOgImage, renderLiveItemOgFromDoc, type LiveItemOgData } from "./_internal/server/features/live/og";

// ── Lottery feature — server data + adapters + actions ──────────────────────────
export { getLotteryEventCached, listLotteryEvents, getLotteryEntriesForAdmin, getLotteryEntriesForUser } from "./_internal/server/features/lottery/data";
export type { LotteryEventClient } from "./_internal/server/features/lottery/data";
export { toClientLotterySlot, toClientLotteryConfig } from "./_internal/server/features/lottery/adapters";
export { toPublicEvent, toClientSpinPrize } from "./_internal/server/features/events/adapters";
export type { ClientSpinPrize } from "./_internal/server/features/events/adapters";
export { buildLotteryMetadata } from "./_internal/server/features/lottery/metadata";
export { renderLotteryOg, renderLotteryOgImage } from "./_internal/server/features/lottery/og";
export type { LotteryOgData } from "./_internal/server/features/lottery/og";
export {
  submitLotteryPullAction,
  flagLotteryEntryAction,
  reopenLotterySlotAction,
  createLotteryEventAction,
  updateLotteryEventAction,
  setProductLotteryModeAction,
} from "./_internal/server/features/lottery/actions";
export { lotteryEntryRepository } from "./features/lottery/repository/lottery-entry.repository";

/*
 * Notification email templates + the shared actionUrl resolver.
 *
 * Server-only: the templates call `renderToStaticMarkup` through a lazy
 * `require`, which must never end up reachable from a client chunk.
 */
export {
  renderNotificationEmail,
  NOTIFICATION_EMAIL_TEMPLATES,
} from "./features/email/notification-templates";
export type {
  NotificationTemplateDef,
  NotificationEmailContext,
} from "./features/email/notification-templates";
export {
  resolveNotificationActionUrl,
} from "./_internal/shared/features/notifications/action-url";
export type { NotificationAudience } from "./_internal/shared/features/notifications/action-url";

// The ONE address shape and the ONE postal rule (W5 / D19). Eleven field
// shapes and fifteen disagreeing postal rules collapsed to these.
export {
  refineAddressPostal,
  addressFormSchema,
  addressUpdateSchema,
  adminAddressCreateSchema,
  adminAddressUpdateSchema,
  addressUnbanRequestSchema,
  adminAddressPatchSchema,
} from "./features/addresses/schemas/address-form";
export type {
  AddressFormValues,
  AddressUpdateValues,
  AdminAddressCreateValues,
} from "./features/addresses/schemas/address-form";
export {
  COUNTRIES,
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  countryFor,
  postalPatternFor,
  postalLabelFor,
  isValidPostalCode,
} from "./constants/geo/countries";
export type { CountryDef } from "./constants/geo/countries";
export { SUBDIVISIONS, subdivisionsFor } from "./constants/geo/subdivisions";

export {
  validateActionIndexEntry,
  normaliseRoute,
} from "./features/search/action-index/validate-entry";
export type {
  ActionIndexValidationContext,
  ActionIndexValidationIssue,
} from "./features/search/action-index/validate-entry";
export {
  ActionIndexRepository,
  actionIndexRepository,
} from "./features/search/action-index/repository";
export type { ActionIndexDocument } from "./features/search/action-index/repository";

export { REFUND_COPY } from "./_internal/shared/features/orders/refund-copy";
/*
 * 🛑 `wouldBeFullRefund` is deliberately NOT exported. I added it here, and
 * `audit-appkit-reexports` was right to refuse it: `_internal/shared/checkout/`
 * is not a `features/` module, so exporting it would have made a money
 * predicate public purely so one route could duplicate a decision
 * `processRefundAction` already makes — see the note on `ProcessRefundInput`.
 */
// Return / refund reasons — the closed enum the final-sale gate branches on.
// See the module docstring for why the exempt set is "seller or carrier fault"
// rather than "serious reasons".
export {
  RETURN_REASON,
  FINAL_SALE_EXEMPT_REASONS,
  RETURN_REASON_LABEL,
  RETURN_REASON_GROUP_LABEL,
  isFinalSaleExempt,
  isReturnReason,
  selectableReturnReasons,
} from "./_internal/shared/features/orders/return-reasons";
export type { ReturnReason } from "./_internal/shared/features/orders/return-reasons";

// Seller listing form draft <-> product write payload. The flat form keys and
// the nested document blocks are different shapes, and nothing translated
// between them — see the module docstring.
export {
  draftToProductInput,
  productToDraft,
} from "./features/seller/utils/product-draft-mapping";

// C5g/C5h/C5i — return custody, destination resolution and the abuse signal.
// Pure: no Firestore, no repository. The counters the abuse signal reads are
// PRE-COMPUTED by the daily job and passed in (Root Cause #104).
export {
  RETURN_CUSTODY_STATES,
  RETURN_CUSTODY_COPY,
  isTerminalCustody,
  canAdvanceCustody,
  nextCustodyState,
  custodyOwner,
  isActionableBy,
} from "./_internal/shared/features/returns/custody";
export type { ReturnCustodyState } from "./_internal/shared/features/returns/custody";
export {
  resolveReturnAddress,
  RTO_ENTRY_CUSTODY,
  rtoCostBearer,
  RETURN_ABUSE_SCAM_TYPES,
  RETURN_ABUSE_THRESHOLDS,
  returnAbuseSignals,
  enforcementFor,
} from "./_internal/shared/features/returns/destination";
export type {
  ReturnAddressResolution,
  ResolveReturnAddressInput,
  ReturnAbuseSignal,
  ReturnAbuseCounters,
  RtoCostBearer,
} from "./_internal/shared/features/returns/destination";

// C5f — courier ratings. Two numbers, never blended; see the module header.
export {
  COURIER_RATING_MIN_CONFIDENT_SAMPLES,
  courierRatingDisplay,
  isValidCourierVote,
  courierVoteId,
  rollUpCourierVotes,
} from "./_internal/shared/features/shipping/courier-rating";
export type {
  CourierRatingPair,
  CourierRatingDisplay,
  CourierRatingVote,
  CourierStats,
} from "./_internal/shared/features/shipping/courier-rating";

/*
 * The sticker-trace codec PORT. Exported because a consumer implements it —
 * functions/src/sticker-trace/sharp-codec.ts is the server half, and the
 * browser half is the client one. A port whose implementors cannot import it
 * is not a seam, and `_internal/*` is deliberately not an exported subpath.
 */
export type {
  ImageCodec,
  DecodeOptions,
  PreviewOptions,
  ProbeResult,
} from "./_internal/shared/features/sticker-trace/codec";
export type {
  DecodedRaster,
  EncodedImage,
  Rect as StickerRect,
} from "./_internal/shared/features/sticker-trace/types";

/*
 * The sticker-trace pipeline handlers. Exported because the Function bindings
 * in functions/src/ are their only callers and cannot reach `_internal/*`,
 * which is deliberately not an exported subpath — the same public-API case as
 * the ImageCodec port above.
 *
 * 🛑 Each *Deps interface ships WITH its handler. A caller that can import the
 * handler but not its dependency shape has to hand-write that object, and a
 * hand-written copy of a contract drifts from it (Root Cause #42, one layer up).
 */
export { runCoordinator, type CoordinatorDeps } from "./_internal/server/features/sticker-trace/coordinator";
export { runShard, type ShardDeps } from "./_internal/server/features/sticker-trace/shard";
export { runFinalizer, type FinalizerDeps } from "./_internal/server/features/sticker-trace/finalizer";

/*
 * The sticker-trace storage adapters the Function bindings inject.
 *
 * `writeRunArtifact` already matched the handlers' `writeArtifact` dependency
 * exactly, so there is no wrapper for it — a pass-through named differently
 * would be a second name for one thing, and the next reader would have to
 * check whether they differ.
 */
export {
  readScanBytes,
  readRunGeometry,
  writeRunArtifact,
  type RunGeometry,
} from "./_internal/server/features/sticker-trace/storage";

/*
 * The part rasteriser factory. Exported rather than the raw
 * `rasterizePathAlpha` because `ShardDeps.rasterise` is keyed on ORDINAL and
 * carries no path — the factory is what closes that gap, and handing a consumer
 * the primitive instead would make every binding re-invent the lookup.
 */
export { rasterisePartToBox } from "./_internal/shared/features/sticker-trace/math/rasterize-path";

/*
 * The sticker-trace ROUTE layer's server surface.
 *
 * 🛑 These go in the WIDE barrel, not in `./features/sticker-trace/server`.
 * That narrow entry exists because a Cloud Function cannot bundle this barrel
 * at all (it drags in react-server-dom-webpack and @vercel/og's wasm — Root
 * Cause #18, caught by tsup rather than by review). Next.js route handlers are
 * the opposite case: they already import this barrel, and adding them to the
 * narrow entry would widen exactly the thing the narrow entry exists to keep
 * small.
 *
 * Each from its DEFINING module. The run lifecycle lives in `actions.ts`, the
 * sheet lifecycle in `sheet-actions.ts`, and the projections in `adapters.ts`.
 */
export {
  startStickerTraceRun,
  retryStickerTraceRun,
  listStickerTraceRuns,
  type StartTraceRunInput,
  type RetryTraceRunInput,
  type RetryTraceRunResult,
  type TraceRunHandle,
  type TraceRunListRow,
} from "./_internal/server/features/sticker-trace/actions";
export {
  buildCutFileForRun,
  buildCutFileBytes,
} from "./_internal/server/features/sticker-trace/build-cut-file";
/*
 * The page-id and profile-id unions, so a route takes one without a cast.
 * Exported for the same reason the narrow Functions entry exports the page id:
 * a conditional type reconstructed at the call site compiles and is unreadable,
 * and an unreadable cast is how an invalid id eventually gets through.
 */
export type { PrintPageSizeId } from "./_internal/shared/features/sticker-trace/export/page-sizes";
export type { MachineProfileId } from "./_internal/shared/features/sticker-trace/export/machine-profiles";
export {
  promoteStickerTraceRun,
  isRunPromoted,
  type PromoteRunInput,
  type PromoteRunResult,
} from "./_internal/server/features/sticker-trace/promote";
export {
  createStickerSheet,
  attachStickerSheetScan,
  resolveStickerAssetUrl,
  measureStickerStorage,
  STICKER_ASSET_KINDS,
  STICKER_SHEET_MAX_BYTES,
  type StickerAssetKind,
  type SheetUsageRow,
  type StickerStorageUsage,
} from "./_internal/server/features/sticker-trace/sheet-actions";
/*
 * 🛑 A different module from `sheet-actions` on purpose. `promoteRun` there is
 * run → sheet (render the full-res parts); this is sheet → marketplace (create
 * the products). The names are close enough that keeping them in one file is
 * how someone calls the wrong one.
 */
export {
  promoteStickerSheetToListings,
  type PromoteToListingsInput,
  type PromoteToListingsResult,
} from "./_internal/server/features/sticker-trace/promote-to-listings";
export {
  toClientStickerSheet,
  toClientTraceRun,
  type ClientStickerSheet,
  type ClientTraceRun,
} from "./_internal/server/features/sticker-trace/adapters";

// The platform's statutory identity, injected at boot from appkit.config.js's
// `business` block via the consumer's providers.config.ts. See the module
// header for why the invoice path must not read it from siteSettings.
export {
  configurePlatformSupplier,
  getPlatformSupplier,
  resetPlatformSupplier,
} from "./_internal/shared/features/site-settings/supplier-of-record";
export type { PlatformSupplierIdentity } from "./_internal/shared/features/site-settings/supplier-of-record";

// Shiprocket carrier adapter. 🛑 NEVER exercised against the live API — the
// credentials are empty — so it parses every response through Zod and refuses
// at construction when unconfigured. See the module header.
export { ShiprocketShippingProvider } from "./providers/shipping-shiprocket/index";
export type { ShiprocketConfig } from "./providers/shipping-shiprocket/index";

/*
 * [SERVER-ONLY] grievance — Phase 10 intake and clock.
 *
 * 🛑 Intake and clock ONLY. Nothing is published: the Consumer Protection
 * (E-Commerce) Rules 2020 require a NAMED grievance officer and statutory
 * periods, and this project publishes the business name with designation
 * "Support" on the same generic support address (D17). The periods here are
 * internal defaults chosen SHORTER than any plausible statutory period, so the
 * clock fires early — a deadline we beat is harmless, one we miss is the thing
 * the regime punishes. The public page stays untouched until the owner supplies
 * the officer and the real numbers.
 */
export {
  fileGrievanceAction,
  recordGrievanceFirstResponseAction,
} from "./_internal/server/features/grievance";
export type { FileGrievanceInput } from "./_internal/server/features/grievance";
export { GRIEVANCE_PERIODS } from "./features/support/schemas/firestore";

/*
 * [SERVER-ONLY] order-completion — per-item ratings and the fast completion
 * path (owner's rule, 2026-10-21).
 *
 * Completion has two writers: `obligationSweep`'s `order-complete` at 7 days,
 * and the buyer marking it complete after rating at least one item. The second
 * is the "immediate disburse" path — and it needs no extra mechanism, because
 * `payout-release` is already blocked on `order-complete`, so closing that
 * obligation early opens the payout gate early as a consequence.
 */
export {
  getRateableItemsAction,
  rateOrderItemAction,
  markOrderCompleteAction,
} from "./_internal/server/features/order-completion";
export type {
  RateableOrderItem,
  RateOrderItemInput,
} from "./_internal/server/features/order-completion";
