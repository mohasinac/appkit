import type { ProductDocument } from "../../features/products/schemas";

/**
 * Seeded listings that explicitly ACCEPT change-of-mind returns.
 *
 * `finalSale` is absent on every other fixture, and absent means final sale —
 * so the default path is exercised by the bulk of the catalogue exactly as it
 * will be in production, where the field did not exist until now and no
 * pre-existing document carries it.
 *
 * One per listing type, deliberately. The "Final Sale" badge and the refund
 * gate both branch on this, and a badge that renders identically on every row
 * proves nothing: without at least one opted-out fixture per type there is no
 * way to tell "the predicate works" from "the predicate returns a constant".
 * That is the same reason the availability work seeded one unavailable row per
 * type rather than trusting the shared checks.
 *
 * Ids are listed rather than a `finalSale: false` written inline at each
 * record because the records live in nine files with five different export
 * wrappers, and a per-record edit is invisible to review — this set can be
 * read in one glance and cross-checked against the badge.
 */
export const RETURNABLE_FIXTURE_IDS: ReadonlySet<string> = new Set([
  // standard
  "product-beyblade-burst-valkyrie",
  // auction
  "auction-beyblade-x-shark-edge",
  // pre-order
  "preorder-beyblade-x-bx-09-glide-ring",
  // prize-draw
  "prizedraw-beyblade-scheduled-demo",
  // classified
  "classified-beyblade-x-starter-pune",
  // digital-code
  "digitalcode-beyblade-x-app-legendary-pack",
  // live
  "live-bonsai-juniper-10yr",
  // art
  "art-valkyrie-holographic-print",
  // stickers
  "stickers-beyblade-x-holographic-pack",
]);

/**
 * Set `finalSale: false` on the opted-out fixtures and leave it ABSENT on
 * every other record.
 *
 * Absent rather than `finalSale: true`, on purpose: writing the default
 * explicitly would mean the seed never produces the shape that production data
 * actually has, so `isFinalSale`'s handling of `undefined` — the only part of
 * it that can be got wrong — would go untested by the entire fixture set.
 *
 * Pure and deterministic, so it does not reintroduce the `appkit-seed`
 * idempotency problem of Root Cause #25.
 */
export function withFinalSale(
  p: Partial<ProductDocument>,
): Partial<ProductDocument> {
  // Spread FIRST so a record that sets `finalSale` itself keeps its own value;
  // this helper only fills in the opt-outs it owns.
  const next = { ...p };
  if (typeof next.finalSale === "undefined" && next.id && RETURNABLE_FIXTURE_IDS.has(next.id)) {
    next.finalSale = false;
  }
  return next;
}
