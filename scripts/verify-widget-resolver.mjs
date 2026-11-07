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
const { PILOT_REGIONS, PILOT_WIDGET_DEFS } = await import(
  pathToFileURL(join(out, "pilot-registry.js")).href
);

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
  return { id, type: "related-scroller", regionId: REGION, parentId: null, order, state, config: { source, title } };
}
function card(id, parentId, order, state) {
  return { id, type: "product-card", regionId: REGION, parentId, order, state, config: {} };
}

/** The four real branches, plus three product-card children under two of them. */
function baseInstances() {
  return [
    scroller(SCROLLER_CATEGORY, "category", "More in this category", 0),
    scroller("w-scroller-brand", "brand", "More by this brand", 1),
    scroller("w-scroller-tags", "tags", "You might also like", 2),
    scroller(SCROLLER_STORE, "store", "More from this seller", 3),
    card("w-card-c1", SCROLLER_CATEGORY, 1),
    card("w-card-c0", SCROLLER_CATEGORY, 0),
    card("w-card-s0", SCROLLER_STORE, 0),
    { id: OFFER_BOARD, type: "offer-board", regionId: REGION, parentId: null, order: 4, config: {} },
    { id: LIVE_PROOF, type: "live-media-proof", regionId: REGION, parentId: null, order: 5, config: {} },
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
    new Set(r.roots.filter((n) => n.instance.type === "related-scroller").map((n) => n.instance.config.source)).size, 4);
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
    [{ id: REGION, surface: "homepage", label: "x", allowedTypes: ["offer-board"] }],
    [{ id: "w-ob", type: "offer-board", regionId: REGION, parentId: null, order: 0, config: {} }],
    { surface: "homepage", permissions: ALL_PERMS },
  );
  eq("C5 `WidgetDef.surfaces` is read: offer-board is product-only", r2.roots[0].reason, "wrong-surface");
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
    [...PILOT_REGIONS, { id: "store-storefront:body", surface: "store", label: "Storefront body", allowedTypes: ["related-scroller"] }],
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
  const r = run([{ id: "w-x", type: "related-scroller", regionId: "nope:body", parentId: null, order: 0, config: {} }]);
  eq("E4 unknown region is reported", r.roots[0].reason, "unknown-region");
  ok("E5 config cannot create a region", r.problems.some((p) => /config cannot create one/.test(p.problem)));
}

{
  // A card-inside-a-card: product-card declares childTypes: [].
  const r = run([
    scroller(SCROLLER_CATEGORY, "category", "t", 0),
    card("w-card-c0", SCROLLER_CATEGORY, 0),
    card("w-card-nested", "w-card-c0", 0),
  ]);
  eq("E6 nesting under a leaf widget is refused", r.byId.get("w-card-nested").reason, "disallowed-child");
  ok("E7 with a problem naming the leaf", r.problems.some((p) => /is a leaf widget/.test(p.problem)));
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
  // A chain the walk ENTERS from a real root, three levels deep under a leaf.
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
  const r = run([{ id: "w-pc", type: "product-card", regionId: REGION, parentId: null, order: 0, config: {} }]);
  eq("E11 a type the REGION does not accept is refused", r.roots[0].reason, "disallowed-child");
  ok("E12 with the allowed list named", r.problems.some((p) => /does not accept "product-card"/.test(p.problem)));
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
    { id: "w-wrap", type: "related-scroller", regionId: REGION, parentId: null, order: 0, state: "off", config: {} },
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
    { type: "offer-compact", tier: "section", label: "Offer (compact)", surfaces: ["product"], childTypes: [], ownsFields: ["offerAmount"] },
  ];
  const r = resolveWidgetTree(
    defs,
    [{ id: REGION, surface: "product", label: "x", allowedTypes: ["offer-board", "offer-compact"] }],
    [
      { id: "w-ob", type: "offer-board", regionId: REGION, parentId: null, order: 0, state: "off", config: {} },
      { id: "w-oc", type: "offer-compact", regionId: REGION, parentId: null, order: 1, config: {} },
    ],
    { surface: "product", permissions: ALL_PERMS },
  );
  ok("F22 a field surfaced by ANY visible widget stays reachable",
    !r.unreachableFields.includes("offerAmount"), JSON.stringify(r.unreachableFields));
  ok("F23 the field only that blocked widget owns is unreachable",
    r.unreachableFields.includes("offerMessage"));
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
    d.type === "related-scroller" ? { ...d, defaultOn: false } : d,
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

rmSync(out, { recursive: true, force: true });

const total = pass + failures.length;
if (failures.length) {
  console.error(`\n${failures.length} of ${total} assertions FAILED:\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`widget resolver: ${pass}/${total} assertions pass`);
