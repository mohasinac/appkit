import { normalizeError } from "../../../../errors/normalize";
import { userRepository } from "../../../../features/auth/repository/user.repository";
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
    /*
     * REVEALED, because this notification is DELIVERED to the reporter and a
     * masked address cannot receive mail. `findById` is ciphertext-by-default,
     * so passing `.email` straight through handed the mailer an `enc:v1:` blob.
     */
    const reporterPlain = reporter ? userRepository.revealUser(reporter) : null;
    await sendNotification({
      userId: reportedBy,
      type: "scam_report_update",
      priority: "normal",
      title: "Scam report not verified",
      message: `Your report for "${name}" could not be verified with the evidence provided. You may submit a new report with additional evidence.`,
      relatedId: scammerId,
      relatedType: "scammer",
      userEmail: reporterPlain?.email ?? undefined,
      userPhone: reporterPlain?.phoneNumber ?? undefined,
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to notify reporter of rejection (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportRejected complete", { scammerId, reportedBy });
}
