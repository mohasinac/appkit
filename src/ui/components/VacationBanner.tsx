"use client";
import React from "react";
import { Alert } from "./Alert";

export interface VacationBannerProps {
  storeName?: string;
  message?: string;
  returnDate?: Date | string;
  className?: string;
}

/**
 * S-STORE-6-A — Vacation-mode banner shown on product detail + checkout
 * pages when the seller has paused new orders.
 */
export function VacationBanner({
  storeName,
  message,
  returnDate,
  className,
}: VacationBannerProps) {
  const formattedDate =
    returnDate &&
    new Date(returnDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return (
    <Alert variant="warning" className={className}>
      <div className="text-sm">
        <strong>
          {storeName ? `${storeName} is on vacation` : "Store is on vacation"}
        </strong>
        {message ? <span> — {message}</span> : null}
        {formattedDate ? <span> Returns {formattedDate}.</span> : null}
        <div className="text-xs opacity-80 mt-1">
          New orders are paused; you can still wishlist items.
        </div>
      </div>
    </Alert>
  );
}
