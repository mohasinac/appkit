"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Div,
  FormField,
  FormGroup,
  Heading,
  Stack,
  Text,
} from "../../../ui";
import { StackedViewShell } from "../../../ui";

type PayoutMethod = "upi" | "bank_transfer";
type AccountType = "savings" | "current";

interface PayoutDraft {
  method: PayoutMethod;
  upiId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: AccountType;
}

interface SafePayoutDetails {
  method: PayoutMethod;
  upiId?: string;
  bankAccount?: {
    accountHolderName: string;
    accountNumberMasked: string;
    ifscCode: string;
    bankName: string;
    accountType: AccountType;
  };
  isConfigured: boolean;
}

export interface SellerPayoutSettingsViewProps {
  apiBase?: string;
}

const DEFAULT_DRAFT: PayoutDraft = {
  method: "upi",
  upiId: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  accountType: "savings",
};

export function SellerPayoutSettingsView({ apiBase = "/api/store/payout-settings" }: SellerPayoutSettingsViewProps) {
  const [draft, setDraft] = useState<PayoutDraft>(DEFAULT_DRAFT);
  const [current, setCurrent] = useState<SafePayoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((res) => {
        const details: SafePayoutDetails = res?.data?.payoutDetails ?? { method: "upi", isConfigured: false };
        setCurrent(details);
        setDraft({
          method: details.method,
          upiId: details.upiId ?? "",
          accountHolderName: details.bankAccount?.accountHolderName ?? "",
          accountNumber: "",
          ifscCode: details.bankAccount?.ifscCode ?? "",
          bankName: details.bankAccount?.bankName ?? "",
          accountType: details.bankAccount?.accountType ?? "savings",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  const update = useCallback(<K extends keyof PayoutDraft>(key: K, value: PayoutDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const body =
        draft.method === "upi"
          ? { method: "upi" as const, upiId: draft.upiId.trim() }
          : {
              method: "bank_transfer" as const,
              accountHolderName: draft.accountHolderName.trim(),
              accountNumber: draft.accountNumber.trim(),
              ifscCode: draft.ifscCode.trim().toUpperCase(),
              bankName: draft.bankName.trim(),
              accountType: draft.accountType,
            };

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      setSuccess(true);
      const updated: SafePayoutDetails = json?.data?.payoutDetails ?? { method: draft.method, isConfigured: false };
      setCurrent(updated);
      // clear sensitive field
      setDraft((prev) => ({ ...prev, accountNumber: "" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isUpi = draft.method === "upi";
  const busy = loading || saving;

  return (
    <StackedViewShell portal="seller" title="Payout Settings" sections={[
      <Stack key="payout" gap="lg">
        {/* Status */}
        {current && (
          <Div className="flex items-center gap-2">
            <Badge variant={current.isConfigured ? "success" : "warning"}>
              {current.isConfigured ? "Payout configured" : "Not configured"}
            </Badge>
          </Div>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Payout details saved.</Alert>}

        {/* Current masked info */}
        {current?.isConfigured && (
          <Alert variant="info">
            {current.method === "upi"
              ? `Current UPI: ${current.upiId}`
              : `Current bank: ${current.bankAccount?.bankName ?? ""} — ••••${current.bankAccount?.accountNumberMasked?.slice(-4) ?? "••••"} (${current.bankAccount?.accountType})`}
          </Alert>
        )}

        {/* Method selector */}
        <section>
          <Heading level={3} className="mb-3">Payout Method</Heading>
          <Stack gap="sm">
            {([
              { value: "upi" as const, label: "UPI", desc: "Instant payouts via UPI VPA (e.g. name@upi)." },
              { value: "bank_transfer" as const, label: "Bank Transfer", desc: "NEFT/RTGS to your bank account within 2–3 business days." },
            ]).map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--appkit-color-border)] cursor-pointer has-[:checked]:border-[var(--appkit-color-primary)] has-[:checked]:bg-[var(--appkit-color-primary)]/5"
              >
                <input
                  type="radio"
                  name="payoutMethod"
                  value={value}
                  checked={draft.method === value}
                  onChange={() => update("method", value)}
                  className="accent-[var(--appkit-color-primary)]"
                  disabled={busy}
                />
                <Div>
                  <Text className="font-medium">{label}</Text>
                  <Text className="text-sm text-[var(--appkit-color-text-muted)]">{desc}</Text>
                </Div>
              </label>
            ))}
          </Stack>
        </section>

        {/* UPI fields */}
        {isUpi && (
          <section>
            <Heading level={3} className="mb-3">UPI Details</Heading>
            <FormField
              name="upiId"
              label="UPI ID (VPA)"
              type="text"
              value={draft.upiId}
              onChange={(v) => update("upiId", v)}
              placeholder="yourname@upi"
              helpText="Ensure this VPA is registered and active."
              disabled={busy}
            />
          </section>
        )}

        {/* Bank fields */}
        {!isUpi && (
          <section>
            <Heading level={3} className="mb-3">Bank Account Details</Heading>
            <Stack gap="md">
              <FormField
                name="accountHolderName"
                label="Account Holder Name"
                type="text"
                value={draft.accountHolderName}
                onChange={(v) => update("accountHolderName", v)}
                placeholder="Name as on bank account"
                disabled={busy}
              />
              <FormGroup columns={2}>
                <FormField
                  name="accountNumber"
                  label="Account Number"
                  type="text"
                  value={draft.accountNumber}
                  onChange={(v) => update("accountNumber", v)}
                  placeholder="Enter full account number"
                  helpText={current?.bankAccount ? `Saved: ••••${current.bankAccount.accountNumberMasked?.slice(-4) ?? "••••"}` : "Stored securely, never displayed in full."}
                  disabled={busy}
                />
                <FormField
                  name="ifscCode"
                  label="IFSC Code"
                  type="text"
                  value={draft.ifscCode}
                  onChange={(v) => update("ifscCode", v.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  disabled={busy}
                />
              </FormGroup>
              <FormGroup columns={2}>
                <FormField
                  name="bankName"
                  label="Bank Name"
                  type="text"
                  value={draft.bankName}
                  onChange={(v) => update("bankName", v)}
                  placeholder="e.g. State Bank of India"
                  disabled={busy}
                />
                <Div>
                  <Text className="text-sm font-medium mb-1.5">Account Type</Text>
                  <Stack gap="xs" className="flex-row">
                    {(["savings", "current"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="accountType"
                          value={t}
                          checked={draft.accountType === t}
                          onChange={() => update("accountType", t)}
                          className="accent-[var(--appkit-color-primary)]"
                          disabled={busy}
                        />
                        <Text className="capitalize text-sm">{t}</Text>
                      </label>
                    ))}
                  </Stack>
                </Div>
              </FormGroup>
            </Stack>
          </section>
        )}

        {/* Save */}
        <Div className="flex justify-end pt-2 border-t border-[var(--appkit-color-border)]">
          <Button variant="primary" onClick={handleSave} disabled={busy} isLoading={saving}>
            Save Payout Details
          </Button>
        </Div>
      </Stack>,
    ]} />
  );
}
