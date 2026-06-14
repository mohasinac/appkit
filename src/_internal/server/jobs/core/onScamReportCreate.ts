import { normalizeError } from "../../../../errors/normalize";
import { userRepository } from "../../../../repositories";
import { sendNotification } from "../../../../features/admin/actions/notification-actions";
import { SCAM_TYPE_LABELS } from "../../../../features/scams/constants/scam-types";
import type { JobContext } from "../runtime/types";

export interface HandleScamReportCreateInput {
  scammerId: string;
  report: {
    reportedBy?: string;
    displayNames?: string[];
    scamType?: string;
    scamPlatform?: string;
    amountLost?: number;
  };
}

export async function handleScamReportCreate(
  input: HandleScamReportCreateInput,
  ctx: JobContext,
): Promise<void> {
  const { scammerId, report } = input;
  const { reportedBy, displayNames, scamType, scamPlatform, amountLost } = report;

  const name = displayNames?.[0] ?? "Unknown";

  // 1. Notify the reporter (multi-channel: respects user notification prefs)
  if (reportedBy) {
    try {
      const reporter = await userRepository.findById(reportedBy);
      await sendNotification({
        userId: reportedBy,
        type: "account_action",
        priority: "normal",
        title: "Scam report submitted",
        message: `Your report for "${name}" has been received. Our team will review it within 48 hours.`,
        relatedId: scammerId,
        relatedType: "scammer",
        userEmail: reporter?.email ?? undefined,
        userPhone: reporter?.phoneNumber ?? undefined,
      });
    } catch (err) {
      void normalizeError(err);
      ctx.logger.error("Failed to notify reporter (non-fatal)", err, { scammerId, reportedBy });
    }
  }

  // 2. Notify all employees with admin:scammers:read permission
  try {
    const result = await userRepository.list({
      filters: "role==employee",
      page: 1,
      pageSize: 100,
    });

    const scamTypeLabel = scamType ? (SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS] ?? scamType) : "Unknown";
    const amountStr = amountLost ? ` ₹${(amountLost / 100).toLocaleString("en-IN")}` : "";
    const platformStr = scamPlatform ? ` via ${scamPlatform}` : "";

    await Promise.all(
      result.items.filter((e) => !!e.id).map((employee) =>
        sendNotification({
          userId: employee.id!,
          type: "account_action",
          priority: "normal",
          title: "New scam report submitted",
          message: `A report was submitted for "${name}" — ${scamTypeLabel}${platformStr}.${amountStr}`,
          relatedId: scammerId,
          relatedType: "scammer",
          userEmail: employee.email ?? undefined,
          userPhone: employee.phoneNumber ?? undefined,
        }).catch((err) =>
          ctx.logger.error("Failed to notify employee (non-fatal)", err, { scammerId, employeeId: employee.id }),
        ),
      ),
    );
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to query employees for scam notification (non-fatal)", err, { scammerId });
  }

  ctx.logger.info("onScamReportCreate complete", { scammerId, reportedBy });
}
