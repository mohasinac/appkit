"use client"
import React, { useEffect, useMemo, useState } from "react";
import { useEvents } from "../hooks/useEvents";
import { Button, TextLink } from "../../../ui";
import type { EventItem } from "../types";

export interface EventBannerProps {
  storageKey?: string;
  className?: string;
  saleHref?: string;
  getOfferHref?: (eventId: string) => string;
  labels?: {
    saleBanner?: (discountPercent: number) => string;
    offerBanner?: (offerCode: string) => string;
    dismissAriaLabel?: string;
  };
}

export function EventBanner({
  storageKey = "dismissed_event_banners",
  className = "",
  saleHref = "/products",
  getOfferHref = (eventId: string) => `/events/${eventId}`,
  labels,
}: EventBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) setDismissedIds(JSON.parse(stored));
    } catch {
      // ignore session storage failures
    }
    setMounted(true);
  }, [storageKey]);

  const { events } = useEvents({ pageSize: 1, sort: "-startsAt" });

  const event = useMemo(
    () =>
      events.find(
        (candidate: EventItem) =>
          (candidate.type === "sale" || candidate.type === "offer") &&
          !dismissedIds.includes(candidate.id),
      ),
    [dismissedIds, events],
  );

  if (!mounted || !event) return null;

  const isSale = event.type === "sale";
  const discountPct = event.saleConfig?.discountPercent ?? 0;
  const offerCode = event.offerConfig?.displayCode ?? "";

  const text = isSale
    ? (labels?.saleBanner?.(discountPct) ??
      `Sale live: up to ${discountPct}% off`)
    : (labels?.offerBanner?.(offerCode) ?? `Offer live: use ${offerCode}`);

  const href = isSale ? saleHref : getOfferHref(event.id);

  const dismiss = () => {
    const next = [...dismissedIds, event.id];
    setDismissedIds(next);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={[
        "relative bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-center text-sm font-medium text-white",
        className,
      ].join(" ")}
     data-section="eventbanner-div-277">
      <TextLink href={href} className="hover:underline">
        {text}
      </TextLink>
      <Button
        type="button"
        variant="ghost"
        onClick={dismiss}
        aria-label={labels?.dismissAriaLabel ?? "Dismiss banner"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
      >
        ×
      </Button>
    </div>
  );
}

export default EventBanner;
