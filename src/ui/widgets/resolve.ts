/**
 * Widget resolver — the pure decision layer.
 *
 * No React, no I/O, no module-level mutable state. Everything it needs comes
 * in as arguments, which is what makes it assertable without a build and
 * without the dev server (`appkit/scripts/verify-widget-resolver.mjs`).
 *
 * ---------------------------------------------------------------------------
 * THE PRECEDENCE RULE (docs/overhaul/widget-architecture.md §6)
 * ---------------------------------------------------------------------------
 *
 *   effective(w) = capabilityAllows(w, ctx) && stateChain(w)
 *
 * and CAPABILITY SITS ABOVE STATE, never beside it. A widget is never shown
 * because somebody flipped a flag, if the capability says it does not belong
 * on this surface or the viewer lacks the permission. That ordering IS the
 * governing principle arriving at the UI layer.
 *
 * Parent off beats an explicitly-enabled child, because a container that does
 * not render has nowhere to render a child; honouring the child would mean
 * hoisting it to the grandparent, silently relocating content nobody asked to
 * move and making the stored config lie about where things are.
 *
 * 🛑 But the child's `state: "on"` is RETAINED, not dropped, and the operator
 * is TOLD — `problems` carries it in the same `{ scope, field, problem }`
 * shape Lane G's `validateRequiredFieldConfig` already uses, for the same
 * stated reason: *"Reported so the admin is not misled into thinking it
 * did."* When the parent comes back on, the child is on.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MODULE DELIBERATELY DOES NOT DO
 * ---------------------------------------------------------------------------
 *
 * It does NOT resolve required-ness. It reads no listing-type registry, no
 * baseline rules and no admin overrides — all of that is
 * `src/validation/required-fields.ts` (item 1.10, Lane G, 63 assertions) and
 * there must never be a second copy of it.
 *
 * `partitionRequiredRules` below takes rules that are ALREADY resolved and
 * answers only the one question the widget layer is the authority on: which
 * of them point at a field the viewer cannot reach. That is the missing
 * half-sentence, not a second mechanism. The intended end state is that
 * Lane G's `resolveRequiredFieldRules` grows an `unreachableFields` argument
 * and calls this; until then this function documents and proves the rule.
 */

import type {
  ResolvedWidget,
  WidgetConfigProblem,
  WidgetContentTag,
  WidgetDef,
  WidgetInstance,
  WidgetRegionDef,
  WidgetResolveContext,
  WidgetTreeResult,
} from "./types";

/** Depth guard. A leaf declares `childTypes: []`, so this only ever fires on a malformed registry. */
const MAX_DEPTH = 12;

function defaultContentVisible(tags: readonly WidgetContentTag[] | undefined): boolean {
  // Absent/empty means visible — the same "absent means enabled" default
  // every other flag check in this codebase uses.
  return !tags || tags.length === 0;
}

/**
 * The capability gate. Returns the blocking reason, or `undefined` when every
 * capability is satisfied.
 *
 * 🛑 Order matters and is deliberate: surface first (a widget on the wrong
 * surface is a placement error and should be reported as one, not as a
 * permission problem), then content tags, then permission. Reporting the
 * first applicable reason rather than a list keeps the operator affordance
 * actionable.
 */
function capabilityBlock(
  instance: WidgetInstance,
  def: WidgetDef,
  ctx: WidgetResolveContext,
): ResolvedWidget["reason"] | undefined {
  if (!def.surfaces.includes(ctx.surface)) return "wrong-surface";

  const visible = ctx.isContentVisible ?? defaultContentVisible;
  const tags = [...(def.governedBy ?? []), ...(instance.contentTags ?? [])];
  if (tags.length > 0 && !visible(tags)) return "content-tag-off";

  if (def.requiredPermission && !ctx.permissions?.has(def.requiredPermission)) {
    return "missing-permission";
  }

  return undefined;
}

/**
 * An instance's own verdict, before its ancestors are consulted. Absent
 * `state` inherits the definition's `defaultOn` (which itself defaults to
 * true).
 *
 * 🛑 `removable: false` wins over an explicit `off`, and the caller REPORTS
 * it. This is the structural mirror of Lane G's `system` tier — see
 * `WidgetDef.removable`. Returning "still on" silently would be the worse of
 * the two failures available here: the operator would believe the price was
 * hidden and the card would keep showing it, with nothing to explain the
 * disagreement.
 */
function ownState(instance: WidgetInstance, def: WidgetDef): boolean {
  if (instance.state === "on") return true;
  if (instance.state === "off") return def.removable === false;
  return def.defaultOn !== false;
}

/**
 * Resolve a flat instance table into an ordered, gated tree.
 *
 * 🛑 FLAT TABLE IN, TREE OUT — the storage shape is deliberately flat
 * (`parentId` + `order`), never a nested document. Two real failures in this
 * repo argue for it: `HomepageSectionsRepository` needed an explicit
 * merge-not-replace `update` override because a Firestore map write
 * "silently deleted" every omitted config key with an HTTP 200, and
 * `DashboardCard.spans` is a sparse sibling map specifically so stored
 * documents predating it keep parsing. Flat also makes an orphan DETECTABLE
 * rather than unreachable.
 */
export function resolveWidgetTree(
  defs: readonly WidgetDef[],
  regions: readonly WidgetRegionDef[],
  instances: readonly WidgetInstance[],
  ctx: WidgetResolveContext,
): WidgetTreeResult {
  const defByType = new Map(defs.map((d) => [d.type, d]));
  const regionById = new Map(regions.map((r) => [r.id, r]));
  const instanceById = new Map(instances.map((i) => [i.id, i]));
  const problems: WidgetConfigProblem[] = [];

  const childrenOf = new Map<string, WidgetInstance[]>();
  const rootsByRegion = new Map<string, WidgetInstance[]>();
  for (const inst of instances) {
    if (inst.parentId === null || inst.parentId === undefined) {
      const list = rootsByRegion.get(inst.regionId) ?? [];
      list.push(inst);
      rootsByRegion.set(inst.regionId, list);
    } else {
      const list = childrenOf.get(inst.parentId) ?? [];
      list.push(inst);
      childrenOf.set(inst.parentId, list);
    }
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.order - b.order);
  for (const list of rootsByRegion.values()) list.sort((a, b) => a.order - b.order);

  const byId = new Map<string, ResolvedWidget>();

  function build(
    inst: WidgetInstance,
    parentVisible: boolean,
    parentDef: WidgetDef | undefined,
    depth: number,
    seen: Set<string>,
  ): ResolvedWidget {
    const def = defByType.get(inst.type);

    if (seen.has(inst.id)) {
      problems.push({
        scope: `widget:${inst.id}`,
        field: "parentId",
        problem: "This widget is its own ancestor. The cycle is broken here and the widget is not rendered.",
      });
      const node: ResolvedWidget = { instance: inst, def, visible: false, reason: "cycle", children: [], depth };
      byId.set(inst.id, node);
      return node;
    }

    if (depth > MAX_DEPTH) {
      problems.push({
        scope: `widget:${inst.id}`,
        field: "parentId",
        problem: `Nesting deeper than ${MAX_DEPTH} is a registry error — a leaf widget must declare childTypes: [].`,
      });
      const node: ResolvedWidget = { instance: inst, def, visible: false, reason: "cycle", children: [], depth };
      byId.set(inst.id, node);
      return node;
    }

    let reason: ResolvedWidget["reason"] | undefined;

    if (!def) {
      // A stale instance of a removed registry entry. Reported, never thrown —
      // the same honesty `FormWidgetButton` already shows for an unknown
      // `formId` ("not editable here") rather than rendering a broken button.
      reason = "unknown-type";
      problems.push({
        scope: `widget:${inst.id}`,
        field: "type",
        problem: `No widget definition named "${inst.type}". The instance is kept so it can be retyped or removed, but it does not render.`,
      });
    } else if (parentDef && !parentDef.childTypes.includes(inst.type)) {
      reason = "disallowed-child";
      problems.push({
        scope: `widget:${inst.id}`,
        field: "type",
        problem: `"${inst.type}" is not an allowed child of "${parentDef.type}". Allowed: ${parentDef.childTypes.join(", ") || "(none — this is a leaf widget)"}.`,
      });
    } else {
      reason = capabilityBlock(inst, def, ctx);

      if (!reason && inst.state === "off" && def.removable === false) {
        /*
         * A16's guardrail, enforced rather than documented: "Required
         * elements cannot be removed: price, condition, authenticity claim,
         * the risk banner, consent affordances … A vendor may restyle them,
         * never hide them." The widget stays on; the operator is told the
         * setting had no effect, at the only moment the feedback is useful.
         */
        problems.push({
          scope: `widget:${inst.id}`,
          field: "state",
          problem:
            `"${def.label}" cannot be removed by configuration (price, condition, authenticity, ` +
            `risk banner, consent and legally-mandated elements). It may be restyled, never hidden. ` +
            `The widget is still shown.`,
        });
      }

      if (!reason && !ownState(inst, def)) reason = "state-off";

      if (!reason && !parentVisible) {
        reason = "parent-off";
        if (inst.state === "on") {
          /*
           * The owner's case: a child explicitly enabled under a blocked
           * parent. The config is RETAINED — flip the parent back on and this
           * child is on — but the effect is gated, and saying so is the whole
           * point of this entry.
           */
          problems.push({
            scope: `widget:${inst.id}`,
            field: "state",
            problem:
              "This widget is explicitly enabled but its container is off, so it does not render. " +
              "The setting is kept and will take effect when the container is enabled again.",
          });
        }
      }
    }

    const visible = reason === undefined;
    const node: ResolvedWidget = { instance: inst, def, visible, reason, children: [], depth };
    byId.set(inst.id, node);

    /*
     * 🛑 Mutate-and-restore, not a per-node `new Set(seen)` copy.
     *
     * The first draft cloned the ancestor set at every node, which is
     * O(nodes x depth) allocation. That was defensible while a card was a
     * LEAF and a region held a handful of widgets. The owner's granularity
     * ruling (2026-11-08) makes every card a container of element widgets, so
     * a single product grid is now region > scroller > 24 cards > ~6 elements
     * each = ~170 nodes where it used to be ~25. Same correctness, O(1) per
     * node instead of O(depth).
     */
    seen.add(inst.id);
    for (const child of childrenOf.get(inst.id) ?? []) {
      node.children.push(build(child, visible, def, depth + 1, seen));
    }
    seen.delete(inst.id);

    return node;
  }

  const roots: ResolvedWidget[] = [];

  for (const [regionId, rootInstances] of rootsByRegion) {
    const region = regionById.get(regionId);

    if (!region) {
      for (const inst of rootInstances) {
        const node: ResolvedWidget = {
          instance: inst,
          def: defByType.get(inst.type),
          visible: false,
          reason: "unknown-region",
          children: [],
          depth: 0,
        };
        byId.set(inst.id, node);
        roots.push(node);
      }
      problems.push({
        scope: `region:${regionId}`,
        field: "regionId",
        problem: `No region is declared with id "${regionId}". A region is code-declared; config cannot create one.`,
      });
      continue;
    }

    const regionOn = region.enabled !== false && region.surface === ctx.surface;

    for (const inst of rootInstances) {
      if (!regionOn) {
        const node: ResolvedWidget = {
          instance: inst,
          def: defByType.get(inst.type),
          visible: false,
          reason: region.surface !== ctx.surface ? "wrong-surface" : "region-disabled",
          children: [],
          depth: 0,
        };
        byId.set(inst.id, node);
        roots.push(node);
        continue;
      }

      /*
       * 🛑 Order matters: "no such widget type" is checked BEFORE the region's
       * `allowedTypes`. Found by assertion E1 — with the checks the other way
       * round, a stale instance of a REMOVED registry entry was reported as
       * `disallowed-child` ("region X does not accept Y"), which sends the
       * operator to the region's allow-list to fix a problem that is actually
       * a deleted definition. The honest reason is the more specific one.
       */
      if (!defByType.has(inst.type)) {
        roots.push(build(inst, true, undefined, 0, new Set()));
        continue;
      }

      if (!region.allowedTypes.includes(inst.type)) {
        problems.push({
          scope: `widget:${inst.id}`,
          field: "type",
          problem: `Region "${regionId}" does not accept "${inst.type}". Allowed: ${region.allowedTypes.join(", ")}.`,
        });
        const node: ResolvedWidget = {
          instance: inst,
          def: defByType.get(inst.type),
          visible: false,
          reason: "disallowed-child",
          children: [],
          depth: 0,
        };
        byId.set(inst.id, node);
        roots.push(node);
        continue;
      }

      roots.push(build(inst, true, undefined, 0, new Set()));
    }
  }

  // An instance whose declared parent is not in the table at all. Flat storage
  // is what makes this visible rather than silently absent.
  for (const [parentId, kids] of childrenOf) {
    if (instanceById.has(parentId)) continue;
    for (const inst of kids) {
      const node: ResolvedWidget = {
        instance: inst,
        def: defByType.get(inst.type),
        visible: false,
        reason: "orphan-parent",
        children: [],
        depth: 0,
      };
      byId.set(inst.id, node);
      roots.push(node);
    }
    problems.push({
      scope: `widget:${parentId}`,
      field: "parentId",
      problem: `${kids.length} widget(s) name "${parentId}" as their parent, but no such widget exists. They are orphaned and do not render.`,
    });
  }

  /*
   * 🛑 Anything still unresolved is in a `parentId` CYCLE (or hangs off one),
   * and before assertion E10 caught it, that case vanished in total silence:
   * a cycle member is not a root (it has a parent) and is not an orphan (its
   * parent exists), so `build` was never reached for it and nothing reported
   * it. Two widgets naming each other as parent simply disappeared with an
   * HTTP 200 — the exact failure signature this repo keeps hitting. The walk
   * above already breaks a cycle it ENTERS from a root; this catches a cycle
   * no root leads into.
   */
  const stranded = instances.filter((i) => !byId.has(i.id));
  if (stranded.length > 0) {
    for (const inst of stranded) {
      const node: ResolvedWidget = {
        instance: inst,
        def: defByType.get(inst.type),
        visible: false,
        reason: "cycle",
        children: [],
        depth: 0,
      };
      byId.set(inst.id, node);
      roots.push(node);
    }
    problems.push({
      scope: `widget:${stranded.map((i) => i.id).join(",")}`,
      field: "parentId",
      problem:
        `${stranded.length} widget(s) are unreachable from any region root — their parent chain forms a cycle ` +
        `or leads into one. They do not render. Re-parent them to break the cycle.`,
    });
  }

  return {
    roots,
    byId,
    unreachableFields: collectUnreachableFields(byId, ctx),
    problems,
  };
}

/**
 * Every field path the viewer cannot reach: owned by a non-visible widget, or
 * already hidden by the surface's own field config / `when` predicate.
 *
 * 🛑 A field owned by a VISIBLE widget is reachable even if another,
 * non-visible widget also claims it. Two widgets legitimately surfacing the
 * same field (a compact card and a full section both showing `stockQuantity`)
 * must not make it unreachable just because one of them is off.
 */
function collectUnreachableFields(
  byId: ReadonlyMap<string, ResolvedWidget>,
  ctx: WidgetResolveContext,
): string[] {
  const reachable = new Set<string>();
  const claimed = new Set<string>();

  for (const node of byId.values()) {
    for (const field of node.def?.ownsFields ?? []) {
      claimed.add(field);
      if (node.visible) reachable.add(field);
    }
  }

  const out = new Set<string>();
  for (const field of claimed) if (!reachable.has(field)) out.add(field);
  for (const field of ctx.hiddenFields ?? []) out.add(field);

  return [...out].sort();
}

// ---------------------------------------------------------------------------
// The blocked-⇒-not-required rule
// ---------------------------------------------------------------------------

/**
 * The minimal structural shape of an ALREADY-RESOLVED required-field rule.
 *
 * Matches `src/validation/required-fields.ts`'s `RequiredFieldRule` on the
 * only two members this decision needs. Declared structurally rather than
 * imported because `appkit` must not depend on the host app — and because
 * this function is deliberately incapable of resolving required-ness itself.
 */
export interface ReachabilityRule {
  field: string;
  tier: "system" | "config";
}

export interface RequiredRulePartition<R extends ReachabilityRule> {
  /** Rules that still apply: reachable, or system-tier and therefore not relaxable. */
  enforced: R[];
  /** `config`-tier rules dropped because their field is unreachable. The form is submittable again. */
  dropped: R[];
  /**
   * `system`-tier rules whose field is unreachable. These STILL APPLY, which
   * means the configuration that hid the field must be REFUSED AT SAVE TIME —
   * otherwise the seller meets an unsatisfiable requirement at publish time
   * with no control on screen to satisfy it.
   */
  refuse: R[];
  /** Operator-facing problems for `refuse`, in Lane G's `{ scope, field, problem }` shape. */
  problems: WidgetConfigProblem[];
}

/**
 * **A field is required only if it is BOTH required by the resolved rule set
 * AND reachable.**
 *
 * - `config` tier + unreachable → **DROPPED.** The owner's rule: blocking a
 *   widget makes its fields disabled AND NOT REQUIRED. Without this a hidden
 *   required field is an unsubmittable form with no error the user can act
 *   on. `field-ui-meta.ts`'s own 🛑 comment already names the defect:
 *   *"Hiding a field does NOT relax its schema. A required field hidden by
 *   `when` still fails validation, invisibly."*
 * - `system` tier + unreachable → **KEPT, and the config is refused.** Safety,
 *   money and mechanism-integrity rules (the live-item video; a collector
 *   drop's end date and starting bid) are not relaxable by configuration, so
 *   the only legitimate way to hide one is a `defaultValue` that passes the
 *   field's own schema — which is the owner's OTHER rule, and it protects the
 *   RECORD while this one protects the FORM. Both are needed.
 *
 * `defaultedFields` are fields for which the configuration supplies a
 * validated default, per that second rule. A system-tier field with a default
 * is satisfiable while hidden, so it is enforced rather than refused — the
 * value reaches the record through Lane G's `applyHiddenFieldDefaults`.
 */
export function partitionRequiredRules<R extends ReachabilityRule>(
  rules: readonly R[],
  unreachableFields: readonly string[],
  defaultedFields: readonly string[] = [],
): RequiredRulePartition<R> {
  const unreachable = new Set(unreachableFields);
  const defaulted = new Set(defaultedFields);

  const enforced: R[] = [];
  const dropped: R[] = [];
  const refuse: R[] = [];
  const problems: WidgetConfigProblem[] = [];

  for (const rule of rules) {
    if (!unreachable.has(rule.field)) {
      enforced.push(rule);
      continue;
    }

    if (rule.tier === "config") {
      dropped.push(rule);
      continue;
    }

    // system tier, unreachable
    enforced.push(rule);

    if (defaulted.has(rule.field)) continue;

    refuse.push(rule);
    problems.push({
      scope: "widget-visibility",
      field: rule.field,
      problem:
        "This field is required by the platform (safety / money / mechanism integrity) and cannot be " +
        "relaxed by hiding the widget that owns it. Either keep that widget enabled, or supply a " +
        "default value that passes the field's own validation.",
    });
  }

  return { enforced, dropped, refuse, problems };
}
