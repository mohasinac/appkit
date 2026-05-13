import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleScamReportVerified } from "../core/onScamReportVerified";
import { handleScamReportRejected } from "../core/onScamReportRejected";

export const onScamReportUpdateHandler: FirestoreTriggerHandler<
  Record<string, unknown>,
  Record<string, unknown>
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
};
