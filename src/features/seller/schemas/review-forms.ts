/*
 * WHY: The seller's reviews page has FOUR write surfaces — reply, bulk reply,
 *      contest, send-feedback — and not one of them had a schema. Every guard
 *      was a `disabled={!text.trim()}` on the button, which is a UI hint, not a
 *      rule: it says nothing about the ceiling the route enforces, and it
 *      cannot say anything at all about content.
 *
 *      The reply route caps at 1000 characters. The textarea carried
 *      `maxLength={1000}`, so the browser truncated silently rather than
 *      saying so — a seller writing a long reply lost the tail with no message.
 *      A schema puts the same number where it can be reported.
 *
 *      The contest route trims and requires a non-empty `reason` and nothing
 *      more, so "x" filed a moderation request a human then has to interpret.
 *      A ten-character floor matches the admin offer-cancel reason, which is
 *      the same kind of record: the only durable account of why.
 *
 * WHAT: One schema per surface. Each is a single field, and that is the point —
 *       they are the same shape as `hardBanReasonSchema`, and they get the same
 *       error summary and section badge as every other form.
 *
 * EXPORTS:
 *   reviewReplySchema, reviewBulkReplySchema, reviewContestSchema,
 *   reviewFeedbackSchema, and their value types
 *
 * @tag domain:seller,reviews
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:SellerReviewsView
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

/** Matches `replySchema` on `POST /api/store/reviews/[id]/reply`. */
export const reviewReplySchema = z.object({
  reply: annotate(
    z
      .string()
      .trim()
      .min(1, "Write a reply before posting it.")
      .max(1000, "A reply is capped at 1000 characters."),
    {
      section: "reply", sectionLabel: "Store reply", sectionRequired: true,
      quick: true, order: 1, row: "full", kind: "textarea",
      help: "Shown publicly beneath the buyer's review.",
    },
  ),
});

export type ReviewReplyValues = z.infer<typeof reviewReplySchema>;

/** The same reply, posted on every selected review. */
export const reviewBulkReplySchema = z.object({
  reply: annotate(
    z
      .string()
      .trim()
      .min(1, "Write a reply before sending it.")
      .max(1000, "A reply is capped at 1000 characters."),
    {
      section: "reply", sectionLabel: "Reply", sectionRequired: true,
      quick: true, order: 1, row: "full", kind: "textarea",
      help: "The same reply will be posted on all selected reviews.",
    },
  ),
});

export type ReviewBulkReplyValues = z.infer<typeof reviewBulkReplySchema>;

/** Flags a review for admin investigation. */
export const reviewContestSchema = z.object({
  reason: annotate(
    z
      .string()
      .trim()
      .min(10, "Say why this review should be investigated — at least 10 characters.")
      .max(1000),
    {
      section: "contest", sectionLabel: "Reason", sectionRequired: true,
      quick: true, order: 1, row: "full", kind: "textarea",
      help: "Fake, abusive, off-topic — be specific; a moderator reads this.",
    },
  ),
});

export type ReviewContestValues = z.infer<typeof reviewContestSchema>;

/** A private note to the buyer, never shown on the public review. */
export const reviewFeedbackSchema = z.object({
  feedback: annotate(
    z
      .string()
      .trim()
      .min(1, "Write your message before sending it.")
      .max(1000, "Keep the message under 1000 characters."),
    {
      section: "feedback", sectionLabel: "Feedback", sectionRequired: true,
      quick: true, order: 1, row: "full", kind: "textarea",
      help: "Sent to the buyer's notification inbox. Does not appear on the review.",
    },
  ),
});

export type ReviewFeedbackValues = z.infer<typeof reviewFeedbackSchema>;
