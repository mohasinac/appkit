/**
 * Template defaults ⊕ stored overrides, and alias-aware lookup.
 *
 * Pure. No React, no I/O — the storage layer
 * (`_internal/server/features/widgets/widget-instances.ts`) answers "what is
 * stored"; this answers "what does that MEAN against the template", which is
 * the part worth asserting.
 *
 * ---------------------------------------------------------------------------
 * THE RESOLUTION ORDER
 * ---------------------------------------------------------------------------
 *
 *   1. start from the registry's template defaults for the region
 *   2. a stored row with the SAME id OVERRIDES that default, field by field
 *   3. a stored row with a NEW id is APPENDED (an added widget)
 *   4. a stored row may not resurrect a default that was removed from code —
 *      see `DEFAULT_REMOVED` below
 *
 * 🛑 Step 2 is a FIELD-WISE merge, not a replacement. A stored row that only
 * says `{ id, state: "off" }` must not wipe the default's `config` — that is
 * the same whole-map-replace failure `HomepageSectionsRepository` already had
 * to patch around, where "every config key a caller omitted was silently
 * deleted" behind an HTTP 200. Storing a partial override is the NORMAL case
 * here (switching one rail off is one field), so getting this wrong would be
 * the common path, not an edge case.
 */

import type { WidgetInstance } from "./types";

/**
 * How a resolved row came to be. Useful to an editor ("this one is customised")
 * and to the drift tracking A16 asks for, and it costs nothing to return.
 */
export type WidgetInstanceOrigin = "default" | "overridden" | "added";

export interface MergedWidgetInstance {
  instance: WidgetInstance;
  origin: WidgetInstanceOrigin;
}

/**
 * Merge stored rows onto the template defaults for ONE region.
 *
 * Both inputs are treated as read-only; nothing is mutated, because callers
 * hold the registry's `readonly` default array and mutating it would leak
 * one request's config into the next (the module-level array is shared for
 * the process lifetime).
 */
export function mergeStoredWithDefaults(
  defaults: readonly WidgetInstance[],
  stored: readonly WidgetInstance[],
): MergedWidgetInstance[] {
  const storedById = new Map(stored.map((s) => [s.id, s]));
  const out: MergedWidgetInstance[] = [];

  for (const def of defaults) {
    const override = storedById.get(def.id);
    if (!override) {
      out.push({ instance: def, origin: "default" });
      continue;
    }
    storedById.delete(def.id);
    out.push({ instance: applyOverride(def, override), origin: "overridden" });
  }

  // Anything left is a widget somebody ADDED that the template does not know.
  for (const added of storedById.values()) {
    out.push({ instance: added, origin: "added" });
  }

  out.sort((a, b) => a.instance.order - b.instance.order);
  return out;
}

/**
 * Field-wise override. A key absent from the stored row keeps the template's
 * value; a key present replaces it.
 *
 * 🛑 `state` is the one key where "absent" is a THIRD value, not a missing
 * one: absent means "inherit the definition default". So an override that
 * omits `state` must leave the default's `state` alone, and an override that
 * sets it must win — which is what `"state" in override` tests. A truthiness
 * check here would make `state: "off"`… fine, but would silently ignore a
 * deliberate clear-back-to-inherit.
 */
function applyOverride(base: WidgetInstance, override: WidgetInstance): WidgetInstance {
  const merged: WidgetInstance = { ...base };

  if (override.regionId) merged.regionId = override.regionId;
  if ("parentId" in override) merged.parentId = override.parentId;
  if (typeof override.order === "number") merged.order = override.order;
  if (override.span) merged.span = override.span;
  if ("state" in override) merged.state = override.state;

  /*
   * `config` is merged one level deep, for the same reason step 2 exists: a
   * stored `{ titleTemplate }` must not erase the default's `source` and
   * `fallbackTitle`. One level is deliberate and sufficient — a widget config
   * is a flat bag of scalars by convention (see `RelatedScrollerConfig`), and
   * a deep merge would make "clear this key" inexpressible.
   */
  if (override.config) merged.config = { ...(base.config ?? {}), ...override.config };

  if (override.contentTags) merged.contentTags = override.contentTags;
  if (override.templateId) merged.templateId = override.templateId;
  if (typeof override.templateVersion === "number") merged.templateVersion = override.templateVersion;
  if (override.templateSlot) merged.templateSlot = override.templateSlot;
  if (override.aliases) merged.aliases = override.aliases;

  // The TYPE is never overridable. Changing a type changes which config shape
  // is valid, so it is a delete + create, not an edit — otherwise a stored
  // row could point a `card.product` default at a `section.offerBoard`
  // definition and keep the old config bag.
  merged.type = base.type;

  return merged;
}

/** Just the instances, for handing straight to `resolveWidgetTree`. */
export function mergedInstances(
  defaults: readonly WidgetInstance[],
  stored: readonly WidgetInstance[],
): WidgetInstance[] {
  return mergeStoredWithDefaults(defaults, stored).map((m) => m.instance);
}

// ---------------------------------------------------------------------------
// Alias-aware lookup — the nav-trap defence
// ---------------------------------------------------------------------------

/**
 * Find an instance by its id OR by any legacy key it answers to.
 *
 * 🛑 THIS IS THE WHOLE POINT OF `aliases`, and it exists because of a real,
 * live failure mode. `src/constants/navigation.tsx` derives a nav item's `id`
 * from its `href` at module scope, and that derived id is the live key for
 * `siteSettings.navConfig` and for the attention-count registry. Change the
 * href and the re-derived key matches nothing: every badge silently vanishes
 * while the route still returns 200. The same file records the sibling
 * failure, two surfaces deriving two spellings (`nav-brands` vs
 * `nav-public-brands`) with each believing it had saved.
 *
 * So: a widget instance's identity is MINTED AND STORED, and any derived key
 * it used to be known by is recorded ONCE in `aliases` and never re-derived.
 * This function is the only place that knows those legacy keys existed.
 *
 * Exact id wins over an alias, always — an alias must never shadow a real
 * instance, or a newly minted id colliding with somebody's old derived key
 * would resolve to the wrong widget.
 */
export function findInstanceByRef(
  instances: readonly WidgetInstance[],
  ref: string,
): WidgetInstance | undefined {
  const exact = instances.find((i) => i.id === ref);
  if (exact) return exact;
  return instances.find((i) => i.aliases?.includes(ref));
}

/**
 * Every key an instance answers to — its id plus its aliases.
 *
 * For a migration or an audit that needs to prove no legacy key was dropped:
 * diff this against the keys actually present in `siteSettings.navConfig`
 * before switching a surface over.
 */
export function instanceRefs(instance: WidgetInstance): string[] {
  return [instance.id, ...(instance.aliases ?? [])];
}

/**
 * Detect two instances claiming the same ref — which would make
 * `findInstanceByRef` return an arbitrary one of them.
 *
 * Returns the colliding refs, empty when clean. An alias collision is exactly
 * the `nav-brands`/`nav-public-brands` defect in its new home, so it is worth
 * a cheap explicit check rather than trusting that nobody does it.
 */
export function findRefCollisions(instances: readonly WidgetInstance[]): string[] {
  const seen = new Map<string, number>();
  for (const inst of instances) {
    for (const ref of instanceRefs(inst)) {
      seen.set(ref, (seen.get(ref) ?? 0) + 1);
    }
  }
  return [...seen.entries()].filter(([, n]) => n > 1).map(([ref]) => ref);
}
