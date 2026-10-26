/*
 * WHY: Seeds the live events — the Diwali → New Year season.
 * WHAT: ONE event. The PINNED `offer` hub (6 Nov 2026 → 5 Feb 2027),
 *       advertising the four codes a community poll chose plus the
 *       festival-only CASHBACK10.
 *
 * ## 🛑 PRUNED AGAIN 2026-10-27 — the five season events are GONE
 *
 * Owner's instruction: *"delete the extra event post other than the main 4
 * coupon diwali one"*. The keeper is `event-festive-cashback-10` — the only
 * `status: active` row in live, `isPinned: true`, and the one carrying four
 * `couponIds`, which is what "the main 4 coupon diwali one" names.
 *
 * Deleted here AND from Firestore (`scripts/delete-extra-events.mjs`), because
 * `appkit-seed load` writes `set(merge: true)`: a Firestore-only delete would
 * be undone by the next `load`, and a seed-only delete changes nothing live.
 * Live is canonical — the same rule the 2026-10-21 prune below established.
 *
 * All five had already been set `status: cancelled` in live before this, so
 * none of them was running; the delete removed rows nobody was being shown.
 * Their 14 `eventLikes` went with them (a like pointing at a deleted event is
 * the dangling FK of Root Cause #26). The keeper's 9 likes are untouched.
 *
 * 🛑 CONSEQUENCE, recorded rather than rediscovered — this re-opens exactly
 * the gap the 2026-10-21 prune noted and the 2026-10-24 addition closed:
 * `sale`, `poll`, `spin_wheel` and `raffle` have NO fixture again, so the
 * tester cases for those four types, and `saleConfig`/`EventSaleBanner` (whose
 * only fixture this ever had was one of the five), can again only report
 * "could not test". `survey`, `feedback` and `lottery` never had one.
 *
 * 🛑 Its id and slug still say `festive-cashback-10`, which is now narrower
 * than what the event covers. They are KEPT: the slug is the live public URL
 * (/events/festive-cashback-10), `coupon-cashback10` is not the code it
 * features any more but other seed rows and any saved link resolve by this
 * slug, and renaming it would 404 every share of it to buy a tidier string.
 *
 * ## 🛑 PRUNED TO MATCH LIVE, 2026-10-21
 *
 * This file used to seed 11 demo events covering all eight event types (poll,
 * survey, sale, raffle, spin_wheel, feedback, offer, lottery) plus 8 event
 * entries. Live holds exactly ONE event, and the owner's decision is that
 * **live is canonical** — so the demo rows were deleted rather than left to be
 * re-created.
 *
 * Why that mattered rather than being tidy-up: `appkit-seed load` writes
 * `set(payload, { merge: true })` with no production guard of any kind, and
 * `.env.local` points at the live project. So those 11 demo events were one
 * `npx appkit-seed load` away from appearing on the live site — measured
 * against production, `events 12 seed / 0 in db / 12 would create`.
 *
 * 🛑 CONSEQUENCE, recorded rather than discovered later: the tester checklist
 * cases that need a poll, a survey, a spin wheel, a raffle, a lottery, or a
 * `paused`/`cancelled`/`ended` status chip now have NO fixture. Those cases
 * can only report "could not test". That cost was raised before the deletion
 * and accepted. If they are wanted back, they belong in a scratch Firebase
 * project rather than in a corpus that loads against production.
 *
 * `eventEntriesSeedData` is deliberately an EMPTY array rather than deleted:
 * all 8 entries referenced events that no longer exist, so keeping them would
 * be a dangling FK (Root Cause #26), and removing the export would break
 * `seed/index.ts` and `seed-cli`'s import. An empty array is honest.
 *
 * EXPORTS:
 *   eventsSeedData — Array of EventDocument for seed runner
 *   eventEntriesSeedData — empty; see above
 *
 * @tag domain:events
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type {
  EventDocument,
  EventEntryPlain,
} from "../features/events/schemas";
import { withEventSearchTxt } from "./_helpers/search-txt-wrappers";
import { EVENT_FIELDS } from "../features/events/schemas";
import { editorialImage } from "./_helpers/editorial-media";
/*
 * `DIWALI_CASHBACK_END` is deliberately NOT imported here. The 16 November
 * date appears in this event's prose, but the event's own window is the full
 * season — only `coupons-seed-data.ts` has a field that date belongs in.
 */
import { SEASON_START, SEASON_END } from "./_helpers/festive-window";
/*
 * 🛑 DERIVED, never hand-typed. The like ROWS live in event-likes-seed-data
 * and the COUNT lives here, so a hand-written number drifts the moment a like
 * is added there — the mirror-drift trap (Root Cause #42). Importing the
 * tally makes the two one fact with one writer.
 */
import { SEEDED_LIKE_COUNTS } from "./event-likes-seed-data";

const NOW = new Date();

/*
 * 🛑 EVENT COVERS REUSE REAL CATALOGUE PHOTOGRAPHY, DELIBERATELY.
 *
 * These `category-*-image` slugs are the model covers already fetched from
 * beyblade.fandom.com, already uploaded to Storage, already recorded in
 * `docs/research/.../image-provenance.json`, and already resolvable through
 * `/media/<shortId>`. Pointing an event at one costs no new fetch and cannot
 * 404 — and it is the only source that has Beyblade subject matter at all.
 * Openverse indexes Commons, Flickr and museums; it has no Beyblades.
 *
 * The carousel BACKGROUNDS are different and must not come from here: a
 * full-bleed backdrop sits under inverse-ink copy at ~55% dim, and a product
 * shot competes with the headline and loses both. Those are the abstract
 * `carousel-bg-*` slots in the editorial manifest.
 */
const COVER = {
  launchWeek: "category-ultimate-valkyrie-legacy-variable-9-image",
  clearance: "category-spriggan-requiem-0-zeta-image",
  spin: "category-storm-spriggan-knuckle-unite-image",
  vote: "category-astral-spriggan-over-quattro-0-image",
  raffle: "category-dranzer-g-image",
} as const;

const _raweventsSeedData: EventDocument[] = [
  // ── UPCOMING — Offer: 10% festive cashback, code published early ─────────
  /*
   * 🛑 `type: "offer"` + `offerConfig.displayCode` is what renders the
   * COPY-TO-CLIPBOARD card. `events/[id]/page.tsx` mounts `<EventOfferCard>`
   * on exactly that pair; a `sale` event renders `<EventSaleBanner>`, which
   * shows the code as text with no copy button.
   *
   * 🛑 `status: "active"` with a FUTURE `startsAt` is how this codebase
   * spells "coming soon". There is no `upcoming` member of the status union,
   * and `listPublicEvents` hard-filters `status==active` — so a `draft` here
   * would be invisible on `/events` AND on the homepage strip, which is the
   * opposite of what an announcement is for.
   *
   * 🛑 `startsAt` and every coupon's `validity.startDate` are now the SAME
   * IMPORTED CONSTANT. This comment used to say they must match and that both
   * were `daysAhead(7)`; the coupon file said the same thing about
   * `daysAhead(16)`. They were nine days apart, so the event advertised a code
   * that `isCouponValid` refused — see `_helpers/festive-window.ts`.
   *
   * 🛑 `isPinned` keeps this at the top of /events and the homepage strip for
   * the whole season. It is applied in memory by `sortPinnedFirst`, NOT by a
   * Firestore `orderBy` — ordering on a field that every other event lacks
   * would return only this row and empty the page (Root Cause #100).
   */
  {
    id: "event-festive-cashback-10",
    slug: "festive-cashback-10",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Diwali to New Year: Four Offers, Three Months",
    description:
      `<p><strong>Our festive season opens on Dhanteras — Friday 6 November 2026 — and the offers below run right through to 5 February 2027.</strong></p>` +
      `<p>You picked these. We ran a community poll asking which offers to run from Diwali to New Year, and <strong>Buy 3, Get 1 Free</strong> won with 28 of the 33 votes. We are running the other three as well.</p>` +
      `<h2>The offers</h2>` +
      `<ul>` +
      `<li><strong>BUY3GET1</strong> — Buy 3, get 1 free on items priced ₹2,000 or under. <strong>Add four qualifying items and the cheapest of the four comes off.</strong> Items above ₹2,000 do not count towards it.</li>` +
      `<li><strong>CASHBACK500</strong> — 10% of your order value back, up to ₹500, on any order.</li>` +
      `<li><strong>CASHBACK5</strong> — 5% back with no upper limit. Worth more than CASHBACK500 once your order passes ₹10,000.</li>` +
      `<li><strong>FREESHIP2000</strong> — free delivery on any order above ₹2,000.</li>` +
      `</ul>` +
      `<h2>Diwali fortnight only</h2>` +
      `<p><strong>CASHBACK10</strong> gives 10% back up to ₹1,000 on orders above ₹999. It is the festival code rather than a season one, so it runs from Dhanteras only until <strong>16 November</strong>. Over the Diwali fortnight it is the best code on the list for any order between ₹999 and ₹10,000.</p>` +
      `<h2>How it works</h2>` +
      `<ol><li>Copy the code you want from the card below, or from the list above.</li>` +
      `<li>Paste it at checkout from Dhanteras onwards.</li>` +
      `<li>Cashback is credited to your wallet within 24 hours of delivery.</li></ol>` +
      `<h2>The rules, plainly</h2>` +
      `<p><strong>One code per order.</strong> These are all store-wide codes and they do not stack with each other, so pick whichever is worth most on your basket. Each is one use per account.</p>` +
      `<p><em>The codes are published now so you can save them. They become spendable when the sale opens on 6 November.</em></p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    /*
     * 🛑 The event's OWN window is the season, so it stays visible and
     * readable for the full three months. `endsAt` here is not what gates a
     * code — each coupon carries its own `validity`, which is why CASHBACK10
     * can expire on 16 November inside an event that runs to February.
     */
    startsAt: SEASON_START,
    endsAt: SEASON_END,
    isPinned: true,
    coverImage: {
      type: "image",
      url: editorialImage("event-cover-diwali-lamps"),
      alt: "Lit clay diya lamps glowing in a row at night for Diwali",
    },
    tags: ["offer", "cashback", "diwali", "festive", "new-year", "bogo", "free-shipping"],
    /*
     * 🛑 `offerConfig` still holds exactly ONE code — it drives the single
     * headline copy-to-clipboard card and the type has no array form.
     * BUY3GET1 is featured because it is what the poll actually voted for.
     *
     * This comment used to end: "Do not 'fix' this by inventing a second
     * couponId field: the card component reads this shape, and a field
     * nothing renders is worse than the prose that currently works."
     *
     * That was correct, and its PREMISE has since changed: `couponIds` below
     * is rendered by `<AttachedCouponsSection>` on the event page. So the
     * other four codes are no longer prose-only. The reasoning is worth
     * keeping anyway — it is the right test for any field like this, and the
     * answer only flipped because a renderer landed, not because the rule
     * softened.
     */
    offerConfig: {
      couponId: "coupon-buy3get1",
      displayCode: "BUY3GET1",
      bannerText: "Buy 3, get 1 free on items under ₹2,000 — add 4 and the cheapest comes off. Plus 3 more codes inside.",
    },
    /*
     * The four codes the description lists in prose, now also rendered as
     * copyable cards.
     *
     * 🛑 BUY3GET1 is deliberately ABSENT — it is already the `offerConfig`
     * headline card directly above, and listing it again would render the
     * same code twice on one page. The two fields are different jobs: that
     * one is the offer, these are the rest of the list.
     *
     * CASHBACK10 is included even though it expires mid-season on 16 November
     * while the event runs to February. That is the fixture that proves
     * `getAttachedCoupons` drops an expired coupon rather than advertising a
     * code the till will refuse — after the 16th this card should simply stop
     * appearing, with the other three unaffected.
     */
    couponIds: [
      "coupon-cashback10",
      "coupon-cashback500",
      "coupon-cashback5",
      "coupon-freeship2000",
    ],
    /*
     * The season hub slide — SIX tiles, one per thing running this festive
     * season, each linking to its own page.
     *
     * 🛑 THIS IS WHY `placement: "cards"` EXISTS. The rail renders at most
     * `MAX_ACTIVE_SLIDES` (5), and four of those are standing messages
     * (how-to-shop, authenticity, pre-orders, and the launch sale below).
     * Giving each of the six promotions its own overlay slide would need six
     * slots we do not have; one tiled slide advertises all six inside one.
     *
     * Zones are the 2x3 desktop grid — 1·2·3 across the top, 4·5·6 beneath.
     * On a phone they flow in this source order, one per row, which is why
     * the two strongest offers are zones 1 and 2 rather than buried at 5–6.
     */
    /*
     * The PUBLISH decision, separate from the slide's content below — see
     * `EventDocument.showOnCarousel`. Set here so the rail renders exactly as
     * it did before the flag existed; `carouselConfig.active` stays only as
     * the read-only fallback for documents already in Firestore.
     */
    showOnCarousel: true,
    carouselConfig: {
      placement: "cards",
      order: 2,
      active: true,
      /*
       * 🛑 AN IMAGE THAT ALREADY EXISTS, not the new Openverse slot.
       *
       * `carousel-bg-festive-deals` is declared in the editorial manifest
       * but has not been fetched or uploaded, so `/media/<slug>` would 404
       * and the slide would render as a bare dark box — a broken image is
       * not an error anywhere, which is exactly how 504 category covers
       * served 404s for three days while every gate stayed green.
       *
       * `carousel-bg-cashback` is real, abstract, already in Storage, and
       * was freed when the old Diwali slide switched to the event cover —
       * the manifest says so: "stays in MEDIA for the next promo". This is
       * the next promo.
       *
       * Swap to the Openverse slug once `fetch-openverse-images.mjs` and
       * `push-editorial-images.mjs` have actually run for it.
       */
      backgroundMediaSlug: "carousel-bg-cashback",
      dimOpacity: 0.62,
      cards: [
        {
          zone: 1,
          mediaSlug: COVER.launchWeek,
          eyebrow: "Buy 3, get 1 free",
          title: "BUY3GET1",
          description: "Four items under ₹2,000 — the cheapest comes off.",
          buttonText: "Copy the code",
        },
        {
          zone: 2,
          mediaSlug: COVER.clearance,
          eyebrow: "Opens Dhanteras",
          title: "10% back, up to ₹1,000",
          description: "CASHBACK10, on orders over ₹999. Diwali fortnight only.",
          buttonText: "See all four codes",
        },
        {
          zone: 3,
          mediaSlug: COVER.spin,
          eyebrow: "Daily, free",
          title: "Spin the Launcher",
          description: "One spin a day through the Diwali fortnight.",
          href: "/events/spin-the-launcher",
          buttonText: "Take your spin",
        },
        {
          zone: 4,
          mediaSlug: COVER.launchWeek,
          eyebrow: "6–20 November",
          title: "Beyblade X Launch Week",
          description: "The X range, with the festive codes on top.",
          href: "/events/beyblade-x-launch-week",
          buttonText: "Shop the range",
        },
        {
          zone: 5,
          mediaSlug: COVER.raffle,
          eyebrow: "Free to enter",
          title: "Signed Dranzer G",
          description: "One raffle, one winner, drawn 1 December.",
          href: "/events/signed-dranzer-raffle",
          buttonText: "Enter the raffle",
        },
        {
          zone: 6,
          mediaSlug: COVER.vote,
          eyebrow: "Your call",
          title: "What should we restock?",
          description: "Vote on what we bring back in 2027.",
          href: "/events/restock-vote-2027",
          buttonText: "Cast a vote",
        },
      ],
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-festive-cashback-10"] ?? 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  } as EventDocument,
];

// ── Event Entries ────────────────────────────────────────────────────────────

/*
 * 🛑 `EventEntryPlain`: these fixtures hold REAL plaintext and `seed-cli`
 * encrypts the PII fields on write. The document type now declares them
 * `Encrypted<string>`, so the document type would be a false claim.
 */
export const eventEntriesSeedData: EventEntryPlain[] = [
];

/**
 * Tokens derived here, not per record — see _helpers/search-txt-wrappers.ts for
 * why the wrapper form is what makes omission impossible.
 */
export const eventsSeedData: EventDocument[] =
  _raweventsSeedData.map(withEventSearchTxt);
