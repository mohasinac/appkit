/**
 * verify-prize-claim — who may claim an event prize, and when.
 *
 * Owner, 2026-11-13: *"all can see, only the winners can claim if multiple,
 * and on the main shop only not from the events."*
 *
 * 🛑 THE EXPENSIVE FAILURE IS GIVING A PRIZE AWAY EARLY OR TO THE WRONG
 * PERSON, so every unknown resolves toward NOT claimable. A missing end date
 * must not make a prize claimable; an unidentified viewer must not be treated
 * as a winner.
 *
 * ⚠ And this only decides whether the BUTTON is drawn. The control is the
 * claim coupon's `restrictions.allowedUserIds`, enforced server-side — see
 * verify-coupon-role-gate. Anyone can type a checkout URL.
 *
 * Run: npx tsx appkit/scripts/verify-prize-claim.mts
 */
import { resolvePrizeClaim } from "../src/_internal/shared/features/protection/prize-claim.ts";

let fail = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (!ok) fail += 1;
  console.log(`  ${ok ? "✅" : "🛑"} ${label}${detail ? `  — ${detail}` : ""}`);
};

const NOW = 1_763_000_000_000;
const ENDED = NOW - 86_400_000;
const OPEN = NOW + 86_400_000;
const WINNER = "user-winner";
const OTHER = "user-passerby";

console.log("\n  ── rule 3: not before the event ends ──\n");
{
  const open = resolvePrizeClaim({ viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: OPEN, now: NOW });
  check(open.state === "event-open", "a WINNER cannot claim while the event runs", open.state);
  check(!open.canClaim, "and the control is not drawn");
  check(/when the event closes/i.test(open.reason ?? ""), "the reason says when, not why not");
}

console.log("\n  ── 🛑 the fail-safe direction: unknown end date ──\n");
{
  const unknown = resolvePrizeClaim({ viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: undefined, now: NOW });
  check(!unknown.canClaim, "a MISSING end date is NOT claimable", "handing out value early is the expensive error");
  const garbage = resolvePrizeClaim({ viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: "not a date", now: NOW });
  check(!garbage.canClaim, "an unparseable end date behaves the same");
}

console.log("\n  ── rule 2: winners only, and there may be several ──\n");
{
  const mine = resolvePrizeClaim({ viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(mine.canClaim && mine.state === "claimable", "the winner can claim", mine.state);
  check(mine.reason === undefined, "and is given no reason — there is nothing to explain");

  const multi = resolvePrizeClaim({
    viewerUserId: "user-c", winnerUserIds: ["user-a", "user-b", "user-c"], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW,
  });
  check(multi.canClaim, "one of THREE winners can claim", "a tier with runners-up is one listing, several claimants");
  check(/3 winners/.test(multi.reason ?? "") === false, "a winner sees no count");

  const theirs = resolvePrizeClaim({ viewerUserId: OTHER, winnerUserIds: [WINNER], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(!theirs.canClaim && theirs.state === "not-yours", "a non-winner cannot", theirs.state);
}

console.log("\n  ── rule 1: everyone SEES it — this gates an action, not a render ──\n");
{
  const anon = resolvePrizeClaim({ viewerUserId: undefined, winnerUserIds: [WINNER], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(!anon.canClaim, "a signed-out visitor cannot claim");
  check(anon.state === "not-yours", "but is not an error state", anon.state);
  check(
    !/you did not win|you lost/i.test(anon.reason ?? ""),
    "and is NOT told they lost",
    "a public prize page is read by people who never entered",
  );
  check(/awarded to its winner/i.test(anon.reason ?? ""), "it states who it is for instead", anon.reason);
}

console.log("\n  ── not awarded yet ──\n");
{
  const none = resolvePrizeClaim({ viewerUserId: WINNER, winnerUserIds: [], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(none.state === "not-awarded", "ended with no winners recorded", none.state);
  check(!none.canClaim, "nothing is claimable");
  check(/not been announced/i.test(none.reason ?? ""), "says announcements are pending");
  const absent = resolvePrizeClaim({ viewerUserId: WINNER, eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(absent.state === "not-awarded", "an ABSENT winner list behaves as empty", "the running-event state");
}

console.log("\n  ── the plural message counts correctly ──\n");
{
  const many = resolvePrizeClaim({ viewerUserId: OTHER, winnerUserIds: ["a", "b"], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(/2 winners/.test(many.reason ?? ""), "two winners → '2 winners'", many.reason);
  const one = resolvePrizeClaim({ viewerUserId: OTHER, winnerUserIds: ["a"], eventEndsAt: ENDED, claimWindowEndsAt: OPEN, now: NOW });
  check(/its winner/.test(one.reason ?? "") && !/1 winners/.test(one.reason ?? ""), "one winner → singular", one.reason);
}

console.log("\n  ── rule 4: the claim window, so nobody claims after 2-3 years ──\n");
{
  const expired = resolvePrizeClaim({
    viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: ENDED,
    claimWindowEndsAt: ENDED, now: NOW,
  });
  check(expired.state === "claim-window-closed", "a WINNER cannot claim after the window", expired.state);
  check(!expired.canClaim, "and the control is not drawn");
  check(/window .* has closed/i.test(expired.reason ?? ""), "the reason names the window", expired.reason);

  /*
   * 🛑 The fail-safe. An absent window must not be open-ended — a prize
   * awarded before the field existed, or an award that forgot to stamp it,
   * must not stay claimable forever.
   */
  const noWindow = resolvePrizeClaim({
    viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: ENDED, now: NOW,
  });
  check(
    noWindow.state === "claim-window-closed",
    "an ABSENT window reads as CLOSED, never 'forever'",
    "this is the whole point of the setting",
  );
  const junk = resolvePrizeClaim({
    viewerUserId: WINNER, winnerUserIds: [WINNER], eventEndsAt: ENDED,
    claimWindowEndsAt: "not a date", now: NOW,
  });
  check(junk.state === "claim-window-closed", "an unparseable window behaves the same");

  /*
   * 🛑 ORDERING IS A PRIVACY PROPERTY, not a style choice. A passer-by must be
   * told "awarded to its winner", NOT "claims closed" — the latter leaks the
   * award state of an event to someone with no stake in it.
   */
  const passerby = resolvePrizeClaim({
    viewerUserId: OTHER, winnerUserIds: [WINNER], eventEndsAt: ENDED,
    claimWindowEndsAt: ENDED, now: NOW,
  });
  check(
    passerby.state === "not-yours",
    "🛑 a NON-winner sees 'not yours', not 'window closed'",
    "the window is only disclosed to someone who could have claimed",
  );
}

console.log(`\n${fail === 0 ? "✅ prize claims are winner-only, never early, never late, and never call a visitor a loser" : `🛑 ${fail} failure(s)`}`);
process.exit(fail === 0 ? 0 : 1);
