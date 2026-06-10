"use client";
import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Div, FormField, Heading, Stack, Text } from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";
import { StepDef, StepForm } from "../../shell";

type ShippingMethod = "custom" | "shiprocket";

interface ShippingDraft {
  method: ShippingMethod;
  customCarrierName: string;
  customShippingPrice: string;
  shiprocketEmail: string;
  shiprocketPassword: string;
  pickupAddressId: string;
  freeShippingThreshold: string;
  fragileSurcharge: string;
}

interface ShippingConfig {
  method: ShippingMethod;
  customCarrierName?: string;
  customShippingPrice?: number;
  shiprocketEmail?: string;
  isConfigured: boolean;
  isTokenValid?: boolean;
  pickupAddress?: { locationName?: string; city?: string; isVerified?: boolean };
}

export interface SellerShippingViewProps {
  apiBase?: string;
}

const DEFAULT_DRAFT: ShippingDraft = {
  method: "custom",
  customCarrierName: "",
  customShippingPrice: "",
  shiprocketEmail: "",
  shiprocketPassword: "",
  pickupAddressId: "",
  freeShippingThreshold: "",
  fragileSurcharge: "",
};

export function SellerShippingView({ apiBase = "/api/store/shipping" }: SellerShippingViewProps) {
  const [draft, setDraft] = useState<ShippingDraft>(DEFAULT_DRAFT);
  const [current, setCurrent] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((res) => {
        const cfg: ShippingConfig = res?.data?.shippingConfig ?? { method: "custom", isConfigured: false };
        setCurrent(cfg);
        setDraft({
          method: cfg.method,
          customCarrierName: cfg.customCarrierName ?? "",
          customShippingPrice: cfg.customShippingPrice ? String(cfg.customShippingPrice / 100) : "",
          shiprocketEmail: cfg.shiprocketEmail ?? "",
          shiprocketPassword: "",
          pickupAddressId: "",
          freeShippingThreshold: (res?.data?.freeShippingThreshold ?? 0)
            ? String(res.data.freeShippingThreshold / 100)
            : "",
          fragileSurcharge: (res?.data?.fragileSurcharge ?? 0)
            ? String(res.data.fragileSurcharge / 100)
            : "",
        });
      })
      .catch(() => {}) // audit-silent-catch-ok: blank form is safe fallback; save round-trip will surface persistent errors
      .finally(() => setLoading(false));
  }, [apiBase]);

  const update = useCallback((partial: Partial<ShippingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSuccess(false);
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const methodFields =
        draft.method === "custom"
          ? {
              method: "custom" as const,
              customCarrierName: draft.customCarrierName.trim(),
              customShippingPrice: Math.round(parseFloat(draft.customShippingPrice || "0") * 100),
            }
          : {
              method: "shiprocket" as const,
              ...(draft.shiprocketPassword
                ? { shiprocketCredentials: { email: draft.shiprocketEmail, password: draft.shiprocketPassword } }
                : {}),
            };

      const body = {
        ...methodFields,
        ...(draft.pickupAddressId ? { pickupAddressId: draft.pickupAddressId } : {}),
        freeShippingThreshold: Math.round(parseFloat(draft.freeShippingThreshold || "0") * 100),
        fragileSurcharge: Math.round(parseFloat(draft.fragileSurcharge || "0") * 100),
      };

      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      setSuccess(true);
      const cfg: ShippingConfig = json?.data?.shippingConfig ?? { method: draft.method, isConfigured: false };
      setCurrent(cfg);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  const steps: StepDef<ShippingDraft>[] = [
    {
      label: "Method",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Shipping Method</Heading>
          {current && (
            <Div className="flex items-center gap-2 mb-2">
              <Badge variant={current.isConfigured ? "success" : "warning"}>
                {current.isConfigured ? "Configured" : "Not configured"}
              </Badge>
              {current.method === "shiprocket" && (
                <Badge variant={current.isTokenValid ? "success" : "danger"}>
                  {current.isTokenValid ? "Shiprocket connected" : "Shiprocket token expired"}
                </Badge>
              )}
            </Div>
          )}
          <Stack gap="sm">
            {(["custom", "shiprocket"] as const).map((m) => (
              <label
                key={m}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--appkit-color-border)] cursor-pointer has-[:checked]:border-[var(--appkit-color-primary)] has-[:checked]:bg-[var(--appkit-color-primary)]/5"
              >
                <input
                  type="radio"
                  name="method"
                  value={m}
                  checked={values.method === m}
                  onChange={() => onChange({ method: m })}
                  className="accent-[var(--appkit-color-primary)]"
                  disabled={busy}
                />
                <Div>
                  <Text className="font-medium">{m === "custom" ? "Custom / Manual" : "Shiprocket"}</Text>
                  <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                    {m === "custom"
                      ? "Set a fixed shipping fee and carrier name for all orders."
                      : "Automated shipping via Shiprocket — connect your account for label generation and tracking."}
                  </Text>
                </Div>
              </label>
            ))}
          </Stack>
          {values.method === "custom" && (
            <Stack gap="md" className="mt-2">
              <FormField
                name="customCarrierName"
                label="Carrier Name"
                type="text"
                value={values.customCarrierName}
                onChange={(v) => onChange({ customCarrierName: v })}
                placeholder="e.g. India Post, DTDC, Delhivery"
                disabled={busy}
              />
              <FormField
                name="customShippingPrice"
                label="Shipping Price (₹)"
                type="number"
                value={values.customShippingPrice}
                onChange={(v) => onChange({ customShippingPrice: v })}
                placeholder="0 for free shipping"
                helpText="Charged to buyer at checkout. Enter 0 for free shipping."
                disabled={busy}
              />
            </Stack>
          )}
          {values.method === "shiprocket" && (
            <Stack gap="md" className="mt-2">
              <FormField
                name="shiprocketEmail"
                label="Shiprocket Email"
                type="email"
                value={values.shiprocketEmail}
                onChange={(v) => onChange({ shiprocketEmail: v })}
                placeholder="your@email.com"
                disabled={busy}
              />
              <FormField
                name="shiprocketPassword"
                label={current?.isTokenValid ? "Password (leave blank to keep existing token)" : "Password"}
                type="password"
                value={values.shiprocketPassword}
                onChange={(v) => onChange({ shiprocketPassword: v })}
                placeholder="••••••••"
                helpText={current?.isTokenValid ? "Only fill this to re-authenticate." : "Required to connect your Shiprocket account."}
                disabled={busy}
              />
            </Stack>
          )}
        </Stack>
      ),
    },
    {
      label: "Pickup Address",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Pickup Address</Heading>
          {current?.pickupAddress && (
            <Alert variant="info">
              Current pickup: {current.pickupAddress.locationName ?? ""}
              {current.pickupAddress.city ? `, ${current.pickupAddress.city}` : ""}
              {current.pickupAddress.isVerified ? " — ✓ Verified" : " — Pending OTP verification"}
            </Alert>
          )}
          <StoreAddressSelectorCreate
            value={values.pickupAddressId}
            onChange={(id) => onChange({ pickupAddressId: id })}
            label="Pickup Address"
            disabled={busy}
          />
          <Text className="text-xs text-[var(--appkit-color-text-muted)]">
            Registering a pickup address sends an OTP to your phone for verification.
          </Text>
        </Stack>
      ),
    },
    {
      label: "Rules",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Shipping Rules</Heading>
          <FormField
            name="freeShippingThreshold"
            label="Free Shipping Threshold (₹)"
            type="number"
            value={values.freeShippingThreshold}
            onChange={(v) => onChange({ freeShippingThreshold: v })}
            placeholder="e.g. 500 — orders above this get free shipping"
            helpText="Leave blank or 0 to disable free shipping offers."
            disabled={busy}
          />
          <FormField
            name="fragileSurcharge"
            label="Fragile Item Surcharge (₹)"
            type="number"
            value={values.fragileSurcharge}
            onChange={(v) => onChange({ fragileSurcharge: v })}
            placeholder="e.g. 50 — added for items marked fragile"
            helpText="Leave blank or 0 to disable the fragile surcharge."
            disabled={busy}
          />
        </Stack>
      ),
    },
  ];

  return (
    <StackedViewShell portal="seller" title="Shipping Configuration" sections={[
      <Div key="shipping">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">Shipping configuration saved.</Alert>}
        <StepForm<ShippingDraft>
          steps={steps}
          values={draft}
          onChange={update}
          onComplete={handleSave}
          formId="seller-shipping"
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          completeLabel="Save Configuration"
          isLoading={busy}
        />
      </Div>,
    ]} />
  );
}
