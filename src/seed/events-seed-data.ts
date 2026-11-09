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
 * 🛑 The three chance-based event types were RENAMED on 2026-10-31 —
 * `raffle` -> `giveaway`, `spin_wheel` -> `bonus-spin`, `giveaway` ->
 * `random-draw`. The historical accounts below deliberately keep the OLD
 * spellings: the rows they describe were written and deleted under those
 * names, and rewriting them would falsify the record.
 *
 * 🛑 CONSEQUENCE, recorded rather than rediscovered — this re-opens exactly
 * the gap the 2026-10-21 prune noted and the 2026-10-24 addition closed:
 * `sale`, `poll`, `spin_wheel` and `raffle` have NO fixture again, so the
 * tester cases for those four types, and `saleConfig`/`EventSaleBanner` (whose
 * only fixture this ever had was one of the five), can again only report
 * "could not test". `survey`, `feedback` and `giveaway` never had one.
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
 * survey, sale, raffle, spin_wheel, feedback, offer, giveaway) plus 8 event
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
 * cases that need a poll, a survey, a spin wheel, a raffle, a giveaway, or a
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

const _raweventsSeedData: EventDocument[] = [
  /*
   * ── PHOTO CONTEST — the fixture for the entry-voting mechanism ─────────
   *
   * Owner spec 2026-11-08, implemented 2026-11-09. This row is the reason the
   * whole `entryVoting` chain exists, and until it was added the chain had NO
   * fixture at all: the vote endpoint was verified only by its 401, the five
   * `entryRanking` rule sets had nothing to rank, and the entries gallery had
   * nothing to render.
   *
   * 🛑 `type: "contest"` IS A SEED SLUG, NOT A CODE CONSTANT, and that is the
   * whole point of the 2026-11-08 change. `EVENT_FIELDS.TYPE_VALUES` has no
   * CONTEST member and must not gain one — event `type` is an open validated
   * slug precisely so a new kind of event is a ROW, not an enum edit and a
   * deploy. The matching definition lives in `event-types-seed-data.ts`, which
   * declares the mechanisms this type switches on
   * (`submission`, `entryVoting`, `prizePool`, `capacityLimit`, `ageGate`) and
   * binds `ruleSets.entryRanking: "ranking-most-likes"`.
   *
   * So the RANKING is config too: swapping most-likes for net-score (which
   * renders dislikes) or for jury is editing one seed field, not a resolver.
   * `resolveEntryRanking` has a `default:` branch returning 0, so a newer rule
   * key against an older deploy degrades instead of taking the page down.
   *
   * 🛑 `isTestData: true` + `testDataExpiresAt`. The owner's standing decision
   * on demo data is "seed it, CLEARLY MARKED, with a delete path proven by
   * experiment". Both flags are what make this row findable and removable
   * later — a demo row that cannot be distinguished from a real one is how a
   * fixture becomes permanent furniture.
   *
   * ⚠ NO ENTRIES ARE SEEDED ALONGSIDE THIS IN PRODUCTION (owner, 2026-11-09:
   * demo entries in dev-db, none in prod). `manifest.ts` keeps
   * `eventEntries: []`, so a production load creates the contest and nothing
   * inside it. The gallery is empty until real people enter, which is the
   * honest state for a live site.
   */
  {
    id: "event-photo-contest-diwali",
    slug: "diwali-photo-contest",
    type: "contest" as EventDocument["type"],
    title: "Diwali Photo Contest: Show Us Your Setup",
    description:
      `<p><strong>Photograph your Beyblade setup and the community picks the winner.</strong></p>` +
      `<h2>How to enter</h2>` +
      `<ol>` +
      `<li>Take a photo of your collection, your stadium, or a battle in progress.</li>` +
      `<li>Submit it below — one entry per account, up to four images.</li>` +
      `<li>Entries are reviewed before they appear in the gallery.</li>` +
      `</ol>` +
      `<h2>How the winner is decided</h2>` +
      `<p>Entries are ranked by <strong>likes</strong>. Anyone signed in can vote, one vote per entry, and you can change your mind — voting again on the same entry takes your vote back.</p>` +
      `<p><strong>Vote counts are public; who voted is not.</strong> Ties are broken by whichever entry was submitted first, so an early entry is never beaten by a later one on an equal score.</p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: SEASON_START,
    endsAt: SEASON_END,
    isPinned: false,
    coverImage: {
      type: "image",
      url: editorialImage("event-cover-diwali-lamps"),
      alt: "Lit clay diya lamps glowing in a row at night",
    },
    tags: ["contest", "photo", "ugc", "diwali", "community"],
    /*
     * 🛑 MODERATED, set EXPLICITLY on this row (owner, 2026-11-09:
     * auto-approve or moderator approval is configured on the event itself).
     *
     * It is spelled out rather than left to the default for two reasons.
     * First, this is USER-SUBMITTED PHOTOGRAPHY on a public gallery — the one
     * content type where "it defaulted to the safe thing" is not good enough
     * to rely on. Second, `contest` was absent from the hardcoded type switch
     * this field replaced, so it was moderated by ACCIDENT; an explicit value
     * turns that accident into a decision.
     *
     * Flip to `"auto"` to publish entries immediately. That is a seed edit,
     * not a deploy — which is the whole point of moving it onto the row.
     */
    entryApproval: "moderated",
    showOnCarousel: false,
    /*
     * 🛑 NOT `isTestData`. It was set here on first write, reasoning from the
     * standing "seed demo data, CLEARLY MARKED, with a delete path" decision —
     * and that was the wrong rule for this row.
     *
     * This is a REAL contest the owner asked to run in production, not a
     * fixture. And `isTestData` is not a label: its documented job is to keep
     * rows OUT of public surfaces (appkit's sitemap builder filters on it for
     * exactly that reason, and it is the only field distinguishing this row
     * from the offer beside it).
     *
     * Symptom while it was set: the events index showed **"2 RUNNING" above a
     * grid containing ONE card**. The count and the list disagreed, which is
     * the same shape as the sitemap's "16 fetched / 0 kept" — a filter applied
     * to one query and not the other.
     *
     * If a genuinely disposable contest fixture is ever needed, mark THAT one.
     * Do not mark a live contest to make it feel reversible.
     */
    /*
     * Zeroed, not omitted. `totalEntries`/`approvedEntries` are read
     * unconditionally by the entries surfaces, and a document MISSING an
     * `orderBy` field drops out of its own index entirely (Root Cause #100) —
     * a contest that does not appear in the contest list.
     */
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  },
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
    /*
     * 🛑 SWITCHED FROM `placement: "cards"` TO `"overlay"`, 2026-11-01 —
     * found live, by the owner, as "4/6 back to back cards" instead of the
     * one clean hero slide every other event on this rail gets.
     *
     * `"cards"` is the mode CLAUDE.md's own "Homepage Hero Carousel"
     * section already documents as having "no authoring surface in the
     * simplified admin form and should not be reached for without a real
     * need" — this row predates that simplification and was the one place
     * still exercising it. Six small zone cards crammed into one slide,
     * each needing its own `mediaSlug` to look finished, is also simply a
     * worse result than one full-bleed hero with the offers summarized —
     * the SAME six codes already render properly as cards in the
     * `HomepageCouponsSection` ("Offers & coupons") lower on the page, so
     * nothing here is losing its only home.
     *
     * `backgroundMediaSlug: "carousel-bg-cashback"` is unchanged — it was
     * already confirmed real/uploaded (see the comment history below,
     * kept for the record of why this specific slug was chosen over
     * `carousel-bg-festive-deals`, which 404s).
     */
    carouselConfig: {
      placement: "overlay",
      order: 2,
      active: true,
      /*
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
      eyebrow: "Dhanteras through 5 February",
      title: "Four Offers, Three Months",
      description:
        "Buy 3 Get 1 Free, up to 10% cashback, and free shipping — stack whichever code is worth most on your basket.",
      buttonText: "See all the offers",
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
