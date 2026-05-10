"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Div,
  FormField,
  Heading,
  Stack,
  Text,
} from "../../../ui";
import { StackedViewShell } from "../../../ui";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";

type ShippingMethod = "custom" | "shiprocket";

interface ShippingDraft {
  method: ShippingMethod;
  customCarrierName: string;
  customShippingPrice: string;
  shiprocketEmail: string;
  shiprocketPassword: string;
  pickupAddressId: string;
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
};

export function SellerShippingView({ apiBase = "/api/store/shipping" }: SellerShippingViewProps) {
  const [draft, setDraft] = useState<ShippingDraft>(DEFAULT_DRAFT);
  const [current, setCurrent] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  const update = useCallback(<K extends keyof ShippingDraft>(key: K, value: ShippingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const body =
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

  const isCustom = draft.method === "custom";
  const busy = loading || saving;

  return (
    <StackedViewShell portal="seller" title="Shipping Configuration" sections={[
      <Stack key="shipping" gap="lg">
        {/* Status badge */}
        {current && (
          <Div className="flex items-center gap-2">
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

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Shipping configuration saved.</Alert>}

        {/* Method selector */}
        <section>
          <Heading level={3} className="mb-3">Shipping Method</Heading>
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
                  checked={draft.method === m}
                  onChange={() => update("method", m)}
                  className="accent-[var(--appkit-color-primary)]"
                  disabled={busy}
                />
                <Div>
                  <Text className="font-medium capitalize">{m === "custom" ? "Custom / Manual" : "Shiprocket"}</Text>
                  <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                    {m === "custom"
                      ? "Set a fixed shipping fee and carrier name for all orders."
                      : "Automated shipping via Shiprocket — connect your account for label generation and tracking."}
                  </Text>
                </Div>
              </label>
            ))}
          </Stack>
        </section>

        {/* Custom shipping fields */}
        {isCustom && (
          <section>
            <Heading level={3} className="mb-3">Custom Shipping Details</Heading>
            <Stack gap="md">
              <FormField
                name="customCarrierName"
                label="Carrier Name"
                type="text"
                value={draft.customCarrierName}
                onChange={(v) => update("customCarrierName", v)}
                placeholder="e.g. India Post, DTDC, Delhivery"
                disabled={busy}
              />
              <FormField
                name="customShippingPrice"
                label="Shipping Price (₹)"
                type="number"
                value={draft.customShippingPrice}
                onChange={(v) => update("customShippingPrice", v)}
                placeholder="0 for free shipping"
                helpText="Charged to buyer at checkout. Enter 0 for free shipping."
                disabled={busy}
              />
            </Stack>
          </section>
        )}

        {/* Shiprocket fields */}
        {!isCustom && (
          <section>
            <Heading level={3} className="mb-3">Shiprocket Account</Heading>
            <Stack gap="md">
              <FormField
                name="shiprocketEmail"
                label="Shiprocket Email"
                type="email"
                value={draft.shiprocketEmail}
                onChange={(v) => update("shiprocketEmail", v)}
                placeholder="your@email.com"
                disabled={busy}
              />
              <FormField
                name="shiprocketPassword"
                label={current?.isTokenValid ? "Password (leave blank to keep existing token)" : "Password"}
                type="password"
                value={draft.shiprocketPassword}
                onChange={(v) => update("shiprocketPassword", v)}
                placeholder="••••••••"
                helpText={current?.isTokenValid ? "Only fill this to re-authenticate." : "Required to connect your Shiprocket account."}
                disabled={busy}
              />
              <Div>
                <StoreAddressSelectorCreate
                  value={draft.pickupAddressId}
                  onChange={(id) => update("pickupAddressId", id)}
                  label="Pickup Address (optional)"
                  disabled={busy}
                />
                <Text className="mt-1 text-xs text-[var(--appkit-color-text-muted)]">
                  Registering a pickup address sends an OTP to your phone for verification.
                </Text>
              </Div>
              {current?.pickupAddress && (
                <Alert variant="info">
                  Current pickup: {current.pickupAddress.locationName ?? ""}{current.pickupAddress.city ? `, ${current.pickupAddress.city}` : ""}
                  {current.pickupAddress.isVerified
                    ? " — ✓ Verified"
                    : " — Pending OTP verification"}
                </Alert>
              )}
            </Stack>
          </section>
        )}

        {/* Save */}
        <Div className="flex justify-end pt-2 border-t border-[var(--appkit-color-border)]">
          <Button variant="primary" onClick={handleSave} disabled={busy} isLoading={saving}>
            Save Configuration
          </Button>
        </Div>
      </Stack>,
    ]} />
  );
}
