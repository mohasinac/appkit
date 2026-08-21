"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, Badge, Div, FormField, Heading, Row, Stack, Text } from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { FormShellContext, useFormShellState, applyZodIssues, FormErrorSummary } from "../../../ui/forms";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";
import { StepDef, StepForm } from "../../shell";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";

import { normalizeError } from "../../../errors/normalize";

const shippingDraftSchema = z.object({
  customCarrierName: z.string().min(1, "Carrier name is required"),
  customShippingPrice: z.string(),
  pickupAddressId: z.string().optional(),
  freeShippingThreshold: z.string().optional(),
  fragileSurcharge: z.string().optional(),
}).superRefine((v, ctx) => {
  const price = parseFloat(v.customShippingPrice);
  if (v.customShippingPrice.trim() === "" || Number.isNaN(price) || price < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customShippingPrice"], message: "Enter a valid shipping price (0 for free)" });
  }
});

interface ShippingDraft {
  customCarrierName: string;
  customShippingPrice: string;
  pickupAddressId: string;
  freeShippingThreshold: string;
  fragileSurcharge: string;
}

interface ShippingConfig {
  method: "custom";
  customCarrierName?: string;
  customShippingPrice?: number;
  isConfigured: boolean;
  pickupAddress?: { locationName?: string; city?: string };
}

export interface SellerShippingViewProps {
  apiBase?: string;
}

const DEFAULT_DRAFT: ShippingDraft = {
  customCarrierName: "",
  customShippingPrice: "",
  pickupAddressId: "",
  freeShippingThreshold: "",
  fragileSurcharge: "",
};

export function SellerShippingView({ apiBase = SELLER_ENDPOINTS.SHIPPING }: SellerShippingViewProps) {
  const [draft, setDraft] = useState<ShippingDraft>(DEFAULT_DRAFT);
  const [current, setCurrent] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { shellCtx, setFieldError, clearErrors, validate } = useFormShellState(shippingDraftSchema);

  useEffect(() => {
    validate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, validate]);

  useEffect(() => {
    fetch(apiBase)
      .then((r) => r.json())
      .then((res) => {
        const cfg: ShippingConfig = res?.data?.shippingConfig ?? { method: "custom", isConfigured: false };
        setCurrent(cfg);
        setDraft({
          customCarrierName: cfg.customCarrierName ?? "",
          customShippingPrice: cfg.customShippingPrice ? String(cfg.customShippingPrice) : "",
          pickupAddressId: "",
          freeShippingThreshold: (res?.data?.freeShippingThreshold ?? 0)
            ? String(res.data.freeShippingThreshold)
            : "",
          fragileSurcharge: (res?.data?.fragileSurcharge ?? 0)
            ? String(res.data.fragileSurcharge)
            : "",
        });
      })
      .catch(console.error)
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
      const body = {
        customCarrierName: draft.customCarrierName.trim(),
        customShippingPrice: Math.round(parseFloat(draft.customShippingPrice || "0") * 100) / 100,
        ...(draft.pickupAddressId ? { pickupAddressId: draft.pickupAddressId } : {}),
        freeShippingThreshold: Math.round(parseFloat(draft.freeShippingThreshold || "0") * 100) / 100,
        fragileSurcharge: Math.round(parseFloat(draft.fragileSurcharge || "0") * 100) / 100,
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
      const cfg: ShippingConfig = json?.data?.shippingConfig ?? { method: "custom", isConfigured: false };
      setCurrent(cfg);
    } catch (err) {
      void normalizeError(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || saving;

  const steps: StepDef<ShippingDraft>[] = [
    {
      label: "Carrier",
      fields: ["customCarrierName", "customShippingPrice"],
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Shipping Carrier</Heading>
          {current && (
            <Row className="mb-2" align="center" gap="sm">
              <Badge variant={current.isConfigured ? "success" : "warning"}>
                {current.isConfigured ? "Configured" : "Not configured"}
              </Badge>
            </Row>
          )}
          <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
            Set a fixed shipping fee and carrier name for all orders. You enter the carrier and tracking number yourself when you ship each order.
          </Text>
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
        </Stack>
      ),
    },
    {
      label: "Pickup Address",
      fields: ["pickupAddressId"],
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Pickup Address</Heading>
          {current?.pickupAddress && (
            <Alert variant="info">
              Current pickup: {current.pickupAddress.locationName ?? ""}
              {current.pickupAddress.city ? `, ${current.pickupAddress.city}` : ""}
            </Alert>
          )}
          <StoreAddressSelectorCreate
            value={values.pickupAddressId}
            onChange={(id) => onChange({ pickupAddressId: id })}
            label="Pickup Address"
            disabled={busy}
          />
        </Stack>
      ),
    },
    {
      label: "Rules",
      fields: ["freeShippingThreshold", "fragileSurcharge"],
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

  const fieldToStepIndex = useMemo(() => {
    const map: Record<string, number> = {};
    steps.forEach((step, i) => {
      step.fields?.forEach((field) => { map[field] = i; });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  const wizardShellCtx = useMemo(
    () => ({ ...shellCtx, fieldToStepIndex, goToStep: (n: number) => setCurrentStep(n) }),
    [shellCtx, fieldToStepIndex, setCurrentStep],
  );

  return (
    <StackedViewShell portal="seller" title="Shipping Configuration" sections={[
      <Div key="shipping">
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">Shipping configuration saved.</Alert>}
        <FormShellContext.Provider value={wizardShellCtx}>
          <FormErrorSummary />
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
        </FormShellContext.Provider>
      </Div>,
    ]} />
  );
}
