import { userRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
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
    const reporter = await userRepository.findById(reportedBy);
    await sendNotification({
      userId: reportedBy,
      type: "account_action",
      priority: "normal",
      title: "Your scam report was verified",
      message: `The report for "${name}" has been verified and published to the Scam Registry. Thank you for helping protect the community.`,
      relatedId: scammerId,
      relatedType: "scammer",
      userEmail: reporter?.email ?? undefined,
      userPhone: reporter?.phoneNumber ?? undefined,
    });
  } catch (err) {
    ctx.logger.error("Failed to notify reporter of verification (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportVerified complete", { scammerId, reportedBy });
}
