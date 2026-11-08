"use client";
/**
 * THE SELLER'S SHIPPING OFFER — the dashboard surface for the owner's
 * 2026-11-08 ruling.
 *
 * *"A seller agrees from their dashboard for the shipping option. If they
 * select custom — i.e. their own — then they must set a per-order fee. But if
 * they are okay with our shipping providers' quotes then they must accept that
 * as well. Both can be enabled."*
 *
 * Drawn from `mocks/18-shipping-fees.qm` — two toggles, a required per-order
 * fee under the custom one, an optional free-above threshold, a buyer-facing
 * label, and a commitment table saying what each choice obliges the seller to.
 *
 * ## 🛑 This writes `StoreDocument.shippingPricing`, the field checkout READS
 *
 * The neighbouring `SellerShippingView` writes `sellerProfiles.shippingConfig`
 * — the legacy flat number `mode.ts` calls an accident. Measured 2026-11-08:
 * `shippingPricing` had two readers on the money path and **zero writers**
 * anywhere, so the authoritative config had no surface at all. This is it.
 *
 * ## 🛑 The client validates, and the SERVER refuses
 *
 * The local checks below exist to put the message under the right input before
 * a round trip. They are not the gate: `validateSellerShippingOffer` runs
 * server-side in `PATCH /api/store/shipping-offer` and answers 422 with the
 * reason, because a form is not a place to enforce a money rule.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Div,
  FormField,
  Heading,
  Row,
  Stack,
  Text,
  Toggle,
} from "../../../ui";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/** Matches `SellerShippingOffer`, as the form holds it (strings for inputs). */
interface OfferDraft {
  platformQuotesAccepted: boolean;
  customEnabled: boolean;
  customFeePerOrder: string;
  customFreeAbove: string;
  customLabel: string;
}

const EMPTY_DRAFT: OfferDraft = {
  platformQuotesAccepted: false,
  customEnabled: true,
  customFeePerOrder: "",
  customFreeAbove: "",
  customLabel: "",
};

export interface SellerShippingOfferViewProps {
  /** `/api/store/shipping-offer`. Injected so the host owns its own routes. */
  apiBase: string;
}

/**
 * `""` → `null`, a number → itself.
 *
 * 🛑 `null`, never `0`. The whole point of the save-time refusal is that a
 * blank fee is an unfinished form and `0` is a deliberate offer of free
 * shipping — coercing the first into the second is exactly what the server
 * refuses to do, so the client must not do it either on the way there.
 */
function toNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function SellerShippingOfferView({ apiBase }: SellerShippingOfferViewProps) {
  const [draft, setDraft] = useState<OfferDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(apiBase)
      .then((r) => r.json())
      .then((res) => {
        if (!live) return;
        const o = res?.data?.offer;
        if (!o) return;
        setDraft({
          platformQuotesAccepted: o.platformQuotesAccepted === true,
          customEnabled: o.customEnabled === true,
          customFeePerOrder: o.customFeePerOrder == null ? "" : String(o.customFeePerOrder),
          customFreeAbove: o.customFreeAbove == null ? "" : String(o.customFreeAbove),
          customLabel: o.customLabel ?? "",
        });
      })
      .catch((err: unknown) => {
        void normalizeError(err);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [apiBase]);

  const update = useCallback((partial: Partial<OfferDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSuccess(false);
    setFieldError({});
  }, []);

  const handleSave = async () => {
    setError(null);
    setFieldError({});
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformQuotesAccepted: draft.platformQuotesAccepted,
          customEnabled: draft.customEnabled,
          customFeePerOrder: draft.customEnabled
            ? toNullableNumber(draft.customFeePerOrder)
            : null,
          customFreeAbove: toNullableNumber(draft.customFreeAbove),
          customLabel: draft.customLabel.trim() === "" ? null : draft.customLabel.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        /*
         * The server's refusal reason arrives as `issues`, already pointed at
         * the field that caused it — so "set your per-order fee" lands under
         * the fee input rather than in a banner above four controls.
         */
        const issues = json?.issues as { path: (string | number)[]; message: string }[] | undefined;
        if (Array.isArray(issues)) {
          const next: Record<string, string> = {};
          for (const i of issues) next[String(i.path[0])] = i.message;
          setFieldError(next);
        }
        setError(
          toUserMessage(json?.code, json?.message, {
            fallback: "We couldn't save your shipping options.",
          }),
        );
        return;
      }
      setSuccess(true);
    } catch (err) {
      void normalizeError(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;
  const noMethod = !draft.platformQuotesAccepted && !draft.customEnabled;
  const customNeedsFee =
    draft.customEnabled && toNullableNumber(draft.customFeePerOrder) === null;

  /** What each combination obliges the seller to — the mock's right-hand panel. */
  const commitment = noMethod
    ? "You cannot publish a listing that ships until you enable a method."
    : draft.platformQuotesAccepted && draft.customEnabled
      ? "Whatever the BUYER picks. If they choose your own shipping, you must fulfil it yourself — we have already taken their money against that method."
      : draft.customEnabled
        ? "You ship it yourself, at your price, on every order."
        : "You buy the label we quote. Its cost comes off your payout.";

  return (
    <StackedViewShell
      portal="seller"
      title="Shipping options"
      sections={[
        <Div key="offer">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              Shipping options saved.
            </Alert>
          )}

          <Stack gap="lg">
            <Stack gap="sm">
              <Heading level={3}>At least one method, and your own needs a price</Heading>
              <Text size="sm" className="text-[var(--appkit-color-text-muted)]">
                A seller who offers neither cannot publish a listing that ships. Both can be
                enabled — then the buyer chooses, and what they choose is what you owe.
              </Text>
            </Stack>

            <Stack gap="md">
              <Row align="center" gap="sm">
                <Toggle
                  checked={draft.platformQuotesAccepted}
                  onChange={(checked: boolean) => update({ platformQuotesAccepted: checked })}
                  disabled={busy}
                  label="Accept platform carrier quotes"
                />
              </Row>
              <Text size="sm" className="text-[var(--appkit-color-text-muted)] pl-1">
                Buyers see live rates from our carrier integrations. You buy the label here; its
                cost comes off your payout.
              </Text>

              <Row align="center" gap="sm" className="mt-4">
                <Toggle
                  checked={draft.customEnabled}
                  onChange={(checked: boolean) => update({ customEnabled: checked })}
                  disabled={busy}
                  label="Offer my own shipping"
                />
              </Row>

              {draft.customEnabled && (
                <Stack gap="md" className="pl-1">
                  <FormField
                    name="customFeePerOrder"
                    label="Per-order fee (₹) *"
                    type="number"
                    value={draft.customFeePerOrder}
                    onChange={(v: string) => update({ customFeePerOrder: v })}
                    placeholder="200"
                    error={fieldError.customFeePerOrder}
                    helpText="Required. Enter 0 if you ship free — leaving it blank is not the same thing, and will be refused."
                    disabled={busy}
                  />
                  <FormField
                    name="customFreeAbove"
                    label="Free above (₹, optional)"
                    type="number"
                    value={draft.customFreeAbove}
                    onChange={(v: string) => update({ customFreeAbove: v })}
                    placeholder="2500"
                    error={fieldError.customFreeAbove}
                    helpText="Order value at or above which your own shipping is free. Leave blank to disable."
                    disabled={busy}
                  />
                  <FormField
                    name="customLabel"
                    label="Label shown to buyers"
                    type="text"
                    value={draft.customLabel}
                    onChange={(v: string) => update({ customLabel: v })}
                    placeholder="e.g. BeyIndia courier (we pack and ship ourselves)"
                    disabled={busy}
                  />
                  <Text size="sm" className="text-[var(--appkit-color-text-muted)]">
                    PER ORDER, not per item. A per-item custom fee is how a four-item order
                    quietly becomes ₹800 — you are quoting one parcel, not four.
                  </Text>
                </Stack>
              )}
            </Stack>

            <Div className="rounded-md border border-[var(--appkit-color-border)] p-4">
              <Row align="center" gap="sm" className="mb-2">
                <Badge variant={noMethod || customNeedsFee ? "warning" : "success"}>
                  {noMethod
                    ? "No method enabled"
                    : customNeedsFee
                      ? "Fee required"
                      : "What you owe"}
                </Badge>
              </Row>
              <Text size="sm">{commitment}</Text>
              <Text size="sm" className="text-[var(--appkit-color-text-muted)] mt-2">
                If you override the buyer&apos;s choice: refund the excess if yours was cheaper,
                and absorb the difference if it cost more. The buyer is never re-billed after
                payment.
              </Text>
            </Div>

            <Row gap="sm">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="rounded-md border border-[var(--appkit-color-border)] px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save shipping options"}
              </button>
            </Row>
          </Stack>
        </Div>,
      ]}
    />
  );
}
