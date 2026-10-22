"use client";

import React, { useCallback, useState } from "react";
import { Badge, Button, Row, Stack, Text } from "../../../ui";
import { RecordDetailModal } from "../../../ui/components/RecordDetailModal";
import { useToast } from "../../../ui/components/Toast";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldSelect } from "../../../ui/forms/FieldSelect";
import { normalizeError } from "../../../errors/normalize";
import { DataListingView } from "../../admin/components/DataListingView";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  DISPUTE_KIND,
  type DisputeKind,
} from "../../../_internal/shared/features/orders/dispute-reasons";
import {
  DISPUTE_REASON_LABEL_MAX,
  type DisputeReasonDocument,
} from "../schemas/firestore";

/**
 * Admin → Trust & Safety → Dispute reasons.
 *
 * ## Why a management page exists at all
 *
 * Inline create in the triage drawer was the cheaper half and was rejected on
 * its own, for a reason worth keeping: **with no management page nothing can
 * ever retire a reason**, so the list only grows and a typo'd row is permanent.
 * Both shipped — the drawer so an agent never leaves a ticket to add a missing
 * reason, this page so the eleven seeded rows are reviewable and retire has a
 * home.
 *
 * ## 🛑 A row is OPENABLE, not just actionable
 *
 * `audit-listing-detail-affordance` requires it and the reason is Root Cause
 * #56: a menu of pure mutations lets staff act on a record they were never able
 * to read. Here that would mean retiring a reason without seeing its KIND — and
 * the kind is the only field that decides which gate the reason inherits, so
 * retiring the wrong one silently narrows the wrong form.
 *
 * `RecordDetailModal` is the shared primitive for exactly this; a bespoke modal
 * would have tripped the Duplication Framework's Rule of Three on sight.
 */

export interface AdminDisputeReasonsViewProps {
  /** `PATCH /api/admin/dispute-reasons/{id}` with `{ isActive }`. */
  onSetActive: (id: string, isActive: boolean) => Promise<void>;
  /** `POST /api/dispute-reasons` — the same endpoint the triage drawer uses. */
  onCreate: (input: { label: string; kind: DisputeKind }) => Promise<void>;
}

interface Row {
  id: string;
  label: string;
  kind: DisputeKind;
  isActive: boolean;
  createdByName: string;
}

interface ListResponse {
  items: DisputeReasonDocument[];
  total: number;
}

/**
 * What each kind MEANS, in one place.
 *
 * 🛑 A `Record<DisputeKind, string>`, so a third kind is a compile error here
 * rather than a picker option rendering a bare token. The kind is the only
 * field on a reason with a consequence — it decides which gate a dispute
 * raised under it inherits — so it is the one that must never read as jargon.
 */
const KIND_MEANING: Record<DisputeKind, string> = {
  item: "Item problem — it arrived wrong or damaged",
  not_reached: "Never arrived — the parcel did not reach the buyer",
};

/*
 * Chips over `isActive`, as ordinary Sieve clauses. `listAll` applies no
 * `isActive` filter of its own precisely so these work without the repository
 * growing a method per chip.
 *
 * 🛑 "All" carries NO filter rather than `isActive==true|false`. A pipe-joined
 * OR over a boolean would be two equalities merged for no reason, and — worse —
 * it would exclude any row written before the field existed, which is the `!=`
 * trap one step removed.
 */
const SCOPE_CHIPS = [
  { id: "active", label: "Active", filter: "isActive==true" },
  { id: "retired", label: "Retired", filter: "isActive==false" },
  { id: "all", label: "All", filter: undefined },
] as const;

/**
 * The two fields, exported so the triage drawer's inline create and this page
 * cannot drift on the label bound or the kind vocabulary.
 */
export function DisputeReasonFields({
  label,
  kind,
  onLabel,
  onKind,
}: {
  label: string;
  kind: DisputeKind;
  onLabel: (v: string) => void;
  onKind: (v: DisputeKind) => void;
}) {
  return (
    <Stack gap="md">
      <FieldInput
        name="label"
        label="Reason wording"
        required
        value={label}
        onChange={onLabel}
        maxLength={DISPUTE_REASON_LABEL_MAX}
        placeholder="The courier left it at the wrong flat"
      />
      <FieldSelect
        name="kind"
        label="Kind"
        required
        value={kind}
        onChange={(v) => onKind(v as DisputeKind)}
        /*
         * Two options, so `<FieldSelect>` is correct — `PaginatedSelect` is for
         * >5 (Rule #9), and a searchable dropdown over two values is worse than
         * a native select. Derived from the shipped union so a third kind
         * cannot exist in the gate and be missing here.
         */
        options={DISPUTE_KIND.map((k) => ({ value: k, label: KIND_MEANING[k] }))}
      />
    </Stack>
  );
}

/** Create form. Shares `DisputeReasonFields` and the endpoint with the drawer. */
function CreateReasonForm({
  onSubmit,
}: {
  onSubmit: (input: { label: string; kind: DisputeKind }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<DisputeKind>(DISPUTE_KIND[0]);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  return (
    <Stack gap="md">
      <Text size="sm" color="muted">
        Short wording, as a buyer would read it. The detail goes in their own
        free-text field — this is a picker option, not the explanation.
      </Text>
      <DisputeReasonFields label={label} kind={kind} onLabel={setLabel} onKind={setKind} />
      <Button
        action={ACTIONS.ADMIN["add-dispute-reason"]}
        isLoading={busy}
        disabled={busy || label.trim().length < 3}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit({ label: label.trim(), kind });
          } catch (err) {
            void normalizeError(err);
            showToast("Couldn't add that reason.", "error");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Stack>
  );
}

export function AdminDisputeReasonsView({
  onSetActive,
  onCreate,
}: AdminDisputeReasonsViewProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState<Row | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const setActive = useCallback(
    async (row: Row, isActive: boolean) => {
      setPending(row.id);
      try {
        await onSetActive(row.id, isActive);
        showToast(
          isActive ? `"${row.label}" is back in the picker.` : `"${row.label}" retired.`,
          "success",
        );
      } catch (err) {
        void normalizeError(err);
        /*
         * No optimistic flip anywhere here, so a failure needs no rollback —
         * the row still shows what the server last told us. Only a successful
         * write and the refetch behind it move the list.
         */
        showToast("Couldn't save that. Nothing was changed.", "error");
      } finally {
        setPending(null);
      }
    },
    [onSetActive, showToast],
  );

  const rowControls = useCallback(
    (row: Row) => (
      <Row align="center" gap="sm">
        <Button variant="ghost" size="sm" onClick={() => setOpen(row)}>
          View
        </Button>
        <Button
          action={
            row.isActive
              ? ACTIONS.ADMIN["retire-dispute-reason"]
              : ACTIONS.ADMIN["reactivate-dispute-reason"]
          }
          size="sm"
          isLoading={pending === row.id}
          disabled={pending !== null}
          onClick={() => setActive(row, !row.isActive)}
        />
      </Row>
    ),
    [pending, setActive],
  );

  return (
    <>
      <DataListingView<ListResponse, Row>
        portal="admin"
        title="Dispute reasons"
        subtitle="What buyers can pick when reporting a problem. A reason's kind decides which gate it inherits — the wording is yours."
        endpoint="/api/admin/dispute-reasons"
        queryKey={["admin", "dispute-reasons"]}
        defaultSort="label"
        filterKeys={["scope"]}
        filterDefaults={{ scope: "active" }}
        buildFilters={(state) =>
          SCOPE_CHIPS.find((c) => c.id === (state.scope ?? "active"))?.filter
        }
        mapRows={(res) =>
          (res.items ?? []).map((r) => ({
            id: r.id,
            label: r.label,
            kind: r.kind,
            isActive: r.isActive,
            createdByName: r.createdByName,
          }))
        }
        getTotal={(res, rows) => res.total ?? rows.length}
        /*
         * 🛑 No `searchPlaceholder` and no `search` — the endpoint does not read
         * `q`, and declaring either is what makes the box exist. ~39 views here
         * render a box whose endpoint ignores the term: it accepts typing, the
         * request carries it, and the results do not change, with no error
         * anywhere. Eleven rows with scope chips need no search.
         */
        emptyLabel="No reasons in this scope."
        primaryAction={{
          label: ACTIONS.ADMIN["add-dispute-reason"].label,
          onClick: ({ openCreatePanel }) => openCreatePanel(),
        }}
        renderEditor={({ close }) => (
          <CreateReasonForm
            onSubmit={async (input) => {
              await onCreate(input);
              close();
            }}
          />
        )}
        resolveEditorTitle={() => "Add a dispute reason"}
        onRowClick={(row) => setOpen(row)}
        renderRowActions={rowControls}
        renderCards={(rows) => (
          <Stack gap="sm">
            {rows.map((row) => (
              <Row
                key={row.id}
                surface="card"
                padding="md"
                rounded="lg"
                border="default"
                align="center"
                justify="between"
                gap="md"
                className="min-w-0"
              >
                <Stack gap="xs" className="min-w-0">
                  <Row align="center" gap="sm" className="min-w-0">
                    <Text weight="semibold" color="primary" className="min-w-0">
                      {row.label}
                    </Text>
                    {/*
                      The state carries a WORD, never colour alone — the rule
                      the status dots follow — and the pairing is chip-style
                      (`{status}-surface` + matching ink), never a
                      theme-inverting tint under literal white (Root Cause #67).
                    */}
                    <Badge variant={row.isActive ? "success" : "neutral"}>
                      {row.isActive ? "Active" : "Retired"}
                    </Badge>
                  </Row>
                  <Text size="xs" color="muted">
                    {KIND_MEANING[row.kind]}
                  </Text>
                  <Text size="xs" color="faint">
                    Added by {row.createdByName}
                  </Text>
                </Stack>
                {rowControls(row)}
              </Row>
            ))}
          </Stack>
        )}
      />

      {open && (
        <RecordDetailModal
          isOpen
          onClose={() => setOpen(null)}
          title={open.label}
          badges={[
            {
              label: open.isActive ? "Active" : "Retired",
              variant: open.isActive ? "success" : "neutral",
            },
          ]}
          fields={[
            { label: "Buyer-facing wording", value: open.label },
            { label: "Kind", value: `${open.kind} — ${KIND_MEANING[open.kind]}` },
            {
              label: "State",
              value: open.isActive
                ? "Active — buyers see it on the dispute form"
                : "Retired — hidden from the form",
            },
            { label: "Added by", value: open.createdByName },
          ]}
          metadata={{
            id: open.id,
            /*
             * Stated on the record itself, because it is the fact an agent is
             * most likely to be unsure about at the moment they are deciding
             * whether to retire: the order snapshots the LABEL, so retiring
             * cannot rewrite what a past dispute said.
             */
            retiringIsNeverADelete:
              "Disputes already raised under this reason keep their wording — the order snapshots the label rather than pointing at this row.",
          }}
        />
      )}
    </>
  );
}
