/*
 * Table test for the payment-method precedence (plan §B).
 *
 * Run: npx tsx appkit/scripts/verify-payment-method-precedence.mts
 *
 * 🛑 WHY A SCRIPT AND NOT A UNIT TEST: this repo has no test runner and no
 * `*.test.ts` files at all (measured) — adding vitest to land one table would
 * be a bigger change than the thing it verifies. This follows the existing
 * `scripts/audit-*` / `verify-*` convention instead, and exits non-zero on
 * failure so CI can call it.
 *
 * 🛑 WHY IT EXISTS AT ALL: the precedence has four levels and three
 * asymmetries, each roughly one character away from being wrong, and none of
 * them visible in a type signature:
 *
 *   · the platform contributes a hard `disabled` CEILING *and* a soft
 *     `default` FLOOR. Collapsing those into one value is what makes an admin
 *     kill switch overridable by any store.
 *   · the chain is `listing ?? store ?? platformDefault` — `??` and NOT `||`.
 *     With `||`, an explicit `false` falls through and the platform default
 *     silently re-enables exactly what a seller had turned off.
 *   · the buyer level is DENY-ONLY and sits beside the ceiling, never in the
 *     `??` chain. In the chain, a stored buyer-level `true` would GRANT a
 *     method to a restricted buyer.
 *
 * Plus two bridge cases that are easy to regress: the LEGACY named toggles
 * (`codEnabled: false` and friends) must still impose the ceiling, and an
 * install with no payment settings at all must still be able to take money.
 *
 * The last two cases are the plan's own headline acceptance test: a payment
 * method the code has never heard of, enabled and disabled by config alone.
 */
import { resolveMethodForContext } from "../src/_internal/server/payments/method-gate.js";
const S = (p: any) => ({ payment: p });
const rows: Array<[string, any, string]> = [];
const t = (name: string, ctx: any, want: string) => {
  const d = resolveMethodForContext("cod", ctx);
  const got = d.allowed ? "ALLOWED" : `DENIED:${d.reason}`;
  rows.push([name, got === want ? "ok " : "FAIL", `${got}${got===want?"":"  want "+want}`]);
};
// platform ceiling is absolute
t("platform disabled + store ON + listing ON", { settings: S({ paymentMethodRules: { cod: { disabled: true } } }), store: { paymentMethods: { cod: true } }, listing: { paymentMethods: { cod: true } } }, "DENIED:platform_disabled");
// LEGACY toggle still imposes the ceiling
t("legacy codEnabled:false + listing ON", { settings: S({ codEnabled: false }), listing: { paymentMethods: { cod: true } } }, "DENIED:platform_disabled");
// legacy true/undefined = no ceiling
t("legacy codEnabled:true", { settings: S({ codEnabled: true }) }, "ALLOWED");
t("no settings at all (fresh install)", { settings: null }, "ALLOWED");
// store-off + listing-on => ON (listing is more specific)
t("store OFF + listing ON", { settings: S({}), store: { paymentMethods: { cod: false } }, listing: { paymentMethods: { cod: true } } }, "ALLOWED");
// store-off alone => OFF
t("store OFF, listing silent", { settings: S({}), store: { paymentMethods: { cod: false } } }, "DENIED:not_enabled");
// listing-off beats store-on
t("store ON + listing OFF", { settings: S({}), store: { paymentMethods: { cod: true } }, listing: { paymentMethods: { cod: false } } }, "DENIED:not_enabled");
// platform soft default false, nobody else speaks
t("platform default:false", { settings: S({ paymentMethodRules: { cod: { default: false } } }) }, "DENIED:not_enabled");
t("platform default:false + store ON", { settings: S({ paymentMethodRules: { cod: { default: false } } }), store: { paymentMethods: { cod: true } } }, "ALLOWED");
// buyer deny can never be overridden
const denied = { role: "user", softBans: [{ action: "use_payment_method", target: "cod", reason: "chargebacks", bannedBy: "u1", bannedAt: new Date(2020,0,1) }] } as any;
t("buyer DENIED + store ON + listing ON", { settings: S({}), store: { paymentMethods: { cod: true } }, listing: { paymentMethods: { cod: true } }, buyer: denied }, "DENIED:buyer_denied");
// expired ban lifts
const expired = { role: "user", softBans: [{ action: "use_payment_method", target: "cod", reason: "x", bannedBy: "u1", bannedAt: new Date(2020,0,1), expiresAt: new Date(2020,1,1) }] } as any;
t("buyer ban EXPIRED", { settings: S({}), buyer: expired }, "ALLOWED");
// a ban on a DIFFERENT method must not leak
const other = { role: "user", softBans: [{ action: "use_payment_method", target: "online", reason: "x", bannedBy: "u1", bannedAt: new Date(2020,0,1) }] } as any;
t("ban targets 'online', asking 'cod'", { settings: S({}), buyer: other }, "ALLOWED");
// untargeted row denies everything (documented safe direction)
const untargeted = { role: "user", softBans: [{ action: "use_payment_method", reason: "x", bannedBy: "u1", bannedAt: new Date(2020,0,1) }] } as any;
t("ban row with NO target", { settings: S({}), buyer: untargeted }, "DENIED:buyer_denied");
// staff bypass (documented inherited convention)
const staff = { role: "admin", softBans: [{ action: "use_payment_method", target: "cod", reason: "x", bannedBy: "u1", bannedAt: new Date(2020,0,1) }] } as any;
t("ADMIN with a cod ban (staff bypass)", { settings: S({}), buyer: staff }, "ALLOWED");
// a method the code has never heard of, enabled purely by config
const made = resolveMethodForContext("upi_autopay", { settings: S({ paymentMethodRules: { upi_autopay: { default: true } } }) } as any);
rows.push(["CONFIG-ONLY new method 'upi_autopay'", made.allowed ? "ok " : "FAIL", made.allowed ? "ALLOWED" : "denied"]);
const madeOff = resolveMethodForContext("upi_autopay", { settings: S({ paymentMethodRules: { upi_autopay: { disabled: true } } }) } as any);
rows.push(["CONFIG-ONLY method disabled", !madeOff.allowed ? "ok " : "FAIL", madeOff.allowed ? "allowed" : "DENIED:"+(madeOff as any).reason]);

for (const [n, s, g] of rows) console.log(s, n.padEnd(42), g);

const failed = rows.filter((r) => r[1].trim() === "FAIL").length;
console.log("\nFAILURES:", failed, "/", rows.length);
// 🛑 Non-zero exit, so this is callable from CI rather than only readable by a
// human. A verifier whose failure is invisible to automation has already been
// recorded in this project as producing a false PASS.
if (failed > 0) process.exit(1);
