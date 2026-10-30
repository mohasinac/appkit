#!/usr/bin/env node
/**
 * migrate-collector-drop-rename — drain every PRE-RENAME spelling of the
 * payment-aggregator-optics renames out of Firestore.
 *
 * Two sub-migrations now live here, 18 tasks in total:
 *
 *   B (2026-10-30) `auction` -> `collector-drop`, 15 tasks.
 *   C (2026-10-31) the three chance-based `EventType` values — `raffle` ->
 *     `giveaway`, `spin_wheel` -> `bonus-spin`, `lottery` -> `random-draw` —
 *     3 tasks (`events`, `claimedCoupons`, `homepageSections`). See the
 *     § SUB-MIGRATION C banner in TASKS for the three same-word things that
 *     are deliberately NOT migrated.
 *
 * One script rather than two because the mechanics are identical and a second
 * runner is a second set of credential handling, batching and dry-run
 * defaults to get right. `--only` restricts to named tasks either way.
 *
 * ── WHY THIS IS A SIBLING OF migrate-listing-type-value.mjs, NOT A FLAG ────
 *
 * `migrate-listing-type-value.mjs --from auction --to collector-drop` moves
 * exactly one scalar on one collection. The collector-drop rename is wider
 * than that in three ways it cannot express:
 *
 *   1. **FIELD renames**, not value renames. `auctionEndDate` ->
 *      `collectorDropEndDate` means read the old key, write the new one, and
 *      `FieldValue.delete()` the old — three operations the value script has
 *      no concept of.
 *   2. **NESTED and ARRAY** positions. `orders.sourceContext.path`,
 *      `orders.items[].listingType`, `carts.items[].isAuctionWin`,
 *      `categories.metrics.auctionCount`, `stores.capabilities[]`. An array
 *      cannot be patched element-wise; the whole array is rewritten.
 *   3. **MAP KEYS** that are listingType values. `categoryCounts.own.auction`
 *      and `priceIndex.sold.byPath.auction` are keys, not values.
 *
 * A half-finished rename here is worse than none: a stored value matching no
 * query is as good as absent (Root Cause #58), and a Firestore equality is
 * byte-exact, so a row left on `"auction"` disappears from its own tab with
 * no error anywhere (Root Cause #33).
 *
 * ── WHAT THE CODE SIDE ALREADY TOLERATES, AND WHAT IT DOES NOT ─────────────
 *
 * Read-side back-compat aliases exist for `listingType` (`normalizeListingType`,
 * `LISTING_KIND_ALIAS_MAP`, `collector-drop/schema.ts`), `sourceContext.path`
 * (`priceIndexRollup`), the slug prefix (`LEGACY_SLUG_PREFIXES["auction-"]`)
 * and `productType` (the `"auction"` member kept on `HistoryProductType` /
 * `UserWishlistItem.productType` / the guest-wishlist `type` union).
 *
 * 🛑 There is deliberately NO alias for these, so they NEED this script:
 *   - `orders.orderType` — `ORDER_LANE_LABELS` is a `Record<OrderType,string>`
 *     and a legacy member would add a tab matching zero rows, which is the
 *     defect `audit-filter-tab-enums` exists to catch. Same precedent as the
 *     `prize-draw` -> `random-lots` orderType rename, which also kept none.
 *   - `notifications.type` — four compile-checked `Record<NotificationType,…>`
 *     maps plus a derived filter-chip list; a legacy member is a dead chip.
 *   - `supportTickets.category`, `users.permissionGroup`,
 *     `stores.capabilities[]` — same shape, same reason.
 *   - every FIELD rename in § PRODUCTS / ORDERS / CARTS / CATEGORIES /
 *     COUPONS below. A renamed field simply is not read under its old name.
 *
 * ── SAFE TO RUN ON THIS PROJECT ────────────────────────────────────────────
 *
 * Pre-launch: no real users, no real orders, no real money
 * (`project_never_went_live`). Every operation is additive-then-delete on a
 * single document, batched, and idempotent — a second run finds zero rows.
 *
 * Talks directly to Firestore via firebase-admin — no dev server, no deploy.
 *
 * Usage (from the CONSUMER project root, e.g. d:/proj/letitrip.in):
 *   node appkit/scripts/migrate-collector-drop-rename.mjs                       # DRY RUN (default)
 *   node appkit/scripts/migrate-collector-drop-rename.mjs --only products,orders
 *   node appkit/scripts/migrate-collector-drop-rename.mjs --yes
 *   node appkit/scripts/migrate-collector-drop-rename.mjs --yes --service-account <key.json>
 *
 * 🛑 DRY RUN IS THE DEFAULT. `--yes` is the only thing that writes; there is
 * no `--dry-run` flag to forget. `--only <a,b,c>` restricts to named tasks and
 * the summary NAMES what it skipped, so a filtered run can never be mistaken
 * for a whole one.
 *
 * Exit: 0 = success, 1 = errors during run, 2 = misconfiguration.
 *
 * @tag domain:products,orders,cart,categories,promotions,notifications,support,auth,stores,events,homepage
 * @tag layer:script
 * @tag access:node-only
 * @tag sideEffects:firestore-write
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = rawArgs.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = rawArgs[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const SERVICE_ACCOUNT_OVERRIDE =
  typeof flag("service-account") === "string" ? flag("service-account") : null;
const CONFIRMED = flag("yes", false) === true;
const DRY_RUN = !CONFIRMED;
const ONLY = typeof flag("only") === "string" ? flag("only").split(",").map((s) => s.trim()).filter(Boolean) : null;

/*
 * Every task's name, declared here as well as on the task itself, SOLELY so a
 * `--only` typo is caught before credentials are touched. A misspelled task
 * name that reached the run loop would simply select nothing and report a
 * clean zero — a filtered run reading as a passing one (Rule #11.4).
 */
const TASK_NAMES = [
  "products", "orders", "carts", "bids", "categories", "categoryCounts",
  "priceIndex", "coupons", "notifications", "supportTickets", "users",
  "stores", "history", "wishlists", "siteSettings",
  // Sub-migration C (2026-10-31) — the three chance-based EventType values.
  "events", "claimedCoupons", "homepageSections",
];
if (ONLY) {
  const unknown = ONLY.filter((n) => !TASK_NAMES.includes(n));
  if (unknown.length) {
    console.error(`✗ Unknown --only task(s): ${unknown.join(", ")}`);
    console.error(`  Known: ${TASK_NAMES.join(", ")}`);
    process.exit(2);
  }
}

const BATCH_LIMIT = 500; // Firestore write-batch hard ceiling

/**
 * Sub-migration C — the three chance-based `EventType` values, 2026-10-31.
 * Declared once so the `events` and `homepageSections` tasks cannot drift
 * apart: both rewrite the same union, one as a scalar and one nested inside a
 * section config.
 *
 * 🛑 This map is keyed by the OLD value and must never gain an entry for a
 * value that is not an `EventType`. In particular `spin_wheel` appears in the
 * unrelated `RaffleType` union and `lottery` in the unrelated product-level
 * `prizeDrawMode` — neither is migrated. See the § SUB-MIGRATION C banner on
 * the tasks below.
 */
const EVENT_TYPE_RENAMES = {
  raffle: "giveaway",
  spin_wheel: "bonus-spin",
  lottery: "random-draw",
};

/**
 * Own-property lookup into `EVENT_TYPE_RENAMES`, returning `undefined` for
 * anything unmapped.
 *
 * 🛑 NOT a bare `EVENT_TYPE_RENAMES[value]`. A stored `type` is arbitrary
 * Firestore data, so a document holding `"constructor"` or `"toString"` would
 * walk the prototype chain, yield a FUNCTION, pass a truthiness test, and get
 * written back into Firestore as the document's new `type`. Vanishingly
 * unlikely and trivially avoided.
 */
function renamedEventType(value) {
  if (typeof value !== "string") return undefined;
  return Object.hasOwn(EVENT_TYPE_RENAMES, value)
    ? EVENT_TYPE_RENAMES[value]
    : undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rename a flat or dotted field: write the new path, delete the old. */
function renameField(patch, data, oldPath, newPath) {
  const v = getPath(data, oldPath);
  if (v === undefined) return false;
  patch[newPath] = v;
  patch[oldPath] = DELETE();
  return true;
}
function getPath(obj, path) {
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[seg];
  }
  return cur;
}
/** Move a MAP KEY within a nested object. Returns a replacement object or null. */
function renameMapKey(map, oldKey, newKey) {
  if (!map || typeof map !== "object" || !(oldKey in map)) return null;
  const next = { ...map };
  // 🛑 If BOTH keys exist the counts are two halves of one total — sum them,
  // never let the new key silently win and lose the old rows.
  next[newKey] = typeof next[newKey] === "number" && typeof next[oldKey] === "number"
    ? next[newKey] + next[oldKey]
    : next[newKey] ?? next[oldKey];
  delete next[oldKey];
  return next;
}

/** Shallow-rename keys inside every element of an array of plain objects. */
function mapArray(arr, fn) {
  if (!Array.isArray(arr)) return null;
  let touched = false;
  const next = arr.map((el) => {
    if (!el || typeof el !== "object") return el;
    const copy = { ...el };
    if (fn(copy)) touched = true;
    return copy;
  });
  return touched ? next : null;
}

// ---------------------------------------------------------------------------
// TASKS — one per collection. Each returns a patch object (or null to skip).
//
// 🛑 Every task uses `.select(...)` so the read stays cheap, and filters IN
// MEMORY rather than with `where("x","==","auction")`. Not a style choice: a
// Firestore equality cannot see a document whose field is ABSENT, and several
// of these renames are "the field does not exist yet" cases.
// ---------------------------------------------------------------------------
const TASKS = [
  {
    name: "products",
    collection: "products",
    select: [
      "listingType", "title",
      "auctionEndDate", "auctionStartDate", "auctionEndedAt",
      "auctionExtensionMinutes", "auctionOriginalEndDate", "auctionShippingPaidBy",
    ],
    patch(d) {
      const p = {};
      if (d.listingType === "auction") p.listingType = "collector-drop";
      renameField(p, d, "auctionEndDate", "collectorDropEndDate");
      renameField(p, d, "auctionStartDate", "collectorDropStartDate");
      renameField(p, d, "auctionEndedAt", "collectorDropEndedAt");
      renameField(p, d, "auctionExtensionMinutes", "collectorDropExtensionMinutes");
      renameField(p, d, "auctionOriginalEndDate", "collectorDropOriginalEndDate");
      renameField(p, d, "auctionShippingPaidBy", "collectorDropShippingPaidBy");
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "orders",
    collection: "orders",
    select: ["orderType", "sourceContext", "items"],
    patch(d) {
      const p = {};
      if (d.orderType === "auction") p.orderType = "collector-drop";

      const sc = d.sourceContext;
      if (sc && typeof sc === "object") {
        const next = { ...sc };
        let touched = false;
        if (next.path === "auction-won") { next.path = "collector-drop-won"; touched = true; }
        if (next.path === "auction-buy-now") { next.path = "collector-drop-buy-now"; touched = true; }
        // Pre-rename sourceContext also used the bare `"auction"` path.
        if (next.path === "auction") { next.path = "collector-drop-won"; touched = true; }
        for (const [from, to] of [
          ["auctionId", "collectorDropId"],
          ["auctionEndedAt", "collectorDropEndedAt"],
          ["auctionEndDate", "collectorDropEndDate"],
        ]) {
          if (from in next) { next[to] = next[from]; delete next[from]; touched = true; }
        }
        // 🛑 Whole-object write, not dotted paths: `sourceContext` is a
        // discriminated union and a dotted delete + dotted set on the same
        // map in one patch is order-dependent in the emulator.
        if (touched) p.sourceContext = next;
      }

      const items = mapArray(d.items, (it) => {
        let t = false;
        if (it.listingType === "auction") { it.listingType = "collector-drop"; t = true; }
        if ("auctionId" in it) { it.collectorDropId = it.auctionId; delete it.auctionId; t = true; }
        if ("isAuctionWin" in it) { it.isCollectorDropWin = it.isAuctionWin; delete it.isAuctionWin; t = true; }
        return t;
      });
      if (items) p.items = items;

      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "carts",
    collection: "carts",
    select: ["items"],
    patch(d) {
      const items = mapArray(d.items, (it) => {
        let t = false;
        if (it.listingType === "auction") { it.listingType = "collector-drop"; t = true; }
        if ("isAuctionWin" in it) { it.isCollectorDropWin = it.isAuctionWin; delete it.isAuctionWin; t = true; }
        if ("auctionId" in it) { it.collectorDropId = it.auctionId; delete it.auctionId; t = true; }
        return t;
      });
      return items ? { items } : null;
    },
  },
  {
    name: "bids",
    collection: "bids",
    select: ["auctionId"],
    patch(d) {
      const p = {};
      renameField(p, d, "auctionId", "collectorDropId");
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "categories",
    collection: "categories",
    select: ["metrics"],
    patch(d) {
      const p = {};
      renameField(p, d, "metrics.auctionCount", "metrics.collectorDropCount");
      renameField(p, d, "metrics.auctionIds", "metrics.collectorDropIds");
      renameField(p, d, "metrics.totalAuctionCount", "metrics.totalCollectorDropCount");
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "categoryCounts",
    collection: "categoryCounts",
    select: ["own", "total"],
    /*
     * 🛑 `own` / `total` are `Partial<Record<ListingType, number>>`, so
     * `auction` here is a MAP KEY, not a value. Renaming the key is the whole
     * job; `renameMapKey` SUMS when both keys are present rather than letting
     * one win, because the two are halves of one count.
     */
    patch(d) {
      const p = {};
      const own = renameMapKey(d.own, "auction", "collector-drop");
      const total = renameMapKey(d.total, "auction", "collector-drop");
      if (own) p.own = own;
      if (total) p.total = total;
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "priceIndex",
    collection: "priceIndex",
    select: ["sold", "lastSold"],
    patch(d) {
      const p = {};
      const byPath = renameMapKey(d.sold?.byPath, "auction", "collector-drop");
      if (byPath) p["sold.byPath"] = byPath;
      if (d.lastSold?.via === "auction") p["lastSold.via"] = "collector-drop";
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "coupons",
    collection: "coupons",
    select: ["applicableToAuctions", "appliesToAuctions", "restrictions"],
    patch(d) {
      const p = {};
      renameField(p, d, "applicableToAuctions", "applicableToCollectorDrops");
      renameField(p, d, "appliesToAuctions", "appliesToCollectorDrops");
      renameField(p, d, "restrictions.appliesToAuctions", "restrictions.appliesToCollectorDrops");
      // Product/category restriction arrays can name a listingType.
      const r = d.restrictions;
      if (r && Array.isArray(r.applicableListingTypes) && r.applicableListingTypes.includes("auction")) {
        p["restrictions.applicableListingTypes"] = r.applicableListingTypes.map((t) =>
          t === "auction" ? "collector-drop" : t,
        );
      }
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "notifications",
    collection: "notifications",
    select: ["type", "relatedType"],
    patch(d) {
      const p = {};
      if (d.type === "auction_ended") p.type = "collector_drop_ended";
      if (d.relatedType === "auction") p.relatedType = "collector-drop";
      return Object.keys(p).length ? p : null;
    },
  },
  {
    name: "supportTickets",
    collection: "supportTickets",
    select: ["category"],
    patch(d) {
      if (d.category !== "auction_dispute") return null;
      return { category: "collector_drop_dispute" };
    },
  },
  {
    name: "users",
    collection: "users",
    select: ["permissionGroup"],
    /*
     * 🛑 `users` is a PRESERVE collection — never wiped by the tester, holds
     * the only real accounts. This task rewrites ONE enum value and touches
     * nothing else; it must stay that narrow.
     */
    patch(d) {
      if (d.permissionGroup !== "auction_monitor") return null;
      return { permissionGroup: "collector_drop_monitor" };
    },
  },
  {
    name: "stores",
    collection: "stores",
    select: ["capabilities"],
    patch(d) {
      if (!Array.isArray(d.capabilities) || !d.capabilities.includes("host_auctions")) return null;
      return {
        capabilities: d.capabilities.map((c) => (c === "host_auctions" ? "host_collector_drops" : c)),
      };
    },
  },
  {
    name: "history",
    collection: "history",
    select: ["items"],
    patch(d) {
      const items = mapArray(d.items, (it) => {
        if (it.productType !== "auction") return false;
        it.productType = "collector-drop";
        return true;
      });
      return items ? { items } : null;
    },
  },
  {
    name: "wishlists",
    collection: "wishlists",
    select: ["items"],
    patch(d) {
      const items = mapArray(d.items, (it) => {
        if (it.productType !== "auction") return false;
        it.productType = "collector-drop";
        return true;
      });
      return items ? { items } : null;
    },
  },
  {
    name: "siteSettings",
    collection: "siteSettings",
    select: ["listings", "commissions"],
    /*
     * 🛑 `listings.listingTypes` is the kill-switch map, keyed by listingType
     * VALUE. A camelCase or stale key there matches no real type, so the
     * switch silently does nothing (Root Cause #33) — which is exactly the
     * defect the code-side fix in this rename closed. Both the pre-rename
     * `auction` key and the bad `collectorDrop` key are drained here.
     */
    patch(d) {
      const p = {};
      const lt = d.listings?.listingTypes;
      if (lt && typeof lt === "object") {
        const next = { ...lt };
        let touched = false;
        for (const bad of ["auction", "collectorDrop"]) {
          if (bad in next) {
            if (!("collector-drop" in next)) next["collector-drop"] = next[bad];
            delete next[bad];
            touched = true;
          }
        }
        if (touched) p["listings.listingTypes"] = next;
      }
      renameField(p, d, "commissions.auctionListingFee", "commissions.collectorDropListingFee");
      return Object.keys(p).length ? p : null;
    },
  },

  // =========================================================================
  // SUB-MIGRATION C — the three chance-based `EventType` values, 2026-10-31.
  //
  //   raffle     -> giveaway
  //   spin_wheel -> bonus-spin
  //   lottery    -> random-draw
  //
  // Same aggregator-screening rationale as the `auction` -> `collector-drop`
  // rename above. Folded in here rather than given its own script because the
  // mechanics are identical and one runner is one thing to get right.
  //
  // 🛑 THREE THINGS ARE DELIBERATELY NOT MIGRATED, and each uses one of these
  // same words. Scope every match before adding a task:
  //
  //   1. `products.prizeDrawMode: "reveal" | "lottery"` — the PRODUCT-level
  //      draw mode for the `random-lots` listing type. A different axis from
  //      the event-level type; `lotteryConfig`, `lotteryConfigWriteSchema` and
  //      `mergeLotteryConfig` stay with it (CLAUDE.md § "Lottery Config
  //      Writes"). There is no `products` task below for exactly this reason.
  //   2. `events.raffleType: "open_raffle" | "top_n_scorers" |
  //      "top_n_participants" | "spin_wheel"` — the draw MECHANISM. Its
  //      `spin_wheel` is NOT the event type that became `bonus-spin`. The
  //      `events` task below touches `type` ONLY.
  //   3. `events.hasRaffle` / `rafflePrize*` / `raffleWinner*` /
  //      `raffleTopN` / `raffleEntryCount` / `raffleTriggeredAt` /
  //      `raffleGithubFunctionUrl`, and `eventEntries.raffleEligible` —
  //      persisted FIELD names, read under those names everywhere. No field
  //      renames in this sub-migration at all.
  //
  // Unlike the `auction` half, the code side DOES carry a read-side alias:
  // `normalizeEventType` (`features/events/types/index.ts`) maps all three old
  // spellings onto the new union, and every read path goes through it. So the
  // site works before this runs; the script exists so Firestore eventually
  // agrees with the schema, and so the aliases can one day be deleted.
  // =========================================================================
  {
    name: "events",
    collection: "events",
    select: ["type"],
    /*
     * 🛑 `type` ONLY. `raffleType` is a different union and `hasRaffle` /
     * `raffleWinner*` are persisted field names — see note 2 and 3 above.
     * Widening this `select` is how the wrong one gets rewritten.
     */
    patch(d) {
      const next = renamedEventType(d.type);
      return next ? { type: next } : null;
    },
  },
  {
    name: "claimedCoupons",
    collection: "claimedCoupons",
    select: ["source"],
    /*
     * How a coupon reached a user's wallet. `ClaimedCouponSource` dropped
     * `"raffle"` for `"giveaway"`, and the Zod enum is a WRITE gate with no
     * legacy member — so a stored `raffle` is a value the schema no longer
     * admits.
     *
     * 🛑 `"spin"` is NOT touched. It is the bare spin-prize source written by
     * `assignSpinPrize`, not the `spin_wheel` event type that became
     * `bonus-spin`, and it is still a live member of the union.
     */
    patch(d) {
      if (d.source !== "raffle") return null;
      return { source: "giveaway" };
    },
  },
  {
    name: "homepageSections",
    collection: "homepageSections",
    select: ["config"],
    /*
     * `config.raffleType` on the `event-raffles` section.
     *
     * 🛑 Despite its NAME this holds `EventType` values, not `RaffleType`
     * ones — `EventGiveawaysSection` feeds it straight into
     * `sieveFilter(EVENT_FIELDS.TYPE, EQ, ...)`. That is why it IS migrated
     * while `events.raffleType` is not. The field name and the section's own
     * `type: "event-raffles"` discriminator both stay.
     *
     * `"all"` is the third legal value and is unaffected.
     */
    patch(d) {
      const next = renamedEventType(d.config?.raffleType);
      return next ? { "config.raffleType": next } : null;
    },
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
/*
 * 🛑 TASK_NAMES must stay in step with TASKS. Asserted rather than trusted —
 * a hand-maintained list beside a measurement is how an exemption list goes
 * stale (Root Cause #106).
 */
{
  const actual = TASKS.map((t) => t.name);
  const drift = [
    ...actual.filter((n) => !TASK_NAMES.includes(n)).map((n) => `+${n}`),
    ...TASK_NAMES.filter((n) => !actual.includes(n)).map((n) => `-${n}`),
  ];
  if (drift.length) {
    console.error(`✗ TASK_NAMES is out of step with TASKS: ${drift.join(" ")}`);
    process.exit(2);
  }
}


// ---------------------------------------------------------------------------
// .env.local loader (same shape as seed-cli.mjs / migrate-listing-type-value.mjs)
// ---------------------------------------------------------------------------
const repoRoot = process.cwd();
const envLocalPath = resolve(repoRoot, ".env.local");
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
} else {
  console.warn(`⚠ .env.local not found at ${envLocalPath} — relying on existing process.env`);
}

const required = ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (!SERVICE_ACCOUNT_OVERRIDE && missing.length > 0) {
  console.error(`✗ Missing required env vars: ${missing.join(", ")}`);
  console.error("  Either set them in .env.local or pass --service-account <path-to-key.json>");
  process.exit(2);
}

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const parsePrivateKey = (raw) => (raw && raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw);

if (!admin.apps.length) {
  if (SERVICE_ACCOUNT_OVERRIDE) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(readFileSync(resolve(repoRoot, SERVICE_ACCOUNT_OVERRIDE), "utf8"))),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID.trim(),
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL.trim(),
        privateKey: parsePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
      }),
    });
  }
}
const db = admin.firestore();
const DELETE = admin.firestore.FieldValue.delete;
const NOW = () => admin.firestore.FieldValue.serverTimestamp();

console.log(`✓ Connected to project: ${process.env.FIREBASE_ADMIN_PROJECT_ID || "(service-account)"}`);
console.log(`• collector-drop rename migration — ${TASKS.length} task(s) registered`);
if (DRY_RUN) console.log("• DRY RUN (the default) — no writes. Pass --yes to apply.");

const selected = ONLY ? TASKS.filter((t) => ONLY.includes(t.name)) : TASKS;
const skipped = TASKS.filter((t) => !selected.includes(t)).map((t) => t.name);
console.log("");

let totalMatched = 0;
let totalWritten = 0;
let totalErrors = 0;
const perTask = [];

for (const task of selected) {
  let snap;
  try {
    snap = await db.collection(task.collection).select(...task.select).get();
  } catch (err) {
    console.error(`  ✗ ${task.name}: read failed — ${err?.message ?? err}`);
    totalErrors += 1;
    perTask.push({ name: task.name, scanned: 0, matched: 0, written: 0, failed: 1 });
    continue;
  }

  const pending = [];
  for (const doc of snap.docs) {
    const patch = task.patch(doc.data() ?? {});
    if (patch) pending.push({ id: doc.id, patch });
  }
  totalMatched += pending.length;
  console.log(
    `  ${task.name.padEnd(16)} scanned ${String(snap.size).padStart(5)}   to migrate ${String(pending.length).padStart(5)}`,
  );
  for (const r of pending.slice(0, 5)) console.log(`      ${r.id}  ${Object.keys(r.patch).join(", ")}`);
  if (pending.length > 5) console.log(`      … ${pending.length - 5} more`);

  if (DRY_RUN || pending.length === 0) {
    perTask.push({ name: task.name, scanned: snap.size, matched: pending.length, written: 0, failed: 0 });
    continue;
  }

  let written = 0;
  let failed = 0;
  for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
    const slice = pending.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const r of slice) {
      /*
       * `update`, not `set({merge:true})`: update FAILS on a document deleted
       * between scan and write, where a merge-set would silently CREATE a
       * document holding nothing but the migrated field.
       */
      batch.update(db.collection(task.collection).doc(r.id), { ...r.patch, updatedAt: NOW() });
    }
    try {
      await batch.commit();
      written += slice.length;
    } catch (err) {
      failed += slice.length;
      console.error(`      ✗ batch ${Math.floor(i / BATCH_LIMIT) + 1} failed: ${err?.message ?? err}`);
    }
  }
  totalWritten += written;
  totalErrors += failed;
  perTask.push({ name: task.name, scanned: snap.size, matched: pending.length, written, failed });
}

console.log("");
console.log("─".repeat(72));
for (const r of perTask) {
  console.log(
    `  ${r.name.padEnd(16)} scanned ${String(r.scanned).padStart(5)}  matched ${String(r.matched).padStart(5)}  written ${String(r.written).padStart(5)}  failed ${String(r.failed).padStart(4)}`,
  );
}
console.log("─".repeat(72));
/*
 * 🛑 Name the DENOMINATOR, and name what was skipped, on success as well as
 * failure. A filtered run must never read as a full one.
 */
console.log(`  ${selected.length} of ${TASKS.length} task(s) run${skipped.length ? ` — SKIPPED: ${skipped.join(", ")}` : ""}`);
if (DRY_RUN) {
  console.log(`  DRY RUN — ${totalMatched} document(s) would be updated. Re-run with --yes to apply.`);
  process.exit(totalErrors === 0 ? 0 : 1);
}
console.log(`  ${totalErrors === 0 ? "✓" : "⚠"} ${totalWritten} updated, ${totalErrors} failed`);
process.exit(totalErrors === 0 ? 0 : 1);
