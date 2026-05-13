import { notificationRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";

export interface HandleScamReportVerifiedInput {
  scammerId: string;
  report: {
    reportedBy?: string;
    displayNames?: string[];
    prevStatus?: string;
    nextStatus?: string;
  };
}

export async function handleScamReportVerified(
  input: HandleScamReportVerifiedInput,
  ctx: JobContext,
): Promise<void> {
  const { scammerId, report } = input;
  const { reportedBy, displayNames, prevStatus, nextStatus } = report;

  if (prevStatus === nextStatus) return;
  if (nextStatus !== "verified") return;
  if (!reportedBy) return;

  const name = displayNames?.[0] ?? "Unknown";

  try {
    await notificationRepository.create({
      userId: reportedBy,
      type: "account_action",
      title: "Your scam report was verified",
      body: `The report for "${name}" has been verified and published to the Scam Registry. Thank you for helping protect the community.`,
      isRead: false,
      entityId: scammerId,
      entityType: "scammer",
      createdAt: new Date(),
    } as any);
  } catch (err) {
    ctx.logger.error("Failed to notify reporter of verification (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportVerified complete", { scammerId, reportedBy });
}
