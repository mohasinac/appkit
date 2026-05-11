"use client";
/**
 * HistoryTracker — drop into detail views to record a recently-viewed entry.
 * Renders nothing. Fires once per session per productId (debounced inside useHistory).
 */
import { useEffect } from "react";
import { useSession } from "../../../react/contexts/SessionContext";
import { useHistory } from "../hooks/useHistory";
import type { HistoryProductType, HistoryItemSnapshot } from "../repository/user-history.repository";

interface HistoryTrackerProps {
  productId: string;
  productType: HistoryProductType;
  snapshot?: HistoryItemSnapshot;
}

export function HistoryTracker({ productId, productType, snapshot }: HistoryTrackerProps) {
  const { user } = useSession();
  const { track } = useHistory(user?.uid);
  useEffect(() => {
    if (!productId) return;
    track({ productId, productType, snapshot });
  }, [productId, productType, snapshot, track]);
  return null;
}
