"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, Badge, Checkbox, Div, FormField, FormGroup, Heading, Label, Row, Stack, Text, Toggle } from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { FormShellContext, useFormShellState, applyZodIssues, FormErrorSummary } from "../../../ui/forms";
import { SectionDef, SectionForm, useSectionFormNav } from "../../shell";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

import { normalizeError } from "../../../errors/normalize";
const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

// No accountNumber format check here on purpose — the UI supports "leave
// blank to keep the existing saved account number" on re-save (see the
// accountNumber field's helpText below), and the exact keep-existing
// semantics live server-side; a client-side format requirement risks
// blocking that legitimate blank-resave case.
const payoutSettingsDraftSchema = z.object({
  method: z.enum(["upi", "bank_transfer"]),
  upiId: z.string(),
  accountHolderName: z.string(),
  accountNumber: z.string(),
  ifscCode: z.string(),
  bankName: z.string(),
  accountType: z.enum(["savings", "current"]),
  gstin: z.string(),
  pan: z.string(),
  businessType: z.string(),
  autoPayout: z.boolean(),
  minimumThreshold: z.string(),
  emiEnabled: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.method === "upi") {
    if (!v.upiId.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["upiId"], message: "UPI ID is required" });
    } else if (!/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v.upiId.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["upiId"], message: "Please enter a valid UPI ID" });
    }
  } else {
    if (!v.accountHolderName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountHolderName"], message: "Account holder name is required" });
    }
    if (v.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.ifscCode.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ifscCode"], message: "Invalid IFSC code" });
    }
    if (!v.bankName.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankName"], message: "Bank name is required" });
    }
  }
});

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
  emiEnabled: boolean;
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
  emiEnabled: false,
};

export function SellerPayoutSettingsView({ apiBase = SELLER_ENDPOINTS.PAYOUT_SETTINGS }: SellerPayoutSettingsViewProps) {
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
          gstin: res?.data?.taxInfo?.gstin ?? "",
          pan: res?.data?.taxInfo?.pan ?? "",
          businessType: res?.data?.taxInfo?.businessType ?? "",
          autoPayout: res?.data?.preferences?.autoPayout ?? true,
          minimumThreshold: res?.data?.preferences?.minimumThreshold
            ? String(res.data.preferences.minimumThreshold)
            : "",
          emiEnabled: res?.data?.emiEnabled ?? false,
        });
      })
      .catch(console.error)
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
        emiEnabled: draft.emiEnabled,
        taxInfo: {
          gstin: draft.gstin.trim(),
          pan: draft.pan.trim(),
          businessType: draft.businessType.trim(),
        },
        preferences: {
          autoPayout: draft.autoPayout,
          minimumThreshold: Math.round(parseFloat(draft.minimumThreshold || "0") * 100) / 100,
        },
      };

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        if (Array.isArray(json?.issues) && json.issues.length > 0) {
          applyZodIssues(
            json.issues as { path: (string | number)[]; message: string }[],
            setFieldError,
          );
        }
        setError(json?.error ?? "Failed to save");
        return;
      }
      clearErrors();
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

  // Payout Method is the only section that must be filled for the record to be
  // valid — the schema's superRefine rejects an empty UPI ID or bank name and
  // nothing else. Tax Info is explicitly optional, and Preferences all have
  // working defaults. So it is the required-first section, and the other two
  // start collapsed.
  const sections: SectionDef<PayoutDraft>[] = useMemo(() => [
    {
      id: "method",
      label: "Payout Method",
      required: true,
      quick: true,
      fields: ["method", "upiId", "accountHolderName", "accountNumber", "ifscCode", "bankName", "accountType"],
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Payout Method</Heading>
          {current && (
            <Row className="mb-2" align="center" gap="sm">
              <Badge variant={current.isConfigured ? "success" : "warning"}>
                {current.isConfigured ? "Payout configured" : "Not configured"}
              </Badge>
            </Row>
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
                className="flex items-center gap-[var(--appkit-space-3)] p-[var(--appkit-space-3)] rounded-lg border border-[var(--appkit-color-border)] cursor-pointer has-[:checked]:border-[var(--appkit-color-primary)] has-[:checked]:bg-[var(--appkit-color-primary)]/5"
              >
                <Checkbox
                  bare
                  type="radio"
                  name="payoutMethod"
                  value={value}
                  checked={values.method === value}
                  onChange={() => onChange({ method: value })}
                  className="accent-[var(--appkit-color-primary)]"
                  disabled={busy}
                />
                <Div>
                  <Text weight="medium">{label}</Text>
                  <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{desc}</Text>
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
                  <Text className="mb-1.5" size="sm" weight="medium">Account Type</Text>
                  <Row gap="xs">
                    {(["savings", "current"] as const).map((t) => (
                      <Label layout="flex" gap="md" key={t} className="cursor-pointer">
                        <Checkbox
                          bare
                          type="radio"
                          name="accountType"
                          value={t}
                          checked={values.accountType === t}
                          onChange={() => onChange({ accountType: t })}
                          className="accent-[var(--appkit-color-primary)]"
                          disabled={busy}
                        />
                        <Text size="sm" transform="capitalize">{t}</Text>
                      </Label>
                    ))}
                  </Row>
                </Div>
              </FormGroup>
            </Stack>
          )}
        </Stack>
      ),
    },
    {
      id: "tax",
      label: "Tax Info",
      fields: ["gstin", "pan", "businessType"],
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Tax Information</Heading>
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
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
      id: "preferences",
      label: "Preferences",
      fields: ["autoPayout", "minimumThreshold", "emiEnabled"],
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
          <Div className={`${__P.p3} bg-[var(--appkit-color-surface-alt)] border border-[var(--appkit-color-border)]`} rounded="lg">
            <Text className="mb-1" size="sm" weight="medium">Payout Schedule</Text>
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
              Auto-payouts run every Monday for the previous week&apos;s settled orders. Manual payouts can be requested from the Payouts page at any time.
            </Text>
          </Div>
          <Toggle
            checked={values.emiEnabled}
            onChange={(checked) => onChange({ emiEnabled: checked })}
            label="Offer EMI financing on eligible orders"
            disabled={busy}
          />
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Only shown to buyers when platform-wide EMI is also enabled and their
            cart subtotal from your store exceeds the site&apos;s minimum order
            value. Orders on an EMI plan hold your payout until every installment
            is paid, unless you mark the item &quot;ship before EMI completes&quot;.
          </Text>
        </Stack>
      ),
    },
  ], [busy, current]);

  const { openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta } =
    useSectionFormNav(sections, draft);

  const { shellCtx, setFieldError, clearErrors, validate } = useFormShellState(
    payoutSettingsDraftSchema,
    { sections: sectionMeta, onGoToSection: goToSection, fieldToSectionIndex },
  );

  useEffect(() => {
    validate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, validate]);

  return (
    <StackedViewShell portal="seller" title="Payout Settings" sections={[
      <Div key="payout">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">Payout details saved.</Alert>}
        <FormShellContext.Provider value={shellCtx}>
          <FormErrorSummary />
          <SectionForm<PayoutDraft>
            sections={sections}
            values={draft}
            onChange={update}
            onSubmit={handleSave}
            schema={payoutSettingsDraftSchema}
            openIds={openIds}
            onOpenChange={setOpenIds}
            submitLabel="Save Payout Details"
            isLoading={busy}
          />
        </FormShellContext.Provider>
      </Div>,
    ]} />
  );
}
