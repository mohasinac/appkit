import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

export interface HandleScamReportRejectedInput {
  scammerId: string;
  report: {
    reportedBy?: string;
    displayNames?: string[];
    prevStatus?: string;
    nextStatus?: string;
  };
}

export async function handleScamReportRejected(
  input: HandleScamReportRejectedInput,
  ctx: JobContext,
): Promise<void> {
  const { scammerId, report } = input;
  const { reportedBy, displayNames, prevStatus, nextStatus } = report;

  if (prevStatus === nextStatus) return;
  if (nextStatus !== "rejected") return;
  if (!reportedBy) return;

  const name = displayNames?.[0] ?? "Unknown";

  try {
    await notificationRepository.create({
      userId: reportedBy,
      type: "account_action",
      title: "Scam report not verified",
      body: `Your report for "${name}" could not be verified with the evidence provided. You may submit a new report with additional evidence.`,
      isRead: false,
      entityId: scammerId,
      entityType: "scammer",
      createdAt: new Date(),
    } as any);
  } catch (err) {
    ctx.logger.error("Failed to notify reporter of rejection (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportRejected complete", { scammerId, reportedBy });
}
