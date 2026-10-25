/*
 * WHY: Seeds the live events — the Diwali → New Year season.
 * WHAT: 6 active events. The PINNED `offer` hub (6 Nov 2026 → 5 Feb 2027,
 *       advertising the four codes a community poll chose plus the
 *       festival-only CASHBACK10), two `sale` events, a `spin_wheel`,
 *       a `poll` and a `raffle`.
 *
 * ## 🛑 FIVE EVENTS ADDED 2026-10-24, AND WHY THAT IS NOT A PRUNE REVERSAL
 *
 * The prune recorded below deleted ELEVEN DEMO events — placeholder rows that
 * existed to exercise UI, pointing at coupons and stores that no longer exist.
 * These five are the opposite: real seasonal content, written to run, each
 * anchored to a coupon that actually exists and carries its own validity.
 *
 * They also close the gap the prune's own consequence note predicted. It said
 * the tester cases needing a poll, a spin wheel or a raffle "now have NO
 * fixture" and "can only report could not test" — four of those three types
 * are back, as live content rather than as demo rows. `survey`, `feedback`
 * and `lottery` still have none.
 *
 * 🛑 `saleConfig` HAS NEVER HAD A FIXTURE UNTIL NOW. `EventSaleBanner` and the
 * whole `type: "sale"` branch of the detail page shipped with nothing to
 * render, so neither had ever been seen by anyone.
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
 * ── Windows for the five season events added 2026-10-24 ──────────────────
 *
 * Absolute IST instants, for the same reason `festive-window.ts` gives: a
 * `daysAhead(n)` offset moves the whole festival every time anyone reseeds,
 * so prose naming a weekday stops being true the next run.
 *
 * These live here rather than in `festive-window.ts` because that file exists
 * to hold ONE invariant — the event window and the coupon window that must
 * agree. None of these five opens a coupon window of its own: the two sale
 * events advertise codes that already exist and carry their own validity, so
 * there is no second file to disagree with.
 */
const LAUNCH_WEEK_END = new Date("2026-11-20T23:59:59+05:30");
const CLEARANCE_START = new Date("2026-11-21T00:00:00+05:30");
const CLEARANCE_END = new Date("2026-11-23T23:59:59+05:30");
const SPIN_END = new Date("2026-11-16T23:59:59+05:30");
const VOTE_END = new Date("2026-12-15T23:59:59+05:30");
const RAFFLE_END = new Date("2026-12-01T23:59:59+05:30");

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

  // ── SALE — Beyblade X launch week ────────────────────────────────────────
  /*
   * 🛑 THE FIRST `saleConfig` FIXTURE THIS CORPUS HAS EVER HAD.
   * `EventSaleBanner` and the whole `type: "sale"` branch shipped with no row
   * to render, so neither had ever been seen. See the `discountPercent` note.
   */
  {
    id: "event-beyblade-x-launch-sale",
    slug: "beyblade-x-launch-week",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Beyblade X Launch Week",
    description:
      `<p><strong>The Beyblade X range, for the two weeks either side of Diwali.</strong> Launch week runs from Dhanteras, Friday 6 November, to Friday 20 November 2026.</p>` +
      `<p>X is the fourth generation — the Xtreme Gear Ratchet system, the rail-launch stadiums, and a part pool that mixes with nothing that came before it. If you have been waiting to start, this is the fortnight to.</p>` +
      `<h2>What is in it</h2>` +
      `<ul>` +
      `<li>Starter sets, including the rail launchers</li>` +
      `<li>Loose blades, ratchets and bits as spares</li>` +
      `<li>Stadiums and the gear the X system needs</li>` +
      `</ul>` +
      `<h2>Stacking it with the festive codes</h2>` +
      `<p>Launch week sits inside the festive season, so the season codes apply here too. <strong>CASHBACK10</strong> is the one to use during the Diwali fortnight — 10% back up to ₹1,000 on anything over ₹999.</p>` +
      `<p><em>One code per order. If your basket is over ₹10,000, CASHBACK5 is worth more than the capped codes.</em></p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: SEASON_START,
    endsAt: LAUNCH_WEEK_END,
    coverImage: {
      type: "image",
      url: editorialImage(COVER.launchWeek),
      alt: "A Beyblade X top on its launcher",
    },
    tags: ["sale", "beyblade-x", "launch", "festive", "starter-set"],
    /*
     * 🛑 `discountPercent: 10` IS NOT A DISCOUNT THE TILL APPLIES.
     *
     * `SaleConfig` is display copy — `EventSaleBanner` renders it and nothing
     * reads it at checkout. So the number here MUST describe a mechanism that
     * really exists, and it describes CASHBACK10, which is a real coupon with
     * a real `validity` window attached below. Writing an arbitrary percentage
     * would advertise a reduction no code honours — the exact failure
     * `festive-window.ts` was created to stop happening in the other direction.
     */
    saleConfig: {
      discountPercent: 10,
      bannerText: "10% back on the X range with CASHBACK10 — up to ₹1,000, orders over ₹999.",
    },
    couponIds: ["coupon-cashback10", "coupon-freeship2000"],
    /*
     * The one event besides the season hub with its own slide. An overlay
     * rather than tiles: launch week is a single message with a single
     * destination, which is what an overlay is for.
     */
    showOnCarousel: true,
    carouselConfig: {
      placement: "overlay",
      order: 3,
      active: true,
      // Real and already uploaded, same reasoning as the hub slide above.
      // Freed when `slide-bundles-save` was deactivated this session.
      backgroundMediaSlug: "carousel-bg-bundles",
      dimOpacity: 0.58,
      eyebrow: "6–20 November",
      title: "Beyblade X Launch Week",
      description: "The whole X range, with 10% back on orders over ₹999.",
      buttonText: "Shop launch week",
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-beyblade-x-launch-sale"] ?? 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  } as EventDocument,

  // ── SALE — Burst clearance weekend ───────────────────────────────────────
  {
    id: "event-burst-clearance-weekend",
    slug: "burst-clearance-weekend",
    type: EVENT_FIELDS.TYPE_VALUES.SALE,
    title: "Burst Clearance Weekend",
    description:
      `<p><strong>Three days on the Burst generation — Saturday 21 to Monday 23 November 2026.</strong></p>` +
      `<p>Burst ran for seven years and left a deep parts pool behind it. We are clearing the shelves of the generation before X: God layers, Superking, Dynamite Battle, and the loose parts that go with them.</p>` +
      `<h2>Worth knowing</h2>` +
      `<ul>` +
      `<li>Burst parts do not fit the X system. If you are buying for an X top, this is not the sale.</li>` +
      `<li>Condition is stated on every listing — sealed, opened-complete, or loose.</li>` +
      `<li>Stock is what is on the shelf. When a listing goes, it is gone.</li>` +
      `</ul>` +
      `<h2>The code</h2>` +
      `<p><strong>FREESHIP2000</strong> takes the delivery charge off anything over ₹2,000, which is roughly where a three-top order lands. It runs the whole season, not just this weekend.</p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: CLEARANCE_START,
    endsAt: CLEARANCE_END,
    coverImage: {
      type: "image",
      url: editorialImage(COVER.clearance),
      alt: "A Burst-generation Beyblade disassembled into its layers",
    },
    tags: ["sale", "burst", "clearance", "spares", "festive"],
    saleConfig: {
      discountPercent: 0,
      bannerText: "Free delivery over ₹2,000 with FREESHIP2000. Three days only.",
    },
    couponIds: ["coupon-freeship2000", "coupon-cashback5"],
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-burst-clearance-weekend"] ?? 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  } as EventDocument,

  // ── SPIN WHEEL — one free spin a day over the Diwali fortnight ───────────
  /*
   * 🛑 `weight` IS THE ODDS AND NEVER REACHES A BROWSER. `toClientSpinPrize`
   * is an allow-list that emits `{id, label, isActive}` only, and the tester
   * asserts `weightsInPublicSource: 0`. The public wheel therefore draws
   * EQUAL segments — it shows what you could win, not what you are likely to.
   *
   * The weights below sum to 100 so they read as percentages at a glance.
   * `assignSpinPrize` picks with `crypto.randomInt(0, totalWeight)` inside a
   * transaction, so two concurrent spins cannot both take the same prize.
   */
  {
    id: "event-spin-the-launcher",
    slug: "spin-the-launcher",
    type: EVENT_FIELDS.TYPE_VALUES.SPIN_WHEEL,
    title: "Spin the Launcher",
    description:
      `<p><strong>One free spin a day, from Dhanteras to 16 November.</strong> No purchase, no entry fee — sign in and spin.</p>` +
      `<p>Every segment on the wheel is a real coupon that lands in your wallet the moment it stops. Most spins win the smaller codes; the free-shipping and cashback segments are rarer.</p>` +
      `<h2>How it works</h2>` +
      `<ol>` +
      `<li>Sign in and open this page during the fortnight.</li>` +
      `<li>Spin. The wheel stops on what you won.</li>` +
      `<li>Claim it — the code goes to your wallet and is yours to use at checkout.</li>` +
      `</ol>` +
      `<p><em>One spin per account per day. Coupons won here follow the same one-code-per-order rule as the rest of the season.</em></p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: SEASON_START,
    endsAt: SPIN_END,
    coverImage: {
      type: "image",
      url: editorialImage(COVER.spin),
      alt: "A Beyblade launcher with its ripcord drawn",
    },
    tags: ["spin-wheel", "festive", "diwali", "free", "coupons"],
    spinPrizes: [
      { id: "spin-cashback5", label: "5% back, no limit", couponId: "coupon-cashback5", weight: 30, isActive: true },
      { id: "spin-freeship", label: "Free delivery over ₹2,000", couponId: "coupon-freeship2000", weight: 25, isActive: true },
      { id: "spin-cashback500", label: "10% back, up to ₹500", couponId: "coupon-cashback500", weight: 20, isActive: true },
      { id: "spin-buy3get1", label: "Buy 3, get 1 free", couponId: "coupon-buy3get1", weight: 15, isActive: true },
      { id: "spin-cashback10", label: "10% back, up to ₹1,000", couponId: "coupon-cashback10", weight: 8, isActive: true },
      { id: "spin-again", label: "Spin again tomorrow", weight: 2, isActive: true },
    ],
    spinMaxPerUser: 1,
    spinWindowStart: SEASON_START,
    spinWindowEnd: SPIN_END,
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-spin-the-launcher"] ?? 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  } as EventDocument,

  // ── POLL — what to restock in 2027 ───────────────────────────────────────
  /*
   * 🛑 `resultsVisibility: "after_vote"` is the honest setting for a poll whose
   * result changes what we buy: showing the running tally BEFORE someone votes
   * pulls them toward whatever is already winning. It also gives the results
   * chart something to reveal, which "always" would not.
   */
  {
    id: "event-restock-vote-2027",
    slug: "restock-vote-2027",
    type: EVENT_FIELDS.TYPE_VALUES.POLL,
    title: "What should we restock in 2027?",
    description:
      `<p><strong>We have one container of shelf space to commit for the first half of 2027. You decide what goes in it.</strong></p>` +
      `<p>Voting runs to 15 December 2026. Results are published here as soon as you have voted, and the winning line is what we place the order for in January.</p>` +
      `<p>The last poll we ran chose BUY3GET1 over three other festive offers, 28 votes to 5 — and that is the offer running right now. These polls decide real things.</p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: SEASON_START,
    endsAt: VOTE_END,
    coverImage: {
      type: "image",
      url: editorialImage(COVER.vote),
      alt: "A shelf of boxed Beyblades",
    },
    tags: ["poll", "restock", "community", "2027"],
    pollConfig: {
      allowMultiSelect: false,
      allowComment: true,
      requireLogin: true,
      resultsVisibility: "after_vote",
      options: [
        { id: "opt-x-stadiums", label: "Beyblade X stadiums and rail gear" },
        { id: "opt-burst-parts", label: "Burst loose parts and spares" },
        { id: "opt-metal-fight", label: "Metal Fight classics" },
        { id: "opt-original-vintage", label: "Original-generation vintage" },
        { id: "opt-launchers", label: "Launchers and grips" },
      ],
    },
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-restock-vote-2027"] ?? 0 },
    createdBy: "user-admin-letitrip",
    createdAt: NOW,
    updatedAt: NOW,
  } as EventDocument,

  // ── RAFFLE — signed Dranzer G ────────────────────────────────────────────
  /*
   * 🛑 NO `raffleWinner*` FIELDS. The draw has not happened, and
   * `EventRaffleWinnerView` branches on `raffleWinnerUserId` being absent to
   * render "not drawn yet". Seeding a winner would publish a result for a
   * raffle nobody has entered.
   */
  {
    id: "event-signed-dranzer-raffle",
    slug: "signed-dranzer-raffle",
    type: EVENT_FIELDS.TYPE_VALUES.RAFFLE,
    title: "Win a Signed Dranzer G",
    description:
      `<p><strong>One Dranzer G, signed, going to one person. Free to enter, drawn on 1 December 2026.</strong></p>` +
      `<p>Entries are open to any signed-in account from Dhanteras until the end of 30 November. One entry per person — a second does not improve your odds and the form will tell you so.</p>` +
      `<h2>How the winner is picked</h2>` +
      `<p>An open raffle: every confirmed entry goes in, and one is drawn at random when entries close. The draw is run by a scheduled job, not by hand, and the result appears on this page the moment it runs.</p>` +
      `<p><em>Shipping within India is on us. You will need a delivery address on your account before we can send it.</em></p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: SEASON_START,
    endsAt: RAFFLE_END,
    coverImage: {
      type: "image",
      url: editorialImage(COVER.raffle),
      alt: "A Dranzer G Beyblade",
    },
    tags: ["raffle", "free", "giveaway", "dranzer", "festive"],
    hasRaffle: true,
    raffleType: "open_raffle",
    rafflePrize: "A signed Dranzer G, shipped free within India",
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0, likeCount: SEEDED_LIKE_COUNTS["event-signed-dranzer-raffle"] ?? 0 },
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
