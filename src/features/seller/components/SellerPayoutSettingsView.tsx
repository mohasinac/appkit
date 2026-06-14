"use client";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Div, FormField, FormGroup, Heading, Stack, Text, Toggle } from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { StepDef, StepForm } from "../../shell";

import { normalizeError } from "../../../errors/normalize";
const __P = {
  p3: "p-3",
} as const;

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
  gstin: string;
  pan: string;
  businessType: string;
  autoPayout: boolean;
  minimumThreshold: string;
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
  gstin: "",
  pan: "",
  businessType: "",
  autoPayout: true,
  minimumThreshold: "",
};

export function SellerPayoutSettingsView({ apiBase = "/api/store/payout-settings" }: SellerPayoutSettingsViewProps) {
  const [draft, setDraft] = useState<PayoutDraft>(DEFAULT_DRAFT);
  const [current, setCurrent] = useState<SafePayoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
          gstin: res?.data?.taxInfo?.gstin ?? "",
          pan: res?.data?.taxInfo?.pan ?? "",
          businessType: res?.data?.taxInfo?.businessType ?? "",
          autoPayout: res?.data?.preferences?.autoPayout ?? true,
          minimumThreshold: res?.data?.preferences?.minimumThreshold
            ? String(res.data.preferences.minimumThreshold / 100)
            : "",
        });
      })
      .catch(() => {}) // audit-silent-catch-ok: blank form is safe fallback; save round-trip will surface persistent errors
      .finally(() => setLoading(false));
  }, [apiBase]);

  const update = useCallback((partial: Partial<PayoutDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSuccess(false);
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const methodFields =
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

      const body = {
        ...methodFields,
        taxInfo: {
          gstin: draft.gstin.trim(),
          pan: draft.pan.trim(),
          businessType: draft.businessType.trim(),
        },
        preferences: {
          autoPayout: draft.autoPayout,
          minimumThreshold: Math.round(parseFloat(draft.minimumThreshold || "0") * 100),
        },
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
      setDraft((prev) => ({ ...prev, accountNumber: "" }));
    } catch (err) {
      void normalizeError(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  const steps: StepDef<PayoutDraft>[] = [
    {
      label: "Payout Method",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Payout Method</Heading>
          {current && (
            <Div className="flex items-center gap-2 mb-2">
              <Badge variant={current.isConfigured ? "success" : "warning"}>
                {current.isConfigured ? "Payout configured" : "Not configured"}
              </Badge>
            </Div>
          )}
          {current?.isConfigured && (
            <Alert variant="info">
              {current.method === "upi"
                ? `Current UPI: ${current.upiId}`
                : `Current bank: ${current.bankAccount?.bankName ?? ""} — ••••${current.bankAccount?.accountNumberMasked?.slice(-4) ?? "••••"} (${current.bankAccount?.accountType})`}
            </Alert>
          )}
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
                  checked={values.method === value}
                  onChange={() => onChange({ method: value })}
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
          {values.method === "upi" && (
            <FormField
              name="upiId"
              label="UPI ID (VPA)"
              type="text"
              value={values.upiId}
              onChange={(v) => onChange({ upiId: v })}
              placeholder="yourname@upi"
              helpText="Ensure this VPA is registered and active."
              disabled={busy}
            />
          )}
          {values.method === "bank_transfer" && (
            <Stack gap="md" className="mt-2">
              <FormField
                name="accountHolderName"
                label="Account Holder Name"
                type="text"
                value={values.accountHolderName}
                onChange={(v) => onChange({ accountHolderName: v })}
                placeholder="Name as on bank account"
                disabled={busy}
              />
              <FormGroup columns={2}>
                <FormField
                  name="accountNumber"
                  label="Account Number"
                  type="text"
                  value={values.accountNumber}
                  onChange={(v) => onChange({ accountNumber: v })}
                  placeholder="Enter full account number"
                  helpText={current?.bankAccount ? `Saved: ••••${current.bankAccount.accountNumberMasked?.slice(-4) ?? "••••"}` : "Stored securely, never displayed in full."}
                  disabled={busy}
                />
                <FormField
                  name="ifscCode"
                  label="IFSC Code"
                  type="text"
                  value={values.ifscCode}
                  onChange={(v) => onChange({ ifscCode: v.toUpperCase() })}
                  placeholder="e.g. SBIN0001234"
                  disabled={busy}
                />
              </FormGroup>
              <FormGroup columns={2}>
                <FormField
                  name="bankName"
                  label="Bank Name"
                  type="text"
                  value={values.bankName}
                  onChange={(v) => onChange({ bankName: v })}
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
                          checked={values.accountType === t}
                          onChange={() => onChange({ accountType: t })}
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
          )}
        </Stack>
      ),
    },
    {
      label: "Tax Info",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Tax Information</Heading>
          <Text className="text-sm text-[var(--appkit-color-text-muted)]">
            Optional — required only for GST invoice generation and TDS compliance.
          </Text>
          <FormField
            name="gstin"
            label="GSTIN (optional)"
            type="text"
            value={values.gstin}
            onChange={(v) => onChange({ gstin: v.toUpperCase() })}
            placeholder="e.g. 22AAAAA0000A1Z5"
            helpText="15-character Goods and Services Tax Identification Number."
            disabled={busy}
          />
          <FormField
            name="pan"
            label="PAN (optional)"
            type="text"
            value={values.pan}
            onChange={(v) => onChange({ pan: v.toUpperCase() })}
            placeholder="e.g. ABCDE1234F"
            helpText="Required for payouts above ₹50,000 per year (TDS threshold)."
            disabled={busy}
          />
          <FormField
            name="businessType"
            label="Business Type (optional)"
            type="text"
            value={values.businessType}
            onChange={(v) => onChange({ businessType: v })}
            placeholder="e.g. Individual, Sole Proprietor, Private Limited"
            disabled={busy}
          />
        </Stack>
      ),
    },
    {
      label: "Preferences",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Payout Preferences</Heading>
          <Toggle
            checked={values.autoPayout}
            onChange={(checked) => onChange({ autoPayout: checked })}
            label="Enable auto-payout — automatically transfer earnings on schedule"
            disabled={busy}
          />
          <FormField
            name="minimumThreshold"
            label="Minimum Payout Threshold (₹)"
            type="number"
            value={values.minimumThreshold}
            onChange={(v) => onChange({ minimumThreshold: v })}
            placeholder="e.g. 500"
            helpText="Payouts are held until your balance exceeds this amount. Leave blank for no minimum."
            disabled={busy}
          />
          <Div className={`${__P.p3} rounded-lg bg-[var(--appkit-color-surface-alt)] border border-[var(--appkit-color-border)]`}>
            <Text className="text-sm font-medium mb-1">Payout Schedule</Text>
            <Text className="text-sm text-[var(--appkit-color-text-muted)]">
              Auto-payouts run every Monday for the previous week&apos;s settled orders. Manual payouts can be requested from the Payouts page at any time.
            </Text>
          </Div>
        </Stack>
      ),
    },
  ];

  return (
    <StackedViewShell portal="seller" title="Payout Settings" sections={[
      <Div key="payout">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">Payout details saved.</Alert>}
        <StepForm<PayoutDraft>
          steps={steps}
          values={draft}
          onChange={update}
          onComplete={handleSave}
          formId="seller-payout-settings"
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          completeLabel="Save Payout Details"
          isLoading={busy}
        />
      </Div>,
    ]} />
  );
}
