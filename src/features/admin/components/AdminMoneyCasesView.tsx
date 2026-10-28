"use client";

/**
 * AdminMoneyCasesView — the operator queue for everything where money is at
 * risk, and the FIRST surface `paymentCases` has ever had.
 *
 * ## Why this page is the point of the whole payment-protection spine
 *
 * The event inbox, the four reconcilers, the obligation sweep, the dispute
 * ingest, the protection claims and the grievance intake all converge on one
 * collection — and until this view existed, **nothing could read it.** Thirty-six
 * commits of detection wrote rows into a queue with no screen. That is Root
 * Cause #56 at the scale of a subsystem: *a feature is built, one of its
 * surfaces is missing, and nothing notices.*
 *
 * The daily digest was the only consumer, and it was built first for exactly
 * that reason — it PUSHES, so the queue had one reader from day one. This is
 * the pull side.
 *
 * ## 🛑 It is NOT under `/admin/maintenance/`
 *
 * Maintenance means "something broke, look when you can" and is granted to
 * `maintenance_employee`. A case here can carry a gateway's own `respond_by` —
 * miss it and the chargeback is lost by default irrespective of who was right —
 * and an `amountAtRisk` in real rupees. Hence its own section and
 * `admin:payment-cases:read|write`, admin only.
 *
 * ## 🛑 NO SEARCH BOX, and that is a decision
 *
 * `ListingViewConfig.searchPlaceholder` is optional and *"declaring it is what
 * makes the box exist"*. `/api/admin/payment-cases` does not read `q`, and
 * ~39 views in this codebase already render a box whose endpoint ignores the
 * term — the user types, the request carries it, nothing changes, no error.
 * Omitting it is the fix; a placeholder describing a capability the endpoint
 * lacks is the defect.
 *
 * ## 🛑 The default sort cannot be `dueAt`
 *
 * `dueAt` is OPTIONAL and most cases have none — only a dispute and a grievance
 * carry an external clock. A Firestore `orderBy` on an optional field silently
 * EXCLUDES every document that lacks it (Root Cause #100), so sorting by
 * deadline would hide the great majority of the queue while looking like it had
 * simply ordered it. `lastObservedAt` is written by `openOrObserve` on every
 * case, every time, so it is the only safe default — and it happens to be the
 * right one: "what has been seen most recently".
 *
 * Deadline pressure is surfaced instead by the `dueAt` row text and by R4,
 * which escalates and re-notifies at T-72h and T-24h.
 *
 * EXPORTS: AdminMoneyCasesView, type AdminMoneyCasesViewProps
 *
 * @tag domain:payment-cases
 * @tag layer:component
 * @tag pattern:listing
 * @tag access:client
 * @tag consumers:admin/money-cases
 * @tag sideEffects:network
 */

import React, { useState } from "react";
import {
  sieveFilter,
  SIEVE_OP,
  sortBy,
  type JsonArray,
  type JsonValue,
} from "@mohasinac/appkit/client";
import { Button } from "../../../ui/components/Button";
import { FilterChipGroup } from "../../../ui/components/FilterChipGroup";
import { ListingLayout } from "../../../ui/components/ListingLayout";
import { RecordDetailModal } from "../../../ui/components/RecordDetailModal";
import { Row, Stack } from "../../../ui/components/Layout";
import { RowActionMenu } from "../../../ui/components/RowActionMenu";
import { Text } from "../../../ui/components/Typography";
import type { ListingLayoutProps } from "../../../ui/components/ListingLayout";
import { RecordStatusTimeline } from "../../status-history/components/RecordStatusTimeline";
import { ReviewDecisionModal } from "../../store-extensions/components/ReviewDecisionModal";
import {
  paymentCaseResolveFormSchema,
  type PaymentCaseResolveFormValues,
} from "../../payment-cases/schemas/resolve-form";
import { formatMoney } from "../../../utils/number.formatter";
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  ADMIN_PAYMENT_CASE_KIND_TABS,
  ADMIN_PAYMENT_CASE_SEVERITY_TABS,
  ADMIN_PAYMENT_CASE_STATUS_TABS,
} from "../constants/filter-tabs";
import {
  toRecordArray,
  toRelativeDate,
  toStringValue,
} from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";

interface AdminMoneyCasesResponse {
  items?: JsonArray;
  meta?: { total?: number };
}

interface MoneyCaseRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  _raw: Record<string, JsonValue>;
}

/**
 * Operator-facing names. Deliberately describe the PROBLEM rather than echo
 * the field value — `missing_order` is "Captured, no order", which is what has
 * actually happened and what the next action depends on.
 *
 * Kept beside the chip labels rather than shared with them: the chips are terse
 * because they sit in a grid, these head a row and can afford a clause.
 */
const KIND_LABEL: Record<string, string> = {
  missing_order: "Captured payment with no order",
  unprocessed_event: "Gateway event never processed",
  status_conflict: "Late event would have regressed an order",
  dispute: "Chargeback",
  refund_mismatch: "Refund totals disagree with the gateway",
  amount_mismatch: "Captured amount ≠ recorded total",
  dead_job: "Job exhausted its retries",
  grievance: "Statutory grievance",
  shipping_unpriced: "Store shipping could not be priced",
  protection_claim: "Protection claim",
  manual_refund_due: "Refund owed, no automatic rail",
};

/** Rupees, for a row. Plain `toFixed` — these are already decimal rupees. */
function money(value: JsonValue | undefined): string | null {
  return typeof value === "number" ? formatMoney(value) : null;
}

export type AdminMoneyCasesViewProps = ListingLayoutProps;

/**
 * Narrow a JSON value to status-history entries.
 *
 * 🛑 A FUNCTION, NOT A CAST. This was `detail.statusHistory as
 * StatusChangeEntry[] | undefined`, which `tsc` rejects as insufficiently
 * overlapping — and the suggested `as unknown as` is the double cast this
 * repo bans outright, because it has zero runtime effect and silences the one
 * type-level signal there was.
 *
 * `detail` is a `JsonObject` off the wire, so narrowing is genuinely needed;
 * the file already does exactly this for scalars via `toStringValue`. An
 * array whose members are not objects returns undefined rather than being
 * waved through — the timeline renders nothing, which is the honest outcome
 * for data it cannot read.
 */
function toStatusHistory(value: unknown): StatusChangeEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ok = value.every((e) => typeof e === "object" && e !== null);
  return ok ? (value as StatusChangeEntry[]) : undefined;
}

export function AdminMoneyCasesView({ children, ...props }: AdminMoneyCasesViewProps) {
  const [detail, setDetail] = useState<Record<string, JsonValue> | null>(null);
  const [resolveTargetId, setResolveTargetId] = useState<string | null>(null);
  const [dismissTargetId, setDismissTargetId] = useState<string | null>(null);
  /*
   * Bumped after every mutation. `DataListingView` keys its react-query cache
   * on `queryKey`, so changing the key is what forces a refetch — the reports
   * page calls its own `load()` because it owns its fetch; this one does not.
   */
  const [revision, setRevision] = useState(0);

  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        {children}
      </ListingLayout>
    );
  }

  const patch = async (id: string, body: PaymentCaseResolveFormValues | { status: string }) => {
    const res = await fetch(ADMIN_ENDPOINTS.PAYMENT_CASE_BY_ID(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      /*
       * Thrown so `ReviewDecisionModal` stays OPEN and keeps the note the
       * operator just typed. Its catch shows a toast and leaves the dialog up —
       * a decision that did not save must not look like one that did.
       */
      throw new Error(`Could not update this case (${res.status})`);
    }
    setRevision((r) => r + 1);
    setDetail(null);
  };

  const config: ListingViewConfig<AdminMoneyCasesResponse, MoneyCaseRow> = {
    portal: "admin",
    title: "Money cases",
    subtitle:
      "Everything where money is at risk — chargebacks, captured payments with no order, refunds owed, protection claims and grievances. Opened automatically; only a human can close one.",
    emptyLabel: "No open money cases",
    // 🛑 No `searchPlaceholder` / `search` — the endpoint does not read `q`.
    filterKeys: ["status", "kind", "severity"],
    defaultSort: sortBy("lastObservedAt", "DESC"),
    queryKey: ["admin", "payment-cases", "listing", String(revision)],
    endpoint: ADMIN_ENDPOINTS.PAYMENT_CASES,
    /*
     * ── Two traps avoided here, both measured rather than assumed ──────────
     *
     * 🛑 THERE IS NO "SORT BY SEVERITY" OPTION, even though `severity` is
     * `canSort: true` and the option is the obvious one to offer. It stores the
     * STRINGS `error` / `warning` / `info`, so Firestore orders them
     * alphabetically — and `DESC` therefore yields **warning, info, error**,
     * putting the most urgent cases LAST. A sort that silently inverts the
     * thing it claims to rank is worse than no sort (Root Cause #63), and it
     * would be believed. `PAYMENT_CASE_SEVERITY_RANK` exists in TypeScript but
     * is not a stored field, so there is nothing to order by; the severity
     * FILTER is the correct control and it is in the panel.
     *
     * 🛑 The two optional-field sorts NAME their own exclusion. `dueAt` and
     * `amountAtRisk` are both optional, and a Firestore `orderBy` excludes
     * every document that LACKS the field (Root Cause #100) — so these sorts
     * genuinely do shrink the list. For these two that is the right semantics
     * ("soonest deadline" is a question about dated cases), but the shrinking
     * must be stated: an unexplained shorter list is how someone concludes the
     * queue is empty when it is not.
     */
    sortOptions: [
      { value: sortBy("lastObservedAt", "DESC"), label: "Most recently seen" },
      { value: sortBy("lastObservedAt", "ASC"), label: "Longest unseen" },
      { value: sortBy("dueAt", "ASC"), label: "Soonest deadline (dated cases only)" },
      { value: sortBy("amountAtRisk", "DESC"), label: "Largest amount (money cases only)" },
      { value: sortBy("observedCount", "DESC"), label: "Most often re-seen" },
      { value: sortBy("createdAt", "DESC"), label: "Newest" },
      { value: sortBy("createdAt", "ASC"), label: "Oldest" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const kind = toStringValue(item.kind, "unknown");
        const observed = typeof item.observedCount === "number" ? item.observedCount : 1;
        const amount = money(item.amountAtRisk);
        const due = toStringValue(item.dueAt, "");
        return {
          id: toStringValue(item.id, `case-${index}`),
          primary: toStringValue(item.title, KIND_LABEL[kind] ?? kind),
          secondary: [
            KIND_LABEL[kind] ?? kind,
            amount ? `${amount} at risk` : null,
            // An external deadline is the one thing worth putting in a row.
            due ? `due ${new Date(due).toLocaleString()}` : null,
            // Only mentioned when it is informative — "seen once" is noise.
            observed > 1 ? `seen ${observed}×` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status: toStringValue(item.status, "open"),
          updatedAt: toRelativeDate(item.lastObservedAt ?? item.createdAt),
          _raw: item,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.meta?.total === "number" ? response.meta.total : mappedRows.length,
    onRowClick: (row) => setDetail(row._raw),
    buildFilters: (state) => {
      const parts: string[] = [];
      if (state.status && state.status !== "All")
        parts.push(sieveFilter("status", SIEVE_OP.EQ, state.status));
      if (state.kind && state.kind !== "All")
        parts.push(sieveFilter("kind", SIEVE_OP.EQ, state.kind));
      if (state.severity && state.severity !== "All")
        parts.push(sieveFilter("severity", SIEVE_OP.EQ, state.severity));
      return parts.length > 0 ? parts.join(",") : undefined;
    },
    renderRowActions: (row) => {
      const status = row.status;
      const closed = status === "actioned" || status === "dismissed";
      return (
        <RowActionMenu
          actions={[
            { label: "View details", onClick: () => setDetail(row._raw) },
            /*
             * "Take" needs no note — it records that someone is looking, which
             * the schema's own `superRefine` exempts from the resolution floor.
             * Hidden once closed: re-opening a closed case is not a thing this
             * surface offers, because `resolve()` is one-way by design.
             */
            ...(closed
              ? []
              : [
                  {
                    label: status === "under-review" ? "Already taken" : "Take",
                    onClick: () => patch(row.id, { status: "under-review" }),
                    disabled: status === "under-review",
                  },
                  { label: "Resolve", onClick: () => setResolveTargetId(row.id) },
                  { label: "Dismiss", onClick: () => setDismissTargetId(row.id) },
                ]),
          ]}
        />
      );
    },
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <Stack gap="md">
        <FilterChipGroup
          label="Status"
          tabs={ADMIN_PAYMENT_CASE_STATUS_TABS}
          value={pendingFilters.status ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, status: id }))}
        />
        <FilterChipGroup
          label="Severity"
          tabs={ADMIN_PAYMENT_CASE_SEVERITY_TABS}
          value={pendingFilters.severity ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, severity: id }))}
        />
        <FilterChipGroup
          label="Kind"
          tabs={ADMIN_PAYMENT_CASE_KIND_TABS}
          value={pendingFilters.kind ?? ""}
          onChange={(id) => setPendingFilters((p) => ({ ...p, kind: id }))}
        />
      </Stack>
    ),
  };

  const detailKind = detail ? toStringValue(detail.kind, "") : "";
  const detailStatus = detail ? toStringValue(detail.status, "") : "";
  const selfHealed = detail ? toStringValue(detail.selfHealedAt, "") : "";

  return (
    <>
      <DataListingView config={config} />

      <RecordDetailModal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? toStringValue(detail.title, "Money case") : "Money case"}
        badges={
          detail
            ? [
                { label: detailStatus || "open" },
                { label: KIND_LABEL[detailKind] ?? detailKind },
                { label: toStringValue(detail.severity, "info") },
              ]
            : undefined
        }
        description={detail ? toStringValue(detail.detail, "") : undefined}
        fields={
          detail
            ? [
                { label: "Case id", value: toStringValue(detail.id, "") },
                { label: "Subject", value: `${toStringValue(detail.entityType, "")} ${toStringValue(detail.entityId, "")}` },
                { label: "Amount at risk", value: money(detail.amountAtRisk) ?? "—" },
                {
                  label: "External deadline",
                  value: toStringValue(detail.dueAt, "") || "none — this case has no clock",
                },
                {
                  label: "Times observed",
                  value: String(detail.observedCount ?? 1),
                },
                { label: "Last seen", value: toStringValue(detail.lastObservedAt, "") },
                { label: "Assigned to", value: toStringValue(detail.assignedTo, "") || "—" },
                { label: "Gateway payment", value: toStringValue(detail.gatewayPaymentId, "") || "—" },
                { label: "Resolution", value: toStringValue(detail.resolution, "") || "—" },
              ]
            : undefined
        }
        /*
         * 🛑 `selfHealedAt` is rendered as a QUESTION, never as a resolution.
         *
         * A reconciler that stops observing a problem writes this field and
         * nothing else — the case stays `open` on purpose. "The symptom went
         * away" and "a human understands why" are different facts, and on money
         * only the second one closes anything: a self-healed `missing_order`
         * might mean the retry worked, or might mean somebody refunded it by
         * hand and the order will never exist.
         */
        extra={
          detail ? (
            <Stack gap="md">
              {selfHealed ? (
                <Row surface="info-surface" padding="sm" rounded="default">
                  <Text size="sm" color="info">
                    A reconciler no longer sees this problem (as of{" "}
                    {new Date(selfHealed).toLocaleString()}). That is not a
                    resolution — confirm what happened, then resolve or dismiss
                    it.
                  </Text>
                </Row>
              ) : null}
              <RecordStatusTimeline
                entries={toStatusHistory(detail.statusHistory)}
                truncatedCount={
                  typeof detail.statusHistoryTruncated === "number"
                    ? detail.statusHistoryTruncated
                    : undefined
                }
                emptyLabel="Opened automatically; nothing has happened to it yet"
              />
            </Stack>
          ) : undefined
        }
        footer={
          detail && detailStatus !== "actioned" && detailStatus !== "dismissed" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResolveTargetId(toStringValue(detail.id, ""))}
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissTargetId(toStringValue(detail.id, ""))}
              >
                Dismiss
              </Button>
            </>
          ) : undefined
        }
      />

      <ReviewDecisionModal
        isOpen={resolveTargetId !== null}
        onClose={() => setResolveTargetId(null)}
        title="Resolve this case"
        schema={paymentCaseResolveFormSchema}
        status="actioned"
        noteField="resolution"
        noteLabel="What did you do?"
        noteHelp="Required. The next person reading this case has only what you write here."
        notePlaceholder="e.g. Refunded ₹2,511.80 to the buyer from the Razorpay dashboard; the order could not be placed because the address was missing."
        confirmLabel="Resolve case"
        onConfirm={(values) => patch(resolveTargetId!, values)}
      />

      {/*
        Dismiss asks for a reason rather than writing "Dismissed", which is the
        status restated and explains nothing. `/admin/reports` learned this the
        same way.
      */}
      <ReviewDecisionModal
        isOpen={dismissTargetId !== null}
        onClose={() => setDismissTargetId(null)}
        title="Dismiss this case"
        schema={paymentCaseResolveFormSchema}
        status="dismissed"
        noteField="resolution"
        noteLabel="Why is nothing wrong here?"
        noteHelp="Required. A dismissed case with no reason reads identically to one nobody looked at."
        notePlaceholder="e.g. Duplicate of the event two rows above — same payment id, already refunded."
        confirmLabel="Dismiss case"
        onConfirm={(values) => patch(dismissTargetId!, values)}
      />
    </>
  );
}
