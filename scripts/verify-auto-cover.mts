/**
 * verify-auto-cover — what a buyer is told when their parcel rides uncovered.
 *
 * Owner, 2026-11-13: *"items are covered automatically till 2k and more is the
 * add-on needed"*, *"show the insurance is advised else loss won't be covered
 * by the seller or platform"*, and *"if it is not opted tell them the risks
 * clearly, and make sure the invoice generated has that."*
 *
 * 🛑 THE DANGEROUS DIRECTION IS SILENCE. Every other money gate in this
 * codebase fails closed by REFUSING; this one fails closed by SPEAKING. An
 * unreadable config must not quietly promise free cover on every order —
 * over-disclosing a risk costs nothing, and under-disclosing it is what gets
 * argued about after a parcel vanishes.
 *
 * Run: npx tsx appkit/scripts/verify-auto-cover.mts
 */
import { resolveAutoCover } from "../src/_internal/shared/features/protection/auto-cover.ts";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const base = { autoCoverLimit: 2000, protectionPurchased: false, sellerOffersProtection: true };

console.log("\n  ── the threshold ──\n");
{
  const under = resolveAutoCover({ ...base, orderGoodsValue: 1999 });
  check(under.state === "auto-covered", "₹1,999 is covered automatically", under.state);
  check(!under.requiresDisclosure, "and says nothing — there is no risk to disclose");

  const exact = resolveAutoCover({ ...base, orderGoodsValue: 2000 });
  check(exact.state === "auto-covered", "₹2,000 EXACTLY is covered", "'till 2k' includes 2k");

  const over = resolveAutoCover({ ...base, orderGoodsValue: 2001 });
  check(over.state === "uncovered-available", "₹2,001 is not", over.state);
  check(over.requiresDisclosure, "and MUST be disclosed");
}

console.log("\n  ── the two uncovered arms say different things ──\n");
{
  const avail = resolveAutoCover({ ...base, orderGoodsValue: 27750 });
  const unavail = resolveAutoCover({ ...base, orderGoodsValue: 27750, sellerOffersProtection: false });
  check(/advised/i.test(avail.message ?? ""), "offered → protection is ADVISED");
  check(
    /does not offer/i.test(unavail.message ?? ""),
    "not offered → says so instead of advising the impossible",
    "telling someone to buy cover that is not on offer reads as a broken page",
  );
  check(avail.message !== unavail.message, "the two messages differ");
  for (const [name, d] of [["available", avail], ["unavailable", unavail]] as const) {
    check(
      /neither the seller nor the platform|not covered by the seller or the platform/i.test(d.message ?? ""),
      `${name}: names WHO does not cover it`,
      "the owner's wording — the buyer must know nobody is behind it",
    );
    check(/₹2,000/.test(d.message ?? ""), `${name}: states the threshold in rupees`);
  }
}

console.log("\n  ── purchased protection silences it ──\n");
{
  const paid = resolveAutoCover({ ...base, orderGoodsValue: 27750, protectionPurchased: true });
  check(paid.state === "protected", "bought → protected", paid.state);
  check(!paid.requiresDisclosure, "and no warning is shown");
}

console.log("\n  ── 🛑 the fail-closed direction: unknown config SPEAKS ──\n");
{
  const missing = resolveAutoCover({ ...base, orderGoodsValue: 500, autoCoverLimit: undefined });
  check(
    missing.requiresDisclosure,
    "an unreadable limit warns even on a ₹500 order",
    "absent must read as 0, NEVER as 'everything is covered'",
  );
  const nan = resolveAutoCover({ ...base, orderGoodsValue: 500, autoCoverLimit: Number.NaN });
  check(nan.requiresDisclosure, "NaN behaves the same");
  const badValue = resolveAutoCover({ ...base, orderGoodsValue: Number.NaN });
  check(badValue.state === "auto-covered", "an unreadable ORDER value does not invent a warning", "nothing is known about it");
}

console.log("\n  ── the message is carried, not re-written per surface ──\n");
{
  const d = resolveAutoCover({ ...base, orderGoodsValue: 27750 });
  check(
    typeof d.message === "string" && d.message.length > 40,
    "the disclosure text comes WITH the decision",
    "it must also reach the invoice; a second copy there would drift",
  );
  const covered = resolveAutoCover({ ...base, orderGoodsValue: 100 });
  check(covered.message === undefined, "and is absent when there is nothing to say");
}

console.log(`\n${fail === 0 ? "✅ auto-cover discloses when it should, and never stays silent on an unknown" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
