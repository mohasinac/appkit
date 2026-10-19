import type { FirestoreTriggerHandler } from "../runtime/types";
import { markSearchIndexDirty } from "../../features/search/index-build/artifact-store";
import type { JsonValue } from "@mohasinac/appkit";
import { handleScamReportVerified } from "../core/onScamReportVerified";
import { handleScamReportRejected } from "../core/onScamReportRejected";

/*
 * 🛑 Also marks the public search index stale.
 *
 * Added here rather than in the core so all five content triggers share one
 * shape, and so each core keeps doing exactly the one thing it is named for.
 *
 * Safe under Root Cause #92 — which cost 12 MILLION invocations a day —
 * because it writes a DIFFERENT collection (`searchIndex/manifest`) from the
 * one this trigger watches, the same argument `priceIndexRollup` makes for
 * writing `priceIndex/{leafId}` and never `categories`. #92's other half is
 * handled inside `markSearchIndexDirty`: its no-op guard is a BOOLEAN read,
 * never a deep compare, so a burst of 50 writes costs 50 reads and one write.
 *
 * It never throws: a missed mark delays the index by one 15-minute cadence,
 * and failing the content write that triggered it would be far worse.
 */
export const onScamReportUpdateHandler: FirestoreTriggerHandler<
  Record<string, JsonValue>,
  Record<string, JsonValue>
> = async (event, ctx) => {
  const before = event.before;
  const after = event.after;
  if (!after) return;

  const prevStatus = before?.status as string | undefined;
  const nextStatus = after.status as string | undefined;

  const baseInput = {
    scammerId: event.params.scammerId,
    report: {
      reportedBy: (after.reportedBy ?? before?.reportedBy) as string | undefined,
      displayNames: (after.displayNames ?? before?.displayNames) as string[] | undefined,
      prevStatus,
      nextStatus,
    },
  };

  if (nextStatus === "verified") {
    await handleScamReportVerified(baseInput, ctx);
  } else if (nextStatus === "rejected") {
    await handleScamReportRejected(baseInput, ctx);
  }
  await markSearchIndexDirty(ctx.db, "onScamReportUpdate");
};
