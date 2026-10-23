import { normalizeError } from "../../../../errors/normalize";
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
      title: "Your scam report was verified",
      message: `The report for "${name}" has been verified and published to the Scam Registry. Thank you for helping protect the community.`,
      relatedId: scammerId,
      relatedType: "scammer",
      userEmail: reporterPlain?.email ?? undefined,
      userPhone: reporterPlain?.phoneNumber ?? undefined,
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to notify reporter of verification (non-fatal)", err, { scammerId, reportedBy });
  }

  ctx.logger.info("onScamReportVerified complete", { scammerId, reportedBy });
}
