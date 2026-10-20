"use client";

/**
 * Write or edit a review.
 *
 * ── This is the first review form the application has ever had ────────────
 *
 * 🛑 Measured before building: `useCreateReview` had ZERO component consumers,
 * `ReviewForm` did not exist, `ViewReviewModal` is read-only, `/user/reviews`
 * was index-only with no detail or edit route, and the ACTIONS registry had no
 * REVIEW bucket. The repo already knew — a tester case records
 * "createReviewAction, useCreateReview and the UI_TEXT.WRITE_REVIEW string all
 * exist, but no .tsx consumes any of them". So there was a complete write path
 * with nothing able to reach it.
 *
 * ── Field names, because the obvious guesses are all wrong ────────────────
 *
 *   body      → `comment`   (NOT `body`)
 *   owner     → `userId`    (NOT `buyerId`)
 *   verified  → `verified`  (there is no `isVerifiedPurchase`)
 *   reply     → `sellerReply`
 *
 * `REVIEW_UPDATABLE_FIELDS` is already `["rating","title","comment","images"]`,
 * so that is exactly what this form owns — and exactly what the PATCH route
 * accepts now that it is `.strict()`.
 *
 * 🛑 Images are deliberately NOT edited here. The PATCH route does not finalise
 * staged media, so a URL submitted through it would persist as a `tmp/`
 * reference; `updateReview` owns review media. Rather than ship a picker whose
 * uploads silently rot, this form edits the text and the rating.
 *
 * @tag domain:reviews
 * @tag layer:components
 * @tag access:client
 */

import { useEffect, useState } from "react";
import { z } from "zod";
import { apiClient } from "../../../http";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  Button,
  FieldInput,
  FieldTextarea,
  Form,
  Row,
  SideDrawer,
  Stack,
  Text,
} from "../../../ui";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/**
 * Mirrors the PATCH route's schema, which is `.strict()`. A field this form can
 * send that the route does not accept is a 400 naming it — which is the point:
 * the two were allowed to disagree before, and the route silently accepted
 * anything.
 */
export const reviewFormSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Pick a rating from 1 to 5")
    .max(5, "Pick a rating from 1 to 5"),
  title: z.string().trim().min(1, "Give your review a title").max(100),
  comment: z
    .string()
    .trim()
    .min(1, "Say something about the item")
    .max(2000, "Keep it under 2000 characters"),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export interface ReviewFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present = editing that review. Absent = writing a new one. */
  reviewId?: string;
  /** Required when writing; the review is filed against this product. */
  productId?: string;
  storeId?: string;
  initialValues?: Partial<ReviewFormValues>;
  /** Called after a successful save, so the caller can refetch. */
  onSaved?: () => void;
}

const EMPTY: ReviewFormValues = { rating: 0, title: "", comment: "" };

export function ReviewFormDrawer({
  isOpen,
  onClose,
  reviewId,
  productId,
  storeId,
  initialValues,
  onSaved,
}: ReviewFormDrawerProps) {
  const editing = Boolean(reviewId);
  const [values, setValues] = useState<ReviewFormValues>({
    ...EMPTY,
    ...initialValues,
  });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /*
   * Re-seed when the drawer is reopened for a DIFFERENT review. Without this
   * the second review a buyer edits in one session shows the first one's text
   * — the component stays mounted, so initial state alone is not enough.
   */
  useEffect(() => {
    if (isOpen) setValues({ ...EMPTY, ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reviewId]);

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit your review" : "Write a review"}
    >
      <Form
        schema={reviewFormSchema}
        onSubmit={(e) => e.preventDefault()}
        className="space-y-4"
      >
        {({ setFieldError, clearErrors, markSubmitAttempted }) => (
          <Stack gap="md">
            {/*
              Mandatory on every schema-driven form in this codebase — it reads
              FormShellContext directly and is gated on a submit ATTEMPT, so it
              does not accuse the user of mistakes before they have typed.
            */}
            <FormErrorSummary />

            <Stack gap="xs">
              <Text size="sm" weight="medium">
                Rating
              </Text>
              <Row gap="xs" align="center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconButton
                    key={n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    aria-pressed={values.rating === n}
                    size="md"
                    variant="ghost"
                    icon={
                      <Icon
                        name="review"
                        size="lg"
                        filled={n <= values.rating}
                        tone={n <= values.rating ? "warning" : "faint"}
                      />
                    }
                    onClick={() => setValues((v) => ({ ...v, rating: n }))}
                  />
                ))}
              </Row>
            </Stack>

            <FieldInput
              name="title"
              label="Title"
              required
              value={values.title}
              onChange={(title) => setValues((v) => ({ ...v, title }))}
            />

            <FieldTextarea
              name="comment"
              label="Your review"
              required
              rows={6}
              value={values.comment}
              onChange={(comment) => setValues((v) => ({ ...v, comment }))}
            />

            {formError && (
              <Text size="sm" color="error" role="alert">
                {formError}
              </Text>
            )}

            <Button
              type="submit"
              isLoading={busy}
              action={editing ? ACTIONS.REVIEW.edit : ACTIONS.REVIEW.write}
              onClick={async () => {
                clearErrors();
                setFormError(null);
                markSubmitAttempted?.();

                const parsed = reviewFormSchema.safeParse(values);
                if (!parsed.success) {
                  for (const issue of parsed.error.issues) {
                    setFieldError(String(issue.path[0]), issue.message);
                  }
                  return;
                }

                setBusy(true);
                try {
                  if (editing) {
                    await apiClient.patch(`/api/reviews/${reviewId}`, parsed.data);
                  } else {
                    await apiClient.post("/api/reviews", {
                      ...parsed.data,
                      productId,
                      storeId,
                    });
                  }
                  onSaved?.();
                  onClose();
                } catch (err) {
                  const normalized = normalizeError(err);
                  /*
                   * 🛑 `toUserMessage`, never the server's own message. A raw
                   * `?? error` fallback is what rendered a Node MODULE_NOT_FOUND
                   * with a require stack inside a bid modal (Root Cause #86);
                   * this resolves through errors.codes.* and terminates at
                   * UNKNOWN.
                   */
                  setFormError(
                    toUserMessage(
                      (normalized as { code?: string }).code ?? "UNKNOWN",
                    ),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Stack>
        )}
      </Form>
    </SideDrawer>
  );
}
