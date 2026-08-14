import type { FirestoreTriggerHandler } from "../runtime/types";
import { handleJobCreated } from "../core/onJobCreated";
import type { JobDocument } from "../../../../features/jobs/schemas/firestore";

export const onJobCreatedHandler: FirestoreTriggerHandler<null, JobDocument> = async (event, ctx) => {
  const job = event.after;
  if (!job) {
    ctx.logger.error("No snapshot data", null);
    return;
  }
  await handleJobCreated({ jobId: event.params.jobId, job }, ctx);
};
