"use client";

import React from "react";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_SECTION_CARD = "border border-zinc-200 dark:border-zinc-700 rounded-xl p-5";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Div, Form, FormActions, Heading, Input, Row, Section, Span, Stack, Text, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { WHATSAPP_SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildPurchaseAnnouncementMessage } from "../helpers/whatsapp";

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
    <Div className="relative">
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={revealed ? "text" : "password"}
        placeholder={placeholder}
        helperText={helperText}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-3 top-8 text-xs"
      >
        {revealed ? "Hide" : "Reveal"}
      </Button>
    </Div>
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

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  success: "success",
  partial: "warning",
  failed: "danger",
};

// ---------------------------------------------------------------------------
// Sample catalog items for preview
// ---------------------------------------------------------------------------

const SAMPLE_CATALOG_ITEMS = [
  { id: "1", emoji: "🃏", name: "Charizard PSA 9 Base Set", price: "₹4,500" },
  { id: "2", emoji: "🚗", name: "Hot Wheels Redline Vintage", price: "₹1,200" },
  { id: "3", emoji: "🤖", name: "Gundam HG RX-78-2 1/144", price: "₹2,800" },
  { id: "4", emoji: "🪀", name: "Beyblade Burst Storm Pegasus", price: "₹650" },
] as const;

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

  // Catalog sync mutation (push: site → WhatsApp)
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

  // Catalog import mutation (pull: WhatsApp → site)
  const importMutation = useMutation({
    mutationFn: async () => apiClient.post(WHATSAPP_SELLER_ENDPOINTS.CATALOG_IMPORT, {}),
    onSuccess: (res: unknown) => {
      const r = (res as any) ?? {};
      showToast(
        `Imported ${r.imported ?? 0} product${(r.imported ?? 0) !== 1 ? "s" : ""} from WhatsApp (${r.skipped ?? 0} already synced)`,
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Import failed";
      showToast(msg, "error");
    },
  });

  if (!hasCapability) {
    return (
      <Div className="max-w-xl mx-auto py-8 px-4">
        <Alert variant="warning">
          <Text className="font-medium">WhatsApp catalog sync is not enabled for your store.</Text>
          <Text className="text-sm mt-1">
            Contact LetItRip support to request access to the WhatsApp Business integration.
          </Text>
        </Alert>
      </Div>
    );
  }

  return (
    <Stack gap="xl" className="max-w-2xl mx-auto py-6 px-4">

      {/* ── Section 1: Step-by-step setup guide ─────────────────────────── */}
      <Section>
        <Heading level={2} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          How to connect your WhatsApp Business account
        </Heading>
        <Stack gap="sm">
          {STEPS.map((step) => {
            const done =
              step.checkKey === undefined
                ? false
                : step.checkKey === "connected"
                  ? cfg?.connected === true
                  : Boolean(cfg?.[step.checkKey]);
            return (
              <Row key={step.n} gap="sm" align="start">
                <Div
                  className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                    done
                      ? "bg-[var(--appkit-color-success)] text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {done ? "✓" : step.n}
                </Div>
                <Div>
                  <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{step.title}</Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{step.body}</Text>
                </Div>
              </Row>
            );
          })}
        </Stack>
      </Section>

      {/* ── Section 2: Connection form ──────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Row justify="between" align="center" className="mb-4">
          <Heading level={2} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connection</Heading>
          {isLoading ? null : cfg?.connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="default">Not configured</Badge>
          )}
        </Row>

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
              {saveMutation.isPending ? "Saving…" : ACTIONS.STORE["whatsapp-connect"].label}
            </Button>
          </FormActions>
        </Form>
      </Section>

      {/* ── Section 3: Catalog sync ─────────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Catalog Sync</Heading>

        <Row justify="between" align="center" className="mb-4">
          <Div>
            <Text className="text-sm text-zinc-700 dark:text-zinc-300">Enable catalog sync</Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              When enabled, your published standard products can be synced to WhatsApp.
            </Text>
          </Div>
          <Toggle
            checked={syncEnabled}
            onChange={setSyncEnabled}
            disabled={!cfg?.connected}
          />
        </Row>

        {cfg?.lastCatalogSyncAt && (
          <Row gap="sm" align="center" className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            <Text>Last sync: {new Date(cfg.lastCatalogSyncAt).toLocaleString("en-IN")}</Text>
            {cfg.lastSyncCount !== undefined && <Text>· {cfg.lastSyncCount} products</Text>}
            {cfg.lastSyncStatus && (
              <Badge variant={STATUS_VARIANT[cfg.lastSyncStatus] ?? "default"}>
                {cfg.lastSyncStatus}
              </Badge>
            )}
          </Row>
        )}

        <Text className="text-xs text-zinc-400 dark:text-zinc-400 mb-3">
          Only published standard products are synced. Auctions and pre-orders are excluded.
          Batches of up to 50 products per call.
        </Text>

        <Div className="flex gap-3">
          <Button
            onClick={() => syncMutation.mutate()}
            isLoading={syncMutation.isPending}
            disabled={!cfg?.connected || !syncEnabled || syncMutation.isPending}
            variant="secondary"
          >
            {syncMutation.isPending ? "Syncing…" : ACTIONS.STORE["whatsapp-catalog-sync"].label}
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            isLoading={importMutation.isPending}
            disabled={!cfg?.connected || !syncEnabled || importMutation.isPending}
            variant="secondary"
          >
            {importMutation.isPending ? "Importing…" : ACTIONS.STORE["whatsapp-catalog-import"].label}
          </Button>
        </Div>

        <Text className="text-xs text-zinc-400 dark:text-zinc-400 mt-3">
          <Span weight="bold">Push</Span> sends your published standard products to WhatsApp.{" "}
          <Span weight="bold">Import</Span> creates draft products from your WhatsApp catalog.
          Products are matched by slug in the description field.
        </Text>
      </Section>

      {/* ── Section 4: Announcement preview ─────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Purchase Announcement Preview
        </Heading>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          This message is sent automatically to your phone and the platform admin when a new order is placed.
        </Text>
        <Div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-lg px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200 font-mono">
          {buildPurchaseAnnouncementMessage({
            buyerName: "Ravi K.",
            firstItemName: "Charizard PSA 9",
            additionalItemCount: 2,
            totalAmount: 450000,
            orderId: "order-3-20260510-a1b2c3",
          })}
        </Div>
      </Section>

      {/* ── Section 5: Catalog preview ───────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Catalog Preview
        </Heading>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          This is how your products appear in the WhatsApp Catalog when a buyer taps "View Catalog" in the chat. Only published standard products are included.
        </Text>

        {/* Simulated WhatsApp catalog tile grid */}
        <Div className={`border border-zinc-200 dark:border-zinc-700 rounded-xl ${__O.hidden} bg-[#ECE5DD] dark:bg-zinc-800 ${__P.p3}`}>
          <Row gap="sm" align="center" className="mb-3">
            <Div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
              <Text className="text-white text-xs font-bold">W</Text>
            </Div>
            <Div>
              <Text className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {cfg?.connected ? "Your Store" : "Store Name"}
              </Text>
              <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">WhatsApp Business</Text>
            </Div>
          </Row>

          <Div className="grid grid-cols-2 gap-2">
            {SAMPLE_CATALOG_ITEMS.map((item) => (
              <Div key={item.id} surface="card" className={`${__O.hidden}`}>
                <Div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Text className="text-2xl">{item.emoji}</Text>
                </Div>
                <Div className="p-2">
                  <Text className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight">
                    {item.name}
                  </Text>
                  <Text className="text-xs text-[#25D366] font-semibold mt-0.5">
                    {item.price}
                  </Text>
                </Div>
              </Div>
            ))}
          </Div>

          <Div className="mt-3 text-center">
            <Text className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {cfg?.lastSyncCount
                ? `${cfg.lastSyncCount} products synced to catalog`
                : "Sync your products to populate the catalog"}
            </Text>
          </Div>
        </Div>

        {!cfg?.connected && (
          <Text className="text-xs text-warning mt-2">
            Connect your WhatsApp Business account above to enable the catalog.
          </Text>
        )}
      </Section>

    </Stack>
  );
}
