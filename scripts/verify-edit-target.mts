/**
 * verify-edit-target — EXECUTE the resolver against every viewer shape.
 *
 * 🛑 The acceptance test for anything resolved through a table is to RUN it and
 * read its answer. `resolvePaymentMethod` shipped with the full precedence,
 * verified against nine cases, and NOTHING CALLED IT; `dispatchNotification`'s
 * seller arm was unreachable because every input resolved away from it. Both
 * were found by execution and neither by review.
 *
 * ⚠ And this resolver already produced one instance of that class before it
 * ran once: the seller arm was gated on `store:products:write`, a permission
 * key that exists NOWHERE in either repo, so the arm could never have fired.
 * Case 7 below is the regression test for exactly that.
 *
 * Run: npx tsx scripts/verify-edit-target.mts
 */
import {
  resolveEditTarget,
  viewerCanUseEditMode,
  type EditSubject,
  type EditViewer,
} from "../src/_internal/shared/edit-mode/resolve-edit-target";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

/* ── the four viewers the owner's rule distinguishes ───────────────────────── */
/*
 * 🛑 THE ADMIN FIXTURE IS `isAdmin` WITH AN EMPTY `permissions` ARRAY, and that
 * correction found a real bug.
 *
 * It first listed the four permission strings explicitly — a shape the
 * application never produces. `permissionsFor(user)` returns
 * `{ isAdmin, permissions }` and `can()` short-circuits on the flag ("Admin
 * always does"), so a REAL admin can hold an empty `permissions` array. The
 * resolver's membership test therefore returned `false` for every actual
 * admin, and all four admin arms were dead — while this verifier reported
 * 29/29 green, because the fixture shared the code's misunderstanding.
 *
 * ⚠ A test built from the same wrong model as the code agrees with it. The
 * fixture now matches what the app passes, and an `isAdmin`-less admin is
 * asserted separately below.
 */
const admin: EditViewer = { isAdmin: true, permissions: [] };
/* An employee with the explicit grants but NOT the admin flag — the other real
 * shape, and the one that proves the arms are not merely `isAdmin` gates. */
const employee: EditViewer = {
  permissions: [
    "admin:sections:write",
    "admin:products:write",
    "admin:faqs:write",
    "admin:support-tickets:write",
  ],
};
const seller: EditViewer = { permissions: [], storeIds: ["store-mine"], canEditOwnListings: true };
const buyer: EditViewer = { permissions: [] };
/* An admin who ALSO owns a store — the precedence case. */
const adminSeller: EditViewer = {
  permissions: ["admin:products:write"],
  storeIds: ["store-mine"],
  canEditOwnListings: true,
};

const mine: EditSubject = { kind: "listing", id: "p1", storeId: "store-mine" };
const theirs: EditSubject = { kind: "listing", id: "p2", storeId: "store-other" };
const unattributed: EditSubject = { kind: "listing", id: "p3" };
const homepage: EditSubject = { kind: "homepageSection", id: "section-welcome-hero" };
const ticket: EditSubject = { kind: "supportTicket", id: "SUP-882" };

console.log("\n  ── the owner's four rules, executed ──\n");

/* "admin all edit" */
check(resolveEditTarget(homepage, admin)?.scope === "admin", "admin · homepage → admin panel", resolveEditTarget(homepage, admin)?.href);
check(resolveEditTarget(ticket, admin)?.scope === "admin", "admin · support → admin panel", resolveEditTarget(ticket, admin)?.href);
check(resolveEditTarget(mine, admin)?.scope === "admin", "admin · any listing → admin editor", resolveEditTarget(mine, admin)?.href);
check(resolveEditTarget(theirs, admin)?.scope === "admin", "admin · someone else's listing → admin editor");

/*
 * 🛑 The admin arms must fire for BOTH real shapes: `isAdmin` with no strings,
 * and the strings with no flag. Only testing one is how the bug above survived.
 */
check(resolveEditTarget(homepage, employee)?.scope === "admin", "employee WITH the grant · homepage → admin panel");
check(resolveEditTarget(mine, employee)?.scope === "admin", "employee WITH the grant · listing → admin editor");
check(
  resolveEditTarget(homepage, { isAdmin: true, permissions: [] })?.href === "/admin/sections/section-welcome-hero",
  "🛑 an admin with an EMPTY permissions array still resolves (the flag is the entitlement)",
);
check(
  resolveEditTarget(homepage, { permissions: ["admin:faqs:write"] }) === null,
  "a grant for a DIFFERENT resource does not open the homepage editor",
);

/* "listing edit → own listing → seller dashboard edit" */
const sellerOwn = resolveEditTarget(mine, seller);
check(sellerOwn?.scope === "store", "seller · OWN listing → seller dashboard", sellerOwn?.href);
check(
  sellerOwn?.href === "/store/products/p1/edit",
  "…and at the route that exists",
  String(sellerOwn?.href),
);

/* 🛑 CASE 7 — the regression test for the invented permission. If the seller
 * arm is ever re-gated on a key nobody holds, this is the assertion that goes
 * red instead of the arm silently never firing. */
check(sellerOwn !== null, "🛑 the seller arm FIRES at all (it once could not)");

/* "others → no change" */
check(resolveEditTarget(theirs, seller) === null, "seller · someone else's listing → NO affordance");
check(resolveEditTarget(homepage, seller) === null, "seller · homepage → NO affordance");
check(resolveEditTarget(ticket, seller) === null, "seller · support → NO affordance");
check(resolveEditTarget(mine, buyer) === null, "buyer · any listing → NO affordance");
check(resolveEditTarget(homepage, buyer) === null, "buyer · homepage → NO affordance");
check(resolveEditTarget(homepage, null) === null, "anonymous → NO affordance");

/* Precedence: admin wins on their own stock. */
check(
  resolveEditTarget(mine, adminSeller)?.scope === "admin",
  "admin-who-is-also-a-seller · own listing → ADMIN editor, not the narrower seller form",
);

/* 🛑 Unknown ownership fails CLOSED — otherwise every seller gets a pencil on
 * every unattributed listing. */
check(
  resolveEditTarget(unattributed, seller) === null,
  "a listing with NO storeId is not 'mine' — unknown ownership fails closed",
);

/* 🛑 Unknown subject kind fails CLOSED. */
check(
  resolveEditTarget({ kind: "spaceship", id: "x" }, admin) === null,
  "an unknown subject kind → NO affordance, even for an admin",
);

/* A viewer with a malformed permissions field must not crash a page. */
check(
  resolveEditTarget(homepage, { permissions: undefined as never }) === null,
  "a malformed viewer degrades to null rather than throwing",
);

/* ── the toggle gate ──────────────────────────────────────────────────────── */
console.log("\n  ── who may turn edit mode ON ──\n");
check(viewerCanUseEditMode(admin), "admin can use edit mode");
check(viewerCanUseEditMode(seller), "a seller with stock can use edit mode (so their own pencils can render)");
check(!viewerCanUseEditMode(buyer), "a buyer cannot");
check(!viewerCanUseEditMode(null), "anonymous cannot");
check(
  !viewerCanUseEditMode({ permissions: [], canEditOwnListings: true, storeIds: [] }),
  "a 'seller' with ZERO stores cannot — the capability needs a store to act on",
);

/* ── every href must be a real route ──────────────────────────────────────── */
console.log("\n  ── every destination is a route that exists ──\n");
const REAL_ROUTES = [
  /^\/admin\/sections\/[^/]+$/,
  /^\/admin\/faqs\/[^/]+\/edit$/,
  /^\/admin\/support-tickets\/[^/]+$/,
  /^\/admin\/products\/[^/]+\/edit$/,
  /^\/store\/products\/[^/]+\/edit$/,
];
const produced = [
  resolveEditTarget(homepage, admin),
  resolveEditTarget({ kind: "faq", id: "f1" }, admin),
  resolveEditTarget(ticket, admin),
  resolveEditTarget(mine, admin),
  resolveEditTarget(mine, seller),
].filter(Boolean);
for (const t of produced) {
  check(REAL_ROUTES.some((r) => r.test(t!.href)), `${t!.href} matches a real route shape`);
}
/* An id with a slash or a query would otherwise escape its segment. */
const nasty = resolveEditTarget({ kind: "listing", id: "a/b?c=1" }, admin);
check(
  nasty?.href === "/admin/products/a%2Fb%3Fc%3D1/edit",
  "ids are URL-encoded — a slash cannot escape its path segment",
  String(nasty?.href),
);

/* Every target carries a reason; an unexplained precedence is unsupportable. */
check(produced.every((t) => typeof t!.reason === "string" && t!.reason.length > 0), "every target carries a reason");

console.log(`\n${fail === 0 ? "✅ edit-target rules hold" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
