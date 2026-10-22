"use client";

/**
 * The buyer's dispute form: pick a kind, pick a reason, say what happened.
 *
 * ## Why the kind comes first
 *
 * The two kinds have MUTUALLY EXCLUSIVE gates — an item problem needs the
 * order to have arrived, a non-delivery needs it not to have. So the kind is
 * the first choice, it scopes the reason list, and it decides which gate the
 * server will apply. Offering one merged list of reasons would mean a buyer
 * could pick "it never arrived" on a delivered order and have the server
 * refuse them, which reads as the form being broken rather than as the wrong
 * choice.
 *
 * ## The gate is checked HERE for the affordance and AGAIN on the server
 *
 * 🛑 This copy decides what to OFFER. The server decides what to ACCEPT, and
 * it is the authority — `raiseOrderDisputeAction` re-runs `checkDisputeGate`
 * on the real order. Showing a kind the server would refuse is the dead-end
 * shape (CLAUDE.md's rule for `OrderCompletionPanel`: never offer a button the
 * server will refuse), and trusting this copy alone would be a client-side
 * security gate.
 */

import { useCallback, useMemo, useState } from "react";
import {
  DISPUTE_KIND,
  DISPUTE_KIND_LABEL,
  checkDisputeGate,
  disputeNotReachedFilableFrom,
  type DisputeGateOrder,
  type DisputeKind,
} from "../../../_internal/shared/features/orders/dispute-reasons";
import { Alert, Button, Div, FieldTextarea, Form, Stack, Text, useToast } from "../../../ui";
import { PaginatedSelect, type AsyncPage, type PaginatedSelectOption } from "../../../ui/components/PaginatedSelect";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { normalizeError } from "../../../errors/normalize";

export interface RaiseDisputeFormProps {
  /** The gate reads four dates off this; an `OrderDocument` satisfies it. */
  order: DisputeGateOrder;
  /** `GET ?kind=` / `POST` — supplied by the consumer so appkit holds no route. */
  reasonsEndpoint: string;
  onSubmit: (input: { kind: DisputeKind; reasonId: string; detail?: string }) => Promise<void>;
  onDone?: () => void;
}

interface ReasonRow {
  id: string;
  label: string;
}

export function RaiseDisputeForm({
  order,
  reasonsEndpoint,
  onSubmit,
  onDone,
}: RaiseDisputeFormProps) {
  const { showToast } = useToast();
  const [kind, setKind] = useState<DisputeKind | null>(null);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [isPending, setIsPending] = useState(false);

  /*
   * Which kinds this order can actually support, with the server's own gate.
   * A kind that would be refused is shown DISABLED with the reason rather than
   * hidden: "why can't I report this?" is a question the form should answer,
   * and a silently missing option looks like a bug.
   */
  const kindStates = useMemo(
    () =>
      DISPUTE_KIND.map((k) => ({
        kind: k,
        label: DISPUTE_KIND_LABEL[k],
        gate: checkDisputeGate(k, order),
      })),
    [order],
  );

  const filableFrom = useMemo(() => disputeNotReachedFilableFrom(order), [order]);

  /*
   * 🛑 Keyed on `kind` so switching kind refetches. `PaginatedSelect` caches
   * per `loadOptions` identity, so a stable callback would keep showing the
   * previous kind's reasons — which is the one thing that must never happen
   * here, because a mismatched reason is refused by the server.
   */
  const loadReasons = useCallback(
    async (query: string, page: number): Promise<AsyncPage<PaginatedSelectOption<string>>> => {
      if (!kind) return { options: [], hasMore: false };
      const res = await fetch(`${reasonsEndpoint}?kind=${encodeURIComponent(kind)}`);
      if (!res.ok) {
        /*
         * Surfaced, not swallowed into an empty list. An empty picker is
         * indistinguishable from "there are no reasons", and the buyer would
         * sit on a required field with nothing in it (Root Cause #59).
         */
        throw new Error("Could not load the list of reasons. Please try again.");
      }
      const json = (await res.json()) as { data?: { items?: ReasonRow[] } };
      const rows = json.data?.items ?? [];
      const q = query.trim().toLowerCase();
      const filtered = q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows;
      return {
        // `items`, not `options` — checked against `AsyncPage` rather than
        // guessed; the wrong key yields an empty picker with no error.
        items: filtered.map((r) => ({ value: r.id, label: r.label })),
        // The route caps at 50 and the list is short by design; there is no
        // second page to promise. `page` is unused for the same reason.
        hasMore: false,
      };
    },
    [kind, reasonsEndpoint],
  );

  const chooseKind = (next: DisputeKind) => {
    setKind(next);
    // Clearing is required: a reason from the previous kind would be refused.
    setReasonId(null);
  };

  const submit = async () => {
    if (!kind || !reasonId) return;
    setIsPending(true);
    try {
      await onSubmit({ kind, reasonId, detail: detail.trim() || undefined });
      showToast("Thanks — we've recorded it and will look into it.", "success");
      onDone?.();
    } catch (err) {
      // The server's message names the next action; show it verbatim rather
      // than replacing it with a generic failure.
      showToast(normalizeError(err).message, "error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" weight="semibold">
            What&apos;s the problem?
          </Text>
          {kindStates.map((k) => (
            <Div key={k.kind}>
              <Button
                variant={kind === k.kind ? "primary" : "secondary"}
                disabled={!k.gate.allowed}
                onClick={() => chooseKind(k.kind)}
              >
                {k.label}
              </Button>
              {!k.gate.allowed ? (
                <Text size="xs" color="muted">
                  {k.gate.message}
                </Text>
              ) : null}
            </Div>
          ))}
        </Stack>

        {kind ? (
          <>
            {/*
              A visible heading plus `ariaLabel` — `PaginatedSelect` has no
              `label` prop (checked; `BaseProps` carries `ariaLabel`,
              `placeholder` and `searchPlaceholder` only). The `ariaLabel` is
              what NAMES the control, so the `<Text>` above it is a heading
              rather than a stand-in label.
            */}
            <Text size="sm" weight="semibold">
              Reason
            </Text>
            <PaginatedSelect<string>
              ariaLabel="Reason for the dispute"
              /*
               * 🛑 `?? null`, not `?? ""`. PaginatedSelect renders its
               * placeholder only on `value == null`; an empty string paints a
               * BLANK trigger with no prompt, which reads as a broken control
               * rather than an unmade choice.
               */
              value={reasonId ?? null}
              onChange={(v) => setReasonId(v)}
              loadOptions={loadReasons}
              placeholder="Pick the closest match…"
            />

            <FieldTextarea
              name="detail"
              label="What happened? (optional)"
              value={detail}
              onChange={setDetail}
              maxLength={2000}
            />

            {kind === "not_reached" && filableFrom ? (
              <Alert variant="info">
                {`We'll chase the courier. If it turns up before we finish, let us know.`}
              </Alert>
            ) : null}

            <Button
              type="submit"
              action={ACTIONS.SUPPORT["raise-dispute"]}
              isLoading={isPending}
              disabled={!reasonId}
              onClick={submit}
            >
              Report this
            </Button>
          </>
        ) : null}
      </Stack>
    </Form>
  );
}
