"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTopBannerSlot } from "./top-banner-slot";

export interface TopBannerPortalProps {
  children: React.ReactNode;
}

/**
 * Renders `children` into the layout's top-banner slot — the band above the
 * sticky header. See `top-banner-slot.ts` for why that slot exists and why it
 * sits outside the measured header wrapper.
 *
 * Renders nothing until the slot resolves after mount. That is not a loading
 * state to paper over: the banner is dismissible and server-rendering it into
 * a layout that may already have a dismissal recorded would flash it at someone
 * who closed it last week.
 */
export function TopBannerPortal({ children }: TopBannerPortalProps) {
  const slot = useTopBannerSlot();
  if (!slot) return null;
  return createPortal(children, slot);
}
