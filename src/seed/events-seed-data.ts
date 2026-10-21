/*
 * WHY: Seeds the ONE live event — the Diwali cashback offer.
 * WHAT: 1 active `offer` event, published ahead of its own start date.
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

const NOW = new Date();
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

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
   * 🛑 `startsAt` MUST match `coupon-cashback10`'s `validity.startDate`
   * (both `daysAhead(7)`). The code is deliberately readable before it is
   * spendable; two independently-typed dates would silently break that in one
   * direction or the other.
   */
  {
    id: "event-festive-cashback-10",
    slug: "festive-cashback-10",
    type: EVENT_FIELDS.TYPE_VALUES.OFFER,
    title: "Diwali Cashback: 10% Back on Every Order",
    description:
      `<p><strong>Our Diwali sale opens on Dhanteras — Friday 6 November — and runs through the festival.</strong></p>` +
      `<p>Spend ₹999 or more and get <strong>10% of your order value back</strong>, up to ₹1,000. It applies right across the catalogue — Beyblade X tops, spares, sticker sheets and bundles alike.</p>` +
      `<img src="${editorialImage("event-content-diwali-fireworks")}" alt="Fireworks over a city skyline at night" />` +
      `<h2>How it works</h2>` +
      `<ol><li>Copy the code <strong>CASHBACK10</strong> below.</li>` +
      `<li>Paste it at checkout from Dhanteras onwards.</li>` +
      `<li>Cashback is credited to your wallet within 24 hours of delivery.</li></ol>` +
      `<h2>Dates</h2>` +
      `<p>Dhanteras falls on Friday 6 November 2026 and Diwali itself on Sunday 8 November. The code stays live until 16 November, so there is a week after Bhai Dooj to use it.</p>` +
      `<p><em>The code is published now so you can save it ahead of time. It becomes spendable when the sale opens — one use per account, up to ₹1,000 back.</em></p>`,
    status: EVENT_FIELDS.STATUS_VALUES.ACTIVE,
    startsAt: daysAhead(7),
    endsAt: daysAhead(26),
    coverImage: {
      type: "image",
      url: editorialImage("event-cover-diwali-fireworks"),
      alt: "Fireworks over a city skyline at night",
    },
    tags: ["offer", "cashback", "diwali", "festive", "coming-soon"],
    offerConfig: {
      couponId: "coupon-cashback10",
      displayCode: "CASHBACK10",
      bannerText: "Diwali: 10% back on orders above ₹999, up to ₹1,000. One use per account.",
    },
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
