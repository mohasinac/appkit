/**
 * Widget model — the declarative half.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE HAS NO `render` AND NO REACT IMPORT
 * ---------------------------------------------------------------------------
 *
 * A widget DEFINITION has to be readable by four callers that have nothing
 * else in common: the renderer (client), the admin editor (client), the
 * config validator (server), and the required-field resolver (isomorphic,
 * and it is a pure Zod refinement with no React in scope at all). Putting
 * `render` on the definition forces every one of them to pull React.
 *
 * That is not a hypothetical. `src/constants/navigation.tsx` carries a 🛑
 * comment for Root Cause #76: it called `navItemId` at module scope, the
 * import resolved through a `"use client"` entry, and the Vercel build died
 * with *"Attempted to call navItemId() from the server but navItemId is on
 * the client"* — while every local check passed. The same shape applies here
 * with more call sites.
 *
 * So the split is: capabilities + placement live here (plain data, no JSX),
 * and renderers are a separate `Record<type, (ctx) => ReactNode>` map in a
 * `.tsx` module that only the rendering surface imports. This mirrors
 * `_internal/shared/features/dashboard/recent-entry.ts`, which deliberately
 * stays "schema-free … matching every other type in it", and
 * `SECTION_REGISTRY`, which is the one place that holds `render`.
 *
 * ---------------------------------------------------------------------------
 * THE TIERS (see docs/overhaul/widget-architecture.md §2 for the argument)
 * ---------------------------------------------------------------------------
 *
 *   T0 surface  — a route family / host page.          NOT a widget.
 *   T1 region   — a declared hole in a template.       Code-only; its CHILDREN are config.
 *   T2 section  — a container widget, typed config.    CONFIG.
 *   T3 element  — a leaf widget, down to a single link. CONFIG.
 *   T4 field    — a form input or display row.         CONFIG (existing `fieldVisibility`).
 *   T5 atom     — Button / Badge / Icon / Text.        NEVER widgetised; token-themed.
 *
 * The discriminator between T3 and T5, which is the whole granularity
 * decision in one question: **does this thing carry its own content/target,
 * or does it render its parent's data?** Own `href`/`label`/`body` → T3.
 * Renders the parent's field → a T4 field key on the parent. Pure
 * presentation of either → T5.
 */

/** Which tier a definition sits in. T1 regions are declared separately — see `WidgetRegionDef`. */
export type WidgetTier = "section" | "element";

/**
 * A content-tag dependency. Structurally identical to
 * `_internal/shared/features/content-tags/registry.ts`'s `ContentTag`, and
 * declared structurally here rather than imported so this module stays free
 * of runtime imports (see the header). The real `isContentVisible` is
 * injected through `WidgetResolveContext.isContentVisible`, so there is ONE
 * implementation of that predicate, not two.
 */
export interface WidgetContentTag {
  governs: "listingType" | "categoryType" | "browsePage";
  value: string;
}

/**
 * A T1 region — a named hole in a surface's template.
 *
 * 🛑 Regions are declared in CODE and can never be created by config. A hole
 * has to exist in JSX before config can fill it. `NavSlotId`'s own doc
 * comment is the cautionary example: four slot ids exist in the type and
 * only `sidebar-admin` has a real chrome bridge, so composing into the other
 * three is a silent no-op. Config-created regions would multiply that class
 * of no-op by the 379 `pageId`s already in the tree.
 */
export interface WidgetRegionDef {
  /** `"<surfaceId>:<slotName>"`. Hand-chosen and stable — never route-derived. */
  id: string;
  /** Which surface this region belongs to. Matched against `WidgetResolveContext.surface`. */
  surface: string;
  label: string;
  /** Widget types permitted as direct children. A type absent from here is a config error, not a silent drop. */
  allowedTypes: readonly string[];
  /** `false` takes the whole region and everything in it off. Default `true`. */
  enabled?: boolean;
}

/**
 * A widget DEFINITION — one row per type, in code.
 *
 * Every capability field here already exists somewhere in this codebase and
 * is being read from one place instead of several:
 *   `surfaces`           ← `SectionDef.surfaces` (homepage/lib/section-renderer.tsx)
 *   `requiredPermission` ← `SidebarNavItem.requiredPermission`
 *   `governedBy`         ← `DashboardCard.contentTags`
 * `childTypes` and `ownsFields` are the two genuinely new ones: they are what
 * make nesting and the blocked-⇒-not-required rule expressible at all.
 */
export interface WidgetDef {
  /** Registry key. T2 reuses `SectionType` spellings; T3 reuses `CardElement["kind"]` spellings. */
  type: string;
  tier: WidgetTier;
  label: string;
  /**
   * CAPABILITY — which surfaces this type is fit for.
   *
   * 🛑 This is the capability half of the governing principle and it must be
   * READ, not merely declared. `SectionDef.surfaces` is declared today and
   * its own comment admits it is "Declared, not yet CONSUMED", so a
   * `category`-tagged section mounted on a category page renders an empty
   * state. `resolveWidgetTree` consumes it.
   */
  surfaces: readonly string[];
  /** CAPABILITY — permitted child types. `[]` means leaf, which is what caps nesting depth. */
  childTypes: readonly string[];
  /** CAPABILITY — a PERMISSION string. Never a role literal, never a listing-type comparison. */
  requiredPermission?: string;
  /** CAPABILITY — content-tag dependencies evaluated through the injected `isContentVisible`. */
  governedBy?: readonly WidgetContentTag[];
  /**
   * Dotted field paths this widget OWNS — i.e. the fields that become
   * unreachable when this widget is off. The input to the
   * blocked-⇒-not-required rule. Absent/empty means the widget owns no
   * fields, which is the common case for display widgets.
   */
  ownsFields?: readonly string[];
  /** Default state when an instance says nothing. `false` = present in the template but off until enabled. */
  defaultOn?: boolean;
}

/**
 * A stored widget INSTANCE — one row per placed widget, in config.
 *
 * 🛑 `id` IS MINTED AND STORED, NEVER DERIVED. The live nav system derives
 * `id` from the href at module scope (`navItemId(portal, href)`,
 * `publicNavId(href)`) and that derived id is the `siteSettings.navConfig`
 * key and the attention-count key. Change an href and the re-derived key
 * matches nothing: every badge silently vanishes behind a 200. The same file
 * already records the near-miss of two surfaces deriving two spellings
 * (`nav-brands` vs `nav-public-brands`) and each believing it had saved.
 *
 * A minted id survives all three changes a derived one cannot:
 *   MOVE      → `regionId` changes, `id` does not.
 *   RENAME    → `config.label` / `config.href` change, `id` does not.
 *   RE-PARENT → `parentId` changes, `id` does not.
 */
export interface WidgetInstance {
  id: string;
  /** Registry key. Changing the type is a delete + create, never an edit — the config shape differs. */
  type: string;
  /** Owning T1 region id. */
  regionId: string;
  /** Containing instance id, or `null` for a region root. */
  parentId: string | null;
  order: number;
  /**
   * Discrete span, reusing the SAME closed vocabulary `utils/pack-by-span.ts`'s
   * `RowSpan`, `field-ui-meta.ts`'s `FieldRow` and `CardElementSpan` already
   * share. Owner's rule: *"the resize should be in breakpoints not on
   * stretching"* — so four options, never a drag handle.
   */
  span?: "full" | "pair" | "third" | "quarter";
  /**
   * Three-valued by omission: `"on"` / `"off"` / absent = inherit the
   * definition's `defaultOn`. Absent is the overwhelmingly common case, which
   * is what keeps the config table sparse — see the key count in
   * docs/overhaul/widget-architecture.md §8.
   */
  state?: "on" | "off";
  /** Per-type config bag. Labels, hrefs, titles, data sources live HERE, never in the identity. */
  config?: Record<string, unknown>;
  /** Instance-level content tags, AND-ed with the definition's `governedBy`. */
  contentTags?: readonly WidgetContentTag[];
  /** Clone tracking (A16). `templateSlot` is the merge key when a required template element is pushed into clones. */
  templateId?: string;
  templateVersion?: number;
  templateSlot?: string;
  /**
   * Legacy derived keys this instance also answers to. WRITTEN ONCE at
   * migration time from the href as it then was, and NEVER re-derived — that
   * is the entire point. The resolver is the only code that knows derived ids
   * ever existed.
   */
  aliases?: readonly string[];
}

/** Everything the resolver needs about the viewer and the surface. No globals, no I/O. */
export interface WidgetResolveContext {
  /** The surface being rendered, matched against `WidgetDef.surfaces` and `WidgetRegionDef.surface`. */
  surface: string;
  /**
   * The viewer's PERMISSION set. A set of permissions, never a role — a role
   * is a named bundle of permissions and the bundle is data.
   */
  permissions?: ReadonlySet<string>;
  /**
   * The ONE content-visibility predicate, injected. Defaults to "always
   * visible" when omitted, matching `isContentVisible`'s own
   * absent-means-enabled rule so an install predating tagging does not have
   * everything vanish.
   */
  isContentVisible?: (tags: readonly WidgetContentTag[] | undefined) => boolean;
  /** Fields already hidden by the surface's own `fieldVisibility/{surfaceId}` map or a `when` predicate. */
  hiddenFields?: readonly string[];
  /** True for an admin with edit mode on: blocked widgets resolve to `visible: false` but are RETAINED for the dimmed editor affordance. */
  editMode?: boolean;
}

/** Why a widget is not visible. Exactly one reason is reported — the first that applies, in this order. */
export type WidgetBlockReason =
  | "unknown-type"
  | "unknown-region"
  | "region-disabled"
  | "wrong-surface"
  | "content-tag-off"
  | "missing-permission"
  | "state-off"
  | "parent-off"
  | "orphan-parent"
  | "cycle"
  | "disallowed-child";

export interface ResolvedWidget {
  instance: WidgetInstance;
  def: WidgetDef | undefined;
  /** The effective verdict. `false` means this widget does not render for this viewer on this surface. */
  visible: boolean;
  /** Set when `visible` is false. */
  reason?: WidgetBlockReason;
  /** Resolved children, already ordered. */
  children: ResolvedWidget[];
  depth: number;
}

/** A config problem worth telling an operator about, in the SAME shape Lane G's `validateRequiredFieldConfig` already returns. */
export interface WidgetConfigProblem {
  scope: string;
  field: string;
  problem: string;
}

export interface WidgetTreeResult {
  /** Region roots, ordered. */
  roots: ResolvedWidget[];
  byId: Map<string, ResolvedWidget>;
  /**
   * Union of `ownsFields` over every widget that is NOT visible, plus
   * `ctx.hiddenFields`. This is the value that must be handed to the
   * required-field resolver — see `partitionRequiredRules`.
   */
  unreachableFields: string[];
  /** Operator-facing problems: an explicit `on` under an off parent, a disallowed child, a cycle, an orphan. */
  problems: WidgetConfigProblem[];
}
