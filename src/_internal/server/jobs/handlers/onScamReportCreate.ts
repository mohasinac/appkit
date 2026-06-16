import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { handleScamReportCreate } from "../core/onScamReportCreate";

export const onScamReportCreateHandler: FirestoreTriggerHandler<
  null,
  Record<string, JsonValue>
> = async (event, ctx) => {
  const report = event.after;
  if (!report) return;
  await handleScamReportCreate({ scammerId: event.params.scammerId, report }, ctx);
};
