/**
 * verify-prize-claim-gate — a ₹0 prize cannot be bought without its ticket.
 *
 * 🛑 THIS GATE IS THE WHOLE PRIZE FEATURE. Everything else — the badge, the
 * Prizes tab, the claim panel, ticket issuance — only advertises or
 * authorises. None of them stops a purchase. Without this, anyone who finds a
 * prize listing's URL checks it out for ₹0, repeatedly, until the stock is
 * gone.
 *
 * ⚠ And the coupon's `allowedUserIds` does NOT cover it. That stops a
 * non-winner redeeming a TICKET; it has nothing to say about a buyer who
 * presents NO ticket — which is the hole, because a ₹0 item needs no discount
 * to be worth taking.
 *
 * Run: npx tsx appkit/scripts/verify-prize-claim-gate.mts
 */
import { refusedPrizeLines, entitledQuantity } from "../src/_internal/shared/features/prizes/claim-gate.ts";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const WINNER = "user-winner";
const OTHER = "user-other";
const PRIZE = { productId: "prod-prize", isEventPrize: true, productTitle: "Grand Prize" };
const NORMAL = { productId: "prod-normal", isEventPrize: false, productTitle: "A stadium" };
const TICKET = { applicableProducts: ["prod-prize"], allowedUserIds: [WINNER], claimQuantity: 1 };

console.log("\n  ── 🛑 the hole this closes ──\n");
{
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [], buyerUserId: OTHER });
  check(r.length === 1, "a prize with NO ticket is REFUSED", "without this it is free");
  check(r[0]?.reason === "no-ticket", "reason: no-ticket", r[0]?.reason);
  check(/winning ticket/i.test(r[0]?.message ?? ""), "and says why in the buyer's terms");
}

console.log("\n  ── the winner gets through ──\n");
{
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [TICKET], buyerUserId: WINNER });
  check(r.length === 0, "the winner, with their ticket, is permitted");
}

console.log("\n  ── someone else's ticket ──\n");
{
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [TICKET], buyerUserId: OTHER });
  check(r.length === 1 && r[0]?.reason === "ticket-not-yours", "a ticket for another account is refused", r[0]?.reason);
  check(
    !/did not win/i.test(r[0]?.message ?? ""),
    "and does not tell them they lost",
    "same courtesy as the claim resolver",
  );
}

console.log("\n  ── 🛑 an UNBOUND ticket is not a free pass ──\n");
{
  const unbound = { applicableProducts: ["prod-prize"], allowedUserIds: [], claimQuantity: 1 };
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [unbound], buyerUserId: OTHER });
  check(
    r.length === 1,
    "an empty allowedUserIds is NOT 'anyone' for a win ticket",
    "it means the ticket was issued with no holder — on a ₹0 item that is a free pass",
  );
  const missing = { applicableProducts: ["prod-prize"] };
  const r2 = refusedPrizeLines({ items: [PRIZE], tickets: [missing], buyerUserId: OTHER });
  check(r2.length === 1, "an ABSENT allowedUserIds behaves the same");
}

console.log("\n  ── a signed-out buyer ──\n");
{
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [TICKET], buyerUserId: undefined });
  check(r.length === 1 && r[0]?.reason === "unidentified-buyer", "refused before the ticket search", r[0]?.reason);
  check(/sign in/i.test(r[0]?.message ?? ""), "and the remedy offered is sign-in, not 'you lost'");
}

console.log("\n  ── ordinary listings are untouched ──\n");
{
  const r = refusedPrizeLines({ items: [NORMAL], tickets: [], buyerUserId: undefined });
  check(r.length === 0, "a non-prize line needs no ticket", "the gate must not touch normal commerce");
  const mixed = refusedPrizeLines({ items: [NORMAL, PRIZE], tickets: [], buyerUserId: WINNER });
  check(mixed.length === 1 && mixed[0]?.productId === "prod-prize", "a mixed cart refuses ONLY the prize line");
}

console.log("\n  ── a ticket for a DIFFERENT prize ──\n");
{
  const elsewhere = { applicableProducts: ["prod-other-prize"], allowedUserIds: [WINNER], claimQuantity: 1 };
  const r = refusedPrizeLines({ items: [PRIZE], tickets: [elsewhere], buyerUserId: WINNER });
  check(r.length === 1, "a winner's ticket for ANOTHER prize does not unlock this one", "₹0 listings — a ticket must not escape its prize");
}

console.log("\n  ── the VALUE CEILING arm (generic prizes) ──\n");
{
  /* "anything from the listing store under <configured value>" */
  const ceiling = { applicableProducts: [], allowedUserIds: [WINNER], claimQuantity: 1, maxItemValue: 2000 };
  const under = { productId: "p-cheap", isEventPrize: true, itemValue: 1500 };
  const over = { productId: "p-dear", isEventPrize: true, itemValue: 27750 };

  check(
    refusedPrizeLines({ items: [under], tickets: [ceiling], buyerUserId: WINNER }).length === 0,
    "a ceiling ticket covers a listing UNDER it",
    "applicableProducts may be empty on a ceiling ticket — the only such case",
  );
  check(
    refusedPrizeLines({ items: [over], tickets: [ceiling], buyerUserId: WINNER }).length === 1,
    "and refuses one OVER it",
  );
  const exact = { productId: "p-exact", isEventPrize: true, itemValue: 2000 };
  check(
    refusedPrizeLines({ items: [exact], tickets: [ceiling], buyerUserId: WINNER }).length === 0,
    "the boundary is inclusive — 'under 2000' covers exactly 2000",
    "stated so it is not silently flipped later",
  );

  /* 🛑 The dangerous omission. */
  const noValue = { productId: "p-unknown", isEventPrize: true };
  check(
    refusedPrizeLines({ items: [noValue], tickets: [ceiling], buyerUserId: WINNER }).length === 1,
    "🛑 a ceiling ticket against an item with NO VALUE is REFUSED",
    "forgetting itemValue must not re-open the whole catalogue",
  );

  /* A ceiling of 0 or nonsense must not match anything. */
  for (const bad of [0, -1, Number.NaN]) {
    const t = { applicableProducts: [], allowedUserIds: [WINNER], maxItemValue: bad };
    check(
      refusedPrizeLines({ items: [under], tickets: [t], buyerUserId: WINNER }).length === 1,
      `a ceiling of ${String(bad)} entitles nothing`,
    );
  }

  /* And the ceiling does not bypass the OWNER check. */
  check(
    refusedPrizeLines({ items: [under], tickets: [ceiling], buyerUserId: OTHER }).length === 1,
    "🛑 a ceiling ticket is still bound to its winner",
    "the two restrictions are ANDed, not alternatives",
  );
}

console.log("\n  ── entitled quantity ──\n");
{
  check(entitledQuantity("prod-prize", [TICKET], WINNER) === 1, "a 1-unit ticket entitles 1");
  check(entitledQuantity("prod-prize", [TICKET], OTHER) === 0, "nothing for a non-holder");
  check(entitledQuantity("prod-prize", [TICKET], undefined) === 0, "nothing for a signed-out buyer");
  const three = { applicableProducts: ["prod-prize"], allowedUserIds: [WINNER], claimQuantity: 3 };
  check(entitledQuantity("prod-prize", [three], WINNER) === 3, "a 3-unit ticket entitles 3");
  const noQty = { applicableProducts: ["prod-prize"], allowedUserIds: [WINNER] };
  check(
    entitledQuantity("prod-prize", [noQty], WINNER) === 1,
    "an absent quantity means 1, never unlimited",
    "unlimited on a ₹0 item is the same hole as no ticket",
  );
}

console.log(`\n${fail === 0 ? "✅ a ₹0 prize cannot be taken without the ticket that entitles it" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
