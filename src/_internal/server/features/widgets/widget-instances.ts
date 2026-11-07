/*
 * WHY: Persistence for the widget system's instance table (lane W-WIDGET;
 *      schema approved by the hub 2026-11-08). Mirrors
 *      `_internal/server/features/dashboard/page-regions.ts` — same
 *      `React.cache`-wrapped, `safeRead`-degrading read, same plain async
 *      write, same "the id is a hand-chosen/minted stable string the caller
 *      passes" identity rule. This is the THIRD occurrence of that pattern
 *      (page regions, field visibility, widget instances), so under the Rule
 *      of Three there is now a case for extracting a shared helper — flagged
 *      rather than done, because the three differ in a way that matters: the
 *      other two are DOCUMENT-per-id reads and this one is a COLLECTION QUERY
 *      on `regionId`.
 *
 * WHY A COLLECTION AND NOT A `siteSettings` FIELD: `siteSettings` is a single
 *      document that two lanes already write (`navConfig`,
 *      `listings.requiredFields`), and a Firestore map write REPLACES rather
 *      than merges — the exact failure `HomepageSectionsRepository` needed an
 *      explicit `update` override to survive, where every omitted config key
 *      was "silently deleted" behind an HTTP 200. The measured ceiling here is
 *      ~5,210 keys (docs/overhaul/widget-architecture.md §12.2); at that size
 *      a whole-map replace is a certainty, not a hazard. A collection also
 *      makes orphan/cycle detection a query instead of a full-document scan.
 *
 * WHAT: `getWidgetInstances(regionId)` / `setWidgetInstances(regionId, rows)`
 *       over the `widgetInstances` collection. One row per PLACED widget, doc
 *       id = the minted `WidgetInstance.id`.
 *
 * 🛑 ABSENT MEANS TEMPLATE DEFAULT, NOT EMPTY. A region with no stored rows
 *    renders its registry default (`RELATED_DEFAULT_INSTANCES` and friends),
 *    which is what makes the whole cost model work: a default widget costs
 *    ZERO config rows until somebody changes it, and a page with nothing
 *    configured renders byte-identically to before the widget system existed.
 *    `mergeStoredWithDefaults` in `ui/widgets/merge.ts` is where that is
 *    applied — this module only answers "what is stored".
 *
 * EXPORTS: getWidgetInstances, setWidgetInstances, deleteWidgetInstance
 *
 * @tag domain:widgets
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:RelatedItemsSection,widget-instances-route
 * @tag sideEffects:firestore-read,firestore-write
 */

import { cache } from "react";
import { getAdminDb } from "../../../../providers/db-firebase";
import { safeRead } from "../../../../errors/safe-read";
import type { WidgetInstance } from "../../../../ui/widgets/types";

const WIDGET_INSTANCES_COLLECTION = "widgetInstances";

const EMPTY: readonly WidgetInstance[] = [];

/**
 * Normalise one stored row.
 *
 * 🛑 Defensive per FIELD rather than trusting the document, because a widget
 * instance is admin/vendor-authored data and a single malformed row must not
 * take a page region down. A row that cannot produce an `id` + `type` +
 * `regionId` is DROPPED here rather than handed to the resolver, which would
 * otherwise report it as `unknown-type` and make a storage problem look like
 * a registry problem.
 */
function normalise(raw: unknown, fallbackRegionId: string): WidgetInstance | null {
  if (raw == null || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  const id = typeof d.id === "string" && d.id ? d.id : null;
  const type = typeof d.type === "string" && d.type ? d.type : null;
  if (!id || !type) return null;

  const regionId = typeof d.regionId === "string" && d.regionId ? d.regionId : fallbackRegionId;
  const parentId = typeof d.parentId === "string" && d.parentId ? d.parentId : null;
  const order = typeof d.order === "number" && Number.isFinite(d.order) ? d.order : 0;

  const out: WidgetInstance = { id, type, regionId, parentId, order };

  if (d.span === "full" || d.span === "pair" || d.span === "third" || d.span === "quarter") {
    out.span = d.span;
  }
  // Absent `state` is the common case and MUST stay absent — it means
  // "inherit the definition's default", which is a different fact from "off".
  if (d.state === "on" || d.state === "off") out.state = d.state;
  if (d.config != null && typeof d.config === "object") {
    out.config = d.config as Record<string, unknown>;
  }
  if (Array.isArray(d.contentTags)) {
    out.contentTags = d.contentTags.filter(
      (t): t is { governs: "listingType" | "categoryType" | "browsePage"; value: string } =>
        t != null &&
        typeof t === "object" &&
        typeof (t as { value?: unknown }).value === "string" &&
        ["listingType", "categoryType", "browsePage"].includes(String((t as { governs?: unknown }).governs)),
    );
  }
  if (typeof d.templateId === "string") out.templateId = d.templateId;
  if (typeof d.templateVersion === "number") out.templateVersion = d.templateVersion;
  if (typeof d.templateSlot === "string") out.templateSlot = d.templateSlot;
  if (Array.isArray(d.aliases)) {
    out.aliases = d.aliases.filter((a): a is string => typeof a === "string");
  }

  return out;
}

/**
 * Every stored instance for one region, ordered.
 *
 * `React.cache`-wrapped and keyed on `regionId` alone — the narrowest shared
 * argument, same rule `getPageRegion`/`getFieldVisibility` follow. That is
 * what makes it safe for a shared presentational component to call this per
 * mount: seven listing-type detail views rendering the same region cost ONE
 * read per request, not seven.
 *
 * Degrades to `[]` on a missing collection or any read failure, so a
 * widget-config outage can never block a page from rendering — it falls back
 * to the registry defaults, which is the pre-widget-system behaviour.
 */
export const getWidgetInstances = cache(
  async (regionId: string): Promise<readonly WidgetInstance[]> => {
    return safeRead(
      async () => {
        const snap = await getAdminDb()
          .collection(WIDGET_INSTANCES_COLLECTION)
          .where("regionId", "==", regionId)
          .get();

        if (snap.empty) return EMPTY;

        const rows: WidgetInstance[] = [];
        for (const doc of snap.docs) {
          const row = normalise({ id: doc.id, ...doc.data() }, regionId);
          if (row) rows.push(row);
        }
        rows.sort((a, b) => a.order - b.order);
        return rows;
      },
      {
        route: "widget-instances",
        key: `widget-instances:${regionId}`,
        fallback: EMPTY,
      },
    );
  },
);

/**
 * Replace the stored rows for one region.
 *
 * 🛑 A BATCHED delete-then-write of only this region's documents, never a
 * collection-wide operation: the collection holds every region's rows, so an
 * unscoped write would take out other regions. Scoped by the same
 * `regionId ==` query the read uses, so the two cannot disagree about what
 * "this region's rows" means.
 *
 * Whole-region replace rather than a per-row patch because the editor always
 * holds the full current list client-side (the same shape `setPageRegion`
 * uses), so there is no partial-update case and no merge for two editors to
 * race. `order` is persisted explicitly rather than inferred from array
 * position — array position is not a fact Firestore preserves across a
 * per-document write.
 */
export async function setWidgetInstances(
  regionId: string,
  instances: readonly WidgetInstance[],
): Promise<void> {
  const db = getAdminDb();
  const col = db.collection(WIDGET_INSTANCES_COLLECTION);

  const existing = await col.where("regionId", "==", regionId).get();
  const keep = new Set(instances.map((i) => i.id));

  const batch = db.batch();
  for (const doc of existing.docs) {
    if (!keep.has(doc.id)) batch.delete(doc.ref);
  }
  for (const [index, inst] of instances.entries()) {
    const { id, ...rest } = inst;
    batch.set(
      col.doc(id),
      { ...rest, regionId, order: typeof inst.order === "number" ? inst.order : index, updatedAt: new Date() },
      { merge: true },
    );
  }
  await batch.commit();
}

/** Remove one instance. Its children are NOT cascaded — the resolver reports them as `orphan-parent`, which is recoverable; a silent cascade is not. */
export async function deleteWidgetInstance(instanceId: string): Promise<void> {
  await getAdminDb().collection(WIDGET_INSTANCES_COLLECTION).doc(instanceId).delete();
}
