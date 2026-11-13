/*
 * MOVED FROM THE SHOP (src/app/api/promotions/event-prizes.ts), 2026-11-14.
 *
 * Owner asked the right question: *"are code in the application if they are
 * needed in appkit as a functionality?"* — and this was one. Reading prize
 * listings and projecting them safely for a public surface is GENERIC prize
 * machinery, not this shop’s presentation, so a second install would have had
 * to reimplement the query, the cap and — critically — the PROJECTION that
 * keeps winnerUserIds and seller PII off a public response.
 *
 * 🛑 The projection is the reason this move matters rather than being tidiness.
 * sanitizeProductForPublic is a DENYLIST and winnerUserIds is NESTED, so a
 * top-level sweep cannot see it. A consumer writing its own prize endpoint
 * would not know that. Machinery in appkit, composition in the app.
 *
 * ⚠ Three identifiers in this header lost their backticks to a shell that
 * interpreted them while the file was being written — fixed by hand. Writing
 * code through a shell heredoc keeps costing exactly this; use the editor.
 */
/**
 * ── EVENT PRIZES FOR THE PUBLIC PROMOTIONS SURFACES ──────────────────────────
 *
 * Owner, 2026-11-13: *"eventPrizes should be only available on the promotions
 * page as well as show as a tab on the event details page as prizes."* This is
 * the promotions half; the event-page tab lives on the events subdomain.
 *
 * 🛑 WHY THIS IS A MODULE AND NOT TWO COPIES. Two shop surfaces need the same
 * answer — `GET /api/promotions` and the `/promotions/[tab]` page, which reads
 * the repository directly rather than calling its own API. A hand-written
 * second query is how a public list and the page that advertises it silently
 * disagree (see `isCouponDisplayable`, where exactly that happened: the server
 * half swore there were no coupons while the client half rendered three). One
 * predicate, one projection, one cap.
 *
 * It sits beside the route rather than in `src/lib/` only because the route is
 * its primary consumer; nothing here is route-specific and it exports no
 * handler, so Next treats it as an ordinary module.
 */

import { productRepository } from "../../../../features/products/repository/products.repository";
import {
  ProductStatusValues,
  type ProductDocument,
} from "../../../../features/products/schemas/firestore";
import { safeRead } from "../../../../errors/safe-read";
import type { PublicEventPrizeTag } from "../../../../features/promotions/components/EventPrizeLabel";

/**
 * How many prizes a promotional surface will show.
 *
 * Matches the convention the sibling lists already use (promoted caps at 12,
 * featured at 8). A cap also bounds the in-memory work below, which matters
 * because the query is deliberately unsorted — see `readPublicEventPrizes`.
 */
export const EVENT_PRIZE_DISPLAY_CAP = 12;

/**
 * ── THE ALLOWLIST ────────────────────────────────────────────────────────────
 *
 * 🛑 AN ALLOWLIST, NEVER A DENYLIST, AND THIS IS THE FOURTH TIME THIS PROJECT
 * HAS HAD TO SAY SO.
 *
 * A `products` row is not safe to publish as-is. `products` joined the PII
 * registry on 2026-11-11, `ProductRepository.mapDoc` does **not** decrypt, and
 * `encryptPiiFields` derives a `` `${field}Index` `` blind-index sibling for
 * every encrypted field with no map involved — so a raw document off
 * `findBy()` carries `sellerName`/`sellerEmail` **ciphertext** plus
 * `sellerNameIndex`/`sellerEmailIndex`. A blind index is deterministic, so
 * publishing one is an offline *"is this person a seller here"* oracle: worse
 * than the ciphertext beside it. This repo has shipped that leak three times
 * (`phoneNumberIndex` on `/api/admin/users`, `sellerTokensIndex` on
 * `/api/admin/payouts`, and the products case `sanitizeProductForPublic` was
 * written for), each time from a strip list built out of declarations.
 *
 * `sanitizeProductForPublic` exists and sweeps `/Index$/` by SUFFIX, which
 * fails closed — but it is still a denylist, and a denylist silently admits
 * the next field anyone adds to the document. An allowlist admits nothing it
 * was not told about, so the failure mode of a mistake here is a card missing
 * a star rating, not a published digest.
 *
 * ⚠ `eventPrize` is NOT on this list. It is rebuilt field by field below,
 * because the thing that must not escape is NESTED inside it and a top-level
 * allowlist cannot see that far.
 *
 * ⚠ Every entry is a field `ProductCard` / `renderProductCardPriceRow` /
 * `EditAffordance` actually reads — derived by reading those components, not
 * guessed. `storeId`/`storeName`/`storeSlug` are the store-scoped identity
 * that `sanitizeProductForPublic` names as explicitly public (business
 * identity, not a person), and `storeId` in particular is load-bearing: the
 * edit-affordance resolver treats an ABSENT one as "not mine" and fails
 * closed, so dropping it would silently disable every seller's pencil.
 *
 * ⚠ `createdAt`/`updatedAt` are excluded, and that has a second benefit:
 * `deserializeTimestamps` hands them back as `Date` instances, and the page
 * forwards these rows to a `"use client"` component. Keeping the projection to
 * plain JSON values means nothing non-serializable crosses the RSC boundary.
 */
const PUBLIC_PRIZE_CARD_FIELDS = [
  "id",
  "title",
  "slug",
  "price",
  "originalPrice",
  "currency",
  "mainImage",
  "listingType",
  "status",
  "availableQuantity",
  "stockCount",
  "stockQuantity",
  "features",
  "rating",
  "reviewCount",
  "brand",
  "categoryName",
  "storeId",
  "storeName",
  "storeSlug",
  "finalSale",
  "allowOffers",
  "isOnSale",
  "isSold",
  "madeToOrder",
  "partOfBundleIds",
  "partOfBundleTitles",
  "groupId",
  "isGroupParent",
  "groupTitle",
  "groupIcon",
  "sublistingCategoryId",
  "sublistingIcon",
] as const;

/**
 * A prize as a public surface sees it: card fields, plus a prize tag whose type
 * has no `winnerUserIds` member at all (see `PublicEventPrizeTag`).
 */
export type PublicEventPrizeCard = {
  id: string;
  eventPrize: PublicEventPrizeTag;
} & Record<string, unknown>;

/**
 * Project one stored product down to the public prize shape.
 *
 * 🛑 `eventPrize` IS REBUILT, NOT COPIED. `{ ...doc.eventPrize }` would carry
 * `winnerUserIds` — the uids entitled to claim the prize — straight into a
 * public, **ISR-cached** response. That is the sharpest version of the hazard
 * `isCouponDisplayable` is documented against: a page cached at 3600s is
 * public regardless of who first requested it, so anything viewer-specific
 * that reaches the HTML is published to everyone, not merely shown to the
 * wrong person. Naming the three fields that may travel makes the leak
 * unrepresentable rather than merely avoided.
 *
 * `showInPromotions: true` is written as a LITERAL rather than copied from the
 * document. Every row reaching here has already satisfied that filter, and a
 * literal means the flag the renderer re-checks cannot be a stale or
 * mistyped value read back off the row.
 */
export function toPublicEventPrize(doc: ProductDocument): PublicEventPrizeCard {
  const row = doc as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const field of PUBLIC_PRIZE_CARD_FIELDS) {
    const value = row[field];
    if (value !== undefined) out[field] = value;
  }

  const prize = doc.eventPrize;
  out["eventPrize"] = {
    ...(typeof prize?.eventId === "string" && prize.eventId.length > 0
      ? { eventId: prize.eventId }
      : {}),
    ...(typeof prize?.label === "string" && prize.label.trim().length > 0
      ? { label: prize.label }
      : {}),
    showInPromotions: true,
  } satisfies PublicEventPrizeTag;

  out["id"] = String(doc.id);
  return out as PublicEventPrizeCard;
}

/**
 * ── THE QUERY ────────────────────────────────────────────────────────────────
 *
 * `findBy("eventPrize.showInPromotions", true)` — ONE equality clause, no
 * `orderBy`, which is `where("eventPrize.showInPromotions", "==", true)` on the
 * collection. Three deliberate choices:
 *
 * 1. 🛑 **NOT `productRepository.list()` WITH A SIEVE FILTER.** `eventPrize`'s
 *    Sieve entry covers `eventPrize.eventId` and nothing else, and `sieve.ts`
 *    runs with `throwExceptions: false` — so a filter on a field absent from
 *    that map does not raise, `findField` returns undefined and the clause
 *    simply VANISHES (Root Cause #62). A prizes query that lost its clause
 *    would render THE ENTIRE PUBLISHED CATALOGUE as the prize pool: populated,
 *    plausible, wrong, and a 200. The repository's own comment at that Sieve
 *    entry records nearly falling into this. A direct equality read cannot
 *    silently widen — a wrong field name returns zero rows, which is loud.
 *
 * 2. ✅ **NO NEW COMPOSITE INDEX.** A single equality filter with no ordering
 *    is served by the automatic single-field index Firestore maintains for
 *    every field path, nested map fields included; both `firestore.indexes.json`
 *    copies carry **zero** `fieldOverrides`, so nothing excludes this path from
 *    automatic indexing. Index headroom is scarce here (277 of 1000 used, 724
 *    definitions) and an undeployed index returns a successful-looking EMPTY
 *    list rather than an error, so an index-free query is worth real care.
 *
 * 3. **`status` IS FILTERED IN MEMORY, NOT IN THE QUERY.** A second equality
 *    clause is what starts needing a composite index, and the row set here is
 *    the announced prizes for a handful of events — tiny by construction, since
 *    `eventPrize` is absent from every ordinary listing. Trading an index for
 *    a filter over a dozen rows is the right way round.
 *
 * ⚠ 🛑 GATED ON `showInPromotions`, NOT ON THE PRESENCE OF `eventId`. A prize
 * can be RECORDED against an event long before it is ANNOUNCED. Querying by
 * `eventPrize.eventId` would mean the act of linking a prize to an event
 * publishes it, which is the exact surprise the separate flag exists to
 * prevent — and it is the one filter here whose mistake is a disclosure rather
 * than a missing card.
 *
 * ⚠ The sort is applied here because the query has none. Firestore returns
 * documents in key order for an unsorted query, which would let two ISR
 * renders of the same data differ in card order; an explicit comparator keeps
 * the cached HTML stable. Labelled prizes lead and sort by billing, unlabelled
 * trail, title breaks the tie.
 */
export async function readPublicEventPrizes(
  route: string,
): Promise<PublicEventPrizeCard[]> {
  return safeRead(
    async () => {
      const rows = await productRepository.findBy(
        "eventPrize.showInPromotions",
        true,
      );

      return rows
        .filter((p) => p.status === ProductStatusValues.PUBLISHED)
        .sort(comparePrizes)
        .slice(0, EVENT_PRIZE_DISPLAY_CAP)
        .map(toPublicEventPrize);
    },
    {
      route,
      key: "productRepository.eventPrizes",
      /*
       * 🛑 AN EMPTY LIST, AND THE CALLERS MUST HIDE THE GROUP ON ONE.
       *
       * `safeRead` records a DEGRADED_READ row and returns this rather than
       * throwing, so a Firestore outage costs the prize group and not the
       * promotions page. The other half of that contract belongs to the
       * renderer: an empty list must render NOTHING, never a heading with no
       * cards under it. "Event prizes" above blank space reads as a broken
       * page, which is a worse answer than the honest silence of a section
       * that is not there.
       */
      fallback: [] as PublicEventPrizeCard[],
    },
  );
}

function comparePrizes(a: ProductDocument, b: ProductDocument): number {
  const la = a.eventPrize?.label?.trim() ?? "";
  const lb = b.eventPrize?.label?.trim() ?? "";
  if (la !== lb) {
    if (la === "") return 1;
    if (lb === "") return -1;
    return la.localeCompare(lb);
  }
  return String(a.title ?? "").localeCompare(String(b.title ?? ""));
}
