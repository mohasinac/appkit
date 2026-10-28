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

import { Fragment } from "react";
// 🛑 Lazy require, not a top-level `react-dom/server` import — this module is
// reachable from a Server Component via appkit/server, and Next's static tracer
// fails the build on it. See render-static-markup.ts.
import { renderStaticMarkup } from "../../../../features/email/render-static-markup";
import { getAdminDb } from "../../../../providers/db-firebase";
import { getProviders } from "../../../../contracts/registry";
import { checkCourierWalletAndAlert } from "../../features/shipping/courier-block";
import { sendEmail } from "../../../../features/contact/email";
import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";
import { ORDER_COLLECTION, OrderStatusValues } from "../../../../features/orders/schemas/firestore";
import { PRODUCT_COLLECTION, ProductStatusValues } from "../../../../features/products/schemas/firestore";
import { ORDER_FIELDS, PRODUCT_FIELDS } from "../../../../constants/field-names";
import { CONTACT_SUBMISSIONS_COLLECTION } from "../../../../core/contact-submissions.repository";
import { NEWSLETTER_SUBSCRIBERS_COLLECTION } from "../../../../core/newsletter.repository";
import {
  SUPPORT_TICKET_COLLECTION,
  SUPPORT_TICKET_FIELDS,
  TicketStatusValues,
} from "../../../../features/support/schemas/firestore";
import { SCAMMER_COLLECTION, SCAMMER_FIELDS } from "../../../../features/scams/schemas/firestore";
import { ADMIN_AUDIT_LOG_COLLECTION } from "../../../../features/audit-log/schemas/firestore";
import { ADMIN_NOTIFICATIONS_COLLECTION } from "../../../../features/store-extensions/schemas/rbac";
/*
 * Schema modules only — constants and types, no repository. This file is
 * reachable from the Functions bundle and already queries nine collections
 * through `getAdminDb()` directly; importing two repositories for four
 * `count()` calls would widen that graph for nothing. Same reasoning as the
 * `CountableQuery` structural type below.
 */
import {
  PAYMENT_CASES_COLLECTION,
  PAYMENT_CASE_ACTIVE_STATUSES,
  PAYMENT_CASE_FIELDS,
} from "../../../../features/payment-cases/schemas/firestore";
import {
  GATEWAY_EVENTS_COLLECTION,
  GATEWAY_EVENT_FIELDS,
} from "../../../../features/gateway-events/schemas/firestore";
import {
  EmailBold,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailLink,
  EmailRow,
} from "../../../../features/email/primitives";
import { normalizeError } from "../../../../errors/normalize";
import type { JobContext } from "../runtime/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/*
 * `createdAt` and `isRead` on collections with no feature-specific field-name
 * constant — contactSubmissions, newsletterSubscribers, adminAuditLog,
 * adminNotifications.
 *
 * audit-field-name-ok: these are BaseDocument fields common to every
 * collection, not per-feature names. Borrowing ORDER_FIELDS.CREATED_AT here
 * would assert a relationship to the orders schema that does not exist, so a
 * rename there would appear to affect queries it has nothing to do with. Named
 * once, locally, rather than repeated as bare literals at ten call sites.
 */
const CREATED_AT = "createdAt";
const IS_READ = "isRead";

/** Statuses that shouldn't count toward revenue for the day. */
const NON_REVENUE_STATUSES = new Set<string>([
  OrderStatusValues.CANCELLED,
  OrderStatusValues.REFUNDED,
]);

/** How many contact messages the digest lists in full before summarising the rest. */
const CONTACT_PREVIEW_LIMIT = 20;

/** One inbound contact message, rendered with a mailto: reply link. */
export interface DigestContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  /** First ~200 chars. The full text is in /admin/contact. */
  excerpt: string;
}

export interface DailyStatusDigestSummary {
  orderCount: number;
  revenue: number;
  statusBreakdown: Record<string, number>;
  stuckPendingCount: number;
  activeListingCount: number;

  /*
   * Everything below arrived 2026-09, when the digest stopped being an orders
   * report and became THE staff signal.
   *
   * Each of these used to be an email or a WhatsApp blast of its own — or, in
   * the case of support tickets, nothing at all. Folding them here trades
   * "notified instantly, N times a day, at 1 email each" for "notified once a
   * day, at 1 email total", which is the whole point on a 100/day allowance.
   */

  /** New in the last 24h, listed in full up to CONTACT_PREVIEW_LIMIT. */
  contactMessages: DigestContactMessage[];
  contactTotal: number;

  /** New tickets in 24h, plus the standing backlog by status. */
  newTicketCount: number;
  ticketsOpen: number;
  ticketsInProgress: number;
  ticketsWaitingOnUser: number;

  newScamReportCount: number;
  /** Orders sitting in the manual-payment pending state (proof upload / review). */
  manualPaymentPendingCount: number;
  /** Count only — subscriber emails are PII-encrypted with an HMAC blind index. */
  newSubscriberCount: number;
  /** Privileged admin actions recorded in 24h — replaces the per-save settings email. */
  adminActionCount: number;
  unreadAdminNotificationCount: number;

  /*
   * ── MONEY AT RISK ─────────────────────────────────────────────────────────
   *
   * 🛑 The cheapest surface in the whole payment-protection plan, and the
   * reason it is here rather than on a page: this digest PUSHES. The admin
   * queue, the reconcilers and the event inbox are all useless on the day they
   * ship if nobody opens the admin panel — and the one case class with a hard
   * external deadline (a chargeback's `respond_by`) is lost by DEFAULT when
   * nobody looks. ~20 lines of rendering buys the whole phase its first real
   * consumer.
   */

  /** Active (open + under-review) `paymentCases`, by severity. */
  paymentCasesError: number;
  paymentCasesWarning: number;
  paymentCasesInfo: number;
  /**
   * The soonest external deadline across active cases, or null.
   *
   * 🛑 Not "oldest case" and not a count: a deadline is the only thing in this
   * digest that gets WORSE on its own, so it is the one figure worth printing
   * as a date rather than a number.
   */
  nearestCaseDueAt: Date | null;
  /** Gateway events that never reached a terminal status — the inbox backlog. */
  unprocessedGatewayEventCount: number;

  /*
   * ── COURIER WALLET ────────────────────────────────────────────────────────
   *
   * 🛑 The one thing in this digest that is OUR problem rather than a
   * customer's or a seller's.
   *
   * Shiprocket is PREPAID and has no recharge API, so topping up is
   * irreducibly a human action — which makes it exactly the kind of fact a
   * pushed digest exists to carry. Reporting it BEFORE anything is blocked is
   * the point: react only to failures and the first signal is always a buyer's
   * order already stuck.
   *
   * `null` means "no wallet, or we could not read it" — never 0. An unreadable
   * balance alerts nobody (see `checkCourierWalletAndAlert`), because paging
   * an operator on every network hiccup is how they learn to ignore the one
   * that mattered.
   */
  courierWalletBalance: number | null;
  courierWalletLow: boolean;
  /** Why the balance is null, when it is. Printed instead of a figure. */
  courierWalletNote?: string;
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

  /*
   * The staff-signal block.
   *
   * All in ONE `Promise.all` rather than sequentially — the job has the
   * Function's budget rather than Vercel's 10s ceiling, but ten round trips in
   * series is still ten times the latency for no reason (CLAUDE.md Rule #6's
   * "parallelise the rest").
   *
   * Every query is either a `.count()` aggregation or a `limit()`-bounded
   * fetch, so none of them scales with collection size. And every one is a
   * SINGLE-FIELD predicate except the manual-payment pair, which reuses the
   * existing `(status, paymentStatus, createdAt)` composite — no new index is
   * required by this change, and if one starts being demanded the query shape
   * has drifted.
   *
   * `safeCount` swallows per-query failures to zero rather than failing the
   * whole digest: an unreadable scam-report count must not cost the operator
   * the order numbers, the contact messages and everything else. The failure
   * is logged by the caller's own catch, and a stuck zero next to live numbers
   * elsewhere is legible as "that one broke".
   */
  /*
   * Structural, not `import type { Query } from "firebase-admin/firestore"`.
   * A type-only import would be erased, but this file is reachable from the
   * Functions bundle and from Next's tracer, and the cheapest way to keep a
   * firebase-admin specifier out of the graph entirely is not to write one
   * (Root Cause #24). This shape is all `safeCount` needs.
   */
  type CountableQuery = {
    count(): { get(): Promise<{ data(): { count: number } }> };
  };

  const safeCount = async (q: CountableQuery): Promise<number> => {
    try {
      const snap = await q.count().get();
      return snap.data().count;
    } catch (err) {
      void normalizeError(err);
      return 0;
    }
  };

  /*
   * audit-field-name-ok: these six collections — contactSubmissions,
   * supportTickets, scammerProfiles, newsletterSubscribers, adminAuditLog and
   * adminNotifications — have no shared field-name constant covering
   * `createdAt`, and borrowing ORDER_FIELDS.CREATED_AT or PRODUCT_FIELDS.STATUS
   * here would be actively misleading: it would assert a relationship to the
   * orders/products schemas that does not exist, so a rename of ORDER_FIELDS
   * would appear to affect a query it has nothing to do with. `createdAt` and
   * `isRead` are BaseDocument fields common to every collection, not
   * per-feature names. SUPPORT_TICKET_FIELDS is used below where it genuinely
   * applies.
   */
  const [
    contactSnap,
    contactTotal,
    newTicketCount,
    ticketsOpen,
    ticketsInProgress,
    ticketsWaitingOnUser,
    newScamReportCount,
    manualPaymentPendingCount,
    newSubscriberCount,
    adminActionCount,
    unreadAdminNotificationCount,
  ] = await Promise.all([
    db
      .collection(CONTACT_SUBMISSIONS_COLLECTION)
      .where(CREATED_AT, ">=", since)
      .orderBy(CREATED_AT, "desc")
      .limit(CONTACT_PREVIEW_LIMIT)
      .get()
      .catch((err: unknown) => {
        void normalizeError(err);
        return null;
      }),
    safeCount(db.collection(CONTACT_SUBMISSIONS_COLLECTION).where(CREATED_AT, ">=", since)),
    safeCount(db.collection(SUPPORT_TICKET_COLLECTION).where(SUPPORT_TICKET_FIELDS.CREATED_AT, ">=", since)),
    safeCount(db.collection(SUPPORT_TICKET_COLLECTION).where(SUPPORT_TICKET_FIELDS.STATUS, "==", TicketStatusValues.OPEN)),
    safeCount(db.collection(SUPPORT_TICKET_COLLECTION).where(SUPPORT_TICKET_FIELDS.STATUS, "==", TicketStatusValues.IN_PROGRESS)),
    safeCount(db.collection(SUPPORT_TICKET_COLLECTION).where(SUPPORT_TICKET_FIELDS.STATUS, "==", TicketStatusValues.WAITING_ON_USER)),
    safeCount(db.collection(SCAMMER_COLLECTION).where(SCAMMER_FIELDS.CREATED_AT, ">=", since)),
    safeCount(
      db
        .collection(ORDER_COLLECTION)
        .where(ORDER_FIELDS.STATUS, "==", OrderStatusValues.PENDING)
        .where(ORDER_FIELDS.PAYMENT_STATUS, "==", "pending"),
    ),
    safeCount(db.collection(NEWSLETTER_SUBSCRIBERS_COLLECTION).where(CREATED_AT, ">=", since)),
    safeCount(db.collection(ADMIN_AUDIT_LOG_COLLECTION).where(CREATED_AT, ">=", since)),
    safeCount(db.collection(ADMIN_NOTIFICATIONS_COLLECTION).where(IS_READ, "==", false)),
  ]);

  /*
   * ── MONEY AT RISK ─────────────────────────────────────────────────────────
   *
   * Three counts and one date. Deliberately NOT through
   * `paymentCasesRepository`: this file is reachable from the Functions bundle,
   * and the digest already talks to `getAdminDb()` directly for its other nine
   * collections. Pulling a repository in here for three `count()` calls would
   * widen the bundle's graph for no gain — the same reasoning the file's own
   * `CountableQuery` comment gives for not importing a firebase-admin type.
   *
   * 🛑 Every one goes through `safeCount`, which returns 0 on failure. That is
   * right for a digest and wrong almost anywhere else: a missing composite
   * index must not stop the OTHER eleven sections being delivered, and a stuck
   * zero beside live numbers reads as "that one broke". It is also why the
   * nearest-deadline query below swallows and returns null rather than
   * throwing.
   */
  /*
   * The courier wallet. Same spirit as `safeCount` above — it can never fail
   * the digest, and it ALERTS at most once per unresolved episode rather than
   * once per day (the case's `openOrObserve` is the dedupe). `getProviders()`
   * always populates `shipping`, and the base class's `getWalletBalance`
   * default answers "no wallet" for manual, so this needs no capability check.
   */
  const courierWallet = await checkCourierWalletAndAlert(getProviders().shipping);

  const [paymentCasesError, paymentCasesWarning, paymentCasesInfo, unprocessedGatewayEventCount] =
    await Promise.all([
      safeCount(
        db
          .collection(PAYMENT_CASES_COLLECTION)
          .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
          .where(PAYMENT_CASE_FIELDS.SEVERITY, "==", "error"),
      ),
      safeCount(
        db
          .collection(PAYMENT_CASES_COLLECTION)
          .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
          .where(PAYMENT_CASE_FIELDS.SEVERITY, "==", "warning"),
      ),
      safeCount(
        db
          .collection(PAYMENT_CASES_COLLECTION)
          .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
          .where(PAYMENT_CASE_FIELDS.SEVERITY, "==", "info"),
      ),
      safeCount(
        db
          .collection(GATEWAY_EVENTS_COLLECTION)
          .where(GATEWAY_EVENT_FIELDS.STATUS, "in", ["received", "processing", "failed"]),
      ),
    ]);

  /*
   * The soonest external deadline. One document, ordered — and note it can only
   * see cases that HAVE a `dueAt`, because a Firestore inequality excludes
   * documents lacking the field (Root Cause #100). Correct here: a case with no
   * deadline has nothing to be nearest about.
   */
  let nearestCaseDueAt: Date | null = null;
  try {
    const dueSnap = await db
      .collection(PAYMENT_CASES_COLLECTION)
      .where(PAYMENT_CASE_FIELDS.STATUS, "in", [...PAYMENT_CASE_ACTIVE_STATUSES])
      .orderBy(PAYMENT_CASE_FIELDS.DUE_AT, "asc")
      .limit(1)
      .get();
    const raw = dueSnap.docs[0]?.get(PAYMENT_CASE_FIELDS.DUE_AT) as
      | { toDate?: () => Date }
      | Date
      | undefined;
    if (raw instanceof Date) nearestCaseDueAt = raw;
    else if (raw && typeof raw.toDate === "function") nearestCaseDueAt = raw.toDate();
  } catch (err) {
    void normalizeError(err);
  }

  /*
   * `contactSubmissions` carries NO PII encryption — name, email, subject and
   * message are stored in plaintext (see `ContactSubmissionDocument`). That is
   * what lets the digest render a real `mailto:` reply link.
   *
   * Newsletter subscribers are the opposite: `email` is encrypted with an HMAC
   * blind index, so that section is a COUNT and must stay one. Rendering
   * addresses there would mean decrypting PII into an email body.
   */
  const contactMessages: DigestContactMessage[] = (contactSnap?.docs ?? []).map((d) => {
    const data = d.data() as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    const message = data.message ?? "";
    return {
      id: d.id,
      name: data.name ?? "Unknown",
      email: data.email ?? "",
      subject: data.subject ?? "(no subject)",
      excerpt: message.length > 200 ? `${message.slice(0, 200)}…` : message,
    };
  });

  return {
    orderCount: recentSnap.size,
    revenue,
    statusBreakdown,
    stuckPendingCount: stuckSnap.data().count,
    activeListingCount: activeSnap.data().count,
    contactMessages,
    contactTotal,
    newTicketCount,
    ticketsOpen,
    ticketsInProgress,
    ticketsWaitingOnUser,
    newScamReportCount,
    manualPaymentPendingCount,
    newSubscriberCount,
    adminActionCount,
    unreadAdminNotificationCount,
    paymentCasesError,
    paymentCasesWarning,
    paymentCasesInfo,
    nearestCaseDueAt,
    unprocessedGatewayEventCount,
    courierWalletBalance: courierWallet.balance,
    courierWalletLow: courierWallet.low,
    ...(courierWallet.reason ? { courierWalletNote: courierWallet.reason } : {}),
  };
}

function renderDigestHtml(
  summary: DailyStatusDigestSummary,
  siteName: string,
  version?: string,
): string {
  const statusRows = Object.entries(summary.statusBreakdown).sort(([a], [b]) => a.localeCompare(b));
  const title = siteName ? `${siteName} — Daily Status` : "Daily Status";
  return `<!DOCTYPE html>${renderStaticMarkup(
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
        <EmailDivider />
        <EmailRow>
          <EmailBold>Inbox</EmailBold>
          <br />
          <br />
          <StatLine label="New contact messages" value={summary.contactTotal} />
          <StatLine label="New support tickets" value={summary.newTicketCount} />
          <StatLine
            label="Tickets open / in progress / waiting on user"
            value={`${summary.ticketsOpen} / ${summary.ticketsInProgress} / ${summary.ticketsWaitingOnUser}`}
          />
          <StatLine label="Unread admin notifications" value={summary.unreadAdminNotificationCount} />
        </EmailRow>
        {summary.contactMessages.length > 0 ? (
          <EmailRow>
            <EmailBold>Contact messages</EmailBold>
            <br />
            <br />
            {/*
              * `Fragment`, not appkit's <Span>. This is EMAIL markup: the
              * Email* primitives render inline-styled tables because that is
              * what mail clients understand, and a Tailwind-classed <Span>
              * would arrive unstyled. Nothing here needs a wrapper element at
              * all — only a key — so the Fragment emits none.
              */}
            {summary.contactMessages.map((m) => (
              <Fragment key={m.id}>
                <EmailBold>{m.subject}</EmailBold>
                <br />
                {m.name} —{" "}
                {/*
                  * The reply path. A mailto: opens the operator's own mail
                  * client, so the reply leaves from their mailbox and costs
                  * nothing against the send allowance — which is why there is
                  * no in-app reply box for contact messages.
                  */}
                <EmailLink href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                  Reply to {m.email}
                </EmailLink>
                <br />
                {m.excerpt}
                <br />
                <br />
              </Fragment>
            ))}
            {summary.contactTotal > summary.contactMessages.length
              ? `…and ${summary.contactTotal - summary.contactMessages.length} more in /admin/contact.`
              : null}
          </EmailRow>
        ) : null}
        <EmailDivider />
        <EmailRow>
          <EmailBold>Needs attention</EmailBold>
          <br />
          <br />
          <StatLine label="Manual payments pending" value={summary.manualPaymentPendingCount} />
          <StatLine label="New scam reports" value={summary.newScamReportCount} />
          <StatLine label="New newsletter subscribers" value={summary.newSubscriberCount} />
          <StatLine label="Admin actions logged" value={summary.adminActionCount} />
        </EmailRow>
        {/*
          Money at risk. Rendered LAST and as its own section rather than folded
          into "Needs attention", because it is the only block in this digest
          whose items get worse on their own — a chargeback deadline passes
          whether or not anyone read the email.

          Shown unconditionally, including when every number is zero. A section
          that disappears when clean is a section whose absence is ambiguous:
          "no cases" and "the query broke" would look identical, and `safeCount`
          returns 0 on failure precisely so the other sections still arrive.
          Three zeroes are a reassuring fact; a missing block is not.
        */}
        <EmailDivider />
        <EmailRow>
          <EmailBold>Money at risk</EmailBold>
          <br />
          <br />
          <StatLine label="Open cases — urgent" value={summary.paymentCasesError} />
          <StatLine label="Open cases — warning" value={summary.paymentCasesWarning} />
          <StatLine label="Open cases — info" value={summary.paymentCasesInfo} />
          <StatLine
            label="Nearest external deadline"
            value={summary.nearestCaseDueAt ? summary.nearestCaseDueAt.toISOString() : "none"}
          />
          <StatLine
            label="Unfinished gateway events"
            value={summary.unprocessedGatewayEventCount}
          />
          {/*
            🛑 The label SAYS when a figure is missing rather than printing 0.
            An unreadable balance beside live numbers would read as "we have no
            money", which is the one wrong conclusion an operator could act on.
          */}
          <StatLine
            label="Courier wallet"
            value={
              summary.courierWalletBalance === null
                ? `unknown (${summary.courierWalletNote ?? "not read"})`
                : `${currency(summary.courierWalletBalance)}${summary.courierWalletLow ? " — LOW, top up" : ""}`
            }
          />
        </EmailRow>
        <EmailFooter
          copyright={`© ${new Date().getFullYear()}${siteName ? ` ${siteName}` : ""}. All rights reserved.`}
        />
      </EmailContainer>
    </EmailDoc>,
  )}`;
}

/**
 * The plain-text twin of `renderDigestHtml`.
 *
 * 🛑 This exists as a real function, beside the renderer, on purpose. The text
 * part used to be a string concatenated inline at the call site, which meant
 * every new HTML section silently did NOT appear in the text alternative —
 * and a mail client showing the text part would render a digest missing
 * exactly the sections someone had just added. Adding a section now means
 * editing two adjacent functions rather than one function and one distant
 * template literal.
 */
function renderDigestText(summary: DailyStatusDigestSummary, version?: string): string {
  const lines: string[] = [];
  if (version) lines.push(`Deployment ${version} is live.`, "");

  lines.push(
    `Orders placed: ${summary.orderCount}`,
    `Revenue: ${currency(summary.revenue)}`,
    `Active listings: ${summary.activeListingCount}`,
    `Pending > 24h: ${summary.stuckPendingCount}`,
    "",
    "INBOX",
    `New contact messages: ${summary.contactTotal}`,
    `New support tickets: ${summary.newTicketCount}`,
    `Tickets open/in-progress/waiting: ${summary.ticketsOpen}/${summary.ticketsInProgress}/${summary.ticketsWaitingOnUser}`,
    `Unread admin notifications: ${summary.unreadAdminNotificationCount}`,
  );

  if (summary.contactMessages.length > 0) {
    lines.push("", "CONTACT MESSAGES");
    for (const m of summary.contactMessages) {
      lines.push(`- ${m.subject} — ${m.name} <${m.email}>`, `  ${m.excerpt}`);
    }
    if (summary.contactTotal > summary.contactMessages.length) {
      lines.push(`  …and ${summary.contactTotal - summary.contactMessages.length} more in /admin/contact.`);
    }
  }

  lines.push(
    "",
    "NEEDS ATTENTION",
    `Manual payments pending: ${summary.manualPaymentPendingCount}`,
    `New scam reports: ${summary.newScamReportCount}`,
    `New newsletter subscribers: ${summary.newSubscriberCount}`,
    `Admin actions logged: ${summary.adminActionCount}`,
  );

  /*
   * The text twin of the HTML "Money at risk" section — this is the pairing
   * the docstring above exists to enforce. Same five figures, same order, and
   * the same unconditional rendering, because a mail client showing the text
   * part must not get a digest missing the one block with a deadline in it.
   */
  lines.push(
    "",
    "MONEY AT RISK",
    `Open cases — urgent: ${summary.paymentCasesError}`,
    `Open cases — warning: ${summary.paymentCasesWarning}`,
    `Open cases — info: ${summary.paymentCasesInfo}`,
    `Nearest external deadline: ${
      summary.nearestCaseDueAt ? summary.nearestCaseDueAt.toISOString() : "none"
    }`,
    `Unfinished gateway events: ${summary.unprocessedGatewayEventCount}`,
    `Courier wallet: ${
      summary.courierWalletBalance === null
        ? `unknown (${summary.courierWalletNote ?? "not read"})`
        : `${currency(summary.courierWalletBalance)}${summary.courierWalletLow ? " — LOW, top up" : ""}`
    }`,
  );

  return lines.join("\n");
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

  /*
   * 🛑 No CC, deliberately, and `ccRecipients` is no longer read here.
   *
   * Resend bills a CC as a separate delivery, so a three-recipient TO plus one
   * CC was four of the day's 100 emails for one report. The digest now goes to
   * a single address. `emailSettings.dailyDigest.ccRecipients` remains on the
   * schema only so existing documents do not fail validation — nothing reads
   * it, and the admin UI no longer offers it.
   */

  const summary = await collectDailyStatusSummary();
  // No hardcoded brand fallback — appkit is consumer-agnostic; the site name
  // comes from settings or the consumer's own env var.
  const siteName = settings?.siteName?.trim() || process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "";

  const { error } = await sendEmail(
    {
      to: recipients,
      subject: "Daily Status",
      html: renderDigestHtml(summary, siteName, version),
      text: renderDigestText(summary, version),
    },
    {
      channel: "email",
      feature: "daily_digest",
      /*
       * STAFF, and this is the single most load-bearing `audience` in the
       * codebase. The kill switch suppresses user-facing mail only, so turning
       * email off must never blind the operator — this digest is now the only
       * way a contact message, a new support ticket or a stuck payment proof
       * gets noticed at all. Marking it `user` would mean switching off
       * marketing also switched off the ability to notice an outage.
       */
      audience: "staff",
    },
  );

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
