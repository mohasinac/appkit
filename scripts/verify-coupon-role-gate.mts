/**
 * verify-coupon-role-gate — a role-restricted coupon must be unusable and
 * unlistable by anyone outside its roles.
 *
 * 🛑 THE THING THIS GUARDS IS FREE MERCHANDISE.
 *
 * Owner, 2026-11-13, asked for a 100%-off code to test checkout with:
 * *"only role admin can use 100% off including the add ons"* and *"do not
 * show the 100% off coupon on site"*. A code that zeroes an order is free
 * stock the moment it leaks, and codes leak by being guessed, shared or
 * shoulder-surfed — so NOT LISTING IT IS NOT THE CONTROL. The control is
 * `restrictions.allowedRoles`, enforced server-side.
 *
 * ⚠ The two halves are tested separately on purpose, because they fail
 * differently: hiding keeps it out of a cached public page, the gate keeps it
 * out of an order. Only the second one is load-bearing.
 *
 * Run: npx tsx appkit/scripts/verify-coupon-role-gate.mts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCouponDisplayable } from "../src/features/promotions/schemas/firestore.ts";
import type { CouponDocument } from "../src/features/promotions/schemas/firestore.ts";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const base = (over: Partial<CouponDocument> = {}): CouponDocument =>
  ({
    id: "c", code: "X", name: "n", description: "d", type: "percentage",
    scope: "admin", createdBy: "t",
    discount: { value: 100 },
    usage: { currentUsage: 0 },
    validity: { isActive: true, startDate: new Date(0), endDate: new Date(Date.now() + 8.64e7) },
    restrictions: { firstTimeUserOnly: false },
    stats: { totalUses: 0, totalRevenue: 0, totalDiscount: 0 },
    ...over,
  }) as unknown as CouponDocument;

console.log("\n  ── the DISPLAY half: a restricted coupon is never listed ──\n");
{
  const open = base();
  const restricted = base({ restrictions: { firstTimeUserOnly: false, allowedRoles: ["admin"] } } as Partial<CouponDocument>);
  check(isCouponDisplayable(open), "an unrestricted, valid coupon IS listed (no regression)");
  check(!isCouponDisplayable(restricted), "a coupon with allowedRoles is NOT listed");
  const emptyRoles = base({ restrictions: { firstTimeUserOnly: false, allowedRoles: [] } } as Partial<CouponDocument>);
  check(
    isCouponDisplayable(emptyRoles),
    "an EMPTY allowedRoles still lists",
    "empty must mean 'everyone', or every stored coupon changes meaning",
  );
}

/*
 * The REDEMPTION half. The gate lives inside a private repository method that
 * needs Firestore, so the predicate is asserted against the SOURCE rather than
 * executed — and the assertions below are about the exact properties that make
 * it safe, each of which has a failure mode this project has already shipped.
 */
console.log("\n  ── the REDEMPTION half: the gate's load-bearing properties ──\n");
{
  const repo = readFileSync(
    join(import.meta.dirname, "..", "src", "features", "promotions", "repository", "coupons.repository.ts"),
    "utf8",
  );
  const gate = /const allowedRoles = coupon\.restrictions\?\.allowedRoles;[\s\S]{0,420}?\n    \}/.exec(repo)?.[0] ?? "";

  check(gate.length > 0, "the gate exists in _fetchAndValidateCoupon");
  check(
    /redeemerRoles \?\? \[\]/.test(gate),
    "unresolved roles become EMPTY, not 'allow'",
    "fail-closed: unknown must never pass a money gate",
  );
  check(
    /Coupon not found/.test(gate),
    "refusal is reported as NOT FOUND",
    "a distinct 'not allowed' confirms a hidden code is real — an oracle",
  );
  check(
    !/allowedRoles\.length === 0 \?\s*true/.test(gate) && /allowedRoles\.length > 0/.test(gate),
    "absent/empty allowedRoles skips the gate entirely",
  );

  /*
   * 🛑 EVERY caller must pass roles. A gate honoured by two of three callers
   * is not a gate — the shape this project keeps shipping, most recently a
   * consent check present on one of two commit buttons.
   */
  const callers = [...repo.matchAll(/_fetchAndValidateCoupon\(([^)]*)\)/g)].map((m) => m[1]!.trim());
  const calls = callers.filter((c) => !c.includes("code: string"));
  check(calls.length >= 2, `both public validators reach the gate`, `${calls.length} call site(s)`);
  check(
    calls.every((c) => /redeemerRoles/.test(c)),
    "every call site passes roles",
    calls.join(" | "),
  );
}

console.log("\n  ── the SESSION is the source of roles, never the request ──\n");
{
  const route = readFileSync(
    join(import.meta.dirname, "..", "..", "src", "app", "api", "coupons", "validate", "route.ts"),
    "utf8",
  );
  check(/redeemerRoles/.test(route), "the shop's validate route passes roles");
  check(
    /user!\.roles/.test(route) && !/body[!.]?\.?roles/.test(route),
    "from the SESSION user, not the body",
    "the one party a gate must not trust is the party being gated",
  );
  check(
    /user!\.roles && user!\.roles\.length > 0/.test(route),
    "`roles` is preferred over the legacy `role` scalar",
    "reading the scalar once locked a multi-role admin out of /admin",
  );
}

console.log(`\n${fail === 0 ? "✅ the coupon role gate holds" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
