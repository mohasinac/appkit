/**
 * Starter dispute reasons, one set per `DisputeKind`.
 *
 * ## 🛑 Why a seed exists at all for a creatable list
 *
 * The list is staff-creatable, which makes it tempting to ship empty and let
 * it grow. That would show the FIRST buyer who hits a problem an empty
 * dropdown — a required field with no options, which is a dead end they cannot
 * work around and which reads as the form being broken.
 *
 * So these are the reasons we already know buyers report. Staff add to them;
 * nobody has to.
 *
 * ## The wording is buyer-facing and first-person on purpose
 *
 * It matches `RETURN_REASON_LABEL` ("It never arrived", "I changed my mind")
 * rather than an internal taxonomy ("NON_DELIVERY"). A buyer picking from this
 * list is describing their own experience, and a dropdown written in our
 * vocabulary makes them guess which of our categories their problem is.
 *
 * `createdByName` is the platform itself for seeded rows — honest, and it
 * distinguishes "we shipped this" from "an agent added it on 12 Nov".
 */

import type { DisputeReasonDocument } from "../features/dispute-reasons/schemas/firestore";

const SEEDED_BY_NAME = "LetItRip";
const SEEDED_BY_UID = "system";

/** Fixed, so re-seeding is idempotent (Root Cause #25 — never `Date.now()`). */
const SEEDED_AT = new Date("2026-10-22T00:00:00.000Z");

function reason(
  label: string,
  kind: DisputeReasonDocument["kind"],
): DisputeReasonDocument {
  return {
    id: `dreason-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`,
    label,
    kind,
    isActive: true,
    createdByName: SEEDED_BY_NAME,
    createdByUid: SEEDED_BY_UID,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
}

export const disputeReasonsSeedData: DisputeReasonDocument[] = [
  /*
   * ── item: only filable once the order was received ──────────────────────
   *
   * Deliberately overlapping in SPIRIT with the fault half of
   * `RETURN_REASON`, and deliberately NOT the same list: a return is a
   * logistics flow that moves goods and money, a dispute is a complaint that
   * opens an investigation. A buyer may want the second without the first.
   */
  reason("It arrived damaged", "item"),
  reason("It's not what was described", "item"),
  reason("The wrong item was sent", "item"),
  reason("Part of the order is missing", "item"),
  reason("I think it's counterfeit", "item"),
  reason("It arrived too late to be useful", "item"),

  /*
   * ── not_reached: only filable once the ETD is 3+ days past ──────────────
   *
   * Each of these is a DIFFERENT investigation, which is the whole reason the
   * list is finer-grained than the kind: "tracking says delivered" goes to the
   * carrier, "left somewhere unsafe" goes to the carrier with a different
   * question, and "tracking never updated" is usually a label that was printed
   * and never handed over — a seller problem wearing a courier costume.
   */
  reason("Tracking says delivered but I don't have it", "not_reached"),
  reason("It was left somewhere unsafe", "not_reached"),
  reason("Tracking hasn't updated in days", "not_reached"),
  reason("It was returned to the sender", "not_reached"),
  reason("Someone else signed for it", "not_reached"),
];
