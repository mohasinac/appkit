import { normalizeError } from "../../../../errors/normalize";
import { adminNotificationsRepository, userRepository } from "../../../../repositories";
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
        type: "scam_report_update",
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

  /*
   * 2. Tell STAFF — once, into the admin inbox.
   *
   * 🛑 This used to be `Promise.all` over `userRepository.list({ pageSize: 100 })`,
   * i.e. **one `sendNotification` per employee, up to 100, per report filed**.
   * Each of those was a potential email against a 100/day Resend allowance, so
   * a single scam report could consume the entire day — and it was a hundred
   * concurrent Firestore writes besides.
   *
   * It was also the wrong shape regardless of cost: a scam report is one
   * event needing one person to action it, not N personal messages. The
   * `adminNotifications` collection exists for exactly this and is already
   * read by `GET /api/admin/admin-notifications` and surfaced in the admin
   * inbox — `audienceUserIds: []` means "all admins" rather than a fan-out.
   *
   * The daily digest carries the count as well, so nothing depends on someone
   * happening to look at the inbox.
   */
  try {
    const scamTypeLabel = scamType ? (SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS] ?? scamType) : "Unknown";
    const amountStr = amountLost ? ` ₹${amountLost.toLocaleString("en-IN")}` : "";
    const platformStr = scamPlatform ? ` via ${scamPlatform}` : "";

    await adminNotificationsRepository.create({
      category: "fraud",
      title: "New scam report submitted",
      body: `A report was submitted for "${name}" — ${scamTypeLabel}${platformStr}.${amountStr}`,
      severity: "warning",
      isRead: false,
      entityType: "scammer",
      entityId: scammerId,
      audienceUserIds: [],
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.error("Failed to write admin scam-report notification (non-fatal)", err, { scammerId });
  }

  ctx.logger.info("onScamReportCreate complete", { scammerId, reportedBy: reportedBy ?? null });
}
