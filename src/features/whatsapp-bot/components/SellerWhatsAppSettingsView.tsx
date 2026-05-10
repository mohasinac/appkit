"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Badge,
  Button,
  Form,
  FormActions,
  Input,
  Toggle,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { WHATSAPP_SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { buildGroupShareLink, buildPurchaseAnnouncementMessage } from "../helpers/whatsapp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppConfig {
  phoneNumber?: string;
  wabaId?: string;
  catalogId?: string;
  accessToken?: string; // "••••••" if set, undefined if not
  catalogSyncEnabled: boolean;
  lastCatalogSyncAt?: string;
  lastSyncCount?: number;
  lastSyncStatus?: "success" | "partial" | "failed";
  connected: boolean;
  connectedAt?: string;
}

export interface SellerWhatsAppSettingsViewProps {
  /** Whether this store has the whatsapp_catalog_sync capability */
  hasCapability: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MaskedTokenInput({
  label,
  value,
  onChange,
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helperText?: string;
}) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <div className="relative">
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={revealed ? "text" : "password"}
        placeholder={placeholder}
        helperText={helperText}
      />
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-3 top-8 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        {revealed ? "Hide" : "Reveal"}
      </button>
    </div>
  );
}

const STEPS = [
  {
    n: 1,
    title: "Create a Meta Business Account",
    body: "Go to business.facebook.com and create (or use) a Meta Business Manager account.",
    checkKey: undefined as keyof WhatsAppConfig | undefined,
  },
  {
    n: 2,
    title: "Set up a WhatsApp Business App",
    body: "In Meta for Developers, create an App → add the WhatsApp product → note your Phone Number ID and WABA ID from the API Setup page.",
    checkKey: "wabaId" as keyof WhatsAppConfig,
  },
  {
    n: 3,
    title: "Generate a System User access token",
    body: 'In Meta Business Manager → System Users → create a System User → assign "WhatsApp Business Management" + "WhatsApp Business Messaging" permissions → generate a token.',
    checkKey: "accessToken" as keyof WhatsAppConfig,
  },
  {
    n: 4,
    title: "Create a WhatsApp Catalog",
    body: "In Meta Commerce Manager → Catalogs → create a catalog → copy the Catalog ID.",
    checkKey: "catalogId" as keyof WhatsAppConfig,
  },
  {
    n: 5,
    title: "Paste credentials below and save",
    body: "Fill the form below and click Save & Connect. Once connected, you can sync your products.",
    checkKey: "connected" as keyof WhatsAppConfig,
  },
];

const STATUS_COLOR: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SellerWhatsAppSettingsView({ hasCapability }: SellerWhatsAppSettingsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["store", "whatsapp-settings"],
    queryFn: async () => {
      const res = await apiClient.get(WHATSAPP_SELLER_ENDPOINTS.SETTINGS);
      return ((res as any)?.whatsappConfig ?? null) as WhatsAppConfig | null;
    },
  });

  const cfg = data ?? null;

  // Connection form state
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [wabaId, setWabaId] = React.useState("");
  const [catalogId, setCatalogId] = React.useState("");
  const [accessToken, setAccessToken] = React.useState("");
  const [syncEnabled, setSyncEnabled] = React.useState(false);

  // Share-to-group message
  const [shareMessage, setShareMessage] = React.useState(
    "🛍️ New order! A customer just made a purchase at our store. Check it out on LetItRip!",
  );

  React.useEffect(() => {
    if (!cfg) return;
    setPhoneNumber(cfg.phoneNumber ?? "");
    setWabaId(cfg.wabaId ?? "");
    setCatalogId(cfg.catalogId ?? "");
    setAccessToken(cfg.accessToken ?? "");
    setSyncEnabled(cfg.catalogSyncEnabled ?? false);
  }, [cfg]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        catalogSyncEnabled: syncEnabled,
      };
      if (phoneNumber) payload.phoneNumber = phoneNumber;
      if (wabaId) payload.wabaId = wabaId;
      if (catalogId) payload.catalogId = catalogId;
      // Only send accessToken if user has typed a new value (not the masked placeholder)
      if (accessToken && accessToken !== "••••••") payload.accessToken = accessToken;
      return apiClient.put(WHATSAPP_SELLER_ENDPOINTS.SETTINGS, payload);
    },
    onSuccess: () => {
      showToast("WhatsApp settings saved", "success");
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      showToast(msg, "error");
    },
  });

  // Catalog sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => apiClient.post(WHATSAPP_SELLER_ENDPOINTS.CATALOG_SYNC, {}),
    onSuccess: (res: unknown) => {
      const r = (res as any) ?? {};
      showToast(
        `Synced ${r.successCount ?? 0} product${(r.successCount ?? 0) !== 1 ? "s" : ""} to WhatsApp catalog`,
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Sync failed";
      showToast(msg, "error");
    },
  });

  if (!hasCapability) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <Alert variant="warning">
          <p className="font-medium">WhatsApp catalog sync is not enabled for your store.</p>
          <p className="text-sm mt-1">
            Contact LetItRip support to request access to the WhatsApp Business integration.
          </p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6 px-4">

      {/* ── Section 1: Step-by-step setup guide ─────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          How to connect your WhatsApp Business account
        </h2>
        <ol className="space-y-3">
          {STEPS.map((step) => {
            const done =
              step.checkKey === undefined
                ? false
                : step.checkKey === "connected"
                  ? cfg?.connected === true
                  : Boolean(cfg?.[step.checkKey]);
            return (
              <li key={step.n} className="flex gap-3">
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                    done
                      ? "bg-green-500 text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {done ? "✓" : step.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{step.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Section 2: Connection form ──────────────────────────────────── */}
      <section className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connection</h2>
          {isLoading ? null : cfg?.connected ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Connected
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Not configured
            </span>
          )}
        </div>

        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="WhatsApp Business Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="919876543210"
            helperText="Digits only, include country code (e.g. 91 for India)"
          />
          <Input
            label="WABA ID (WhatsApp Business Account ID)"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="123456789012345"
            helperText="From Meta Business Manager → WhatsApp Accounts"
          />
          <Input
            label="Catalog ID"
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
            placeholder="987654321098765"
            helperText="From Meta Commerce Manager → Catalogs"
          />
          <MaskedTokenInput
            label="System User Access Token"
            value={accessToken}
            onChange={setAccessToken}
            placeholder="EAAxxxxxxxx…"
            helperText="Long-lived token with WhatsApp Business permissions"
          />
          <FormActions align="right">
            <Button type="submit" isLoading={saveMutation.isPending} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save & Connect"}
            </Button>
          </FormActions>
        </Form>
      </section>

      {/* ── Section 3: Catalog sync ─────────────────────────────────────── */}
      <section className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Catalog Sync</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Enable catalog sync</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              When enabled, your published standard products can be synced to WhatsApp.
            </p>
          </div>
          <Toggle
            checked={syncEnabled}
            onChange={setSyncEnabled}
            disabled={!cfg?.connected}
          />
        </div>

        {cfg?.lastCatalogSyncAt && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            <span>Last sync: {new Date(cfg.lastCatalogSyncAt).toLocaleString("en-IN")}</span>
            {cfg.lastSyncCount !== undefined && <span>· {cfg.lastSyncCount} products</span>}
            {cfg.lastSyncStatus && (
              <span className={`px-1.5 py-0.5 rounded ${STATUS_COLOR[cfg.lastSyncStatus] ?? ""}`}>
                {cfg.lastSyncStatus}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
          Only published standard products are synced. Auctions and pre-orders are excluded.
          Batches of up to 50 products per call.
        </p>

        <Button
          onClick={() => syncMutation.mutate()}
          isLoading={syncMutation.isPending}
          disabled={!cfg?.connected || !syncEnabled || syncMutation.isPending}
          variant="secondary"
        >
          {syncMutation.isPending ? "Syncing…" : "Sync Now"}
        </Button>
      </section>

      {/* ── Section 4: Announcement preview ─────────────────────────────── */}
      <section className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Purchase Announcement Preview
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          This message is sent automatically to your phone and the platform admin when a new order is placed.
        </p>
        <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 font-mono">
          {buildPurchaseAnnouncementMessage({
            buyerName: "Ravi K.",
            firstItemName: "Charizard PSA 9",
            additionalItemCount: 2,
            totalAmount: 450000,
            orderId: "order-3-20260510-a1b2c3",
          })}
        </div>
      </section>

      {/* ── Section 5: Share to group ────────────────────────────────────── */}
      <section className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Share to WhatsApp Group
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          WhatsApp&apos;s API cannot post directly to groups. Use the button below to open WhatsApp
          with a pre-filled message — then select your group manually to forward it.
        </p>
        <textarea
          className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          rows={3}
          value={shareMessage}
          onChange={(e) => setShareMessage(e.target.value)}
        />
        <div className="mt-3">
          <a
            href={buildGroupShareLink(shareMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] hover:bg-[#1ebe5c] text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Open WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
