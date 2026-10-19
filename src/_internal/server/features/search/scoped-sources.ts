/*
 * WHY: A signed-in viewer should be able to find their own orders, offers
 *      and drafts from the same box — without that box ever being able to
 *      return somebody else's.
 * WHAT: Tier 2. Viewer-scoped `SearchSource`s, built per request from the
 *       session, plus the budget check.
 *
 * ## 🛑 Filtered SERVER-side, never in the browser
 *
 * The same rule `projectActionIndexForViewer` states for the action index.
 * Every source below carries an OWNER CLAUSE in its `where`, so the query
 * itself cannot return another viewer's rows — a client-side filter over a
 * wider result is one rendering bug away from a disclosure, and the bug is
 * invisible in review because the UI looks right.
 *
 * ## 🛑 A guest makes ZERO authenticated requests
 *
 * `scopedSourcesFor(null)` returns `[]`, and the route refuses before
 * touching Firestore. This is not an optimisation: a signed-out visitor
 * whose search fires an authenticated request has a session the page does
 * not know about, and the only honest way to prove the gate works is for
 * there to be no request at all.
 *
 * ## The read budget, which is why the split exists
 *
 *   guest    0 sources    0 docs    0 round trips
 *   buyer    6            ~120      1 (one Promise.all)
 *   seller   +5           ~220      1
 *   admin    +5           ~320      1
 *
 * Against `SCOPED_SCAN_BUDGET` = 400. Scoped sources use `scanLimit: 20`
 * rather than the 60 the public tier uses, because an owner clause has
 * already collapsed the candidate set — a 60-doc window would be 40 reads
 * spent proving there was nothing else.
 *
 * @tag domain:search
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:/api/search/scoped
 * @tag sideEffects:none
 */

import { ROUTES } from "../../../../next/routing/route-map";
import { SCOPED_SCAN_BUDGET, type SearchDocData, type SearchSource } from "./search-everything";

/** The viewer this search is scoped TO. Null means signed out. */
export interface SearchViewer {
  readonly uid: string;
  readonly role: string;
  /** The store slug this viewer owns, if any. See § Store Identity. */
  readonly storeId: string | null;
  readonly isAdmin: boolean;
  readonly isSeller: boolean;
}

/** Scoped sources read a narrow window; the owner clause did the work. */
const SCOPED_SCAN = 20;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/**
 * Every term must appear somewhere in the named fields.
 *
 * 🛑 AND, matching the push-down path's `plan.rest.every(...)`. An OR here
 * would make the two modes disagree about what a two-word query means, on
 * the same page, in adjacent groups.
 *
 * 🛑 Lower-cased comparison only — NOT `normalizeSearchText`. That
 * normaliser exists to make the WRITE path and the token query agree; this
 * path has no tokens, and running it here would strip punctuation out of a
 * tracking number or an order id, which are exactly the strings someone
 * pastes into a scoped search.
 */
function fieldsContain(fields: readonly string[]) {
  return (data: SearchDocData, terms: readonly string[]): boolean => {
    if (terms.length === 0) return false;
    const hay = fields
      .map((f) => str(data[f]) ?? "")
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t.toLowerCase()));
  };
}

/**
 * The viewer's own records.
 *
 * 🛑 `mode: "bounded-memory"` for everything PII-bearing, and `search-txt`
 * only where the collection genuinely carries tokens that are safe to have.
 * `orders` is the interesting case: `buildOrderSearchTxt` already indexes
 * productTitle / storeName / trackingNumber and already EXCLUDES the
 * shipping address, so it keeps the push-down. `addresses` has no
 * `searchTxt` and must never grow one.
 */
function selfSources(viewer: SearchViewer): SearchSource[] {
  return [
    {
      key: "my-orders",
      label: "Your orders",
      collection: "orders",
      // 🛑 `userId`, NOT `buyerId`. The field is `userId` and a query on
      // `buyerId` returns ZERO while raising nothing — indistinguishable
      // from "this buyer has no orders", which is a false-finding generator.
      where: [["userId", viewer.uid]],
      scanLimit: SCOPED_SCAN,
      mode: "search-txt",
      select: ["productTitle", "status", "trackingNumber"],
      toHit: (id, d) => ({
        id,
        title: str(d.productTitle) ?? `Order ${id}`,
        href: String(ROUTES.USER.ORDER_DETAIL(id)),
        detail: str(d.status),
      }),
      moreHref: () => String(ROUTES.USER.ORDERS),
    },
    {
      key: "my-offers",
      label: "Your offers",
      collection: "offers",
      where: [["buyerId", viewer.uid]],
      scanLimit: SCOPED_SCAN,
      mode: "bounded-memory",
      orderBy: ["createdAt", "desc"],
      select: ["productTitle", "status", "productSlug"],
      matches: fieldsContain(["productTitle", "status"]),
      toHit: (id, d) => ({
        id,
        title: str(d.productTitle) ?? "Offer",
        href: String(ROUTES.USER.OFFERS),
        detail: str(d.status),
      }),
      moreHref: () => String(ROUTES.USER.OFFERS),
    },
    {
      key: "my-catalogue",
      label: "Your catalogue",
      collection: "catalogueItems",
      where: [["ownerId", viewer.uid]],
      scanLimit: SCOPED_SCAN,
      mode: "bounded-memory",
      orderBy: ["createdAt", "desc"],
      select: ["title", "listingStatus"],
      matches: fieldsContain(["title"]),
      toHit: (id, d) => ({
        id,
        title: str(d.title) ?? "Catalogue item",
        href: String(ROUTES.USER.CATALOGUE),
        detail: str(d.listingStatus),
      }),
      moreHref: () => String(ROUTES.USER.CATALOGUE),
    },
    {
      /*
       * 🛑 `bounded-memory`, and this is the source the mode exists for.
       *
       * `addresses` is PII — `fullName`, `phone`, `addressLine1` are all
       * encrypted at rest and decrypted by the repository on read. It has
       * no `searchTxt` and must never get one: a prefix-expanded plaintext
       * token array over a person's name and street is precisely what
       * § Searching PII refuses. The owner clause already bounds this to
       * well under 25 rows, so an index would re-derive a bound we have
       * while adding leak surface for nothing.
       */
      key: "my-addresses",
      label: "Your addresses",
      collection: "addresses",
      where: [
        ["ownerType", "user"],
        ["ownerId", viewer.uid],
      ],
      scanLimit: SCOPED_SCAN,
      mode: "bounded-memory",
      select: ["label", "city", "state"],
      // Only the non-sensitive half is matched AND projected. A label and a
      // city are enough to pick an address out of a list of four; the name,
      // phone and street line never leave the server.
      matches: fieldsContain(["label", "city", "state"]),
      toHit: (id, d) => ({
        id,
        title: str(d.label) ?? "Address",
        href: String(ROUTES.USER.ADDRESSES),
        detail: [str(d.city), str(d.state)].filter(Boolean).join(", ") || undefined,
      }),
      moreHref: () => String(ROUTES.USER.ADDRESSES),
    },
  ];
}

/** The viewer's store. Requires a resolved `storeId`, never a uid. */
function sellerSources(viewer: SearchViewer): SearchSource[] {
  if (!viewer.storeId) return [];
  const storeId = viewer.storeId;
  return [
    {
      /*
       * The seller's own listings INCLUDING drafts — which is the whole
       * point, because a published one is already in the public artifact and
       * the merge dedupes it away. What survives in this group is precisely
       * "your drafts", and labelling it so is what makes the dedupe legible.
       */
      key: "my-listings",
      label: "Your listings (incl. drafts)",
      collection: "products",
      where: [["storeId", storeId]],
      scanLimit: SCOPED_SCAN,
      mode: "search-txt",
      select: ["title", "slug", "status"],
      toHit: (id, d) => ({
        id,
        title: str(d.title) ?? "Listing",
        href: String(ROUTES.STORE.PRODUCTS_EDIT(str(d.slug) ?? id)),
        detail: str(d.status),
      }),
      moreHref: () => String(ROUTES.STORE.PRODUCTS),
    },
    {
      key: "store-orders",
      label: "Orders in your store",
      collection: "orders",
      where: [["storeId", storeId]],
      scanLimit: SCOPED_SCAN,
      mode: "search-txt",
      select: ["productTitle", "status", "trackingNumber"],
      toHit: (id, d) => ({
        id,
        title: str(d.productTitle) ?? `Order ${id}`,
        href: String(ROUTES.STORE.ORDER_DETAIL(id)),
        detail: str(d.status),
      }),
      moreHref: () => String(ROUTES.STORE.ORDERS),
    },
  ];
}

/**
 * Build the viewer's sources.
 *
 * 🛑 Returns `[]` for a guest, which is what makes "zero authenticated
 * requests when signed out" structural rather than a caller's discipline.
 */
export function scopedSourcesFor(viewer: SearchViewer | null): SearchSource[] {
  if (!viewer) return [];
  const sources = [...selfSources(viewer)];
  if (viewer.isSeller || viewer.isAdmin) sources.push(...sellerSources(viewer));
  return sources;
}

/**
 * Σ `scanLimit`, for the budget check.
 *
 * Exported so `audit-scoped-search-ownership` R4 can print the arithmetic
 * rather than just a verdict: "over budget" without the per-source figures
 * tells you nothing about which source to shrink.
 */
export function scopedScanTotal(sources: readonly SearchSource[]): number {
  return sources.reduce((n, s) => n + (s.scanLimit ?? 60), 0);
}

export function assertWithinScopedBudget(sources: readonly SearchSource[]): void {
  const total = scopedScanTotal(sources);
  if (total <= SCOPED_SCAN_BUDGET) return;
  const breakdown = sources.map((s) => `${s.key}=${s.scanLimit ?? 60}`).join(" + ");
  throw new Error(
    `Scoped search would read up to ${total} documents, over SCOPED_SCAN_BUDGET ` +
      `(${SCOPED_SCAN_BUDGET}). ${breakdown} = ${total}.`,
  );
}
