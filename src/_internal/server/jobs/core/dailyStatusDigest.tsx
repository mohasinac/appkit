/**
 * Core: daily status digest email.
 *
 * Emails the previous 24h of order activity to the team every morning. The
 * digest's arrival is itself the platform health signal — if it stops
 * landing, something in the Firestore → Functions → Resend chain needs a
 * look. Deliberately no separate error/exception tracking: there is no
 * structured error-log collection to query, and building one just to fill
 * this email would be scope no one asked for.
 *
 * Runs from a scheduled Firebase Function (not a Vercel route), so the
 * unbounded-ish order scan below is safe against CLAUDE.md Rule #6's 10s
 * sync ceiling — it has the Function's much larger budget.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { getAdminDb } from "../../../../providers/db-firebase";
import { sendEmail } from "../../../../features/contact/email";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { ORDER_COLLECTION, OrderStatusValues } from "../../../../features/orders/schemas/firestore";
import { PRODUCT_COLLECTION, ProductStatusValues } from "../../../../features/products/schemas/firestore";
import { ORDER_FIELDS, PRODUCT_FIELDS } from "../../../../constants/field-names";
import {
  EmailBold,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailRow,
} from "../../../../features/email/primitives";
import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuses that shouldn't count toward revenue for the day. */
const NON_REVENUE_STATUSES = new Set<string>([
  OrderStatusValues.CANCELLED,
  OrderStatusValues.REFUNDED,
]);

export interface DailyStatusDigestSummary {
  orderCount: number;
  revenue: number;
  statusBreakdown: Record<string, number>;
  stuckPendingCount: number;
  activeListingCount: number;
}

function currency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** One "Label: value" line. Uses only email primitives — email clients need
 *  inline-styled, table-based markup, which the Email* components provide. */
function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      {label}: <EmailBold>{String(value)}</EmailBold>
      <br />
    </>
  );
}

/** Gathers the last-24h numbers. Exported so the admin manual-trigger route can reuse it. */
export async function collectDailyStatusSummary(): Promise<DailyStatusDigestSummary> {
  const db = getAdminDb();
  const since = new Date(Date.now() - DAY_MS);

  const recentSnap = await db
    .collection(ORDER_COLLECTION)
    .where(ORDER_FIELDS.CREATED_AT, ">=", since)
    .get();

  let revenue = 0;
  const statusBreakdown: Record<string, number> = {};
  for (const doc of recentSnap.docs) {
    const data = doc.data() as { status?: string; totalPrice?: number };
    const status = data.status ?? "unknown";
    statusBreakdown[status] = (statusBreakdown[status] ?? 0) + 1;
    if (!NON_REVENUE_STATUSES.has(status)) {
      revenue += Number(data.totalPrice ?? 0) || 0;
    }
  }

  // Orders still sitting in PENDING beyond the 24h window — the one number
  // here that signals something needs attention rather than just reporting
  // volume.
  const stuckSnap = await db
    .collection(ORDER_COLLECTION)
    .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
    .where(ORDER_FIELDS.CREATED_AT, "<", since)
    .count()
    .get();

  const activeSnap = await db
    .collection(PRODUCT_COLLECTION)
    .where(PRODUCT_FIELDS.STATUS, "==", ProductStatusValues.PUBLISHED)
    .count()
    .get();

  return {
    orderCount: recentSnap.size,
    revenue,
    statusBreakdown,
    stuckPendingCount: stuckSnap.data().count,
    activeListingCount: activeSnap.data().count,
  };
}

function renderDigestHtml(
  summary: DailyStatusDigestSummary,
  siteName: string,
  version?: string,
): string {
  const statusRows = Object.entries(summary.statusBreakdown).sort(([a], [b]) => a.localeCompare(b));
  const title = siteName ? `${siteName} — Daily Status` : "Daily Status";
  return `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title={title}>
      <EmailContainer>
        <EmailHeader brandName={siteName} />
        <EmailRow>
          {version
            ? `Deployment ${version} is live. Activity for the last 24 hours.`
            : "Activity for the last 24 hours."}
          <br />
          <br />
          <StatLine label="Orders placed" value={summary.orderCount} />
          <StatLine label="Revenue (excl. cancelled/refunded)" value={currency(summary.revenue)} />
          <StatLine label="Active listings" value={summary.activeListingCount} />
          <StatLine label="Pending &gt; 24h (needs attention)" value={summary.stuckPendingCount} />
        </EmailRow>
        <EmailDivider />
        <EmailRow>
          <EmailBold>Orders by status</EmailBold>
          <br />
          <br />
          {statusRows.length === 0 ? (
            "No orders in this window."
          ) : (
            statusRows.map(([status, count]) => (
              <StatLine key={status} label={status} value={count} />
            ))
          )}
        </EmailRow>
        <EmailFooter
          copyright={`© ${new Date().getFullYear()}${siteName ? ` ${siteName}` : ""}. All rights reserved.`}
        />
      </EmailContainer>
    </EmailDoc>,
  )}`;
}

export interface DailyStatusDigestResult {
  sent: boolean;
  reason?: string;
  summary?: DailyStatusDigestSummary;
}

const DEPLOY_MARKER_COLLECTION = "system";
const DEPLOY_MARKER_DOC = "deployDigest";

/**
 * Sends the digest once per deployment version.
 *
 * Called from server startup. On Vercel that means EVERY lambda cold start,
 * not once per deploy — so the version marker below is what makes this a
 * per-deployment event rather than a per-cold-start email storm. The claim
 * runs in a transaction because several cold starts can race on the first
 * request after a deploy; exactly one wins and sends.
 */
export async function runDeploymentDigest(
  ctx: JobContext,
  version: string,
): Promise<DailyStatusDigestResult> {
  if (!version) return { sent: false, reason: "no_version" };

  const markerRef = getAdminDb().collection(DEPLOY_MARKER_COLLECTION).doc(DEPLOY_MARKER_DOC);

  let claimed = false;
  try {
    await getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(markerRef);
      const lastVersion = (snap.data() as { lastVersion?: string } | undefined)?.lastVersion;
      if (lastVersion === version) return;
      tx.set(markerRef, { lastVersion: version, sentAt: new Date() }, { merge: true });
      claimed = true;
    });
  } catch (err) {
    void normalizeError(err);
    ctx.logger.warn("deploymentDigest: could not claim version marker — skipping", { version });
    return { sent: false, reason: "claim_failed" };
  }

  if (!claimed) return { sent: false, reason: "already_sent_for_version" };

  ctx.logger.info("deploymentDigest: claimed version, sending", { version });
  return runDailyStatusDigest(ctx, version);
}

export async function runDailyStatusDigest(
  ctx: JobContext,
  version?: string,
): Promise<DailyStatusDigestResult> {
  const settings = await siteSettingsRepository.getSingleton().catch((err: unknown) => {
    void normalizeError(err);
    return null;
  });

  const digestConfig = settings?.emailSettings?.dailyDigest;
  if (digestConfig?.enabled !== true) {
    ctx.logger.info("dailyStatusDigest: disabled in site settings — skipping");
    return { sent: false, reason: "disabled" };
  }

  const recipients = (digestConfig.recipients ?? []).filter((r) => r.trim().length > 0);
  if (recipients.length === 0) {
    ctx.logger.warn("dailyStatusDigest: enabled but no recipients configured — skipping");
    return { sent: false, reason: "no_recipients" };
  }
  const ccRecipients = (digestConfig.ccRecipients ?? []).filter((r) => r.trim().length > 0);

  const summary = await collectDailyStatusSummary();
  // No hardcoded brand fallback — appkit is consumer-agnostic; the site name
  // comes from settings or the consumer's own env var.
  const siteName = settings?.siteName?.trim() || process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "";

  const { error } = await sendEmail({
    to: recipients,
    // Spread rather than `cc: undefined` — SendEmailOptions has a
    // Record<string, JsonValue> index signature that rejects undefined.
    ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
    subject: "Daily Status",
    html: renderDigestHtml(summary, siteName, version),
    text:
      (version ? `Deployment ${version} is live.\n\n` : "") +
      `Orders placed: ${summary.orderCount}\n` +
      `Revenue: ${currency(summary.revenue)}\n` +
      `Active listings: ${summary.activeListingCount}\n` +
      `Pending > 24h: ${summary.stuckPendingCount}`,
  });

  if (error) {
    ctx.logger.error("dailyStatusDigest: send failed", { error: String(error) });
    throw new Error(`Daily status digest send failed: ${String(error)}`);
  }

  ctx.logger.info("dailyStatusDigest: sent", {
    recipients: recipients.length,
    orderCount: summary.orderCount,
  });
  return { sent: true, summary };
}
