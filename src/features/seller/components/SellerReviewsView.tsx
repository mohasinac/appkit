"use client";
import { normalizeError } from "../../../errors/normalize";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  BulkActionBar,
  Button,
  Checkbox,
  Div,
  Heading,
  Modal,
  Row,
  Select,
  SideDrawer,
  Span,
  Stack,
  Text,
  Textarea,
} from "../../../ui";
import type { BulkActionItem } from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { useBottomActions } from "../../layout";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

const __P = {
  p3: "p-3",
  p4: "p-4",
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

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
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

export function SellerReviewsView({
  reviewsApiBase = "/api/store/reviews",
  replyApiBase = "/api/store/reviews",
}: SellerReviewsViewProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [rating, setRating] = useState("");
  const [replied, setReplied] = useState("");
  const [page, setPage] = useState(1);

  // Reply drawer
  const [replyTarget, setReplyTarget] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // S-STORE-4-C — bulk reply + contest + feedback selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReplyOpen, setBulkReplyOpen] = useState(false);
  const [bulkReplyText, setBulkReplyText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [contestTarget, setContestTarget] = useState<ReviewItem | null>(null);
  const [contestReason, setContestReason] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState<ReviewItem | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const submitBulkReply = useCallback(async () => {
    if (!bulkReplyText.trim() || selectedIds.size === 0) return;
    setBulkSaving(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`${replyApiBase}/${id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reply: bulkReplyText }),
        }).catch(() => null),
      ),
    );
    setBulkSaving(false);
    setBulkReplyOpen(false);
    setBulkReplyText("");
    clearSelection();
    fetchReviewsRef.current?.();
  }, [bulkReplyText, selectedIds, replyApiBase, clearSelection]);

  const submitContest = useCallback(async () => {
    if (!contestTarget) return;
    await fetch(`/api/store/reviews/${contestTarget.id}/contest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: contestReason }),
    }).catch(() => null);
    setContestTarget(null);
    setContestReason("");
    fetchReviewsRef.current?.();
  }, [contestTarget, contestReason]);

  const submitFeedback = useCallback(async () => {
    if (!feedbackTarget) return;
    await fetch(`/api/store/reviews/${feedbackTarget.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: feedbackText }),
    }).catch(() => null);
    setFeedbackTarget(null);
    setFeedbackText("");
  }, [feedbackTarget, feedbackText]);

  const fetchReviewsRef = useMemo(
    () => ({ current: null as (() => void) | null }),
    [],
  );

  const fetchReviews = useCallback(async () => {
    // toast-intentionally-silent — error stored in setError() for UI inline render
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (rating) params.set("rating", rating);
      if (replied) params.set("replied", replied);

      const res = await fetch(`${reviewsApiBase}?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load reviews");
      setReviews(json?.data?.reviews ?? []);
      setMeta(json?.data?.meta ?? null);
    } catch (err) {
      void normalizeError(err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [reviewsApiBase, rating, replied, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchReviewsRef.current = fetchReviews; }, [fetchReviews, fetchReviewsRef]);

  const openReply = (review: ReviewItem) => {
    setReplyTarget(review);
    setReplyText(review.sellerReply ?? "");
    setReplyError(null);
  };

  const handleReplySave = async () => {
    if (!replyTarget) return;
    setReplySaving(true);
    setReplyError(null);
    try {
      const res = await fetch(`${replyApiBase}/${replyTarget.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save reply");
      setReplyTarget(null);
      fetchReviews();
    } catch (err) {
      void normalizeError(err);
      setReplyError((err as Error).message);
    } finally {
      setReplySaving(false);
    }
  };

  useBottomActions(selectedIds.size > 0 ? { bulk: { selectedCount: selectedIds.size, onClearSelection: clearSelection, actions: [
    {
      id: "bulk-reply",
      label: "Reply to selected",
      onClick: () => setBulkReplyOpen(true),
    } as BulkActionItem,
  ] } } : {});

  return (
    <>
      <StackedViewShell portal="seller" title="Reviews" sections={[
        <Stack key="reviews" gap="lg">
          {/* Filters */}
          <Row align="center" gap="3" wrap>
            <Select
              value={rating}
              onChange={(e) => { setRating(e.target.value); setPage(1); }}
              aria-label="Filter by rating"
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
              value={replied}
              onChange={(e) => { setReplied(e.target.value); setPage(1); }}
              aria-label="Filter by reply status"
              options={[
                { value: "", label: "All reply statuses" },
                { value: "true", label: "Store replied" },
                { value: "false", label: "Awaiting reply" },
              ]}
            />
            {meta && (
              <Text className="text-[var(--appkit-color-text-muted)] ml-auto" size="sm">
                {meta.total} review{meta.total !== 1 ? "s" : ""}
              </Text>
            )}
          </Row>

          {error && <Alert variant="error">{error}</Alert>}

          {/* S-STORE-4-C — bulk reply bar */}
          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              onClearSelection={clearSelection}
              actions={[
                {
                  id: "bulk-reply",
                  label: "Reply to selected",
                  onClick: () => setBulkReplyOpen(true),
                } as BulkActionItem,
              ]}
            />
          )}

          {/* Review list */}
          {loading ? (
            <Div className="text-center" padding="y-xl">
              <Text className="text-[var(--appkit-color-text-muted)]">Loading reviews…</Text>
            </Div>
          ) : reviews.length === 0 ? (
            <Div className="text-center" padding="y-3xl">
              <Text className="text-[var(--appkit-color-text-muted)]">No reviews found.</Text>
            </Div>
          ) : (
            <Stack gap="md">
              {reviews.map((review) => (
                <Div
                  key={review.id}
                  className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="lg" padding="md"
                >
                  <Row align="start" justify="between" gap="3" wrap>
                    <Row align="start" className="flex-1 min-w-0" gap="3">
                      <Checkbox
                        checked={selectedIds.has(review.id)}
                        onChange={() => toggleSelected(review.id)}
                        aria-label="Select review"
                      />
                      <Div className="flex-1 min-w-0">
                        {/* Product + reviewer */}
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

                        {/* Review content */}
                        {review.title && <Text className="mt-2" weight="medium">{review.title}</Text>}
                        <Text className="mt-1 text-[var(--appkit-color-text-secondary)] line-clamp-3" size="sm">
                          {review.comment}
                        </Text>

                        {/* Existing reply */}
                        {review.sellerReply && (
                          <Div className="mt-2 pl-3 border-l-2 border-[var(--appkit-color-primary)]">
                            <Text className="text-[var(--appkit-color-text-muted)]" size="xs">Store reply:</Text>
                            <Text size="sm">{review.sellerReply}</Text>
                          </Div>
                        )}
                      </Div>
                    </Row>

                    {/* Actions */}
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
              ))}
            </Stack>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <Row align="center" justify="center" gap="sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Text size="sm">
                Page {meta.page} of {meta.totalPages}
              </Text>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasMore || loading}
              >
                Next
              </Button>
            </Row>
          )}
        </Stack>,
      ]} />

      {/* Reply drawer */}
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
          <Div>
            <Text className="mb-1.5" size="sm" weight="medium">Store reply</Text>
            <textarea
              className="w-full rounded-md border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]"
              rows={5}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              maxLength={1000}
              placeholder="Write your response to this review…"
            />
            <Text className="text-[var(--appkit-color-text-muted)] mt-1" size="xs" align="end">
              {replyText.length}/1000
            </Text>
          </Div>
          <Row justify="end" gap="sm">
            <Button variant="outline" onClick={() => setReplyTarget(null)} disabled={replySaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReplySave}
              disabled={replySaving || !replyText.trim()}
              isLoading={replySaving}
            >
              {replyTarget?.sellerReply ? "Update Reply" : "Post Reply"}
            </Button>
          </Row>
        </Stack>
      </SideDrawer>

      {/* S-STORE-4-C — Bulk reply modal */}
      <Modal
        isOpen={bulkReplyOpen}
        onClose={() => setBulkReplyOpen(false)}
        title={`Bulk reply to ${selectedIds.size} review${selectedIds.size === 1 ? "" : "s"}`}
        actions={
          <Row gap="sm">
            <Button variant="ghost" onClick={() => setBulkReplyOpen(false)} disabled={bulkSaving}>Cancel</Button>
            <Button variant="primary" onClick={() => void submitBulkReply()} disabled={!bulkReplyText.trim() || bulkSaving} isLoading={bulkSaving}>
              Send reply
            </Button>
          </Row>
        }
      >
        <Stack gap="md" className="p-1">
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            The same reply will be posted on all selected reviews.
          </Text>
          <Textarea
            value={bulkReplyText}
            onChange={(e) => setBulkReplyText(e.target.value)}
            rows={5}
            placeholder="Thanks for your review…"
            label="Reply"
          />
        </Stack>
      </Modal>

      {/* S-STORE-4-C — Contest review modal */}
      <Modal
        isOpen={!!contestTarget}
        onClose={() => setContestTarget(null)}
        title="Contest this review"
        actions={
          <Row gap="sm">
            <Button variant="ghost" onClick={() => setContestTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void submitContest()} disabled={!contestReason.trim()}>
              Submit
            </Button>
          </Row>
        }
      >
        <Stack gap="md" className="p-1">
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Flag this review for admin investigation. Provide a clear reason — fake, abusive, off-topic, etc.
          </Text>
          <Textarea
            value={contestReason}
            onChange={(e) => setContestReason(e.target.value)}
            rows={4}
            label="Reason"
          />
        </Stack>
      </Modal>

      {/* S-STORE-4-C — Feedback to buyer modal */}
      <Modal
        isOpen={!!feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        title="Send feedback to buyer"
        actions={
          <Row gap="sm">
            <Button variant="ghost" onClick={() => setFeedbackTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void submitFeedback()} disabled={!feedbackText.trim()}>
              Send
            </Button>
          </Row>
        }
      >
        <Stack gap="md" className="p-1">
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Private message sent to the buyer's notification inbox. Does not appear on the public review.
          </Text>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            label="Feedback"
          />
        </Stack>
      </Modal>
    </>
  );
}
