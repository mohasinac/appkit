"use client";

/**
 * The strip and the review drawer, connected.
 *
 * Exists because the two halves need shared client state (which review is
 * open) while the product detail page that mounts them is an async Server
 * Component. One small client island is cheaper than making the detail view
 * take two render-prop slots and thread state between them.
 *
 * @tag domain:reviews
 * @tag layer:components
 * @tag access:client
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { YourPurchaseStrip } from "../../orders/components/YourPurchaseStrip";
import { ReviewFormDrawer } from "./ReviewFormDrawer";

export interface PurchaseReviewAffordanceProps {
  productId: string;
  storeId?: string;
  className?: string;
}

export function PurchaseReviewAffordance({
  productId,
  storeId,
  className,
}: PurchaseReviewAffordanceProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  /*
   * Invalidate the strip's own query, not just the reviews list. The strip is
   * what shows "Your review: 4/5", so saving without invalidating it leaves
   * the buyer looking at their old rating and reasonably concluding the edit
   * did not take.
   */
  const handleSaved = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["user", "purchases", productId],
    });
    void queryClient.invalidateQueries({ queryKey: ["reviews"] });
  }, [queryClient, productId]);

  return (
    <>
      <YourPurchaseStrip
        productId={productId}
        className={className}
        onEditReview={(reviewId) => {
          setEditingId(reviewId);
          setOpen(true);
        }}
        onWriteReview={() => {
          setEditingId(undefined);
          setOpen(true);
        }}
      />
      <ReviewFormDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        reviewId={editingId}
        productId={productId}
        storeId={storeId}
        onSaved={handleSaved}
      />
    </>
  );
}
