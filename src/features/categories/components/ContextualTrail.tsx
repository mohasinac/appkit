"use client";

import React from "react";
import { storageManager } from "../../../core/StorageManager";
import { BreadcrumbTrail } from "./BreadcrumbTrail";
import type { BreadcrumbCrumb } from "../utils/breadcrumb-chain";

/**
 * I5b — the visible trail follows the path the visitor actually took, when
 * that path is one this listing is genuinely filed under.
 *
 * ## 🛑 Why this is CLIENT-side, and why the markup is not
 *
 * A product can be filed under several categories, so there are several valid
 * trails to one page. The resolution keeps D4b's rule (*the visible trail, the
 * JSON-LD and `categoryNames` must agree*) by making exactly ONE of the three
 * contextual, and never the markup:
 *
 *   - `categoryNames`, the JSON-LD and the FIRST PAINT all render the DEFAULT
 *     chain. Always, for everyone.
 *   - only the visible trail, AFTER hydration, may swap to the trail matching
 *     the category page the visitor came from.
 *
 * Doing it on the server is not available: the product routes are CACHED, so a
 * referrer-dependent trail computed server-side would be baked into the cache
 * entry and then served to everyone who shared that URL. And a crawler has no
 * history, so it would get the default anyway.
 *
 * There is no flash, because the default is a REAL answer rather than a
 * placeholder — the same three-state shape the guest-price gate uses.
 *
 * ## 🛑 `sessionStorage`, not a Firestore write and not the `history` collection
 *
 * One key holding the last category page visited. A navigation crumb is not
 * worth a write per page view (Root Cause #94 is the record of what per-page-view
 * client work costs here), and the `history` collection stores *viewed
 * products* — not the path taken to them.
 *
 * ## 🛑 Suppressed entirely for a single assignment
 *
 * Which is the overwhelming majority of rows. Otherwise every product page
 * gains a possible post-hydration layout shift in its first crumb row for a
 * feature that applies to a handful.
 *
 * @tag domain:categories
 * @tag layer:client-component
 * @tag access:client-only
 */

/** The `sessionStorage` key. Read here, written by `<LastCategoryBeacon>`. */
export const LAST_CATEGORY_KEY = "letitrip:last-category";

export interface ContextualTrailProps {
  /**
   * One entry per assignment, DEFAULT FIRST. Each carries the assignment's
   * category id and the full crumb chain for it.
   */
  trails: ReadonlyArray<{ categoryId: string; crumbs: readonly BreadcrumbCrumb[] }>;
  /** Forwarded to `BreadcrumbTrail` for the alternates crumb. */
  alternates?: { ids?: readonly string[] | null; names?: readonly string[] | null };
  className?: string;
}

export function ContextualTrail({ trails, alternates, className }: ContextualTrailProps) {
  // Index 0 is the default chain and is what the server rendered.
  const [index, setIndex] = React.useState(0);

  const multi = trails.length > 1;

  React.useEffect(() => {
    // One assignment: nothing can be swapped to, so never touch state — that is
    // what guarantees no post-hydration shift on the common row.
    if (!multi) return;
    /*
     * 🛑 Through `storageManager`, not a private `try/catch` around
     * `window.sessionStorage`. It already owns the three failure modes (SSR, a
     * cross-origin iframe, a security policy that throws on mere ACCESS),
     * returns `null` for all of them, and normalises what it catches — so this
     * component needs no catch at all and there is one implementation of
     * "storage might not exist" rather than a second, quieter copy.
     */
    const last = storageManager.get<string>(LAST_CATEGORY_KEY, { type: "session" });
    if (!last) return;
    const match = trails.findIndex((t) => t.categoryId === last);
    // 🛑 Only swap to a trail this listing is REALLY filed under. A visitor who
    // arrived from an unrelated category keeps the default, because inventing a
    // trail through a category the product is not in would be a lie about the
    // taxonomy, not a convenience.
    if (match > 0) setIndex(match);
  }, [multi, trails]);

  const active = trails[index] ?? trails[0];
  if (!active) return null;

  return (
    <BreadcrumbTrail crumbs={active.crumbs} alternates={alternates} className={className} />
  );
}
