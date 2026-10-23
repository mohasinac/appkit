"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Heading, Row, Stack, Text } from "../../../ui";
import { Modal } from "../../../ui/components/Modal";
import { useToast } from "../../../ui/components/Toast";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { apiClient } from "../../../http/ApiClient";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  RATE_TIER_ORDER,
  type RateDescriptor,
  type RateTier,
  type RateUnit,
} from "../../../_internal/shared/features/pricing/rate-registry";

/**
 * Admin → Finance → Pricing.
 *
 * ## What this page is FOR, which is not "another settings tab"
 *
 * Every rate here is already editable somewhere — most of them on Site
 * Settings → Commissions. What was missing is the thing a settings form
 * structurally cannot show: **all sixteen rates beside each other, each
 * labelled with what KIND of number it is and when it last moved.**
 *
 * A settings form answers "what is this field set to". This answers "what do
 * we charge, who decided, and when" — and those are different questions with
 * different readers. The second one is the one an operator asks when a margin
 * looks wrong, and before this page the only way to answer it was to read
 * `adminAuditLog` and hope the act had been logged, which for rates it never
 * was.
 *
 * ## 🛑 Statutory rates are ABSENT, not shown greyed out
 *
 * See the registry header. A read-only GST row here would be a second place
 * GST appears, and on the day the two disagree this page is the one an
 * operator believes. The tier legend still names the distinction, because a
 * reader needs to know statutory rates EXIST and are set elsewhere — the link
 * is the honest version of the row.
 *
 * ## 🛑 Changing a rate NEVER restates history
 *
 * The form says so, in those words, above the date field. That is not
 * reassurance copy — it is the single fact that decides whether a reader
 * reaches for this page or for a migration, and getting it wrong in either
 * direction is expensive. Every historical read uses the record's own
 * snapshot (`order.gst`, `order.platformFee`), which is why those fields are
 * snapshotted at all.
 */

interface RateLastChange {
  previousValue: number | null;
  newValue: number;
  effectiveFrom: string;
  changedAt: string;
  changedByName: string;
  reason: string | null;
}

interface RateRow extends RateDescriptor {
  value: number | null;
  editable: boolean;
  lastChange: RateLastChange | null;
}

const TIER_LABEL: Record<RateTier, string> = {
  statutory: "Statutory",
  policy: "Policy ceiling",
  operational: "Operational",
};

const TIER_BLURB: Record<RateTier, string> = {
  statutory:
    "Set by law, not by us. Sourced per HSN code in Tax codes — they deliberately do not appear below.",
  policy: "A ceiling the owner decides. Administrator only, and a reason is required.",
  operational: "Tuned, audited and reversible by back-office staff.",
};

const TIER_TONE: Record<RateTier, "warning" | "info" | "default"> = {
  statutory: "warning",
  policy: "info",
  operational: "default",
};

/**
 * 🛑 Format by the descriptor's UNIT, never by guessing from the value.
 *
 * `2` is 2% as a commission, ₹2 as a floor and 2 days as a hold, and the three
 * are side by side in one table. A bare number would make the COD ceiling and
 * the COD percentage read as the same kind of thing.
 */
function formatRate(value: number | null, unit: RateUnit): string {
  if (value === null) return "—";
  switch (unit) {
    case "percent":
      return `${value}%`;
    case "rupees":
      return `₹${value.toLocaleString("en-IN")}`;
    case "days":
      return value === 1 ? "1 day" : `${value} days`;
    case "minutes":
      return value === 1 ? "1 minute" : `${value} minutes`;
    case "count":
      return String(value);
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export interface AdminPricingViewProps {
  /**
   * The rate endpoint, supplied by the consumer.
   *
   * 🛑 REQUIRED, with no default. appkit cannot import `API_ROUTES` (that is
   * consumer-side), so a default would be a path literal living in the
   * library — a second place the route is written, and the one nobody updates
   * when it moves. `audit-hardcoded-api-routes` blocks it, correctly.
   */
  endpoint: string;
}

export function AdminPricingView({ endpoint }: AdminPricingViewProps) {
  const { showToast } = useToast();
  const [rates, setRates] = useState<RateRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await apiClient.get<{ rates?: RateRow[] }>(endpoint);
      setRates(payload?.rates ?? []);
    } catch (err) {
      /*
       * Surfaced, never swallowed into an empty table. An empty rate list and
       * a failed read look identical, and the first reads as "we charge
       * nothing" (Root Cause #59/#72 — undefined must never render as zero).
       *
       * 🛑 A FIXED string, never `normalized.message`. The server's own text
       * is how a Node `MODULE_NOT_FOUND` with a require stack ended up inside
       * "Place your bid" (Root Cause #86) — and `mapToHttpError` scrubs 5xx
       * messages in production anyway, so the raw value is either useless or
       * dangerous. `normalizeError` still runs: it is what keeps `unknown`
       * out of the catch body.
       */
      void normalizeError(err);
      setLoadError("Could not load the rate table. Try again.");
      setRates([]);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const byTier = useMemo(() => {
    const groups = new Map<RateTier, RateRow[]>();
    for (const tier of RATE_TIER_ORDER) groups.set(tier, []);
    for (const rate of rates ?? []) groups.get(rate.tier)?.push(rate);
    return groups;
  }, [rates]);

  const openEditor = useCallback((rate: RateRow) => {
    setEditing(rate);
    setDraftValue(rate.value === null ? "" : String(rate.value));
    setDraftReason("");
  }, []);

  const submit = useCallback(
    async (setFieldError: (field: string, message: string) => void) => {
      if (!editing) return;
      const parsed = Number(draftValue);
      if (!Number.isFinite(parsed)) {
        setFieldError("newValue", "Enter a number.");
        return;
      }
      setSaving(true);
      try {
        await apiClient.post(endpoint, {
          path: editing.path,
          newValue: parsed,
          ...(draftReason.trim() ? { reason: draftReason.trim() } : {}),
        });
        showToast(`${editing.label} updated.`, "success");
        setEditing(null);
        await load();
      } catch (err) {
        void normalizeError(err);
        /*
         * 🛑 `toUserMessage`, never the server's own message — and no
         * `?? normalized.message` fallback either. That fallback IS the bug:
         * `toUserMessage` already terminates at `errors.codes.UNKNOWN`, so
         * adding a raw-text branch for the unmapped case reintroduces exactly
         * what Root Cause #86 describes — a require stack rendered inside a
         * modal. The first draft of this file had it.
         */
        const code = (err as { code?: string } | null)?.code;
        setFieldError("newValue", toUserMessage(code ?? "UNKNOWN"));
      } finally {
        setSaving(false);
      }
    },
    [draftReason, draftValue, editing, endpoint, load, showToast],
  );

  return (
    <Stack gap="loose">
      <Stack gap="dense">
        <Heading level={1}>Pricing</Heading>
        <Text color="muted">
          Every rate the platform charges, what kind of number it is, and when it last moved.
          Changes take effect from the moment they are saved and never restate past orders.
        </Text>
      </Stack>

      {loadError ? (
        <Stack surface="danger-surface" padding="md" rounded="lg" gap="dense">
          <Text weight="semibold">The rate table could not be loaded.</Text>
          <Text size="sm">{loadError}</Text>
          <Row>
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </Row>
        </Stack>
      ) : null}

      {RATE_TIER_ORDER.map((tier) => {
        const rows = byTier.get(tier) ?? [];
        /*
         * The statutory section renders with NO rows and that is the point —
         * it tells a reader the tier exists and where it is set. Hiding an
         * empty section would make statutory rates look like something this
         * platform does not have.
         */
        if (rows.length === 0 && tier !== "statutory") return null;

        return (
          <Stack key={tier} gap="comfortable">
            <Stack gap="dense">
              <Row gap="dense" align="center">
                <Heading level={2}>{TIER_LABEL[tier]}</Heading>
                <Badge variant={TIER_TONE[tier]}>{rows.length || "set elsewhere"}</Badge>
              </Row>
              <Text size="sm" color="muted">
                {TIER_BLURB[tier]}
              </Text>
            </Stack>

            {rows.map((rate) => (
              <Row
                key={rate.path}
                surface="card"
                padding="card"
                rounded="lg"
                gap="comfortable"
                align="start"
                justify="between"
              >
                <Stack gap="dense">
                  <Row gap="dense" align="center">
                    <Text weight="semibold">{rate.label}</Text>
                    {rate.sellerOnly ? <Badge variant="default">Seller-facing</Badge> : null}
                  </Row>
                  <Text size="sm" color="muted">
                    {rate.description}
                  </Text>
                  {rate.lastChange ? (
                    <Text size="xs" color="muted">
                      {formatRate(rate.lastChange.previousValue, rate.unit)} →{" "}
                      {formatRate(rate.lastChange.newValue, rate.unit)} on{" "}
                      {formatWhen(rate.lastChange.effectiveFrom)}
                      {rate.lastChange.changedByName ? ` by ${rate.lastChange.changedByName}` : ""}
                      {rate.lastChange.reason ? ` — ${rate.lastChange.reason}` : ""}
                    </Text>
                  ) : (
                    <Text size="xs" color="muted">
                      No recorded change — this is the value it was configured with.
                    </Text>
                  )}
                </Stack>
                <Row gap="comfortable" align="center">
                  <Text weight="bold" numeric>
                    {formatRate(rate.value, rate.unit)}
                  </Text>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!rate.editable}
                    onClick={() => openEditor(rate)}
                  >
                    Change
                  </Button>
                </Row>
              </Row>
            ))}
          </Stack>
        );
      })}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Change ${editing.label}` : "Change rate"}
      >
        {editing ? (
          <Form onSubmit={(e) => e.preventDefault()}>
            {({ setFieldError, clearErrors }) => (
              <Stack gap="comfortable">
                <FormErrorSummary />
                <Text size="sm" color="muted">
                  {editing.description}
                </Text>
                <FieldInput
                  name="newValue"
                  label={`New value (${editing.unit})`}
                  required
                  value={draftValue}
                  onChange={setDraftValue}
                />
                <FieldTextarea
                  name="reason"
                  label={
                    editing.tier === "policy" ? "Reason (required)" : "Reason (optional)"
                  }
                  value={draftReason}
                  onChange={setDraftReason}
                />
                <Text size="xs" color="muted">
                  This takes effect now. Orders, invoices and payouts already recorded keep the
                  rate they were charged at — nothing is restated.
                </Text>
                <Row gap="dense" justify="end">
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button
                    action={ACTIONS.ADMIN["update-pricing"]}
                    isLoading={saving}
                    onClick={() => {
                      clearErrors();
                      void submit(setFieldError);
                    }}
                  />
                </Row>
              </Stack>
            )}
          </Form>
        ) : null}
      </Modal>
    </Stack>
  );
}
