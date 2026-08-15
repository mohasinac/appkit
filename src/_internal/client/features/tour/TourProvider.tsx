"use client";

import React from "react";
import type { Config, DriveStep } from "driver.js";

export type TourRole = "buyer" | "seller" | "admin";

export interface TourContextValue {
  /** Starts the tour for the given role (defaults to "buyer"). */
  startTour: (role?: TourRole) => void;
}

const TourContext = React.createContext<TourContextValue>({
  startTour: () => {},
});

export function useTour(): TourContextValue {
  return React.useContext(TourContext);
}

const step = (element: string, title: string, description: string): DriveStep => ({
  element,
  popover: { title, description },
  skipMissingElement: true,
});

// P-16 — role-specific step sets. Anchors are `data-tour="…"` attributes on
// TitleBarLayout's icon buttons (present on every page) plus a couple of
// dashboard-specific anchors. `skipMissingElement: true` on every step means
// a step whose target isn't on the current page is silently skipped rather
// than breaking the tour — the same tour can be started from anywhere.
export const CUSTOMER_TOUR_STEPS: DriveStep[] = [
  step('[data-tour="nav-search"]', "Search", "Search by name, brand, or price to find what you're after."),
  step('[data-tour="nav-wishlist"]', "Wishlist", "Save items here to come back to them later."),
  step('[data-tour="nav-cart"]', "Cart", "Review your items and check out when you're ready."),
  step('[data-tour="nav-profile"]', "Your account", "Manage your profile, orders, and messages here."),
  {
    popover: {
      title: "Checkout",
      description: "At checkout, pay via UPI, cash, EMI, or COD — whatever suits you.",
    },
    skipMissingElement: true,
  },
  {
    popover: {
      title: "Track your orders",
      description: "Every order's status, tracking, and invoice lives in My Orders.",
    },
    skipMissingElement: true,
  },
];

export const SELLER_TOUR_STEPS: DriveStep[] = [
  step('[data-tour="store-products"]', "Your listings", "Create and manage your product listings here."),
  {
    popover: {
      title: "Product form",
      description: "Fill in details, images, and pricing — you can save as a draft anytime.",
    },
    skipMissingElement: true,
  },
  step('[data-tour="store-orders"]', "Incoming orders", "See and manage orders as buyers place them."),
  {
    popover: {
      title: "Mark as shipped",
      description: "Open an order to enter the carrier name and tracking number once it ships.",
    },
    skipMissingElement: true,
  },
  step('[data-tour="nav-profile"]', "Store settings", "Set up your store profile, shipping, and pickup address."),
  step('[data-tour="store-analytics"]', "Analytics", "Track your sales, revenue, and top products."),
  step('[data-tour="store-payouts"]', "Payouts", "See what you've earned and your payout history."),
];

export const ADMIN_TOUR_STEPS: DriveStep[] = [
  step('[data-tour="admin-orders"]', "Marketplace orders", "All orders across every store, in one place."),
  {
    popover: {
      title: "Verify payments",
      description: "Open an order to confirm manual payments and update its status.",
    },
    skipMissingElement: true,
  },
  step('[data-tour="admin-products"]', "Moderation", "Approve or reject listings before they go live."),
  step('[data-tour="admin-users"]', "Users", "Manage buyer and seller accounts."),
  step('[data-tour="admin-stores"]', "Stores", "Approve new store applications."),
  step('[data-tour="admin-analytics"]', "Analytics", "Platform-wide GMV, orders, and top products."),
  step('[data-tour="admin-settings"]', "Site settings", "Configure how the platform behaves."),
  step('[data-tour="admin-feature-flags"]', "Feature flags", "Turn platform features on or off."),
];

const STEP_SETS: Record<TourRole, DriveStep[]> = {
  buyer: CUSTOMER_TOUR_STEPS,
  seller: SELLER_TOUR_STEPS,
  admin: ADMIN_TOUR_STEPS,
};

/**
 * TourProvider — lazily imports driver.js on first use so it never lands in
 * the initial bundle. Respects prefers-reduced-motion by disabling driver.js's
 * highlight animation (the tour itself — step-to-step navigation — still
 * works; only the animated transition is skipped).
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const startTour = React.useCallback((role: TourRole = "buyer") => {
    if (typeof window === "undefined") return;
    void (async () => {
      const [{ driver }] = await Promise.all([
        import("driver.js"),
        import("driver.js/dist/driver.css"),
      ]);
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      const config: Config = {
        showProgress: true,
        animate: !reducedMotion,
        allowClose: true,
        steps: STEP_SETS[role],
      };
      driver(config).drive();
    })();
  }, []);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}
