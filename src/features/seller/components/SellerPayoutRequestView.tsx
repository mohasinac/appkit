"use client";
import { normalizeError } from "../../../errors/normalize";
import { useEffect, useState } from "react";
import { Alert } from "../../../ui/components/Alert";
import { Badge } from "../../../ui/components/Badge";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Modal } from "../../../ui/components/Modal";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Textarea } from "../../../ui/components/Textarea";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { formatCurrency } from "../../../utils/number.formatter";
const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
} as const;

interface PayoutSummary {
  availableEarnings: number;
  hasPendingPayout: boolean;
  eligibleOrderCount: number;
}

interface PayoutDetails {
  method: "upi" | "bank_transfer";
  upiId?: string;
  bankAccount?: { accountNumberMasked?: string; bankName?: string };
  isConfigured: boolean;
}

export interface SellerPayoutRequestViewProps {
  payoutsApiBase?: string;
  payoutSettingsApiBase?: string;
  requestApiBase?: string;
  onRequested?: () => void;
}

/*
 * 🛑 A LOCAL `rupees()` HELPER WAS DELETED HERE in favour of the one formatter.
 *
 * It set `minimumFractionDigits: 2` and no MAXIMUM, so a value carrying more
 * than two decimals printed every one of them — and payout amounts are
 * commission arithmetic, which is exactly where they come from. A seller's
 * available earnings could read "₹17,500.333".
 *
 * `formatCurrency` goes through `Intl.NumberFormat` with `style: "currency"`,
 * which pins the fraction digits to the currency's own minor-unit count (2
 * for INR) in both directions, and takes the symbol from the locale rather
 * than hardcoding one.
 */

export function SellerPayoutRequestView({
  payoutsApiBase = SELLER_ENDPOINTS.PAYOUTS,
  payoutSettingsApiBase = SELLER_ENDPOINTS.PAYOUT_SETTINGS,
  requestApiBase = SELLER_ENDPOINTS.PAYOUT_REQUEST,
  onRequested,
}: SellerPayoutRequestViewProps) {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(payoutsApiBase).then((r) => r.json()),
      fetch(payoutSettingsApiBase).then((r) => r.json()),
    ])
      .then(([payoutsJson, settingsJson]) => {
        setSummary(payoutsJson?.data?.summary ?? null);
        setPayoutDetails(settingsJson?.data?.payoutDetails ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [payoutsApiBase, payoutSettingsApiBase]);

  const handleRequest = async () => {
    if (!payoutDetails?.method) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(requestApiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: payoutDetails.method, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to submit request");
      setSubmitted(true);
      setModalOpen(false);
      setNotes("");
      onRequested?.();
    } catch (err) {
      void normalizeError(err);
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!summary) return null;

  const canRequest = !summary.hasPendingPayout && summary.availableEarnings > 0 && payoutDetails?.isConfigured;

  return (
    <>
      <Div className={`${__P.p4} border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]`} rounded="lg">
        <Row align="center" justify="between" gap="3" wrap>
          <Div>
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">Available for Payout</Text>
            <Text className="text-[var(--appkit-color-primary)]" size="2xl" weight="bold">
              {formatCurrency(summary.availableEarnings)}
            </Text>
            <Text className="text-[var(--appkit-color-text-muted)] mt-0.5" size="xs">
              {summary.eligibleOrderCount} eligible order{summary.eligibleOrderCount !== 1 ? "s" : ""}
            </Text>
          </Div>
          <Row align="center" gap="sm" wrap>
            {summary.hasPendingPayout && <Badge variant="warning">Payout in progress</Badge>}
            {submitted && <Badge variant="success">Payout requested!</Badge>}
            {!payoutDetails?.isConfigured && (
              <Text className="text-[var(--appkit-color-warning)]" size="sm">
                Set up payout details first
              </Text>
            )}
            <Button
              variant="primary"
              onClick={() => setModalOpen(true)}
              disabled={!canRequest}
            >
              Request Payout
            </Button>
          </Row>
        </Row>
      </Div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSubmitError(null); }}
        title="Request Payout"
      >
        <Stack gap="md" className={`${__P.p4}`}>
          <Div className={`${__P.p3} bg-[var(--appkit-color-bg)]`} rounded="default">
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">Amount to be paid</Text>
            <Text size="xl" weight="bold">{formatCurrency(summary?.availableEarnings ?? 0)}</Text>
            <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
              Via {payoutDetails?.method === "upi"
                ? `UPI — ${payoutDetails.upiId}`
                : `Bank — ${payoutDetails?.bankAccount?.bankName ?? ""} ••••${payoutDetails?.bankAccount?.accountNumberMasked?.slice(-4) ?? "••••"}`}
            </Text>
          </Div>

          {submitError && <Alert variant="error">{submitError}</Alert>}

          <Div>
            <Textarea
              label="Notes (optional)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="Any notes for the payout request…"
            />
          </Div>

          <Row justify="end" gap="sm">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleRequest} disabled={submitting} isLoading={submitting}>
              Confirm Request
            </Button>
          </Row>
        </Stack>
      </Modal>
    </>
  );
}
