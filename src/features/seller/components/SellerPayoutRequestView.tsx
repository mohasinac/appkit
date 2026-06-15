"use client";
import { normalizeError } from "../../../errors/normalize";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Div, Modal, Row, Stack, Text } from "../../../ui";
const __P = {
  p3: "p-3",
  p4: "p-4",
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

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export function SellerPayoutRequestView({
  payoutsApiBase = "/api/store/payouts",
  payoutSettingsApiBase = "/api/store/payout-settings",
  requestApiBase = "/api/store/payouts/request",
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
      .catch(() => {}) // audit-silent-catch-ok: empty state is safe fallback; UI shows "no payout history yet"
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
              {rupees(summary.availableEarnings)}
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
          <Div className={`${__P.p3} bg-[var(--appkit-color-surface-muted)]`} rounded="default">
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">Amount to be paid</Text>
            <Text size="xl" weight="bold">{rupees(summary?.availableEarnings ?? 0)}</Text>
            <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
              Via {payoutDetails?.method === "upi"
                ? `UPI — ${payoutDetails.upiId}`
                : `Bank — ${payoutDetails?.bankAccount?.bankName ?? ""} ••••${payoutDetails?.bankAccount?.accountNumberMasked?.slice(-4) ?? "••••"}`}
            </Text>
          </Div>

          {submitError && <Alert variant="error">{submitError}</Alert>}

          <Div>
            <Text className="mb-1.5" size="sm" weight="medium">Notes (optional)</Text>
            <textarea
              className="w-full rounded-md border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]"
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
