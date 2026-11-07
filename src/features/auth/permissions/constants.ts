/**
 * Permission & Role-Based Access Control Constants
 *
 * Single source of truth for all Permission strings, EmployeeGroup presets,
 * PERMISSION_GROUPS bundles, and StoreCapability flags.
 *
 * Design: admin role bypasses all permission checks. employee role is gated
 * entirely by the permissions[] field on their UserDocument. Roles are convenience
 * bundles — individual employees can have custom overrides on top of their preset.
 *
 * Permission naming: admin:resource:action
 * Ban action naming: plain verb phrase — write_reviews, place_bids, etc.
 */

// ============================================================================
// PERMISSION TYPE
// ============================================================================

export type Permission =
  // Dashboard
  | "admin:dashboard:view"

  // Management — Users
  | "admin:users:read"
  | "admin:users:write"
  | "admin:users:delete"
  | "admin:user-bans:read"
  | "admin:user-bans:write"

  // Management — Products
  | "admin:products:read"
  | "admin:products:write"
  | "admin:products:delete"

  // Management — Orders & Returns
  | "admin:orders:read"
  | "admin:orders:write"
  /**
   * ── The order PAYMENT OVERRIDE — a money-path power with its own gate ──────
   *
   * Three actions in `_internal/server/features/orders/actions.ts` hang off
   * this and nothing else: `adminVerifyPaymentAction` (declares a manual
   * cash/UPI payment received, flips the order to `paid`/`processing`),
   * `adminRequestProofReuploadAction` (clears the proof and extends the payment
   * window) and `adminRejectPaymentAsFraudAction` (cancels the order, restores
   * stock, and enqueues a 7-day hard-ban cascade on the buyer's account).
   *
   * 🛑 Deliberately NOT `admin:orders:write`, and that is the whole decision.
   * `orders:write` names "edit an order" — fix an address, bump a status. None
   * of the three above is an edit: one asserts money arrived, one moves a
   * deadline, one bans a human being. Owner, 2026-11-08, choosing explicit
   * moderation permissions over the `moderator`→`employee` fold: an order
   * override is a money-path power and must not come bundled with editing a
   * review. Same reasoning as `admin:points:write` below.
   *
   * 🛑 Granted by the `payment_reviewer` preset ONLY, and that preset is in no
   * role bundle — so no account holds this because of a role, ever. An admin
   * bypasses the array entirely, which is what keeps "admin sees and does
   * everything" true without naming it here.
   */
  | "admin:orders:payment-override"
  | "admin:returns:read"
  | "admin:returns:write"

  // Management — Stores
  | "admin:stores:read"
  | "admin:stores:write"
  | "admin:store-addresses:read"

  // Management — unified address book (users + stores, SB-UNI-A)
  | "admin:addresses:read"
  | "admin:addresses:write"

  // Finance
  | "admin:analytics:view"
  | "admin:payouts:read"
  | "admin:payouts:write"

  // Audit log (read-only — entries are written only via recordAdminAction())
  | "admin:audit-log:read"

  // Catalog
  | "admin:categories:read"
  | "admin:categories:write"
  | "admin:categories:delete"
  /*
   * The two GENERATED reference databases. Separate from
   * `admin:categories:*` on purpose: a part or a bey row is built by a
   * committed generator from a crawled corpus, so the person trusted to
   * re-file a category is not automatically the person who should be
   * hand-correcting extracted specs. Granting them together is a choice an
   * operator can still make; conflating them removes the choice.
   */
  | "admin:parts:read"
  | "admin:parts:write"
  | "admin:parts:delete"
  | "admin:beys:read"
  | "admin:beys:write"
  | "admin:beys:delete"
  | "admin:brands:read"
  | "admin:brands:write"
  | "admin:brands:delete"
  | "admin:coupons:read"
  | "admin:coupons:write"
  | "admin:coupons:delete"
  | "admin:deals:read"
  | "admin:deals:write"
  | "admin:featured:read"
  | "admin:featured:write"

  // Content
  | "admin:reviews:read"
  | "admin:reviews:write"
  | "admin:reviews:delete"
  | "admin:blog:read"
  | "admin:blog:write"
  | "admin:blog:delete"
  | "admin:blog:publish"
  | "admin:bids:read"
  | "admin:bids:write"
  | "admin:offers:read"
  | "admin:offers:write"
  | "admin:media:read"
  | "admin:media:write"
  | "admin:media:delete"

  // Site / CMS
  | "admin:site:read"
  | "admin:site:write"
  | "admin:settings:write"
  | "admin:navigation:read"
  | "admin:navigation:write"
  | "admin:sections:read"
  | "admin:sections:write"
  | "admin:carousel:read"
  | "admin:carousel:write"
  | "admin:carousel:delete"
  | "admin:ads:read"
  | "admin:ads:write"
  | "admin:ads:delete"
  | "admin:faqs:read"
  | "admin:faqs:write"
  | "admin:faqs:delete"
  | "admin:tester-checklist:read"
  | "admin:tester-checklist:write"
  | "admin:tester-checklist:delete"
  | "admin:tester-feedback:read"
  | "admin:tester-feedback:write"
  | "admin:newsletter:read"
  | "admin:newsletter:write"
  | "admin:contact:read"
  /** Destructive/mutating contact-submission actions. Added 2026-08-29 —
   * `DELETE /api/admin/contact-submissions/[id]` declared `admin:contact:delete`,
   * which is not a member of this union and therefore could never be granted. */
  | "admin:contact:write"

  /*
   * ── Moderation — a GRANT, never a side effect of holding `employee` ────────
   *
   * `admin:moderation:read` gates the moderation hub, the reports queue, the
   * item-request queue, the Trust & Safety guide (`constants/navigation.tsx`)
   * and draw-entry oversight (seeing every entrant on a product/event draw
   * rather than only your own).
   *
   * 🛑 It used to be the one non-empty entry in `ROLE_PERMISSION_BUNDLES`,
   * handed to `employee` automatically. That was a consequence of collapsing
   * `moderator` into `employee` (A9), not a decision anyone made: every
   * existing employee account silently gained the moderation surfaces. Owner,
   * 2026-11-08: keep the fold, but gate moderation on an explicit permission,
   * so an employee can moderate only if GRANTED it.
   *
   * It is therefore granted by the moderation PRESETS below
   * (`content_moderator`, `review_manager`, `trust_and_safety`,
   * `scam_moderator`) and by per-person grants — never by a role.
   *
   * ⚠ Both keys were also ungrantable until 2026-11-08 for a second,
   * independent reason: the admin employee-permission editor renders
   * `PERMISSION_DOMAINS` × `getPermissionsForDomain()`, and that function
   * enumerates only permissions that appear in some `PERMISSION_GROUPS`
   * preset. A permission in no preset and no domain has no checkbox, which is
   * precisely why bundling it onto the role was the only way to hand it out.
   * Both gaps are closed below; neither may be reopened.
   */
  | "admin:moderation:read"
  /**
   * ACT on the moderation queue — flag a suspicious draw entry, resolve a
   * queued report.
   *
   * Added 2026-11-08 because `PATCH /api/lottery-entries/[id]/flag` was gated
   * a role tuple naming the dead `moderator` with no permission at all (the
   * literal is not quoted — `audit-permission-role-mismatch.mjs` matches such
   * a line textually and a comment reciting it keeps the audit red), so the
   * fold made
   * it reachable by every employee; and gating a WRITE on `:read` would be the
   * kind of near-miss that reads as correct for ever. Paired with `:read` the
   * way every other resource in this union is.
   */
  | "admin:moderation:write"
  | "admin:roles:read"

  /**
   * Skip OTP + payment when placing an order. Replaces
   * `siteSettings.featureFlags.adminCheckoutBypass`: a capability granted to a
   * person belongs in the permission system, not in a site-wide toggle that is
   * either on for every admin or off for all of them.
   *
   * Named `admin:checkout:bypass` rather than the bare `checkout:bypass` so it
   * matches the `admin:resource:action` convention every other member follows
   * and is picked up by PERMISSION_DOMAINS prefix matching.
   */
  | "admin:checkout:bypass"

  /**
   * Lets a `tester` reach `/admin/**` with real read/write access.
   *
   * Replaces the `canTestAdmin` boolean. Not a second role: the hierarchy is
   * linear, so there is no level meaning "seller-level, plus read admin" that
   * would not also outrank moderator and employee. Granted through the same
   * `permissions[]` array employees already use, so there is one grant
   * mechanism — and revoking it is a permission change, which the admin audit
   * log already records.
   */
  | "tester:admin-surfaces"

  // Events
  | "admin:events:read"
  | "admin:events:write"
  | "admin:events:delete"
  | "admin:event-entries:read"
  | "admin:event-entries:write"

  // Support Tickets
  | "admin:support-tickets:read"
  | "admin:support-tickets:write"

  // Procurement Shipments
  | "admin:shipments:read"
  | "admin:shipments:write"
  | "admin:catalogue:read"
  | "admin:catalogue:write"

  /*
   * Inventory — the box registry, placements and the move ledger.
   *
   * 🛑 Declared in BOTH places, which is why this comment is here. The plan
   * for this phase names it as a wiring step that fails silently: a permission
   * in the union but absent from the route map below leaves the PAGE ungated,
   * and one in the map but absent from the union does not typecheck at a
   * route. `audit-permission-role-mismatch` checks the pair.
   *
   * No separate ledger permission: a movement cannot be edited or deleted at
   * all (the repository throws), so the only write is an append — and anyone
   * who may move stock may record that they moved it.
   */
  | "admin:inventory:read"
  | "admin:inventory:write"

  /*
   * Grouped listings — the admin-authored "you might also like" theme
   * scroller. It had a working view, working API routes and NO permission of
   * its own until 2026-08-26 (W22), which is why it also had no nav entry:
   * `adminItem()` takes a permission and there was nothing to pass.
   *
   * Deliberately NOT folded into `admin:products:*`. A grouped listing is
   * catalogue curation, and a role that should arrange the storefront is not
   * necessarily one that should edit product records — collapsing the two
   * makes that distinction unexpressible.
   */
  | "admin:grouped-listings:read"
  | "admin:grouped-listings:write"
  | "admin:support-tickets:assign"
  | "admin:support-tickets:close"

  // Scam Registry
  | "admin:scammers:read"
  | "admin:scammers:write"
  | "admin:scammers:verify"
  | "admin:scammers:delete"

  // System (admin-only; never grant to employees via team UI)
  | "admin:sessions:read"
  | "admin:sessions:delete"
  | "admin:notifications:read"
  | "admin:notifications:write"
  | "admin:carts:read"
  | "admin:wishlists:read"
  | "admin:feature-flags:read"
  | "admin:feature-flags:write"
  | "admin:team:read"
  | "admin:team:write"

  // Maintenance & Observability (workstream 10) — gates the admin/maintenance/* pages.
  | "admin:maintenance:view-server-errors"
  | "admin:maintenance:view-client-errors"
  | "admin:maintenance:view-function-errors"
  | "admin:maintenance:view-cloud-logs"
  | "admin:maintenance:view-payment-rollbacks"
  | "admin:maintenance:run-analysis"
  | "admin:maintenance:purge-errors"
  | "admin:maintenance:view-gateway-events"
  | "admin:maintenance:view-obligations"
  | "admin:maintenance:view-cache"
  | "admin:maintenance:clear-cache"

  /*
   * Payment protection — the operator queues the money spine writes to.
   *
   * 🛑 These are NOT `admin:maintenance:*` and are NOT granted to
   * `maintenance_employee`, deliberately. A payment case can carry a gateway's
   * own `respond_by` and an `amountAtRisk`; a protection claim decides who
   * absorbs a real loss. Maintenance is "something broke, look when you can",
   * which is the wrong urgency and the wrong audience for both.
   *
   * Split read/write so a future analyst role can see the queue without being
   * able to close a case — closing one is what asserts a human understood it,
   * and `resolve()` refuses `resolvedBy: "system"` precisely to protect that.
   */
  | "admin:payment-cases:read"
  | "admin:payment-cases:write"
  | "admin:protection-claims:read"
  | "admin:protection-claims:write"
  /**
   * Credit or debit a buyer's points by hand.
   *
   * 🛑 WRITE ONLY, with no matching `:read`, and that asymmetry is deliberate:
   * a buyer's balance and ledger are already visible on the admin user detail
   * page under the permissions that get you there. What needs its own gate is
   * the act of CREATING SPENDABLE MONEY — 1 point = ₹1 against a future order,
   * so a credit is a liability the platform must honour.
   *
   * Granted to no employee bundle. `createRouteHandler` lets an effective admin
   * through without consulting the array at all, so this exists to be the thing
   * an employee bundle would have to name explicitly — and nothing names it.
   * Same reasoning as `admin:payment-cases:*`: a queue an analyst may read is
   * different from a decision that moves money.
   */
  | "admin:points:write";

// ============================================================================
// ROLES AS DATA — the role → permission bundles, and the role-count cap
// ============================================================================

/**
 * 🛑 THE cap on how many roles one user may hold — the DEFAULT, not the rule.
 *
 * Owner, 2026-11-07: *"they can have more than 3 in future, for now 3"*. So
 * the literal `3` appears exactly here and nowhere else: not in the schema,
 * not in the validator, not in the admin UI. Read it through
 * `getMaxRolesPerUser()` in `features/auth/auth-helpers`, which prefers a
 * configured override and falls back to this.
 *
 * Raising it must be a settings change, never a deploy — which is only true as
 * long as nobody restates the number.
 */
export const DEFAULT_MAX_ROLES_PER_USER = 3;

/**
 * ── Roles are bundles of permissions, and the bundles are DATA ───────────────
 *
 * `permissionsFor(user)` unions the bundle of every role the user holds with
 * the per-user `permissions[]` array. Editing this map is how a role gains or
 * loses a capability — no code change, no new branch anywhere.
 *
 * 🛑 EVERY bundle is EMPTY, and that is a decision, not an oversight:
 *
 *   - `admin` short-circuits to `isAdmin: true` and never consults a list, so
 *     an entry here would be dead weight. Admin sees everything, everywhere.
 *   - `user`, `seller` and `tester` hold no ADMIN-console permissions at all.
 *     Their abilities are ownership-scoped ("edit your own store", "bid on a
 *     listing"), enforced at the resource, not by an `admin:*` key.
 *   - `employee` is configured ENTIRELY per person through `permissions[]` +
 *     `PERMISSION_GROUPS`. Holding the role grants nothing on its own.
 *
 * ── 🛑 THE DEFAULT GRANT FOR MODERATION IS: **NOT GRANTED** ─────────────────
 *
 * `employee` used to carry `admin:moderation:read` here, and that single entry
 * was the whole problem. Collapsing `moderator` into `employee` (A9, owner
 * 2026-11-07) made `isModeratorUser()` true for every employee, so ~20
 * moderator-gated actions — order payment overrides, review and product
 * moderation, support tickets, draw-entry oversight — widened to every
 * existing employee account as a side effect of a role rename. Nobody decided
 * that; it fell out of the fold.
 *
 * Owner, 2026-11-08, asked to choose: **keep the fold, and gate those sites on
 * an explicit moderation permission.** So the fold stays (`moderator` is not
 * coming back as a role — `rolesOf()` folds the name away on read), and the
 * power becomes a GRANT:
 *
 *   employee WITHOUT the grant  → denied every moderation site.
 *   employee WITH the grant     → allowed exactly what was granted.
 *   admin                       → allowed unconditionally, never consults this.
 *   user / seller / tester      → gain nothing; `permissions[]` is not even
 *                                 honoured for seller/user (see
 *                                 `ROLE_GRANTS_EXPLICIT_PERMISSIONS`).
 *
 * ⚠ Do not "fix" a moderation surface by adding a key back to the `employee`
 * bundle. That reinstates exactly the widening the owner rejected, and it does
 * it silently. Grant it to the person, or add it to a preset below.
 */
export const ROLE_PERMISSION_BUNDLES: Record<string, Permission[]> = {
  admin: [],
  employee: [],
  /*
   * Legacy alias. `rolesOf()` folds `moderator` to `employee`, so a normalised
   * role set never contains it and this entry is never read — it exists so the
   * map stays total against the `UserRole` union while the union still carries
   * the deprecated member for un-backfilled documents. Empty for the same
   * reason `employee` is: a stored `moderator` document must not out-grant a
   * backfilled one.
   */
  moderator: [],
  seller: [],
  tester: [],
  user: [],
};

/**
 * Which roles have their per-user `permissions[]` array HONOURED on top of
 * their bundle.
 *
 * 🛑 This is a security boundary expressed as data, and it exists so
 * `permissionsFor()` does not have to ask "what role is this?".
 *
 * Why it is not simply "always honour the array": `permissions[]` is written
 * by the admin team UI for employees. A stray `admin:users:write` sitting on a
 * SELLER document — a leftover from a demotion, a bad import, a bulk edit —
 * would otherwise become live admin access the moment the resolver started
 * unioning. The previous resolver returned `[]` for every non-employee role,
 * so honouring the array unconditionally would have been a silent widening
 * dressed up as a refactor.
 *
 * `tester` is included because `tester:admin-surfaces` is granted through this
 * very array (see `canTestAdminSurfaces`) — that is the one non-employee role
 * whose fine-grained grants are real.
 */
export const ROLE_GRANTS_EXPLICIT_PERMISSIONS: Record<string, boolean> = {
  admin: true, // moot — admin short-circuits before the array is read
  employee: true,
  moderator: true, // legacy alias of employee; never present after folding
  tester: true,
  seller: false,
  user: false,
};

// ============================================================================
// BANNED ACTION TYPE
// ============================================================================

/**
 * Granular user actions that can be soft-banned individually.
 * A user may have multiple simultaneous soft bans of different types.
 * Hard ban (disabled: true) overrides all of these.
 */
export type BannedAction =
  | "write_reviews" // cannot submit product reviews
  | "write_blog_comments" // cannot comment on blog posts (future)
  | "join_events" // cannot register for events/tournaments
  | "place_bids" // cannot bid on collectorDrops
  | "create_listings" // seller cannot create new listings
  | "send_messages" // cannot send direct messages
  | "create_support_tickets" // cannot open new support tickets
  | "report_scammers"; // cannot submit scam reports

// ============================================================================
// EMPLOYEE GROUP TYPE
// ============================================================================

/**
 * Preset permission bundles. "custom" = no preset, permissions set individually.
 * Used for display and for pre-filling the permissions editor when inviting employees.
 */
export type EmployeeGroup =
  | "content_moderator"
  | "review_manager"
  | "blog_poster"
  | "community_manager"
  | "event_handler"
  | "newsletter_manager"
  | "seo_manager"
  | "ad_manager"
  | "site_manager"
  | "catalog_manager"
  | "finance_manager"
  | "data_analyst"
  | "customer_support"
  | "support_agent"
  | "store_onboarding"
  | "trust_and_safety"
  /**
   * The ONLY preset that carries `admin:orders:payment-override`.
   *
   * Narrow on purpose — dashboard, read orders, override a payment, nothing
   * else. It exists so the money-path power is grantable from the admin UI
   * (`getPermissionsForDomain` only lists permissions some preset names) while
   * staying out of every broader bundle: `trust_and_safety` and
   * `customer_support` both touch orders and deliberately do NOT hold it.
   */
  | "payment_reviewer"
  | "collector_drop_monitor"
  | "scam_moderator"
  | "maintenance_employee"
  | "custom";

// ============================================================================
// PERMISSION GROUP PRESETS
// ============================================================================

/**
 * Pre-defined permission bundles for each EmployeeGroup.
 * Admin always bypasses; these bundles are only relevant for role=employee.
 */
export const PERMISSION_GROUPS: Record<
  Exclude<EmployeeGroup, "custom">,
  Permission[]
> = {
  content_moderator: [
    "admin:dashboard:view",
    /*
     * The moderation hub itself. Named by the four moderation presets and by
     * nothing else — it is no longer in any ROLE bundle, so "make this person
     * a content moderator" is now the act that grants it.
     */
    "admin:moderation:read",
    "admin:moderation:write",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:products:read",
    "admin:users:read",
    "admin:blog:read",
  ],

  review_manager: [
    "admin:dashboard:view",
    "admin:moderation:read",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:products:read",
    "admin:users:read",
  ],

  blog_poster: [
    "admin:dashboard:view",
    "admin:blog:read",
    "admin:blog:write",
    // NOT blog:delete or blog:publish — junior writer only
    "admin:media:read",
    "admin:media:write",
  ],

  community_manager: [
    "admin:dashboard:view",
    "admin:events:read",
    "admin:events:write",
    "admin:events:delete",
    "admin:event-entries:read",
    "admin:event-entries:write",
    "admin:blog:read",
    "admin:blog:write",
    "admin:blog:publish",
    "admin:reviews:read",
    "admin:notifications:read",
    "admin:notifications:write",
    "admin:newsletter:read",
    "admin:newsletter:write",
    "admin:media:read",
    "admin:media:write",
  ],

  event_handler: [
    "admin:dashboard:view",
    "admin:events:read",
    "admin:events:write",
    "admin:events:delete",
    "admin:event-entries:read",
    "admin:event-entries:write",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  newsletter_manager: [
    "admin:dashboard:view",
    "admin:newsletter:read",
    "admin:newsletter:write",
    "admin:contact:read",
    "admin:users:read",
  ],

  seo_manager: [
    "admin:dashboard:view",
    "admin:faqs:read",
    "admin:faqs:write",
    "admin:faqs:delete",
    "admin:blog:read",
    "admin:blog:write",
    "admin:blog:publish",
    "admin:navigation:read",
    "admin:navigation:write",
    "admin:sections:read",
    "admin:sections:write",
    "admin:site:read",
  ],

  ad_manager: [
    "admin:dashboard:view",
    "admin:ads:read",
    "admin:ads:write",
    "admin:ads:delete",
    "admin:carousel:read",
    "admin:carousel:write",
    "admin:carousel:delete",
    "admin:deals:read",
    "admin:deals:write",
    "admin:featured:read",
    "admin:featured:write",
    "admin:sections:read",
    "admin:sections:write",
  ],

  site_manager: [
    "admin:dashboard:view",
    "admin:site:read",
    "admin:site:write",
    "admin:settings:write",
    "admin:navigation:read",
    "admin:navigation:write",
    "admin:sections:read",
    "admin:sections:write",
    "admin:carousel:read",
    "admin:carousel:write",
    "admin:faqs:read",
    "admin:faqs:write",
    "admin:media:read",
    "admin:media:write",
  ],

  catalog_manager: [
    "admin:dashboard:view",
    "admin:grouped-listings:read",
    "admin:grouped-listings:write",
    "admin:categories:read",
    "admin:categories:write",
    "admin:categories:delete",
    "admin:parts:read",
    "admin:parts:write",
    "admin:parts:delete",
    "admin:beys:read",
    "admin:beys:write",
    "admin:beys:delete",
    "admin:brands:read",
    "admin:brands:write",
    "admin:brands:delete",
    "admin:products:read",
    "admin:products:write",
    "admin:media:read",
    "admin:media:write",
    "admin:deals:read",
    "admin:deals:write",
    "admin:featured:read",
    "admin:featured:write",
  ],

  finance_manager: [
    "admin:dashboard:view",
    "admin:analytics:view",
    "admin:payouts:read",
    "admin:payouts:write",
    "admin:orders:read",
    "admin:returns:read",
    "admin:audit-log:read",
  ],

  data_analyst: [
    "admin:dashboard:view",
    "admin:analytics:view",
    "admin:orders:read",
    "admin:payouts:read",
    "admin:products:read",
    "admin:users:read",
    "admin:reviews:read",
    "admin:carts:read",
    "admin:wishlists:read",
    "admin:bids:read",
    "admin:offers:read",
  ],

  customer_support: [
    "admin:dashboard:view",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:assign",
    "admin:support-tickets:close",
    "admin:orders:read",
    "admin:orders:write",
    "admin:returns:read",
    "admin:returns:write",
    "admin:users:read",
    "admin:contact:read",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  support_agent: [
    "admin:dashboard:view",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:assign",
    "admin:support-tickets:close",
    "admin:orders:read",
    "admin:returns:read",
    "admin:users:read",
    "admin:contact:read",
    "admin:notifications:read",
    "admin:notifications:write",
  ],

  store_onboarding: [
    "admin:dashboard:view",
    "admin:stores:read",
    "admin:stores:write",
    "admin:store-addresses:read",
    "admin:users:read",
    "admin:notifications:write",
  ],

  /*
   * 🛑 `admin:orders:payment-override` is deliberately ABSENT here, even
   * though this preset holds `admin:orders:read` and the fraud-rejection path
   * is arguably trust-and-safety work. Verifying that money arrived is a
   * finance decision, not a safety one, and the three override actions are one
   * permission — granting the ban half would grant the "declare this payment
   * received" half with it. Use `payment_reviewer` alongside this preset when
   * one person genuinely does both.
   */
  trust_and_safety: [
    "admin:dashboard:view",
    "admin:moderation:read",
    "admin:moderation:write",
    "admin:users:read",
    "admin:users:write",
    "admin:user-bans:read",
    "admin:user-bans:write",
    "admin:orders:read",
    "admin:products:read",
    "admin:products:write",
    /*
     * ⚠ Added 2026-11-08 by the lane that gated `DELETE /api/products/[id]` on
     * this key, because `verify-moderation-permissions.mjs` caught that
     * `admin:products:delete` appeared in NO preset — so it matched no
     * `getPermissionsForDomain()` result, had no checkbox in the employee
     * editor, and was therefore declarable in code and ungrantable in the UI.
     * Same latent defect as `admin:moderation:read` had, and the same reason a
     * permission ends up bolted onto a role instead.
     *
     * `trust_and_safety` and not `catalog_manager`: taking down a counterfeit
     * or illegal listing is a safety act. Curating the catalogue is not a
     * mandate to archive someone else's listing.
     */
    "admin:products:delete",
    "admin:reviews:read",
    "admin:reviews:write",
    "admin:reviews:delete",
    "admin:bids:read",
    "admin:bids:write",
    "admin:offers:read",
    "admin:offers:write",
    "admin:sessions:read",
    "admin:sessions:delete",
    "admin:carts:read",
    "admin:support-tickets:read",
    "admin:support-tickets:write",
    "admin:support-tickets:close",
    "admin:scammers:read",
    "admin:scammers:write",
    "admin:scammers:verify",
  ],

  collector_drop_monitor: [
    "admin:dashboard:view",
    "admin:bids:read",
    "admin:bids:write",
    "admin:offers:read",
    "admin:offers:write",
    "admin:products:read",
    "admin:orders:read",
    "admin:users:read",
    "admin:notifications:write",
  ],

  scam_moderator: [
    "admin:dashboard:view",
    "admin:moderation:read",
    "admin:moderation:write",
    "admin:scammers:read",
    "admin:scammers:write",
    "admin:scammers:verify",
    "admin:scammers:delete",
    "admin:users:read",
    "admin:media:read",
    "admin:media:write",
  ],

  /*
   * ── The money-path override, in one narrow preset ─────────────────────────
   *
   * `admin:orders:payment-override` appears HERE AND NOWHERE ELSE: not in
   * `ROLE_PERMISSION_BUNDLES` (so no role confers it), not in
   * `trust_and_safety`, not in `customer_support`. Picking this preset, or
   * ticking the single checkbox it makes visible, is the only way a non-admin
   * ever gets to declare a manual payment received, extend a payment window,
   * or reject a proof as fraud (which cancels the order and enqueues a 7-day
   * hard ban).
   *
   * `admin:orders:read` rides with it because reviewing a proof without being
   * able to open the order is not a usable grant — but note there is no
   * `admin:orders:write`: this preset cannot edit orders, only decide payments.
   */
  payment_reviewer: [
    "admin:dashboard:view",
    "admin:orders:read",
    "admin:orders:payment-override",
  ],

  maintenance_employee: [
    "admin:dashboard:view",
    "admin:maintenance:view-server-errors",
    "admin:maintenance:view-client-errors",
    "admin:maintenance:view-function-errors",
    "admin:maintenance:view-cloud-logs",
    "admin:maintenance:view-payment-rollbacks",
    "admin:maintenance:run-analysis",
    /*
     * The two new diagnostics surfaces DO belong to this role — a stuck
     * gateway event and an overdue obligation are exactly what a maintenance
     * employee should be able to look at.
     *
     * 🛑 `admin:payment-cases:*` and `admin:protection-claims:*` deliberately
     * are NOT here. Those decide money and carry external deadlines.
     */
    "admin:maintenance:view-gateway-events",
    "admin:maintenance:view-obligations",
    /*
     * View-only. `clear-cache` is deliberately NOT granted here — same
     * exclusion as `purge-errors`, which this role also lacks. Wiping a
     * repository's cache site-wide is a blunter action than looking at one;
     * admin role bypasses this map entirely when it's actually needed.
     */
    "admin:maintenance:view-cache",
  ],
} as const;

// ============================================================================
// ROUTE → PERMISSION MAP
// ============================================================================

/**
 * Maps each /admin/[section] pathname prefix to the permission required to READ it.
 * Write/delete operations use the corresponding write/delete permission at the API level.
 * Admin role bypasses this map entirely.
 */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  "/admin/dashboard": "admin:dashboard:view",
  "/admin/users": "admin:users:read",
  "/admin/products": "admin:products:read",
  "/admin/orders": "admin:orders:read",
  "/admin/return-requests": "admin:returns:read",
  "/admin/stores": "admin:stores:read",
  "/admin/store-addresses": "admin:store-addresses:read",
  "/admin/analytics": "admin:analytics:view",
  "/admin/payouts": "admin:payouts:read",
  "/admin/audit-log": "admin:audit-log:read",
  "/admin/shipments": "admin:shipments:read",
  "/admin/inventory": "admin:inventory:read",
  "/admin/inventory/boxes": "admin:inventory:read",
  "/admin/inventory/movements": "admin:inventory:read",
  "/admin/catalogue-approvals": "admin:catalogue:read",
  "/admin/grouped-listings": "admin:grouped-listings:read",
  "/admin/categories": "admin:categories:read",
  "/admin/parts": "admin:parts:read",
  "/admin/beys": "admin:beys:read",
  "/admin/brands": "admin:brands:read",
  "/admin/coupons": "admin:coupons:read",
  "/admin/deals": "admin:deals:read",
  "/admin/featured": "admin:featured:read",
  "/admin/reviews": "admin:reviews:read",
  "/admin/blog": "admin:blog:read",
  "/admin/bids": "admin:bids:read",
  "/admin/offers": "admin:offers:read",
  "/admin/media": "admin:media:read",
  "/admin/site": "admin:site:read",
  "/admin/settings": "admin:settings:write",
  "/admin/navigation": "admin:navigation:read",
  "/admin/sections": "admin:sections:read",
  "/admin/carousel": "admin:carousel:read",
  "/admin/ads": "admin:ads:read",
  "/admin/faqs": "admin:faqs:read",
  "/admin/newsletter": "admin:newsletter:read",
  "/admin/contact": "admin:contact:read",
  "/admin/events": "admin:events:read",
  "/admin/event-entries": "admin:event-entries:read",
  "/admin/support-tickets": "admin:support-tickets:read",
  "/admin/scammers": "admin:scammers:read",
  // System — rarely granted to employees
  "/admin/sessions": "admin:sessions:read",
  "/admin/notifications": "admin:notifications:read",
  "/admin/carts": "admin:carts:read",
  "/admin/wishlists": "admin:wishlists:read",
  "/admin/feature-flags": "admin:feature-flags:read",
  "/admin/team": "admin:team:read",
  // Maintenance & Observability (workstream 10)
  "/admin/maintenance": "admin:maintenance:view-server-errors",
  "/admin/maintenance/server-errors": "admin:maintenance:view-server-errors",
  "/admin/maintenance/client-errors": "admin:maintenance:view-client-errors",
  "/admin/maintenance/function-errors": "admin:maintenance:view-function-errors",
  "/admin/maintenance/cloud-logs": "admin:maintenance:view-cloud-logs",
  "/admin/maintenance/payment-rollbacks": "admin:maintenance:view-payment-rollbacks",
  "/admin/maintenance/analysis": "admin:maintenance:run-analysis",
  "/admin/maintenance/gateway-events": "admin:maintenance:view-gateway-events",
  "/admin/maintenance/obligations": "admin:maintenance:view-obligations",
  // Payment protection — admin-only, see the permission union's own 🛑 note.
  "/admin/money-cases": "admin:payment-cases:read",
  "/admin/protection-claims": "admin:protection-claims:read",
  /*
   * Phase 7 invoicing — the GSTR-1 draft export.
   *
   * 🛑 `settings:write` rather than a new permission, and that is a judgement
   * worth stating. The page exports the company's tax position for a quarter
   * plus every buyer's place of supply; the set of people who should see that
   * is the set who can already change the GSTIN and the fee schedule, which is
   * exactly what `settings:write` names. Minting
   * `admin:invoicing:read` would add a permission with one route and one
   * holder — a distinction with no decision behind it, which is how a
   * permission union becomes unreadable.
   */
  "/admin/invoicing": "admin:settings:write",
};

// ============================================================================
// STORE CAPABILITY TYPE
// ============================================================================

/**
 * Per-store feature flags stored as capabilities[] on StoreDocument.
 * Managed by admin via AdminStoreEditorView.
 * Checked server-side on store API routes — client check is UX only.
 *
 * Defaults on store creation: ["suggest_brands", "create_coupons"]
 */
export type StoreCapability =
  // Listing & Catalog
  | "advanced_listing_types" // can create the seven advanced listing types (see _internal/shared/listing-types/tiers.ts)
  /*
   * 🛑 `host_collector_drops` no longer gates anything. `collector drop` is a BASIC listing
   * type as of the advanced-types split, so the check was removed rather than
   * inverted. The string stays declared so existing store documents carrying
   * it remain valid against `storeFirestoreSchema` — removing a union member
   * would make every such document fail validation on its next write.
   */
  | "host_collector_drops" // legacy, no longer checked — collector drop is basic
  | "host_preorders" // legacy per-type grant; still honoured for pre-order
  | "create_categories" // can request new categories (goes to admin)
  | "suggest_brands" // can suggest new brands (default on)
  | "create_coupons" // can create store-level coupons (default on)
  | "bulk_listing_import" // can bulk-import products via CSV
  | "extended_return_window" // can offer 30-day returns (platform default: 7 days)

  // Trust & Visibility
  | "verified_seller" // shows Verified badge on store + products
  | "featured_placement" // eligible for featured store sections
  | "promotional_banner" // banner usable in carousel/promotional sections
  | "priority_support" // dedicated support queue

  // Platform & Technical
  | "multiple_stores" // owner can create more than one store
  | "custom_store_slug" // can change store slug after 7-day lock period
  | "api_access" // programmatic API credentials (future)
  | "lower_commission_rate" // negotiated reduced platform fee; requires customCommissionRate
  | "early_access_features" // beta features before GA
  | "advanced_analytics" // cohort/basket analysis beyond summary stats

  // Integrations
  | "whatsapp_catalog_sync"; // can sync store products to their WhatsApp Business Catalog (admin-granted)

/**
 * Every capability, as a runtime value.
 *
 * 🛑 `Record<StoreCapability, true>` rather than a plain array, for the same
 * reason `ALL_LISTING_TYPES_MAP` is: adding a member to the union without
 * adding it here is then a COMPILE error, not a silent omission. This is what
 * lets `capabilities` be validated as a `z.enum` instead of
 * `z.array(z.string())` — which accepted any string, so a typo'd capability
 * saved successfully and the gate it was meant to open never opened, silently.
 *
 * It also backs the admin editor's grouping, so a new capability cannot be
 * granted in code and remain unreachable from the admin UI.
 */
const STORE_CAPABILITY_MAP: Record<StoreCapability, true> = {
  advanced_listing_types: true,
  host_collector_drops: true,
  host_preorders: true,
  create_categories: true,
  suggest_brands: true,
  create_coupons: true,
  bulk_listing_import: true,
  extended_return_window: true,
  verified_seller: true,
  featured_placement: true,
  promotional_banner: true,
  priority_support: true,
  multiple_stores: true,
  custom_store_slug: true,
  api_access: true,
  lower_commission_rate: true,
  early_access_features: true,
  advanced_analytics: true,
  whatsapp_catalog_sync: true,
};

export const ALL_STORE_CAPABILITIES = Object.keys(
  STORE_CAPABILITY_MAP,
) as StoreCapability[];

/** Narrow an untrusted string to a real capability. */
export function isStoreCapability(value: unknown): value is StoreCapability {
  return typeof value === "string" && value in STORE_CAPABILITY_MAP;
}

/**
 * Default capabilities granted to every new store on creation.
 *
 * 🛑 THE one definition. `AdminStoreEditorView` hardcoded its own copy, which
 * is also the `??` fallback on its load path — so the two could disagree about
 * what a store with no `capabilities` field is entitled to, and the admin
 * editor's copy is the one that gets SAVED BACK. Import this; never restate it.
 */
export const DEFAULT_STORE_CAPABILITIES: StoreCapability[] = [
  "suggest_brands",
  "create_coupons",
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check whether a permission array includes a required permission.
 * Use server-side only — never trust client-supplied permission arrays.
 */
export function hasPermission(
  permissions: Permission[],
  required: Permission,
): boolean {
  return permissions.includes(required);
}

/**
 * Check whether a permission array includes ANY of the required permissions.
 */
export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.some((p) => permissions.includes(p));
}

/**
 * Check whether a permission array includes ALL of the required permissions.
 */
export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[],
): boolean {
  return required.every((p) => permissions.includes(p));
}

/**
 * Check whether a store's capabilities include a specific capability.
 */
export function hasCapability(
  capabilities: StoreCapability[],
  required: StoreCapability,
): boolean {
  return capabilities.includes(required);
}

/**
 * Resolve a store's stored `capabilities` array to its effective set.
 *
 * 🛑 The PURE half of `getStoreCapabilities`, extracted so a caller that
 * already holds the store document does not pay a second Firestore read to ask
 * what it is entitled to (Rule #6). Three WhatsApp routes were reading
 * `store.capabilities ?? []` inline for exactly that reason, which made them a
 * second, divergent reader of the field — they skipped the default merge, so
 * they and `getStoreCapabilities` could disagree about the same store.
 *
 * Note the empty-array case falls back to the defaults, matching
 * `getStoreCapabilities`' long-standing `raw.length > 0` test. That is
 * arguably the wrong call — an admin who deliberately unticks everything gets
 * the defaults handed back — but it is the established behaviour and changing
 * it would silently re-grant capabilities on stores that had them removed.
 */
export function resolveStoreCapabilities(
  raw: readonly string[] | null | undefined,
): StoreCapability[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as StoreCapability[];
  return [...DEFAULT_STORE_CAPABILITIES];
}

// ============================================================================
// PERMISSION DOMAINS — display grouping (S-ADMIN-7, 2026-08-19)
// ============================================================================

/**
 * Groups permission prefixes into human-labeled domains for display —
 * used by the employee-permission editor and the read-only permissions
 * catalog page. `prefix` may hold multiple `|`-separated prefixes when a
 * domain spans more than one resource namespace.
 */
export const PERMISSION_DOMAINS: { label: string; prefix: string }[] = [
  { label: "Dashboard", prefix: "admin:dashboard:" },
  { label: "Users & Bans", prefix: "admin:users:|admin:user-bans:" },
  { label: "Products", prefix: "admin:products:" },
  // Offers sit with Orders, not with Content where Bids live: an offer is a
  // commerce-pipeline object that ends in an order, and the permissions
  // catalogue should group it where an operator would look for it.
  { label: "Orders & Returns", prefix: "admin:orders:|admin:returns:|admin:offers:" },
  { label: "Stores", prefix: "admin:stores:|admin:store-addresses:" },
  { label: "Finance", prefix: "admin:analytics:|admin:payouts:" },
  {
    label: "Catalog",
    prefix:
      "admin:categories:|admin:parts:|admin:beys:|admin:brands:|admin:coupons:|admin:deals:|admin:featured:",
  },
  {
    label: "Content",
    prefix: "admin:reviews:|admin:blog:|admin:bids:|admin:media:",
  },
  {
    label: "Site / CMS",
    prefix: "admin:site:|admin:navigation:|admin:sections:|admin:carousel:|admin:ads:|admin:faqs:|admin:newsletter:|admin:contact:",
  },
  { label: "Events", prefix: "admin:events:|admin:event-entries:" },
  { label: "Support & Safety", prefix: "admin:support-tickets:|admin:scammers:" },
  /*
   * 🛑 Moderation had NO domain until 2026-11-08, so `admin:moderation:read`
   * and `admin:roles:read` had no checkbox in the employee-permission editor
   * and no row in the permissions catalogue — they were declarable in code and
   * ungrantable in the UI. That is the reason the moderation key was bolted
   * onto the `employee` role bundle instead, which is the widening this lane
   * exists to undo. The domain must stay, or the grant becomes unreachable and
   * someone will "fix" it by bundling it onto the role again.
   */
  { label: "Moderation", prefix: "admin:moderation:|admin:roles:" },
];

/** True when `perm` starts with any of the `|`-separated prefixes in `prefix`. */
export function matchesDomain(perm: string, prefix: string): boolean {
  return prefix.split("|").some((p) => perm.startsWith(p));
}

/** Every distinct permission (across all PERMISSION_GROUPS presets) belonging to a domain. */
export function getPermissionsForDomain(prefix: string): Permission[] {
  const allPerms = Object.values(PERMISSION_GROUPS).flat();
  const seen = new Set<string>();
  const result: Permission[] = [];
  for (const p of allPerms) {
    if (matchesDomain(p, prefix) && !seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }
  return result;
}

/** "admin:orders:mark-shipped" -> "Mark Shipped" */
export function formatPermLabel(perm: string): string {
  const parts = perm.split(":");
  return parts[parts.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
