import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleScamReportCreate } from "../core/onScamReportCreate";

export const onScamReportCreateHandler: FirestoreTriggerHandler<
  null,
  Record<string, unknown>
> = async (event, ctx) => {
  const report = event.after;
  if (!report) return;
  await handleScamReportCreate({ scammerId: event.params.scammerId, report }, ctx);
};
