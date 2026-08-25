/*
 * WHY: `POST /api/store/analytics/alerts` and `POST /api/store/analytics/cards`
 *      both spread the raw request body into Firestore.
 *
 *      The alert one matters most. An analytics alert is a rule that FIRES —
 *      `metric`, `operator`, `threshold` and `windowHours` are what a scheduled
 *      job evaluates, and none of the four was checked. A `threshold` arriving
 *      as the string "50" from a number input was written as a string, so the
 *      comparison the alert exists to perform would run against a string; an
 *      `operator` outside the real six matched nothing; and `windowHours` was
 *      unbounded, so a rule could ask a job to look back a hundred years.
 *
 *      Neither failure surfaces as an error. The alert is created, listed, and
 *      looks configured — it simply never fires, or fires wrongly.
 *
 * WHAT: The two create contracts.
 *
 * ## `scope` / `ownerId` / `isBuiltIn` are absent on purpose
 *
 * The routes pin all three. `scope` in particular decides whether a row is a
 * seller's or the platform's, so accepting it from the body would let a seller
 * file an admin-scoped card.
 *
 * EXPORTS:
 *   analyticsAlertCreateSchema, analyticsCardCreateSchema,
 *   ANALYTICS_ALERT_OPERATORS, ANALYTICS_CARD_TYPES,
 *   type AnalyticsAlertCreateValues, type AnalyticsCardCreateValues
 *
 * @tag domain:store-extensions,analytics
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/store/analytics/alerts,/api/store/analytics/cards
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { AlertOperator, AnalyticsCardType } from "./firestore";
import { firestoreValueSchema } from "../../../schemas/firestore-value";

/*
 * Keyed `Record<Union, true>` so BOTH mistakes are compile errors — a value
 * added to the union and forgotten here, and a value here that is not real.
 */
const ALERT_OPERATOR_MAP: Record<AlertOperator, true> = {
  ">": true,
  "<": true,
  ">=": true,
  "<=": true,
  "==": true,
  "!=": true,
};
export const ANALYTICS_ALERT_OPERATORS = Object.keys(ALERT_OPERATOR_MAP) as [
  AlertOperator,
  ...AlertOperator[],
];

const CARD_TYPE_MAP: Record<AnalyticsCardType, true> = {
  metric: true,
  line: true,
  bar: true,
  pie: true,
  table: true,
  custom: true,
};
export const ANALYTICS_CARD_TYPES = Object.keys(CARD_TYPE_MAP) as [
  AnalyticsCardType,
  ...AnalyticsCardType[],
];

/** One year. A window beyond this is a typo, not a reporting period. */
const MAX_WINDOW_HOURS = 24 * 365;

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const analyticsAlertCreateSchema = z
  .object({
    label: annotate(z.string().min(1, "Give the alert a name.").max(120), {
      section: "alert",
      sectionLabel: "Alert",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "full",
    }),
    metric: annotate(z.string().min(1, "Choose a metric to watch."), {
      section: "rule",
      sectionLabel: "When to fire",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    operator: annotate(z.enum(ANALYTICS_ALERT_OPERATORS), {
      section: "rule",
      quick: true,
      order: 2,
      row: "pair",
    }),
    // Coerced. A number input sends a string, and an uncoerced threshold is
    // compared as a string by whatever evaluates the rule — "9" > "10".
    threshold: annotate(z.coerce.number({ invalid_type_error: "Set a numeric threshold." }), {
      section: "rule",
      quick: true,
      order: 3,
      row: "pair",
      kind: "number",
    }),
    windowHours: annotate(
      z.coerce
        .number()
        .int("The window must be a whole number of hours.")
        .min(1, "The window must be at least an hour.")
        .max(MAX_WINDOW_HOURS, "That window is longer than a year."),
      { section: "rule", quick: true, order: 4, row: "pair", kind: "number" },
    ),
    isActive: annotate(z.boolean().optional(), {
      section: "delivery",
      sectionLabel: "Delivery",
      order: 1,
      row: "quarter",
    }),
    notifyChannels: annotate(
      z.array(z.enum(["in-app", "email", "whatsapp"])).min(1).optional(),
      { section: "delivery", order: 2, row: "full", kind: "list" },
    ),
  })
  .strict();

export type AnalyticsAlertCreateValues = z.infer<typeof analyticsAlertCreateSchema>;

export const analyticsCardCreateSchema = z
  .object({
    title: annotate(z.string().min(1, "Give the card a title.").max(120), {
      section: "card",
      sectionLabel: "Card",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "full",
    }),
    type: annotate(z.enum(ANALYTICS_CARD_TYPES), {
      section: "card",
      quick: true,
      order: 2,
      row: "pair",
    }),
    metric: annotate(z.string().min(1, "Choose a metric."), {
      section: "card",
      quick: true,
      order: 3,
      row: "pair",
    }),
    // Deliberately open — filter shape varies by card type, and a closed schema
    // would silently strip whatever the builder produced for a type it did not
    // enumerate.
    filters: annotate(z.record(firestoreValueSchema).optional(), {
      section: "card",
      order: 4,
      row: "full",
      kind: "list",
    }),
    position: annotate(z.coerce.number().int().min(0).optional(), {
      section: "layout",
      sectionLabel: "Layout",
      order: 1,
      row: "pair",
      kind: "number",
    }),
    isVisible: annotate(z.boolean().optional(), {
      section: "layout",
      order: 2,
      row: "quarter",
    }),
  })
  .strict();

export type AnalyticsCardCreateValues = z.infer<typeof analyticsCardCreateSchema>;
