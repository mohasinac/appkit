/**
 * `POST /api/admin/prizes/award` — record winners and issue their win tickets.
 *
 * The ONE caller of `awardPrize`, and therefore the thing that turns the prize
 * modules from files into a feature.
 *
 * ## 🛑 WHY THIS IS ADMIN-ONLY AND PERMISSION-GATED
 *
 * It mints coupons that entitle someone to take a ₹0 listing. That is the
 * highest-value write in the prize feature — higher than the listing itself,
 * because a ticket is the only thing that unlocks one. It is gated on an
 * explicit permission rather than "is an admin", because this codebase's own
 * rule is that moderation-class powers are a GRANT, not a role side effect.
 *
 * ## What it does NOT do
 *
 * It does not price anything, does not touch stock, and does not create an
 * order. A winner still goes through the ordinary checkout — the owner's
 * *"they have to purchase the prize item"* — where the purchase gate reads the
 * ticket this issued.
 */

import { NextResponse } from "next/server.js";
import { z } from "zod";
import { awardPrize } from "../../../../_internal/server/features/prizes/award-action";
import { getSiteSettingsGlobal } from "../../utils/getSiteSettingsGlobal";
import { serverLogger } from "../../../../monitoring/server-logger";
import { normalizeError } from "../../../../errors/normalize";

const awardSchema = z.object({
  /** Prize listings this win entitles — plural, for a multi-item prize. */
  prizeProductIds: z.array(z.string().min(1)).min(1).max(20),
  eventId: z.string().min(1),
  /** When the event closed. Stamped onto the prize so the shop never reads events. */
  eventEndsAt: z.coerce.date(),
  winnerUserIds: z.array(z.string().min(1)).min(1).max(100),
  quantity: z.number().int().min(1).max(50).default(1),
});

/**
 * ⚠ Handler shape only. The consumer mounts this with its own auth wrapper —
 * appkit cannot import the shop's `withProviders`/`createRouteHandler` without
 * inverting the dependency. 🛑 The MOUNT must gate on an admin prize-award
 * permission; a route that mints entitlements must never be mounted open, and
 * an unguarded mount is the one way this becomes a free-prize endpoint.
 */
export async function handleAwardPrize(
  body: unknown,
  actor: { uid: string },
): Promise<NextResponse> {
  const parsed = awardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid award input" },
      { status: 400 },
    );
  }

  try {
    /*
     * 🛑 The window comes from CONFIG, resolved HERE and passed down, so no
     * commercial figure lives in the award modules. Owner: *"a gate, say 7 or
     * 10 or 15 days I can set"* and *"it has to be properly configured."*
     *
     * ⚠ An unreadable setting falls to the action's BOUNDED default rather
     * than to unlimited — an absent config must not mint a prize claimable
     * forever, which is the thing the window exists to prevent.
     */
    const settings = await getSiteSettingsGlobal().catch(() => null);
    const claimWindowDays = settings?.prizes?.claimWindowDays;

    const result = await awardPrize({
      prizeProductIds: parsed.data.prizeProductIds,
      eventId: parsed.data.eventId,
      eventEndsAt: parsed.data.eventEndsAt,
      winnerUserIds: parsed.data.winnerUserIds,
      quantity: parsed.data.quantity,
      awardedBy: actor.uid,
      ...(claimWindowDays === undefined ? {} : { claimWindowDays }),
    });

    /*
     * ⚠ PARTIAL SUCCESS IS REPORTED, not flattened to ok/failed. Five winners
     * where the third ticket failed is a real state an operator must see and
     * re-run — and re-running is safe because issuing is idempotent on a
     * deterministic id. Reporting "failed" would hide the two that worked;
     * reporting "ok" would hide the three that did not.
     */
    const partial = result.failed.length > 0 || result.stampFailed.length > 0;
    serverLogger.info("[prize-award] completed", {
      eventId: parsed.data.eventId,
      issued: result.issued.length,
      failed: result.failed.length,
      stampFailed: result.stampFailed.length,
    });

    return NextResponse.json(
      {
        success: !partial,
        data: {
          /* ⚠ Codes are returned so an operator can hand them over — this is
             the admin surface, not a public one. The EVENT page must never
             expose them (owner: "not even admin can see it there"). */
          issued: result.issued,
          failed: result.failed,
          stampFailed: result.stampFailed,
          claimWindowEndsAt: result.claimWindowEndsAt,
        },
      },
      { status: partial ? 207 : 200 },
    );
  } catch (err) {
    const e = normalizeError(err);
    serverLogger.error("[prize-award] threw", { kind: e.kind });
    return NextResponse.json(
      { success: false, error: "Could not award the prize." },
      { status: 500 },
    );
  }
}
