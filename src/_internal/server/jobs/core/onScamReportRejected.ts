import { userRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
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
    const reporter = await userRepository.findById(reportedBy);
    await sendNotification({
      userId: reportedBy,
      type: "account_action",
      priority: "normal",
      title: "Scam report not verified",
      message: `Your report for "${name}" could not be verified with the evidence provided. You may submit a new report with additional evidence.`,
      relatedId: scammerId,
      relatedType: "scammer",
      userEmail: reporter?.email ?? undefined,
      userPhone: reporter?.phoneNumber ?? undefined,
    });
  } catch (err) {
    ctx.logger.error("Failed to notify reporter of rejection (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportRejected complete", { scammerId, reportedBy });
}
