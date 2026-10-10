/**
 * Tax Codes Seed Data
 *
 * The HSN codes this catalogue actually needs, and nothing speculative.
 *
 * ## 🛑 Only chapter 9503 is VERIFIED
 *
 * The four 9503 rates below were confirmed against the current schedule. The
 * chapters for printed matter (4911) and playing cards (9504) are correct
 * chapters for merchandise we sell, and their RATES ARE NOT CONFIRMED — the
 * toys rates themselves moved in the 2025 revision. They are deliberately NOT
 * seeded: a wrong HSN on a real invoice is worse than an absent one, and an
 * absent code leaves `gstRate` undefined, which every reader already handles.
 *
 * Add them as a one-line seed change once someone has checked the schedule.
 *
 * ## The 18% row is load-bearing
 *
 * `tax-hsn-95030010` exists so the catalogue has at least one rate that is not
 * 5%. Without it a 5%-only dataset cannot distinguish "the rate is being
 * applied" from "the rate is hardcoded", and the B6 gate — the Tax row
 * rendering on a real order for the first time — would pass either way.
 *
 * ## The 0% row is an EXEMPTION, not a missing value
 *
 * `tax-exempt-0` carries no HSN, which is legal only at rate 0 (enforced in
 * both the form schema and the repository). It covers the live
 * plants/animals listings. `gstRate: 0` and `gstRate: undefined` mean
 * different things throughout — see the field's own comment.
 *
 * id === slug, prefix: tax-
 */

import type { TaxCodeDocument } from "../features/tax-codes/schemas/firestore";

/*
 * A FIXED date, not `Date.now()`. Seed files are re-imported on every
 * `appkit-seed` invocation, so a moving timestamp makes `load` non-idempotent
 * and `status`/`delete` unable to see what a prior run wrote — Root Cause #25.
 */
const SEEDED_AT = new Date("2026-10-10T00:00:00.000Z");

export const taxCodesSeedData: TaxCodeDocument[] = [
  {
    id: "tax-hsn-95030020",
    hsnCode: "95030020",
    label: "Toys, non-electronic incl. spinning tops (HSN 9503 0020) — 5%",
    description:
      "The default for this catalogue: every Beyblade, part, launcher and stadium.",
    gstRate: 5,
    chapter: "9503",
    isActive: true,
    notes:
      "Verified against the current GST schedule. Spinning tops are named explicitly in this sub-heading, which is why it is the default rather than 9503 0099.",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "tax-hsn-95030099",
    hsnCode: "95030099",
    label: "Other toys (HSN 9503 0099) — 5%",
    description:
      "Toys and collectibles that are not spinning tops and not electronic — figures, model kits, diecast.",
    gstRate: 5,
    chapter: "9503",
    isActive: true,
    notes: "Verified. The catch-all within chapter 9503 for non-electronic toys.",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "tax-hsn-95030010",
    hsnCode: "95030010",
    label: "Electronic toys (HSN 9503 0010) — 18%",
    description:
      "Toys whose function depends on electronics — anything battery-driven or with a screen.",
    gstRate: 18,
    chapter: "9503",
    isActive: true,
    notes:
      "Verified. 🛑 Keep at least one product on this code: it is the only row that proves the 18% branch is applied rather than a 5% rate being hardcoded.",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "tax-hsn-95030091",
    hsnCode: "95030091",
    label: "Parts of electronic toys (HSN 9503 0091) — 18%",
    description: "Components and spares for electronic toys.",
    gstRate: 18,
    chapter: "9503",
    isActive: true,
    notes: "Verified. Follows the parent heading's rate.",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "tax-exempt-0",
    hsnCode: "",
    label: "Exempt — 0% (no HSN)",
    description:
      "Live plants and live animals. An exemption, deliberately recorded rather than left unset.",
    gstRate: 0,
    chapter: "exempt",
    isActive: true,
    notes:
      "🛑 Rate 0 is a DECISION; `gstRate: undefined` is 'nobody has said'. Every reader tests `== null` rather than falsiness precisely so this row survives a default being applied elsewhere.",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
