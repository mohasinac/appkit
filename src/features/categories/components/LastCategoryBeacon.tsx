"use client";

import React from "react";
import { storageManager } from "../../../core/StorageManager";
import { LAST_CATEGORY_KEY } from "./ContextualTrail";

/**
 * Record which category page the visitor is on, for `<ContextualTrail>`.
 *
 * 🛑 `sessionStorage`, one key, one write per category page view — not a
 * Firestore write and not the `history` collection (which stores viewed
 * PRODUCTS, not the path taken). Root Cause #94 is the record of what
 * per-page-view client work costs on this project.
 *
 * Renders nothing. It is a component rather than an effect inside the category
 * page because that page is a Server Component and must stay one.
 *
 * @tag domain:categories
 * @tag layer:client-component
 * @tag access:client-only
 */
export function LastCategoryBeacon({ categoryId }: { categoryId: string }) {
  React.useEffect(() => {
    if (!categoryId) return;
    /*
     * Through `storageManager`, which already handles SSR, a cross-origin
     * iframe and a policy that throws on access — so there is no catch here
     * and no second copy of that logic. A `false` return means the visitor
     * keeps the default trail, which is a correct answer.
     */
    storageManager.set(LAST_CATEGORY_KEY, categoryId, { type: "session" });
  }, [categoryId]);
  return null;
}
