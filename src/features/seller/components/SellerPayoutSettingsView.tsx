"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, Badge, Checkbox, Div, FormField, FormGroup, Heading, Label, Row, Span, Stack, Text, Toggle } from "../../../ui";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import { FormShellContext, useFormShellState, applyZodIssues, FormErrorSummary } from "../../../ui/forms";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import type { SectionDef } from "../../shell/SectionForm";
import { annotate } from "../../shell/field-ui-meta";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { getBrandName } from "../../../core/brand-resolver";
const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

// No accountNumber format check here on purpose — the UI supports "leave
// blank to keep the existing saved account number" on re-save (see the
// accountNumber field's helpText below), and the exact keep-existing
// semantics live server-side; a client-side format requirement risks
// blocking that legitimate blank-resave case.
/**
 * Section membership and row span live on the FIELD (W3).
 *
 * The `sections` array below still hand-writes this form's JSX, because its
 * Payout Method panel is genuinely bespoke — a configured/not-configured
 * badge, a "current UPI/bank" alert, and a UPI-vs-bank branch. What is NOT
 * hand-written any more is which field belongs where and how wide it is:
 * that is read off the schema, and `audit-form-field-roundtrip` (W4) can
 * cross-check the two so they cannot drift apart.
 *
 * 🛑 `annotate()` must be the OUTERMOST call on each field. It keys a WeakMap
 * by schema instance, and every zod wrapper returns a NEW instance — so
 * `annotate(z.string(), …).optional()` silently loses the metadata and the
 * field falls into the "advanced" fallback section. `audit-field-ui-meta`
 * blocks that ordering.
 */
const payoutSettingsDraftSchema = z.object({
  method: annotate(z.enum(["upi", "bank_transfer"]), {
    section: "method", sectionLabel: "Payout Method", sectionRequired: true,
    quick: true, order: 1, row: "pair",
  }),
  upiId: annotate(z.string(), { section: "method", quick: true, order: 2, row: "pair" }),
  accountHolderName: annotate(z.string(), { section: "method", quick: true, order: 3, row: "full" }),
  // Account number and IFSC read as one unit and each needs about half the
  // width — the pairing this whole mechanism exists to make declarative
  // instead of a bare `grid-cols-2` that is two columns wide at 320px.
  accountNumber: annotate(z.string(), { section: "method", quick: true, order: 4, row: "pair" }),
  ifscCode: annotate(z.string(), { section: "method", quick: true, order: 5, row: "pair" }),
  bankName: annotate(z.string(), { section: "method", quick: true, order: 6, row: "pair" }),
  accountType: annotate(z.enum(["savings", "current"]), { section: "method", quick: true, order: 7, row: "pair" }),

  // The three fields that identify the SUPPLIER OF RECORD on this store's
  // invoices. A seller with a GSTIN invoices under it; one without
  // invoices under {getBrandName()}'s (resolveSupplierIdentity).
  //
  // `pan` and `businessType` were removed 2026-10-19: neither exists on
  // StoreDocument or UserDocument and the route stripped them, so a
  // seller who entered a PAN was told it saved and it went nowhere.
  // An input that provably cannot persist is worse than no input.
  gstin: annotate(z.string(), { section: "tax", sectionLabel: "Tax Info", order: 1, row: "pair" }),
  legalName: annotate(z.string(), { section: "tax", order: 2, row: "pair" }),
  registeredAddress: annotate(z.string(), { section: "tax", order: 3, row: "full" }),

  autoPayout: annotate(z.boolean(), {
    section: "preferences", sectionLabel: "Preferences", order: 1, row: "quarter",
  }),
  minimumThreshold: annotate(z.string(), { section: "preferences", order: 2, row: "pair" }),
  emiEnabled: annotate(z.boolean(), { section: "preferences", order: 3, row: "quarter" }),
  /*
   * How the seller types prices. Lives in PAYOUT settings, not the store
   * profile, because payout is what it actually changes: at 5% a ₹999
   * inclusive listing pays out ₹951.43, while the same number typed ex-tax is
   * stored as ₹1,048.95 and pays out ₹999.00.
   *
   * 🛑 It does NOT re-price existing listings — the gross-up happens at write
   * time — so the label has to say so, or a seller flips it and assumes their
   * catalogue moved.
   */
  pricesIncludeGst: annotate(z.boolean(), { section: "preferences", order: 4, row: "quarter" }),
  /*
   * ── C5e, tier 2 of three ─────────────────────────────────────────────────
   *
   * Whether this seller agrees to be held to each buyer protection. Alongside
   * payout settings on purpose: supporting a cover means genuine claims are
   * charged back to this seller, so it is a payout consequence, not a profile
   * decoration.
   *
   * 🛑 Both default OFF and that is deliberate — see StoreDocument. The
   * copy below has to say what declining COSTS, because a buyer sees a risk
   * notice on every listing either way; a seller who does not know that will
   * read the default as neutral.
   */
  supportsShippingProtection: annotate(z.boolean(), { section: "preferences", order: 5, row: "quarter" }),
  supportsSaleProtection: annotate(z.boolean(), { section: "preferences", order: 6, row: "quarter" }),
  /*
   * Advanced listing types — pre-orders, prize draws, classifieds, digital
   * codes, live items, art and stickers. Everyone can already list
   * `standard`, `spares` and `auction`.
   *
   * 🛑 Alongside payout settings for the same reason the protections are:
   * each of these carries an obligation, not just a form. A pre-order takes
   * money for stock that does not exist yet, a prize draw is a regulated
   * promotion, a classified happens off-platform with no escrow, a
   * digital-code listing must be delivered from a pool the seller has to keep
   * stocked, and a live listing is an animal. A new seller should meet those
   * deliberately rather than by discovering a nav item.
   *
   * OFF by default, and the copy has to say what enabling ACCEPTS — the same
   * reason the protection toggles say what declining costs.
   */
  advancedListingTypesEnabled: annotate(z.boolean(), { section: "preferences", order: 7, row: "quarter" }),
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
  legalName: string;
  registeredAddress: string;
  autoPayout: boolean;
  minimumThreshold: string;
  emiEnabled: boolean;
  pricesIncludeGst: boolean;
  supportsShippingProtection: boolean;
  supportsSaleProtection: boolean;
  advancedListingTypesEnabled: boolean;
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
  legalName: "",
  registeredAddress: "",
  autoPayout: true,
  minimumThreshold: "",
  emiEnabled: false,
  // Inclusive is the documented default — see StoreDocument.pricesIncludeGst.
  pricesIncludeGst: true,
  // OFF by default — matches StoreDocument, and absence must read as declined.
  supportsShippingProtection: false,
  supportsSaleProtection: false,
  /*
   * OFF by default, which is also the direction the server gate fails. A
   * default of `true` here would be worse than cosmetic: this draft is what
   * gets PATCHed, so it would silently GRANT the capability on the next
   * unrelated save of this form.
   */
  advancedListingTypesEnabled: false,
};

/**
 * One radio group for a single-value field, with ONE error message.
 *
 * Extracted because the payout-method and account-type groups were the same
 * eleven lines twice, and because adding the error handling to both tipped
 * this view past `audit-code-quality`'s component-size threshold. The error
 * placement is the part worth sharing: `aria-invalid` goes on every radio so
 * assistive tech marks the whole group, but the message renders ONCE
 * underneath — the field is one value, so an `error` per radio would print
 * and announce the same sentence for every option.
 */
function RadioFieldGroup<V extends string>({
  name,
  value,
  options,
  error,
  disabled,
  onSelect,
  renderOption,
  layout: Layout,
}: {
  name: string;
  value: V;
  options: readonly V[];
  error?: string;
  disabled?: boolean;
  onSelect: (value: V) => void;
  renderOption: (value: V) => React.ReactNode;
  layout: typeof Stack | typeof Row;
}) {
  return (
    <>
      <Layout gap="sm">
        {options.map((option) => (
          <Label layout="flex" gap="md" key={option} className="cursor-pointer">
            <Checkbox
              bare
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onSelect(option)}
              className="accent-[var(--appkit-color-primary)]"
              disabled={disabled}
              aria-invalid={error ? "true" : undefined}
            />
            {renderOption(option)}
          </Label>
        ))}
      </Layout>
      {error && (
        <Text size="sm" variant="error" role="alert">
          {error}
        </Text>
      )}
    </>
  );
}

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
          /*
           * 🛑 Flat fields, NOT `res.data.taxInfo.*`.
           *
           * `taxInfo` is a key the route has never returned, so these three
           * inputs were ALWAYS blank on load no matter what had been saved —
           * and the save side posted a `taxInfo` object that the route's
           * `z.object()` schema silently stripped. A seller could type their
           * GSTIN, get a success toast, reload, and find it gone.
           *
           * The route now declares and persists `gstin` / `legalName` /
           * `registeredAddress` on the STORE, because the GSTIN decides who
           * is the supplier of record on that store's invoices.
           */
          gstin: res?.data?.gstin ?? "",
          legalName: res?.data?.legalName ?? "",
          registeredAddress: res?.data?.registeredAddress ?? "",
          autoPayout: res?.data?.preferences?.autoPayout ?? true,
          minimumThreshold: res?.data?.preferences?.minimumThreshold
            ? String(res.data.preferences.minimumThreshold)
            : "",
          emiEnabled: res?.data?.emiEnabled ?? false,
          // Absent means inclusive, matching the schema default exactly.
          pricesIncludeGst: res?.data?.pricesIncludeGst ?? true,
          supportsShippingProtection: res?.data?.supportsShippingProtection ?? false,
          supportsSaleProtection: res?.data?.supportsSaleProtection ?? false,
          // Absent means NOT entitled. Defaulting this to `true` would be a
          // silent GRANT on the next save, since this draft is what gets sent.
          advancedListingTypesEnabled: res?.data?.advancedListingTypesEnabled ?? false,
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
        pricesIncludeGst: draft.pricesIncludeGst,
        supportsShippingProtection: draft.supportsShippingProtection,
        supportsSaleProtection: draft.supportsSaleProtection,
        advancedListingTypesEnabled: draft.advancedListingTypesEnabled,
        // Flat, matching the route's schema. A nested `taxInfo` object was
        // stripped by `z.object()` and never reached Firestore.
        gstin: draft.gstin.trim(),
        legalName: draft.legalName.trim(),
        registeredAddress: draft.registeredAddress.trim(),
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
        /*
         * `json.error` is the SERVER's sentence — never shown to a user
         * (Rule #9.6). Resolve the stable `code` instead; `toUserMessage`
         * terminates in this fallback and can never return server text.
         *
         * Only a banner when the issues above attached nothing: if they did,
         * the fields now carry the detail and a banner repeating a vaguer
         * version of it is noise.
         */
        const attached =
          Array.isArray(json?.issues) &&
          json.issues.some((i: { path?: unknown[] }) => i?.path?.length);
        if (!attached) {
          setError(
            toUserMessage(json?.code, undefined, {
              fallback: "We couldn't save your payout settings.",
            }),
          );
        }
        return;
      }
      clearErrors();
      setSuccess(true);
      const updated: SafePayoutDetails = json?.data?.payoutDetails ?? { method: draft.method, isConfigured: false };
      setCurrent(updated);
      setDraft((prev) => ({ ...prev, accountNumber: "" }));
    } catch (err) {
      /*
       * `normalizeError` was already being called and its result DISCARDED,
       * then the raw `.message` shown anyway — a thrown value's message is
       * written for a developer, and this is the path a network failure or a
       * bundler fault takes (Root Cause #86 rendered a require stack this
       * way). Use the normalized code; the sentence is ours.
       */
      const normalized = normalizeError(err);
      setError(
        toUserMessage(normalized.code, undefined, {
          fallback: "We couldn't save your payout settings. Please try again.",
        }),
      );
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
      render: ({ values, onChange, errors }) => (
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
                  /*
                   * Marked invalid on each radio, but the message is rendered
                   * ONCE under the group — `method` is one field, so an
                   * `error` per radio would print and announce the same
                   * sentence for every option.
                   */
                  aria-invalid={errors.method ? "true" : undefined}
                />
                <Div>
                  <Text weight="medium">{label}</Text>
                  <Text className="text-[var(--appkit-color-text-muted)]" size="sm">{desc}</Text>
                </Div>
              </label>
            ))}
            {errors.method && (
              <Text size="sm" variant="error" role="alert">{errors.method}</Text>
            )}
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
                  <RadioFieldGroup
                    name="accountType"
                    value={values.accountType}
                    options={["savings", "current"] as const}
                    error={errors.accountType}
                    disabled={busy}
                    onSelect={(t) => onChange({ accountType: t })}
                    layout={Row}
                    renderOption={(t) => (
                      <Text size="sm" transform="capitalize">{t}</Text>
                    )}
                  />
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
      fields: ["gstin", "legalName", "registeredAddress"],
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Tax Information</Heading>
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Optional. Enter a GSTIN and your orders are invoiced under your own
            registration; leave it blank and they are invoiced under {getBrandName()}&apos;s.
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
            name="legalName"
            label="Registered legal name (optional)"
            type="text"
            value={values.legalName}
            onChange={(v) => onChange({ legalName: v })}
            placeholder="e.g. Arena Collectibles Pvt Ltd"
            helpText="The entity name that appears on the invoice. Leave blank to use your store name."
            disabled={busy}
          />
          <FormField
            name="registeredAddress"
            label="Registered address (optional)"
            type="text"
            value={values.registeredAddress}
            onChange={(v) => onChange({ registeredAddress: v })}
            placeholder="Address as registered against your GSTIN"
            helpText="Printed on invoices issued under your GSTIN."
            disabled={busy}
          />
          {/*
            PAN and Business Type were removed 2026-10-19. Neither had any
            storage — no field on StoreDocument or UserDocument — and the
            route's z.object() stripped the whole `taxInfo` object, so a
            seller who entered their PAN was shown a success toast and the
            value went nowhere. An input that provably cannot persist is
            worse than no input: it tells the seller we hold something we
            do not. Re-add either one WITH a schema field and a write path.
          */}
        </Stack>
      ),
    },
    {
      id: "preferences",
      label: "Preferences",
      fields: ["autoPayout", "minimumThreshold", "emiEnabled", "pricesIncludeGst", "supportsShippingProtection", "supportsSaleProtection", "advancedListingTypesEnabled"],
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
          <Div className={`${__P.p3} bg-[var(--appkit-color-bg)] border border-[var(--appkit-color-border)]`} rounded="lg">
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
          <Toggle
            checked={values.pricesIncludeGst}
            onChange={(checked) => onChange({ pricesIncludeGst: checked })}
            label="The prices I enter already include GST"
            disabled={busy}
          />
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Buyers always see a tax-inclusive price, so this only changes how
            your own entry is read. Leave it{" "}
            <Span weight="semibold">on</Span> and a ₹999 listing at 5% GST
            means the buyer pays ₹999 and you earn ₹951.43 — the ₹47.57 is GST
            we collect and remit for you. Turn it{" "}
            <Span weight="semibold">off</Span> and ₹999 is treated as your
            ex-GST price: the listing is shown at ₹1,048.95 and you earn ₹999.
          </Text>

          <Heading level={3} className="mb-2 mt-4">Buyer Protections</Heading>
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Two separate covers a buyer can pay for at checkout. Supporting one
            earns a safety badge on your listings;{" "}
            <Span weight="semibold">declining shows buyers a risk notice
            instead</Span> — there is no neutral option, because a buyer who is
            told nothing cannot tell a seller who declined from one who was
            never asked.
          </Text>
          <Toggle
            checked={values.supportsShippingProtection}
            onChange={(checked) => onChange({ supportsShippingProtection: checked })}
            label="Offer shipment protection — loss or damage in transit"
            disabled={busy}
          />
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            The parcel never arrived or arrived damaged. We pursue the courier,
            not you, and the buyer is refunded from the funds we hold — so a
            genuine transit loss costs you the item, not an argument.
          </Text>
          <Toggle
            checked={values.supportsSaleProtection}
            onChange={(checked) => onChange({ supportsSaleProtection: checked })}
            label="Offer sale protection — item not as described"
            disabled={busy}
          />
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            A no-questions-asked refund on the item itself. Be clear about what
            this means:{" "}
            <Span weight="semibold">
              a claim we inspect and find genuine is charged back to you
            </Span>{" "}
            — that is the cover. A claim we find to be a change of mind is
            absorbed by us, which is what the buyer&apos;s fee pays for. Not
            offered on your final-sale listings, since &quot;no returns&quot;
            and &quot;no questions asked&quot; cannot both be true.
          </Text>
          {/*
            🛑 This has to be said. The gross-up happens when a product is
            SAVED, so flipping the toggle leaves every existing listing exactly
            as it is — a seller who assumed otherwise would believe their whole
            catalogue had just been repriced.
          */}
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Changing this does not re-price listings you have already published.
            It applies to products you save from now on.
          </Text>
          <Toggle
            checked={values.advancedListingTypesEnabled}
            onChange={(checked) => onChange({ advancedListingTypesEnabled: checked })}
            label="Enable advanced listing types"
            disabled={busy}
          />
          {/*
            🛑 The copy names what enabling ACCEPTS, not just what it unlocks.
            Every one of these types carries an obligation a seller has not
            agreed to by opening a shop, and a bare "unlock more listing types"
            label would read as a feature rather than a commitment.
          */}
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Adds pre-orders, prize draws, classifieds, digital codes, live
            items, art and stickers alongside the products, spares and auctions
            you can already list. Each carries its own obligation:{" "}
            <Span weight="semibold">
              a pre-order takes payment for stock you do not have yet, a prize
              draw is a regulated promotion, a classified happens off-platform
              with no escrow protection, a digital code must be delivered from a
              pool you keep stocked, and a live listing is an animal.
            </Span>{" "}
            Turning this off later does not unpublish listings you have already
            created — it only stops you making new ones.
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
