/**
 * verify-widget-resolver.mjs — assertions for the widget resolver (lane W-WIDGET).
 *
 * WHY A SCRIPT AND NOT A TEST RUNNER: this repo has no vitest/jest/tsx —
 * `typescript` is the only relevant dev dependency and `scripts/*.mjs` run by
 * plain node is the established convention (see `appkit/scripts/README.md` and
 * the ~40 `audit-*.mjs` in the host repo). This compiles the four widget
 * modules with the installed `tsc` into a scratch dir, imports the output, and
 * asserts against it. Needs no `next build`, no dev server, and no appkit
 * watcher — which matters because the watchers are off and `appkit/src` edits
 * do not reach the running app until the hub rebuilds.
 *
 * Run: node appkit/scripts/verify-widget-resolver.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = resolve(import.meta.dirname, "..", "..");
const SRC = join(REPO, "appkit", "src", "ui", "widgets");
const out = mkdtempSync(join(tmpdir(), "widget-resolver-"));

let pass = 0;
const failures = [];

function ok(label, cond, detail) {
  if (cond) {
    pass += 1;
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, `expected ${e}, got ${a}`);
}

// ---------------------------------------------------------------------------
// Compile
// ---------------------------------------------------------------------------

const tsc = join(REPO, "node_modules", "typescript", "bin", "tsc");
try {
  execFileSync(
    process.execPath,
    [
      tsc,
      join(SRC, "types.ts"),
      join(SRC, "resolve.ts"),
      join(SRC, "merge.ts"),
      join(SRC, "pilot-registry.ts"),
      "--outDir", out,
      "--module", "commonjs",
      "--target", "es2022",
      "--moduleResolution", "node",
      "--strict",
      "--skipLibCheck",
    ],
    { stdio: "pipe" },
  );
} catch (err) {
  console.error("tsc failed:\n" + (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? ""));
  rmSync(out, { recursive: true, force: true });
  process.exit(1);
}

const { resolveWidgetTree, partitionRequiredRules } = await import(
  pathToFileURL(join(out, "resolve.js")).href
);
const {
  PILOT_REGIONS,
  PILOT_WIDGET_DEFS,
  RELATED_DEFAULT_INSTANCES,
  asRelatedScrollerConfig,
  resolveScrollerTitle,
} = await import(pathToFileURL(join(out, "pilot-registry.js")).href);
const { mergeStoredWithDefaults, mergedInstances, findInstanceByRef, findRefCollisions, instanceRefs } =
  await import(pathToFileURL(join(out, "merge.js")).href);

// ---------------------------------------------------------------------------
// Fixtures — the four hardcoded RelatedItemsSection branches, as config
// ---------------------------------------------------------------------------

const REGION = "products-slug:body";

/** Mint ids the way `usePageRegion.genCardId` already does: opaque, never derived. */
let seq = 0;
const mint = () => `w-${(Date.now() + seq++).toString(36)}-${(seq * 7919).toString(36)}`;

const SCROLLER_CATEGORY = "w-scroller-category";
const SCROLLER_STORE = "w-scroller-store";
const OFFER_BOARD = "w-offer-board";
const LIVE_PROOF = "w-live-proof";

function scroller(id, source, title, order, state) {
  return { id, type: "row.horizontalScroller", regionId: REGION, parentId: null, order, state, config: { source, title } };
}
function card(id, parentId, order, state) {
  return { id, type: "card.product", regionId: REGION, parentId, order, state, config: {} };
}
/** A T3 leaf element — the bottom of the addressable model after the owner's ruling. */
function el(id, type, parentId, order, state) {
  return { id, type, regionId: REGION, parentId, order, state, config: {} };
}

/** The four real branches, plus three card.product children under two of them. */
function baseInstances() {
  return [
    scroller(SCROLLER_CATEGORY, "category", "More in this category", 0),
    scroller("w-scroller-brand", "brand", "More by this brand", 1),
    scroller("w-scroller-tags", "tags", "You might also like", 2),
    scroller(SCROLLER_STORE, "store", "More from this seller", 3),
    card("w-card-c1", SCROLLER_CATEGORY, 1),
    card("w-card-c0", SCROLLER_CATEGORY, 0),
    card("w-card-s0", SCROLLER_STORE, 0),
    { id: OFFER_BOARD, type: "section.offerBoard", regionId: REGION, parentId: null, order: 4, config: {} },
    { id: LIVE_PROOF, type: "section.liveMediaProof", regionId: REGION, parentId: null, order: 5, config: {} },
  ];
}

const ALL_PERMS = new Set(["offers.view"]);

/** Content-tag predicate stand-in with the real AND semantics and absent-means-visible default. */
function tagPredicate(offTags) {
  const off = new Set(offTags);
  return (tags) => {
    if (!tags || tags.length === 0) return true;
    return tags.every((t) => !off.has(`${t.governs}:${t.value}`));
  };
}

function run(instances, ctxOverride = {}) {
  return resolveWidgetTree(PILOT_WIDGET_DEFS, PILOT_REGIONS, instances, {
    surface: "product",
    permissions: ALL_PERMS,
    isContentVisible: tagPredicate([]),
    ...ctxOverride,
  });
}

// ---------------------------------------------------------------------------
// A. Nesting — a container widget with card children, from config alone
// ---------------------------------------------------------------------------

{
  const r = run(baseInstances());
  eq("A1 six region roots resolved", r.roots.length, 6);
  eq("A2 roots are ordered by `order`", r.roots.map((n) => n.instance.id), [
    SCROLLER_CATEGORY, "w-scroller-brand", "w-scroller-tags", SCROLLER_STORE, OFFER_BOARD, LIVE_PROOF,
  ]);

  const cat = r.byId.get(SCROLLER_CATEGORY);
  eq("A3 container has its 2 card children", cat.children.length, 2);
  eq("A4 children sorted by `order`, not insertion", cat.children.map((n) => n.instance.id), ["w-card-c0", "w-card-c1"]);
  ok("A5 nested card is visible", cat.children.every((n) => n.visible));
  eq("A6 child depth is parent depth + 1", cat.children[0].depth, 1);

  const store = r.byId.get(SCROLLER_STORE);
  eq("A7 'seller's other items' scroller carries its own child", store.children.length, 1);
  eq("A8 titles live in config, not identity", cat.instance.config.title, "More in this category");
  eq("A9 all four hardcoded branches are now instances of ONE type",
    new Set(r.roots.filter((n) => n.instance.type === "row.horizontalScroller").map((n) => n.instance.config.source)).size, 4);
  eq("A10 no config problems on a clean tree", r.problems.length, 0);
}

// ---------------------------------------------------------------------------
// B. Precedence — parent off, child explicitly on
// ---------------------------------------------------------------------------

{
  const insts = baseInstances();
  insts.find((i) => i.id === SCROLLER_CATEGORY).state = "off";
  insts.find((i) => i.id === "w-card-c0").state = "on"; // explicit child-on under an off parent
  const r = run(insts);

  const cat = r.byId.get(SCROLLER_CATEGORY);
  ok("B1 parent off is not visible", cat.visible === false);
  eq("B2 parent off reports `state-off`", cat.reason, "state-off");

  const kid = r.byId.get("w-card-c0");
  ok("B3 explicitly-enabled child under an off parent is NOT visible", kid.visible === false);
  eq("B4 the child's reason is `parent-off`, not `state-off`", kid.reason, "parent-off");
  eq("B5 the child's `state: \"on\"` is RETAINED, not dropped", kid.instance.state, "on");
  ok("B6 the operator is TOLD about the contradiction",
    r.problems.some((p) => p.scope === `widget:w-card-c0` && p.field === "state" && /explicitly enabled but its container is off/.test(p.problem)),
    JSON.stringify(r.problems));
  ok("B7 a sibling scroller is unaffected", r.byId.get(SCROLLER_STORE).visible === true);

  // The parent comes back on -> the stored child-on takes effect.
  insts.find((i) => i.id === SCROLLER_CATEGORY).state = "on";
  const r2 = run(insts);
  ok("B8 re-enabling the parent re-enables the retained child", r2.byId.get("w-card-c0").visible === true);
  eq("B9 and the contradiction report is gone", r2.problems.length, 0);
}

{
  const insts = baseInstances();
  insts.find((i) => i.id === "w-card-c0").state = "off";
  const r = run(insts);
  ok("B10 child off, parent on: only the child is off", r.byId.get(SCROLLER_CATEGORY).visible === true);
  ok("B11 child off is not visible", r.byId.get("w-card-c0").visible === false);
  ok("B12 the other child is still visible", r.byId.get("w-card-c1").visible === true);
}

// ---------------------------------------------------------------------------
// C. Capability sits ABOVE state, never beside it
// ---------------------------------------------------------------------------

{
  const insts = baseInstances();
  insts.find((i) => i.id === OFFER_BOARD).state = "on";
  const r = run(insts, { permissions: new Set() });
  const ob = r.byId.get(OFFER_BOARD);
  ok("C1 an explicit `on` cannot defeat a missing permission", ob.visible === false);
  eq("C2 and the reason is the permission, not the state", ob.reason, "missing-permission");
}

{
  const insts = baseInstances();
  insts.find((i) => i.id === OFFER_BOARD).state = "on";
  const r = run(insts, { isContentVisible: tagPredicate(["listingType:standard"]) });
  eq("C3 an explicit `on` cannot defeat a disabled content tag", r.byId.get(OFFER_BOARD).reason, "content-tag-off");
}

{
  // `surfaces` must be CONSUMED, not merely declared — SectionDef's own gap.
  const r = run([scroller("w-s", "category", "t", 0)], { surface: "homepage" });
  eq("C4 a widget on a surface its region does not belong to is blocked", r.roots[0].reason, "wrong-surface");
  const r2 = resolveWidgetTree(
    PILOT_WIDGET_DEFS,
    [{ id: REGION, surface: "homepage", label: "x", allowedTypes: ["section.offerBoard"] }],
    [{ id: "w-ob", type: "section.offerBoard", regionId: REGION, parentId: null, order: 0, config: {} }],
    { surface: "homepage", permissions: ALL_PERMS },
  );
  eq("C5 `WidgetDef.surfaces` is read: section.offerBoard is product-only", r2.roots[0].reason, "wrong-surface");
}

{
  const r = run(baseInstances(), { });
  ok("C6 omitting `isContentVisible` defaults to visible (absent means enabled)",
    r.byId.get(OFFER_BOARD).visible === true);
}

// ---------------------------------------------------------------------------
// D. Identity survives move, rename and re-parent
// ---------------------------------------------------------------------------

{
  const original = baseInstances();
  const r0 = run(original);
  const idBefore = r0.byId.get(SCROLLER_STORE).instance.id;

  // RENAME: the title and the data source both change.
  const renamed = baseInstances();
  const target = renamed.find((i) => i.id === SCROLLER_STORE);
  target.config = { source: "tags", title: "Totally different heading" };
  const r1 = run(renamed);
  eq("D1 RENAME: id unchanged after label/source edit", r1.byId.get(SCROLLER_STORE).instance.id, idBefore);
  ok("D2 RENAME: the child still resolves under the same parent",
    r1.byId.get(SCROLLER_STORE).children.map((n) => n.instance.id).includes("w-card-s0"));

  // RE-PARENT: move the card from the store scroller to the category scroller.
  const reparented = baseInstances();
  reparented.find((i) => i.id === "w-card-s0").parentId = SCROLLER_CATEGORY;
  const r2 = run(reparented);
  eq("D3 RE-PARENT: id unchanged", r2.byId.get("w-card-s0").instance.id, "w-card-s0");
  eq("D4 RE-PARENT: it now resolves under the new parent", r2.byId.get(SCROLLER_CATEGORY).children.length, 3);
  eq("D5 RE-PARENT: and no longer under the old one", r2.byId.get(SCROLLER_STORE).children.length, 0);

  // MOVE: same widget, a different region.
  const moved = baseInstances().filter((i) => i.id === SCROLLER_STORE);
  moved[0].regionId = "store-storefront:body";
  const r3 = resolveWidgetTree(
    PILOT_WIDGET_DEFS,
    [...PILOT_REGIONS, { id: "store-storefront:body", surface: "store", label: "Storefront body", allowedTypes: ["row.horizontalScroller"] }],
    moved,
    { surface: "store", permissions: ALL_PERMS },
  );
  eq("D6 MOVE: id unchanged after a region move", r3.roots[0].instance.id, SCROLLER_STORE);
  ok("D7 MOVE: still visible in the new region", r3.roots[0].visible === true);

  // The counter-example: a derived id would have changed under all three.
  const derive = (cfg) => `w-${String(cfg.source)}-${String(cfg.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  ok("D8 a derived id WOULD have changed on rename (the nav trap)",
    derive(original.find((i) => i.id === SCROLLER_STORE).config) !== derive(target.config));
}

// ---------------------------------------------------------------------------
// E. Malformed config is REPORTED, never thrown or silently dropped
// ---------------------------------------------------------------------------

{
  const r = run([{ id: "w-x", type: "no-such-widget", regionId: REGION, parentId: null, order: 0, config: {} }]);
  eq("E1 unknown type is reported", r.roots[0].reason, "unknown-type");
  ok("E2 and kept so it can be retyped or removed", r.byId.has("w-x"));
  ok("E3 with an operator-facing problem", r.problems.some((p) => /No widget definition named/.test(p.problem)));
}

{
  const r = run([{ id: "w-x", type: "row.horizontalScroller", regionId: "nope:body", parentId: null, order: 0, config: {} }]);
  eq("E4 unknown region is reported", r.roots[0].reason, "unknown-region");
  ok("E5 config cannot create a region", r.problems.some((p) => /config cannot create one/.test(p.problem)));
}

{
  /*
   * REWRITTEN for the owner's 2026-11-08 granularity ruling. This used to
   * assert "a card inside a card is refused because card.product is a LEAF".
   * A card is now a CONTAINER, so the leaf moved down a level: the thing that
   * may hold nothing is `element.price`. The assertion did not merely change
   * its expected value — its subject changed, which is what "this is
   * structural, not a config tweak" means in practice.
   */
  const r = run([
    scroller(SCROLLER_CATEGORY, "category", "t", 0),
    card("w-card-c0", SCROLLER_CATEGORY, 0),
    el("w-price", "element.price", "w-card-c0", 0),
    el("w-under-price", "element.badge", "w-price", 0),
  ]);
  ok("E6a a card is now a CONTAINER: an element child is accepted",
    r.byId.get("w-price").visible === true, r.byId.get("w-price").reason);
  eq("E6 nesting under a leaf ELEMENT is refused", r.byId.get("w-under-price").reason, "disallowed-child");
  ok("E7 with a problem naming the leaf", r.problems.some((p) => /is a leaf widget/.test(p.problem)));
  eq("E7a the real containment depth is region > row > card > element",
    r.byId.get("w-price").depth, 2);
}

{
  // A card inside a card is STILL refused — not because cards are leaves, but
  // because `card.product` does not list itself in `childTypes`.
  const r = run([
    scroller(SCROLLER_CATEGORY, "category", "t", 0),
    card("w-card-c0", SCROLLER_CATEGORY, 0),
    card("w-card-nested", "w-card-c0", 0),
  ]);
  eq("E6b a card inside a card is refused by `childTypes`, not by leafness",
    r.byId.get("w-card-nested").reason, "disallowed-child");
}

{
  const r = run([card("w-orphan", "w-does-not-exist", 0)]);
  eq("E8 an orphaned child is detectable, not invisible", r.roots[0].reason, "orphan-parent");
  ok("E9 and reported", r.problems.some((p) => /no such widget exists/.test(p.problem)));
}

{
  const a = card("w-a", "w-b", 0);
  const b = card("w-b", "w-a", 0);
  const r = run([a, b]);
  ok("E10 a parentId cycle does not hang the resolver", r.byId.size === 2, `byId=${r.byId.size}`);
  ok("E13 a cycle with no root leading into it is still REPORTED, not silent",
    r.problems.some((p) => /parent chain forms a cycle/.test(p.problem)), JSON.stringify(r.problems));
  ok("E14 and both members are marked not-visible with reason `cycle`",
    r.byId.get("w-a").reason === "cycle" && r.byId.get("w-b").reason === "cycle");
  ok("E15 neither contributes a reachable field", r.unreachableFields.length === 0);
}

{
  // A chain the walk ENTERS from a real root, three levels deep under a card.
  const r = run([
    scroller(SCROLLER_CATEGORY, "category", "t", 0),
    card("w-k1", SCROLLER_CATEGORY, 0),
    card("w-k2", "w-k1", 0),
    card("w-k3", "w-k2", 0),
  ]);
  ok("E16 every node in a deep chain is resolved exactly once", r.byId.size === 4, `byId=${r.byId.size}`);
  eq("E17 leaf nesting is refused at the first illegal level", r.byId.get("w-k2").reason, "disallowed-child");
  /*
   * Each level reports its OWN structural reason rather than inheriting
   * `parent-off`, because `disallowed-child` is a capability/registry fault
   * and capability is checked above state (section 6). An operator fixing a
   * three-deep illegal nest wants all three told to them, not one plus two
   * "its parent is off".
   */
  eq("E18 each illegal level reports its own structural reason",
    r.byId.get("w-k3").reason, "disallowed-child");
  eq("E19 one problem per illegal level, none swallowed",
    r.problems.filter((p) => /is not an allowed child/.test(p.problem)).length, 2);
}

{
  /*
   * `element.price` is a legal widget type and a legal CHILD of a card, but
   * the region does not accept it as a root — an element belongs inside a
   * card, not loose in a page region. The region allow-list and the parent's
   * `childTypes` are two different gates and both have to hold.
   */
  const r = run([el("w-loose-price", "element.price", null, 0)]);
  eq("E11 a type the REGION does not accept as a ROOT is refused", r.roots[0].reason, "disallowed-child");
  ok("E12 with the allowed list named", r.problems.some((p) => /does not accept "element\.price"/.test(p.problem)));
  ok("E12a and the same type IS accepted inside a card",
    run([scroller(SCROLLER_CATEGORY, "category", "t", 0), card("w-c", SCROLLER_CATEGORY, 0), el("w-p", "element.price", "w-c", 0)])
      .byId.get("w-p").visible === true);
}

// ---------------------------------------------------------------------------
// F. 🛑 Blocked ⇒ DISABLED AND NOT REQUIRED — the correctness requirement
// ---------------------------------------------------------------------------

/** Shaped exactly like Lane G's resolved `RequiredFieldRule[]`, tiers included. */
const RESOLVED_RULES = [
  { field: "stockQuantity", tier: "config" },
  { field: "offerAmount", tier: "config" },
  { field: "video.url", tier: "system" },
];

{
  const r = run(baseInstances());
  eq("F1 nothing blocked: no unreachable fields", r.unreachableFields, []);
  const p = partitionRequiredRules(RESOLVED_RULES, r.unreachableFields);
  eq("F2 nothing blocked: every rule is enforced", p.enforced.length, 3);
  eq("F3 nothing dropped", p.dropped.length, 0);
  eq("F4 nothing refused", p.refuse.length, 0);
}

{
  // Block the offer board — a CONFIG-tier field owner.
  const insts = baseInstances();
  insts.find((i) => i.id === OFFER_BOARD).state = "off";
  const r = run(insts);

  ok("F5 blocking a widget makes its fields unreachable",
    r.unreachableFields.includes("offerAmount") && r.unreachableFields.includes("offerMessage"),
    JSON.stringify(r.unreachableFields));
  ok("F6 a VISIBLE widget's fields stay reachable", !r.unreachableFields.includes("video.url"));

  const p = partitionRequiredRules(RESOLVED_RULES, r.unreachableFields);
  eq("F7 the config-tier rule on the blocked field is DROPPED", p.dropped.map((x) => x.field), ["offerAmount"]);
  ok("F8 the form is submittable: offerAmount is no longer enforced",
    !p.enforced.some((x) => x.field === "offerAmount"));
  ok("F9 unrelated requirements are untouched", p.enforced.some((x) => x.field === "stockQuantity"));
  eq("F10 nothing is refused — a config-tier field is relaxable by definition", p.refuse.length, 0);
}

{
  // Block the live-media widget — a SYSTEM-tier field owner. Must NOT drop.
  const insts = baseInstances();
  insts.find((i) => i.id === LIVE_PROOF).state = "off";
  const r = run(insts);
  ok("F11 the system-tier field is unreachable", r.unreachableFields.includes("video.url"));

  const p = partitionRequiredRules(RESOLVED_RULES, r.unreachableFields);
  eq("F12 a SYSTEM-tier requirement is NOT dropped by hiding its widget", p.dropped.length, 0);
  ok("F13 it is still enforced", p.enforced.some((x) => x.field === "video.url"));
  eq("F14 and the configuration is REFUSED", p.refuse.map((x) => x.field), ["video.url"]);
  ok("F15 with a save-time problem in Lane G's { scope, field, problem } shape",
    p.problems.length === 1 && p.problems[0].field === "video.url" &&
    /cannot be\s+relaxed by hiding the widget/.test(p.problems[0].problem),
    JSON.stringify(p.problems));
}

{
  // The owner's OTHER rule composes: a validated default makes hiding legitimate.
  const insts = baseInstances();
  insts.find((i) => i.id === LIVE_PROOF).state = "off";
  const r = run(insts);
  const p = partitionRequiredRules(RESOLVED_RULES, r.unreachableFields, ["video.url"]);
  eq("F16 a supplied default makes a hidden system-tier field acceptable", p.refuse.length, 0);
  ok("F17 the requirement still STANDS against the record", p.enforced.some((x) => x.field === "video.url"));
  eq("F18 and it is still not dropped", p.dropped.length, 0);
}

{
  // Blocking a PARENT must make a child's fields unreachable too.
  const insts = [
    { id: "w-wrap", type: "row.horizontalScroller", regionId: REGION, parentId: null, order: 0, state: "off", config: {} },
  ];
  const r = run(insts);
  eq("F19 a blocked container is not visible", r.roots[0].visible, false);

  // And a field hidden by the SURFACE's own fieldVisibility map joins the set.
  const r2 = run(baseInstances(), { hiddenFields: ["stockQuantity"] });
  ok("F20 fieldVisibility hides feed the same unreachable set", r2.unreachableFields.includes("stockQuantity"));
  const p = partitionRequiredRules(RESOLVED_RULES, r2.unreachableFields);
  eq("F21 and are dropped by the same rule", p.dropped.map((x) => x.field), ["stockQuantity"]);
}

{
  // Two widgets claiming one field: one visible is enough to keep it reachable.
  const defs = [
    ...PILOT_WIDGET_DEFS,
    { type: "section.offerCompact", tier: "section", label: "Offer (compact)", surfaces: ["product"], childTypes: [], ownsFields: ["offerAmount"] },
  ];
  const r = resolveWidgetTree(
    defs,
    [{ id: REGION, surface: "product", label: "x", allowedTypes: ["section.offerBoard", "section.offerCompact"] }],
    [
      { id: "w-ob", type: "section.offerBoard", regionId: REGION, parentId: null, order: 0, state: "off", config: {} },
      { id: "w-oc", type: "section.offerCompact", regionId: REGION, parentId: null, order: 1, config: {} },
    ],
    { surface: "product", permissions: ALL_PERMS },
  );
  ok("F22 a field surfaced by ANY visible widget stays reachable",
    !r.unreachableFields.includes("offerAmount"), JSON.stringify(r.unreachableFields));
  ok("F23 the field only that blocked widget owns is unreachable",
    r.unreachableFields.includes("offerMessage"));
}

// ---------------------------------------------------------------------------
// H. `removable: false` — A16's "required elements cannot be removed",
//    with a mechanism behind it for the first time. Added because the owner's
//    granularity ruling made `price` a WIDGET, so the guardrail can no longer
//    be a required-FIELD rule.
// ---------------------------------------------------------------------------

{
  const insts = [
    scroller(SCROLLER_CATEGORY, "category", "t", 0),
    card("w-c", SCROLLER_CATEGORY, 0),
    el("w-price", "element.price", "w-c", 0, "off"),      // vendor tries to remove the price
    el("w-badge", "element.badge", "w-c", 1, "off"),      // and a badge, which IS removable
  ];
  const r = run(insts);

  ok("H1 a non-removable element stays VISIBLE despite `state: \"off\"`",
    r.byId.get("w-price").visible === true, r.byId.get("w-price").reason);
  ok("H2 and the operator is TOLD the setting had no effect",
    r.problems.some((p) => p.scope === "widget:w-price" && /cannot be removed by configuration/.test(p.problem)),
    JSON.stringify(r.problems));
  ok("H3 the problem names the element, so the message is actionable",
    r.problems.some((p) => /"Price" cannot be removed/.test(p.problem)));
  ok("H4 a REMOVABLE sibling is still removed — the rule is per-definition, not blanket",
    r.byId.get("w-badge").visible === false);
  eq("H5 and its reason is the ordinary `state-off`", r.byId.get("w-badge").reason, "state-off");
  ok("H6 only one refusal is reported, not one per element",
    r.problems.filter((p) => /cannot be removed by configuration/.test(p.problem)).length === 1);
}

{
  // `removable: false` does NOT outrank a capability denial or a blocked
  // parent — it only outranks an explicit `off` on that widget itself.
  const insts = [
    scroller(SCROLLER_CATEGORY, "category", "t", 0, "off"),
    card("w-c", SCROLLER_CATEGORY, 0),
    el("w-price", "element.price", "w-c", 0),
  ];
  const r = run(insts);
  ok("H7 a non-removable element still goes with a blocked ancestor",
    r.byId.get("w-price").visible === false);
  eq("H8 with reason `parent-off`", r.byId.get("w-price").reason, "parent-off");
  ok("H9 so `price` becomes unreachable and its requirement is in play",
    r.unreachableFields.includes("price"));
}

{
  // The full depth the owner's ruling produces, end to end.
  const insts = [
    scroller(SCROLLER_CATEGORY, "category", "More in this category", 0),
    card("w-c", SCROLLER_CATEGORY, 0),
    el("w-img", "element.image", "w-c", 0),
    el("w-title", "element.title", "w-c", 1),
    el("w-price", "element.price", "w-c", 2),
    el("w-cond", "element.condition", "w-c", 3),
    el("w-cta", "element.cta", "w-c", 4),
    el("w-link", "element.link", "w-c", 5),
  ];
  const r = run(insts);
  eq("H10 one card carries 6 element widgets", r.byId.get("w-c").children.length, 6);
  ok("H11 all six resolve visible", r.byId.get("w-c").children.every((n) => n.visible));
  eq("H12 element depth is 2 (region > row > card > element)", r.byId.get("w-price").depth, 2);
  eq("H13 elements keep their configured order",
    r.byId.get("w-c").children.map((n) => n.instance.type),
    ["element.image", "element.title", "element.price", "element.condition", "element.cta", "element.link"]);
  eq("H14 no problems on a well-formed deep tree", r.problems.length, 0);
  eq("H15 every element field is reachable", r.unreachableFields, []);
}

{
  // The measured shape of a real grid: 1 scroller, 24 cards, 6 elements each.
  const insts = [scroller(SCROLLER_CATEGORY, "category", "t", 0)];
  for (let c = 0; c < 24; c += 1) {
    insts.push(card(`w-c${c}`, SCROLLER_CATEGORY, c));
    for (const [i, t] of ["element.image", "element.title", "element.price", "element.condition", "element.cta", "element.link"].entries()) {
      insts.push(el(`w-c${c}-e${i}`, t, `w-c${c}`, i));
    }
  }
  const t0 = process.hrtime.bigint();
  const r = run(insts);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  eq("H16 a 24-card grid resolves every node", r.byId.size, 1 + 24 + 24 * 6);
  ok("H17 and resolves in under 25ms", ms < 25, `${ms.toFixed(2)}ms for ${r.byId.size} nodes`);
  eq("H18 with no spurious problems", r.problems.length, 0);
  console.log(`  (H17 observed: ${ms.toFixed(2)}ms for ${r.byId.size} nodes)`);
}

// ---------------------------------------------------------------------------
// G. Sparseness — absent config must behave exactly as today
// ---------------------------------------------------------------------------

{
  const r = run([]);
  eq("G1 no stored instances resolves to nothing, with no error", r.roots.length, 0);
  eq("G2 and no unreachable fields", r.unreachableFields, []);
  eq("G3 and no problems", r.problems.length, 0);
  const p = partitionRequiredRules(RESOLVED_RULES, r.unreachableFields);
  eq("G4 so required-ness is byte-identical to today", p.enforced.length, 3);
}

{
  const insts = baseInstances().map((i) => ({ ...i, state: undefined }));
  const r = run(insts);
  ok("G5 absent `state` inherits the definition default (on)", r.roots.every((n) => n.visible));
}

{
  const defs = PILOT_WIDGET_DEFS.map((d) =>
    d.type === "row.horizontalScroller" ? { ...d, defaultOn: false } : d,
  );
  const r = resolveWidgetTree(defs, PILOT_REGIONS, [scroller("w-s", "category", "t", 0)], {
    surface: "product", permissions: ALL_PERMS,
  });
  eq("G6 `defaultOn: false` means present-but-off until explicitly enabled", r.roots[0].reason, "state-off");
  const r2 = resolveWidgetTree(defs, PILOT_REGIONS, [scroller("w-s", "category", "t", 0, "on")], {
    surface: "product", permissions: ALL_PERMS,
  });
  ok("G7 an explicit `on` enables it", r2.roots[0].visible === true);
}

{
  const r = run(baseInstances(), { });
  ok("G8 region `enabled: false` takes the whole region off",
    resolveWidgetTree(PILOT_WIDGET_DEFS, [{ ...PILOT_REGIONS[0], enabled: false }], baseInstances(),
      { surface: "product", permissions: ALL_PERMS }).roots.every((n) => n.visible === false));
  ok("G9 and with the region on, the same instances render", r.roots.some((n) => n.visible));
}

// Minted ids must be unique even when minted in the same millisecond.
{
  const ids = new Set(Array.from({ length: 500 }, mint));
  eq("G10 minted ids are unique within one tick", ids.size, 500);
}

// ---------------------------------------------------------------------------
// J. THE LIVE SLICE — the four defaults must reproduce RelatedItemsSection's
//    original headings EXACTLY. This is the value-validation that a 200 and a
//    screenshot cannot give: the `altRegionName` regression blanked a real
//    content block and still returned 200.
// ---------------------------------------------------------------------------

/** Re-implementation of the component's row mapping, so the assertions test the real decision path. */
function relatedRows(instances, labels, counts) {
  const r = resolveWidgetTree(PILOT_WIDGET_DEFS, PILOT_REGIONS, instances, { surface: "product" });
  return r.roots
    .filter((n) => n.visible && n.instance.regionId === "products-slug:related")
    .map((n) => {
      const cfg = asRelatedScrollerConfig(n.instance.config);
      if (!cfg) return null;
      if (!counts[cfg.source]) return null;
      return { id: n.instance.id, source: cfg.source, title: resolveScrollerTitle(cfg, labels[cfg.source]) };
    })
    .filter(Boolean);
}

const ALL_FOUR = { category: 3, brand: 3, tags: 3, store: 3 };

{
  // Every label present — the three interpolating branches must interpolate.
  const rows = relatedRows(
    RELATED_DEFAULT_INSTANCES,
    { category: "Burst Series", brand: "Takara Tomy", tags: undefined, store: "BeyHub" },
    ALL_FOUR,
  );
  eq("J1 four default instances resolve to four rows", rows.length, 4);
  eq("J2 in the original JSX order", rows.map((r) => r.source), ["category", "brand", "tags", "store"]);
  eq("J3 headings match the hardcoded branches verbatim", rows.map((r) => r.title), [
    "More in Burst Series",
    "More by Takara Tomy",
    "You might also like",
    "More from BeyHub",
  ]);
}

{
  // No labels — the fallbacks the ternaries used to supply.
  const rows = relatedRows(
    RELATED_DEFAULT_INSTANCES,
    { category: undefined, brand: undefined, tags: undefined, store: undefined },
    ALL_FOUR,
  );
  eq("J4 absent labels fall back exactly as the ternaries did", rows.map((r) => r.title), [
    "More in this category",
    "More by this brand",
    "You might also like",
    "More from this seller",
  ]);
}

{
  // An empty source array renders nothing — the `.length > 0` guards.
  const rows = relatedRows(
    RELATED_DEFAULT_INSTANCES,
    { category: "Burst Series", brand: "X", tags: undefined, store: "Y" },
    { category: 3, brand: 0, tags: 0, store: 2 },
  );
  eq("J5 a source with no items contributes no row", rows.map((r) => r.source), ["category", "store"]);
  eq("J6 and the surviving headings are unaffected", rows.map((r) => r.title),
    ["More in Burst Series", "More from Y"]);
}

{
  const rows = relatedRows(RELATED_DEFAULT_INSTANCES, {}, { category: 0, brand: 0, tags: 0, store: 0 });
  eq("J7 all sources empty -> zero rows (component returns null, no empty frame)", rows.length, 0);
}

{
  // The payoff: removing one carousel is now CONFIG, not a code edit.
  const off = RELATED_DEFAULT_INSTANCES.map((i) =>
    i.id === "w-related-store" ? { ...i, state: "off" } : i,
  );
  const rows = relatedRows(off, { category: "C", brand: "B", tags: undefined, store: "S" }, ALL_FOUR);
  eq("J8 switching off 'sellers other items' removes exactly that row",
    rows.map((r) => r.source), ["category", "brand", "tags"]);
}

{
  // Reordering is config too.
  const reordered = RELATED_DEFAULT_INSTANCES.map((i) => ({
    ...i,
    order: { "w-related-store": 0, "w-related-tags": 1, "w-related-brand": 2, "w-related-category": 3 }[i.id],
  }));
  const rows = relatedRows(reordered, { category: "C", brand: "B", tags: undefined, store: "S" }, ALL_FOUR);
  eq("J9 reordering the carousels is a config change",
    rows.map((r) => r.source), ["store", "tags", "brand", "category"]);
}

{
  // Retitling is config, and it must not touch the identity.
  const retitled = RELATED_DEFAULT_INSTANCES.map((i) =>
    i.id === "w-related-tags"
      ? { ...i, config: { ...i.config, titleTemplate: "Recommended for you", fallbackTitle: "Recommended for you" } }
      : i,
  );
  const rows = relatedRows(retitled, {}, ALL_FOUR);
  ok("J10 retitling a carousel is a config change", rows[2].title === "Recommended for you", rows[2].title);
  eq("J11 and its id is unchanged by the retitle", rows[2].id, "w-related-tags");
}

{
  // A fifth instance of the SAME type — "add another scroller" with no new code.
  const plus = [
    ...RELATED_DEFAULT_INSTANCES,
    {
      id: "w-related-extra",
      type: "row.horizontalScroller",
      regionId: "products-slug:related",
      parentId: null,
      order: 4,
      config: { source: "brand", titleTemplate: "Also by {label}", fallbackTitle: "Also by this brand" },
    },
  ];
  const rows = relatedRows(plus, { category: "C", brand: "B", tags: undefined, store: "S" }, ALL_FOUR);
  eq("J12 a fifth scroller needs no code change", rows.length, 5);
  eq("J13 and it reads the same closed source vocabulary", rows[4].title, "Also by B");
}

{
  // A malformed stored row must not take the section down.
  const bad = [
    ...RELATED_DEFAULT_INSTANCES,
    {
      id: "w-related-bad",
      type: "row.horizontalScroller",
      regionId: "products-slug:related",
      parentId: null,
      order: 9,
      config: { source: "not-a-real-source", titleTemplate: "x", fallbackTitle: "x" },
    },
  ];
  const rows = relatedRows(bad, {}, ALL_FOUR);
  eq("J14 an unknown `source` is skipped, not thrown", rows.length, 4);
  eq("J15 and the four real rows still render", rows.map((r) => r.source),
    ["category", "brand", "tags", "store"]);
  eq("J16 asRelatedScrollerConfig rejects the bad row", asRelatedScrollerConfig({ source: "nope" }), undefined);
}

{
  // `maxItems` is honoured as config (unused by the defaults, present from day one).
  const capped = RELATED_DEFAULT_INSTANCES.map((i) =>
    i.id === "w-related-category" ? { ...i, config: { ...i.config, maxItems: 2 } } : i,
  );
  eq("J17 maxItems survives the config narrowing",
    asRelatedScrollerConfig(capped[0].config).maxItems, 2);
}

{
  // Defaults must be stable identities, not minted per call.
  const a = RELATED_DEFAULT_INSTANCES.map((i) => i.id);
  const b = RELATED_DEFAULT_INSTANCES.map((i) => i.id);
  eq("J18 default instance ids are stable across reads", a, b);
  ok("J19 and are hand-written, not timestamp-minted",
    a.every((id) => /^w-related-[a-z]+$/.test(id)), JSON.stringify(a));
  eq("J20 every default targets the live related region",
    new Set(RELATED_DEFAULT_INSTANCES.map((i) => i.regionId)).size, 1);
}

// ---------------------------------------------------------------------------
// K. PERSISTENCE — template defaults (+) stored overrides, and alias lookup
// ---------------------------------------------------------------------------

{
  const merged = mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, []);
  eq("K1 no stored rows -> the four template defaults, unchanged", merged.length, 4);
  ok("K2 all marked `default`", merged.every((m) => m.origin === "default"));
  eq("K3 byte-identical config to the registry",
    merged.map((m) => m.instance.config.source), ["category", "brand", "tags", "store"]);
}

{
  /*
   * THE COMMON CASE, and the one a whole-map replace would break: a stored row
   * that says ONLY `{ id, state: "off" }`. Its `config` must survive from the
   * default — `HomepageSectionsRepository` needed an explicit `update`
   * override because "every config key a caller omitted was silently deleted"
   * behind an HTTP 200.
   */
  const stored = [{ id: "w-related-store", type: "row.horizontalScroller", regionId: "products-slug:related", parentId: null, order: 3, state: "off" }];
  const merged = mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, stored);
  const row = merged.find((m) => m.instance.id === "w-related-store");
  eq("K4 a partial override does NOT wipe the default config",
    row.instance.config, { source: "store", titleTemplate: "More from {label}", fallbackTitle: "More from this seller" });
  eq("K5 but the overridden field wins", row.instance.state, "off");
  eq("K6 and the row is marked `overridden`", row.origin, "overridden");
  ok("K7 siblings stay `default`",
    merged.filter((m) => m.instance.id !== "w-related-store").every((m) => m.origin === "default"));
}

{
  // A partial CONFIG override merges one level, it does not replace the bag.
  const stored = [{ id: "w-related-tags", type: "row.horizontalScroller", regionId: "products-slug:related", parentId: null, order: 2, config: { titleTemplate: "Picked for you" } }];
  const row = mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, stored)
    .find((m) => m.instance.id === "w-related-tags");
  eq("K8 overriding one config key keeps the others", row.instance.config, {
    source: "tags", titleTemplate: "Picked for you", fallbackTitle: "You might also like",
  });
}

{
  // An ADDED widget the template does not know about.
  const stored = [{ id: "w-extra", type: "row.horizontalScroller", regionId: "products-slug:related", parentId: null, order: 9, config: { source: "brand", titleTemplate: "Also by {label}", fallbackTitle: "Also by this brand" } }];
  const merged = mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, stored);
  eq("K9 an added row is appended", merged.length, 5);
  eq("K10 and marked `added`", merged.find((m) => m.instance.id === "w-extra").origin, "added");
  eq("K11 merged output is ordered by `order`",
    merged.map((m) => m.instance.order), [0, 1, 2, 3, 9]);
}

{
  // `type` is never overridable — a type change is delete + create.
  const stored = [{ id: "w-related-tags", type: "section.offerBoard", regionId: "products-slug:related", parentId: null, order: 2 }];
  const row = mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, stored)
    .find((m) => m.instance.id === "w-related-tags");
  eq("K12 a stored row cannot repoint a default at another definition",
    row.instance.type, "row.horizontalScroller");
}

{
  // End to end: stored override -> merge -> resolve -> the rail disappears.
  const stored = [{ id: "w-related-brand", type: "row.horizontalScroller", regionId: "products-slug:related", parentId: null, order: 1, state: "off" }];
  const rows = relatedRows(
    mergedInstances(RELATED_DEFAULT_INSTANCES, stored),
    { category: "C", brand: "B", tags: undefined, store: "S" },
    ALL_FOUR,
  );
  eq("K13 a STORED off removes exactly that rail, end to end",
    rows.map((r) => r.source), ["category", "tags", "store"]);
  eq("K14 and the survivors keep their headings",
    rows.map((r) => r.title), ["More in C", "You might also like", "More from S"]);
}

{
  // Alias lookup — the nav-trap defence.
  const withAlias = RELATED_DEFAULT_INSTANCES.map((i) =>
    i.id === "w-related-store" ? { ...i, aliases: ["pdp-sections:related-store", "nav-related-store"] } : i,
  );
  eq("K15 lookup by minted id works",
    findInstanceByRef(withAlias, "w-related-store").id, "w-related-store");
  eq("K16 lookup by a LEGACY derived key resolves to the same instance",
    findInstanceByRef(withAlias, "pdp-sections:related-store").id, "w-related-store");
  eq("K17 a second legacy spelling also resolves (the nav-brands/nav-public-brands case)",
    findInstanceByRef(withAlias, "nav-related-store").id, "w-related-store");
  eq("K18 an unknown ref resolves to nothing, rather than to an arbitrary row",
    findInstanceByRef(withAlias, "no-such-key"), undefined);
  eq("K19 every ref an instance answers to is enumerable for a migration audit",
    instanceRefs(withAlias.find((i) => i.id === "w-related-store")),
    ["w-related-store", "pdp-sections:related-store", "nav-related-store"]);
}

{
  // An exact id must NEVER be shadowed by someone else's alias.
  const insts = [
    { id: "w-a", type: "element.link", regionId: "r", parentId: null, order: 0, aliases: ["w-b"] },
    { id: "w-b", type: "element.link", regionId: "r", parentId: null, order: 1 },
  ];
  eq("K20 an exact id wins over another row's alias", findInstanceByRef(insts, "w-b").id, "w-b");
  eq("K21 the collision is detectable rather than silent", findRefCollisions(insts), ["w-b"]);
  eq("K22 a clean table reports no collisions", findRefCollisions(RELATED_DEFAULT_INSTANCES), []);
}

{
  // Defaults must never be mutated by a merge — the registry array is a
  // process-lifetime singleton, so a mutation would leak across requests.
  const before = JSON.stringify(RELATED_DEFAULT_INSTANCES);
  mergeStoredWithDefaults(RELATED_DEFAULT_INSTANCES, [
    { id: "w-related-store", type: "row.horizontalScroller", regionId: "products-slug:related", parentId: null, order: 3, state: "off", config: { titleTemplate: "X" } },
  ]);
  eq("K23 merging does not mutate the registry defaults", JSON.stringify(RELATED_DEFAULT_INSTANCES), before);
}

// ---------------------------------------------------------------------------

rmSync(out, { recursive: true, force: true });

const total = pass + failures.length;
if (failures.length) {
  console.error(`\n${failures.length} of ${total} assertions FAILED:\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`widget resolver: ${pass}/${total} assertions pass`);
