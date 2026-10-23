/*
 * WHY: Seeds the ONE live event — the Diwali → New Year season offers.
 * WHAT: 1 active, PINNED `offer` event spanning 6 Nov 2026 → 5 Feb 2027,
 *       advertising the four codes a community poll chose plus the
 *       festival-only CASHBACK10.
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

const NOW = new Date();

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
      `<img src="${editorialImage("event-content-diwali-fireworks")}" alt="Fireworks over a city skyline at night" />` +
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
      url: editorialImage("event-cover-diwali-fireworks"),
      alt: "Fireworks over a city skyline at night",
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
    stats: { totalEntries: 0, approvedEntries: 0, flaggedEntries: 0 },
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
