import { notificationRepository, userRepository } from "../../../../repositories";
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

  // 1. Notify the reporter
  if (reportedBy) {
    try {
      await notificationRepository.create({
        userId: reportedBy,
        type: "account_action",
        title: "Scam report submitted",
        body: `Your report for "${name}" has been received. Our team will review it within 48 hours.`,
        isRead: false,
        entityId: scammerId,
        entityType: "scammer",
        createdAt: new Date(),
      } as any);
    } catch (err) {
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
      result.items.map((employee) =>
        notificationRepository.create({
          userId: employee.id,
          type: "account_action",
          title: "New scam report submitted",
          body: `A report was submitted for "${name}" — ${scamTypeLabel}${platformStr}.${amountStr}`,
          isRead: false,
          entityId: scammerId,
          entityType: "scammer",
          createdAt: new Date(),
        } as any).catch((err) =>
          ctx.logger.error("Failed to notify employee (non-fatal)", err, { scammerId, employeeId: employee.id }),
        ),
      ),
    );
  } catch (err) {
    ctx.logger.error("Failed to query employees for scam notification (non-fatal)", err, { scammerId });
  }

  ctx.logger.info("onScamReportCreate complete", { scammerId, reportedBy });
}
