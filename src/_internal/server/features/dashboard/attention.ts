/**
 * Attention counts for the dashboard hubs — "how many things here are waiting
 * for me".
 *
 * ## 🛑 A count that fails renders ABSENT, never `0`
 *
 * This is the one rule the whole module is shaped around, and it is the
 * opposite of what `dailyStatusDigest`'s `safeCount` does. The digest returns
 * `0` on a failed query and says so: *"a stuck zero next to live numbers
 * elsewhere is legible as 'that one broke'"*. That is true of a table of
 * twenty figures in an email and false of a badge on a card — there, `0` reads
 * as **"nothing needs attention"**, which is the one wrong answer that stops
 * the operator looking.
 *
 * So a failed source resolves to `null` and the card renders no badge at all.
 * Root Cause #72: `undefined` must mean "the count failed", never "zero", and
 * every count fails OPEN.
 *
 * ## Keyed by nav item id, not by section
 *
 * A count belongs to a SCREEN ("2 payouts are pending"), not to a section, so
 * the key is `navItemId(portal, href)` — already derived, already stable,
 * already the `navConfig` key. A section card sums its own items' counts, so
 * no second keying scheme exists and a renamed group cannot orphan a count.
 *
 * 🛑 The ids are written as literals here and CROSS-CHECKED against the real
 * nav by `audit-dashboard-hub-coverage`. A literal that matches no nav item is
 * a count nothing can ever display — the silent half of Root Cause #62, where
 * a filter is emitted on a field the allowlist omits and simply vanishes.
 *
 * ## 🛑 `nav-admin-admin-orders` is CORRECT. Do not "tidy" the repetition.
 *
 * `navItemId(portal, href)` is `nav-${portal}-${slugified href}`, and the href
 * ALSO begins with the portal segment — so `/admin/orders` under the `admin`
 * portal is `nav-admin-admin-orders`, and `/store/orders` is
 * `nav-store-store-orders`. It reads like a mistake and is the live `navConfig`
 * key.
 *
 * Every key in this registry was first written the way it reads — a single
 * `nav-admin-orders` — and the consequence is worth recording because it is
 * precisely the failure mode this registry's cross-check exists for:
 * `collectAttentionCounts` looks each VISIBLE nav id up in here, so with the
 * shortened keys **not one source would ever have matched**. No query would
 * run, no badge would appear, and nothing anywhere would error — a feature
 * that silently does nothing, which is indistinguishable from "nothing is
 * waiting". `audit-dashboard-hub-coverage`'s R3 caught all six on its first
 * clean run.
 *
 * ## Why these counts and not more
 *
 * Every source below is a query COPIED from one that already runs in
 * production — four from `dailyStatusDigest`, which documents its own index
 * story, plus the seller order count. None of them needed a new index:
 * all are single-field equalities except the manual-payment pair (which reuses
 * the existing `(status, paymentStatus, createdAt)` composite) and the seller
 * pair (which is a prefix of `(storeId, status, createdAt)`). Verified against
 * `appkit/firebase/base/firestore.indexes.json` rather than assumed.
 *
 * Inventing a count means choosing what "needs attention" means for a
 * collection, and a wrong choice here is a badge that is confidently wrong
 * forever. Adding one is a registry entry plus that decision, made once.
 *
 * **The user portal has no counts, deliberately.** Nothing on a buyer's
 * dashboard is an obligation they are failing to meet — their unread count
 * already lives in the notification bell, and duplicating it onto a card would
 * be a second place for the same number to be stale. The registry simply has
 * no `nav-user-*` key, so the user hubs run zero queries rather than running
 * queries that return a number nobody acts on.
 */

import { getAdminDb } from "../../../../providers/db-firebase";
import { normalizeError } from "../../../../errors/normalize";
import { ORDER_COLLECTION, OrderStatusValues } from "../../../../features/orders/schemas/firestore";
import { ORDER_FIELDS } from "../../../../constants/field-names";
import { PAYOUT_COLLECTION, PAYOUT_FIELDS } from "../../../../features/payments/schemas/firestore";
import {
  SUPPORT_TICKET_COLLECTION,
  SUPPORT_TICKET_FIELDS,
  TicketStatusValues,
} from "../../../../features/support/schemas/firestore";
import { ADMIN_NOTIFICATIONS_COLLECTION } from "../../../../features/store-extensions/schemas/rbac";
import {
  CATALOGUE_COLLECTION,
  CATALOGUE_FIELDS,
} from "../../../../features/catalogue/schemas/firestore";

/**
 * `null` is a FAILED read; a missing key is "no count is defined for this
 * screen". Both render as no badge, and the distinction matters only here.
 */
export type AttentionCounts = Record<string, number | null>;

/*
 * Structural rather than `import type { Query } from "firebase-admin/firestore"`.
 * This file is reachable from the Functions bundle and from Next's tracer, and
 * the cheapest way to keep a firebase-admin specifier out of the graph is not
 * to write one (Root Cause #24) — the same reasoning, and the same shape, as
 * `dailyStatusDigest`'s own `CountableQuery`.
 */
type CountableQuery = {
  count(): { get(): Promise<{ data(): { count: number } }> };
};

/** `null` on any failure — see the header. */
async function countOrNull(q: CountableQuery): Promise<number | null> {
  try {
    const snap = await q.count().get();
    return snap.data().count;
  } catch (err) {
    void normalizeError(err);
    return null;
  }
}

/**
 * What each count needs from the viewer. A source whose requirement cannot be
 * met is not run — it is not reported as `0` either, it is simply absent.
 */
interface AttentionSource {
  /**
   * Build the query. `storeId` is the viewer's store SLUG when they have one.
   *
   * 🛑 A store SLUG, not an Auth uid — `OrderDocument.storeId` holds the slug
   * (§ "Store Identity Architecture"). Passing a uid returns zero for every
   * seller and raises nothing, which is Root Cause #98's second bug.
   */
  query: (db: ReturnType<typeof getAdminDb>, storeId?: string) => CountableQuery | null;
}

/**
 * nav item id → how to count what is waiting there.
 *
 * 🛑 Keys are cross-checked against the real nav by
 * `audit-dashboard-hub-coverage`. A key matching no nav item is a count that
 * can never be displayed — the silent half of Root Cause #62.
 */
export const ATTENTION_SOURCES: Record<string, AttentionSource> = {
  /*
   * Orders awaiting a manual-payment decision. The digest's exact query —
   * `status == pending AND paymentStatus == pending` — which is what
   * § "Manual Payment Review Flow" calls the review queue's bounded
   * pre-filter, and which reuses the existing
   * `(status, paymentStatus, createdAt)` composite.
   */
  "nav-admin-admin-orders": {
    query: (db) =>
      db
        .collection(ORDER_COLLECTION)
        .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
        .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending"),
  },
  "nav-admin-admin-payouts": {
    query: (db) =>
      db
        .collection(PAYOUT_COLLECTION)
        .where(PAYOUT_FIELDS.STATUS, "==", PAYOUT_FIELDS.STATUS_VALUES.PENDING),
  },
  "nav-admin-admin-support-tickets": {
    query: (db) =>
      db
        .collection(SUPPORT_TICKET_COLLECTION)
        .where(SUPPORT_TICKET_FIELDS.STATUS, "==", TicketStatusValues.OPEN),
  },
  "nav-admin-admin-notifications": {
    query: (db) => db.collection(ADMIN_NOTIFICATIONS_COLLECTION).where("isRead", "==", false),
  },
  "nav-admin-admin-catalogue-approvals": {
    query: (db) =>
      db
        .collection(CATALOGUE_COLLECTION)
        .where(CATALOGUE_FIELDS.LISTING_STATUS, "==", "pending_admin_approval"),
  },
  /* A prefix of the existing `(storeId, status, createdAt)` composite. */
  "nav-store-store-orders": {
    query: (db, storeId) =>
      storeId
        ? db
            .collection(ORDER_COLLECTION)
            .where(ORDER_FIELDS.STORE_ID, "==", storeId)
            .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
        : null,
  },
};

/**
 * Count what is waiting, for the nav items this viewer can actually see.
 *
 * ## 🛑 `visibleItemIds` is the gate, and it is not an optimisation
 *
 * The caller passes the ids that SURVIVED permission filtering, so a count is
 * only ever computed for a card that will be rendered. Two things fall out of
 * that which a blanket "am I staff" boolean could not give:
 *
 *  - An employee holding one permission pays for one count, not six. The first
 *    draft derived staffness from `permissions.length > 0` and ran all five
 *    admin queries for anyone with any grant at all — six reads to render one
 *    card, and a number computed from a collection that employee has no
 *    permission to read.
 *  - A seller and an admin need no separate branches. The store nav contains
 *    `nav-store-orders` and the admin nav does not, so the nav IS the scope.
 *
 * `Promise.all` over `.count()` aggregations: six reads worst case, none
 * scaling with collection size, parallel rather than sequential (Rule #6).
 */
export async function collectAttentionCounts(
  visibleItemIds: readonly string[],
  storeId?: string,
): Promise<AttentionCounts> {
  const db = getAdminDb();

  const runnable: Array<[string, CountableQuery]> = [];
  for (const id of visibleItemIds) {
    const source = ATTENTION_SOURCES[id];
    if (!source) continue;
    const q = source.query(db, storeId);
    if (q) runnable.push([id, q]);
  }

  const results = await Promise.all(runnable.map(([, q]) => countOrNull(q)));

  const counts: AttentionCounts = {};
  runnable.forEach(([key], i) => {
    counts[key] = results[i] ?? null;
  });
  return counts;
}
