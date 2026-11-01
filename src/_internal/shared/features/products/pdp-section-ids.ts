/**
 * Phase 10 ("widget descriptors") — human labels for the 5 `PdpSectionId`
 * values, mirroring `ProductDetailPageView.tsx`'s own `renderGallery` /
 * `renderInfo` / `renderActions` / `renderTabs` / `renderRelated` slot names
 * 1:1 (verified against that file, 2026-11-02 — `renderBreadcrumb`,
 * `renderSublistingSection`, `renderGroupSection`, `renderBundleSection` are
 * real slots too but are conditional/listing-type-specific, not present on
 * every product; the "jump to section" nav only lists the 5 that render
 * unconditionally).
 */
import type { PdpSectionId } from "../dashboard/recent-entry";

export const PDP_SECTION_IDS: readonly PdpSectionId[] = [
  "gallery",
  "info",
  "actions",
  "tabs",
  "related",
];

export const PDP_SECTION_LABEL: Record<PdpSectionId, string> = {
  gallery: "Photos",
  info: "Details",
  actions: "Buy box",
  tabs: "Description & specs",
  related: "Related items",
};
