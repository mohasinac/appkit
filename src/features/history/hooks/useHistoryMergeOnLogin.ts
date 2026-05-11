"use client";
/**
 * useHistoryMergeOnLogin — merge guest localStorage history into Firestore
 * the moment a user transitions from null → uid.
 */
import { useEffect, useRef } from "react";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { clearGuestHistory, getGuestHistory } from "../utils/guest-history";

export function useHistoryMergeOnLogin(userId: string | null | undefined) {
  const prevRef = useRef<string | null | undefined>(undefined);
  const mergedRef = useRef(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = userId;

    if (!userId || prev === userId) return;
    if (mergedRef.current) return;
    mergedRef.current = true;

    const items = getGuestHistory();
    if (items.length === 0) return;

    fetch(ACCOUNT_ENDPOINTS.HISTORY_MERGE, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
      .then((r) => {
        if (r.ok) clearGuestHistory();
      })
      .catch(() => {
        // best-effort — guest history stays in localStorage to retry next session
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) mergedRef.current = false;
  }, [userId]);
}
