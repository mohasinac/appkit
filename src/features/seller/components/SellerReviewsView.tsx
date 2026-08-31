"use client";
import { normalizeError } from "../../../errors/normalize";
import React, { useCallback, useState } from "react";
import type { ZodTypeAny } from "zod";
import {
  reviewReplySchema, reviewBulkReplySchema, reviewContestSchema, reviewFeedbackSchema,
  type ReviewReplyValues, type ReviewBulkReplyValues,
  type ReviewContestValues, type ReviewFeedbackValues,
} from "../schemas/review-forms";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Checkbox, Div, Modal, Row, Select, SideDrawer, Span, Stack, Text, Textarea, useToast } from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { SELLER_BULK_ACTIONS, ROW_ACTION_META } from "../../products/constants/action-defs";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { sortBy, sieveFilter, SIEVE_OP } from "../../../utils/sieve-builder";
import { DataListingView } from "../../admin/components/DataListingView";
import type { ListingViewConfig, ListingSelectionContext } from "../../admin/components/DataListingView";

const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest" },
  { value: sortBy("rating", "DESC"), label: "Highest rating" },
  { value: sortBy("rating", "ASC"), label: "Lowest rating" },
];

const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
} as const;

interface ReviewItem {
  id: string;
  productId: string;
  productTitle: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  verified: boolean;
  status: string;
  sellerReply?: string;
  sellerRepliedAt?: Date | string | null;
  createdAt: Date | string;
}

interface ReviewsListResponse {
  reviews?: ReviewItem[];
  meta?: { total: number };
}

export interface SellerReviewsViewProps {
  reviewsApiBase?: string;
  replyApiBase?: string;
}

const STAR = "★";
const EMPTY_STAR = "☆";

function Stars({ rating }: { rating: number }) {
  return (
    <Span size="sm" className="text-[var(--appkit-color-warning)]">
      {Array.from({ length: 5 }, (_, i) => (i < rating ? STAR : EMPTY_STAR)).join("")}
    </Span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "danger" | "default"> = {
    approved: "success",
    pending: "warning",
    rejected: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

/**
 * The four write surfaces on this page are each ONE textarea, and four
 * copies of the same twenty lines of SectionForm wiring is exactly the Rule of
 * Three trigger. It stays local: the shape is "a single-field modal form", not
 * a generally useful primitive, and `QuickFormDrawer` already owns the
 * generalised version for drawers.
 *
 * `hideActions` is deliberately NOT used — each modal's own footer buttons are
 * removed in favour of this row, so there is one Save and one Cancel per form.
 */
function ReviewTextForm<T extends object>({
  schema, values, onChange, onSubmit, submitLabel, onCancel, isLoading, scope,
}: {
  schema: ZodTypeAny;
  values: T;
  onChange: (partial: Partial<T>) => void;
  onSubmit: () => void;
  submitLabel: string;
  onCancel: () => void;
  isLoading?: boolean;
  scope: string;
}) {
  const sections = React.useMemo(
    () => buildSectionsFromSchema<T>(schema),
    [schema],
  );
  const nav = useSectionFormNav(sections, values, { scope });
  const form = useFormShellState(schema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });
  return (
    <FormShellContext.Provider value={form.shellCtx}>
      <FormErrorSummary />
      <SectionForm<T>
        sections={sections}
        values={values}
        onChange={onChange}
        onSubmit={() => {
          // SectionForm scrolls to the first erroring section and then submits
          // regardless, so the guard lives here.
          form.clearErrors();
          const parsed = schema.safeParse(visibleValues(schema, values));
          if (!parsed.success) {
            applyZodIssues(parsed.error.issues, form.setFieldError);
            return;
          }
          onSubmit();
        }}
        onValidationChange={() => form.validate(values)}
        schema={schema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        submitLabel={submitLabel}
        cancelLabel="Cancel"
        onCancel={onCancel}
        isLoading={isLoading}
      />
    </FormShellContext.Provider>
  );
}

export function SellerReviewsView({
  reviewsApiBase = SELLER_ENDPOINTS.REVIEWS,
  replyApiBase = SELLER_ENDPOINTS.REVIEWS,
}: SellerReviewsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const refetchReviews = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["seller", "reviews", "listing"] }),
    [queryClient],
  );

  // Reply drawer
  const [replyTarget, setReplyTarget] = useState<ReviewItem | null>(null);
  const [replyDraft, setReplyDraft] = useState<ReviewReplyValues>({ reply: "" });
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // S-STORE-4-C — bulk reply + contest + feedback selection
  const [bulkReplyOpen, setBulkReplyOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState<ReviewBulkReplyValues>({ reply: "" });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([]);
  const [bulkClearSelection, setBulkClearSelection] = useState<(() => void) | null>(null);
  const [contestTarget, setContestTarget] = useState<ReviewItem | null>(null);
  const [contestDraft, setContestDraft] = useState<ReviewContestValues>({ reason: "" });
  const [feedbackTarget, setFeedbackTarget] = useState<ReviewItem | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<ReviewFeedbackValues>({ feedback: "" });

  const openReply = (review: ReviewItem) => {
    setReplyTarget(review);
    setReplyDraft({ reply: review.sellerReply ?? "" });
    setReplyError(null);
  };

  const handleReplySave = async (onDone: () => void) => {
    if (!replyTarget) return;
    setReplySaving(true);
    setReplyError(null);
    try {
      const res = await fetch(`${replyApiBase}/${replyTarget.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyDraft.reply }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save reply");
      setReplyTarget(null);
      onDone();
    } catch (err) {
      void normalizeError(err);
      setReplyError((err as Error).message);
    } finally {
      setReplySaving(false);
    }
  };

  // The three submits below all closed their modal unconditionally, so a
  // rejected or unsent request looked exactly like a successful one — the
  // seller believed the contest/feedback/reply had been filed.
  const submitContest = useCallback(async (onDone: () => void) => {
    if (!contestTarget) return;
    try {
      const res = await fetch(SELLER_ENDPOINTS.REVIEW_CONTEST(contestTarget.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: contestDraft.reason }),
      });
      if (!res.ok) throw new Error(`Could not submit the contest (${res.status})`);
    } catch (err) {
      showToast(normalizeError(err).message, "error");
      return;
    }
    setContestTarget(null);
    setContestDraft({ reason: "" });
    onDone();
  }, [contestTarget, contestDraft, showToast]);

  const submitFeedback = useCallback(async () => {
    if (!feedbackTarget) return;
    try {
      const res = await fetch(SELLER_ENDPOINTS.REVIEW_FEEDBACK(feedbackTarget.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackDraft.feedback }),
      });
      if (!res.ok) throw new Error(`Could not send the feedback (${res.status})`);
    } catch (err) {
      showToast(normalizeError(err).message, "error");
      return;
    }
    setFeedbackTarget(null);
    setFeedbackDraft({ feedback: "" });
  }, [feedbackTarget, feedbackDraft, showToast]);

  const submitBulkReply = useCallback(async () => {
    if (!bulkDraft.reply.trim() || bulkTargetIds.length === 0) return;
    setBulkSaving(true);
    // Partial success is the normal outcome of a bulk write, so report the
    // count that failed rather than throwing away the whole batch's result.
    const outcomes = await Promise.all(
      bulkTargetIds.map((id) =>
        fetch(`${replyApiBase}/${id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reply: bulkDraft.reply }),
        })
          .then((res) => res.ok)
          .catch((err: unknown) => {
            void normalizeError(err);
            return false;
          }),
      ),
    );
    const failed = outcomes.filter((ok) => !ok).length;
    if (failed > 0) {
      showToast(`${failed} of ${outcomes.length} replies could not be saved.`, "error");
    }
    setBulkSaving(false);
    setBulkReplyOpen(false);
    setBulkDraft({ reply: "" });
    bulkClearSelection?.();
    setBulkTargetIds([]);
    await refetchReviews();
  }, [bulkDraft, bulkTargetIds, replyApiBase, bulkClearSelection, refetchReviews, showToast]);

  const config: ListingViewConfig<ReviewsListResponse, ReviewItem> = {
    portal: "seller",
    title: "Reviews",
    searchPlaceholder: "Search product, reviewer, or comment…",
    emptyLabel: "No reviews found.",
    filterKeys: ["rating", "replied"],
    defaultSort: SORT_OPTIONS[0].value,
    queryKey: ["seller", "reviews", "listing"],
    endpoint: reviewsApiBase,
    sortOptions: SORT_OPTIONS,
    hideTableView: true,
    mapRows: (response) => response.reviews ?? [],
    getTotal: (response, rows) => response.meta?.total ?? rows.length,
    buildFilters: (state) => {
      const clauses: string[] = [];
      if (state.rating) clauses.push(sieveFilter("rating", SIEVE_OP.EQ, state.rating));
      if (state.replied) clauses.push(sieveFilter("replied", SIEVE_OP.EQ, state.replied));
      return clauses.length ? clauses.join(",") : undefined;
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <Select
          label="Rating"
          value={pendingFilters.rating || ""}
          onChange={(e) => setPendingFilters((p) => ({ ...p, rating: e.target.value }))}
          options={[
            { value: "", label: "All ratings" },
            { value: "5", label: "5 stars" },
            { value: "4", label: "4 stars" },
            { value: "3", label: "3 stars" },
            { value: "2", label: "2 stars" },
            { value: "1", label: "1 star" },
          ]}
        />
        <Select
          label="Reply status"
          value={pendingFilters.replied || ""}
          onChange={(e) => setPendingFilters((p) => ({ ...p, replied: e.target.value }))}
          options={[
            { value: "", label: "All reply statuses" },
            { value: "true", label: "Store replied" },
            { value: "false", label: "Awaiting reply" },
          ]}
        />
      </Stack>
    ),
    buildBulkActions: (selection: ListingSelectionContext<ReviewItem>) =>
      SELLER_BULK_ACTIONS.reviews.map((id) => ({
        ...ROW_ACTION_META[id],
        onClick: () => {
          setBulkTargetIds(selection.selectedIds);
          setBulkClearSelection(() => selection.clearSelection);
          setBulkReplyOpen(true);
        },
      })) as BulkActionItem[],
    renderCards: (rows, _view, selection, isLoading) => (
      <Stack gap="md">
        {isLoading ? (
          <Div className="text-center" padding="y-xl">
            <Text className="text-[var(--appkit-color-text-muted)]">Loading reviews…</Text>
          </Div>
        ) : rows.length === 0 ? (
          <Div className="text-center" padding="y-3xl">
            <Text className="text-[var(--appkit-color-text-muted)]">No reviews found.</Text>
          </Div>
        ) : (
          rows.map((review) => (
            <Div
              key={review.id}
              className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="lg" padding="md"
            >
              <Row align="start" justify="between" gap="3" wrap>
                <Row align="start" className="flex-1 min-w-0" gap="3">
                  <Checkbox
                    checked={selection.selectedIds.includes(review.id)}
                    onChange={() => selection.toggleSelect(review.id)}
                    aria-label="Select review"
                  />
                  <Div className="flex-1 min-w-0">
                    <Text className="truncate" weight="medium">{review.productTitle}</Text>
                    <Row className="mt-1" align="center" gap="sm" wrap>
                      <Stars rating={review.rating} />
                      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">by {review.userName}</Text>
                      {review.verified && <Badge variant="success">Verified</Badge>}
                      {statusBadge(review.status)}
                      <Badge variant={review.sellerReply ? "success" : "warning"}>
                        {review.sellerReply ? "Store replied" : "Awaiting store reply"}
                      </Badge>
                    </Row>
                    {review.title && <Text className="mt-2" weight="medium">{review.title}</Text>}
                    <Text className="mt-1 text-[var(--appkit-color-text-secondary)] line-clamp-3" size="sm">
                      {review.comment}
                    </Text>
                    {review.sellerReply && (
                      <Div className="mt-2 pl-[0.75rem] border-l-2 border-[var(--appkit-color-primary)]">
                        <Text className="text-[var(--appkit-color-text-muted)]" size="xs">Store reply:</Text>
                        <Text size="sm">{review.sellerReply}</Text>
                      </Div>
                    )}
                  </Div>
                </Row>
                <Row className="flex-shrink-0" gap="sm">
                  <Button variant="outline" size="sm" onClick={() => openReply(review)}>
                    {review.sellerReply ? "Edit Reply" : ACTIONS.STORE["reply-review"].label}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setContestTarget(review)}>
                    {ACTIONS.STORE["contest-review"].label}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFeedbackTarget(review)}>
                    {ACTIONS.STORE["buyer-feedback"].label}
                  </Button>
                </Row>
              </Row>
            </Div>
          ))
        )}
      </Stack>
    ),
  };

  return (
    <>
      <DataListingView config={config} />

      <SideDrawer
        isOpen={!!replyTarget}
        onClose={() => setReplyTarget(null)}
        title={replyTarget?.sellerReply ? "Edit Reply" : "Reply to Review"}
        mode="create"
      >
        <Stack gap="md" className={`${__P.p4}`}>
          {replyTarget && (
            <Div className={`${__P.p3} bg-[var(--appkit-color-surface-muted)]`} rounded="default">
              <Stars rating={replyTarget.rating} />
              <Text className="mt-1" size="sm">{replyTarget.comment}</Text>
            </Div>
          )}
          {replyError && <Alert variant="error">{replyError}</Alert>}
          <ReviewTextForm<ReviewReplyValues>
            schema={reviewReplySchema}
            values={replyDraft}
            onChange={(partial) => setReplyDraft((d) => ({ ...d, ...partial }))}
            onSubmit={() => void handleReplySave(refetchReviews)}
            submitLabel={replyTarget?.sellerReply ? "Update Reply" : "Post Reply"}
            onCancel={() => setReplyTarget(null)}
            isLoading={replySaving}
            scope="store:review-reply"
          />
        </Stack>
      </SideDrawer>

      <Modal
        isOpen={bulkReplyOpen}
        onClose={() => setBulkReplyOpen(false)}
        title="Bulk reply to selected reviews"
      >
        <Stack gap="md" padding="2xs">
          <ReviewTextForm<ReviewBulkReplyValues>
            schema={reviewBulkReplySchema}
            values={bulkDraft}
            onChange={(partial) => setBulkDraft((d) => ({ ...d, ...partial }))}
            onSubmit={() => void submitBulkReply()}
            submitLabel="Send reply"
            onCancel={() => setBulkReplyOpen(false)}
            isLoading={bulkSaving}
            scope="store:review-bulk-reply"
          />
        </Stack>
      </Modal>

      <Modal
        isOpen={!!contestTarget}
        onClose={() => setContestTarget(null)}
        title="Contest this review"
      >
        <Stack gap="md" padding="2xs">
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Flag this review for admin investigation.
          </Text>
          <ReviewTextForm<ReviewContestValues>
            schema={reviewContestSchema}
            values={contestDraft}
            onChange={(partial) => setContestDraft((d) => ({ ...d, ...partial }))}
            onSubmit={() => void submitContest(refetchReviews)}
            submitLabel="Submit"
            onCancel={() => setContestTarget(null)}
            scope="store:review-contest"
          />
        </Stack>
      </Modal>

      <Modal
        isOpen={!!feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        title="Send feedback to buyer"
      >
        <Stack gap="md" padding="2xs">
          <ReviewTextForm<ReviewFeedbackValues>
            schema={reviewFeedbackSchema}
            values={feedbackDraft}
            onChange={(partial) => setFeedbackDraft((d) => ({ ...d, ...partial }))}
            onSubmit={() => void submitFeedback()}
            submitLabel="Send"
            onCancel={() => setFeedbackTarget(null)}
            scope="store:review-feedback"
          />
        </Stack>
      </Modal>
    </>
  );
}
