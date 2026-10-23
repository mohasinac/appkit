"use client";

import { useApiMutation, useBulkEvent, RTDB_PATHS } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_SECTION_CARD = "border border-[var(--appkit-color-border)] rounded-xl p-[var(--appkit-space-5)]";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Badge, Button, Div, Form, FormActions, Heading, Input, Row, Section, Span, Stack, Text, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { WHATSAPP_SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { buildPurchaseAnnouncementMessage } from "../helpers/whatsapp";
import {
  whatsappConnectionSchema,
  type WhatsappConnectionValues as ConnectionValues,
} from "../../admin/schemas/admin-user-form";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";

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

/**
 * What the server sends in place of a stored access token. It is a SENTINEL,
 * not a value — the real token never leaves the server.
 */
const MASKED_TOKEN = "••••••";

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
  /*
   * There is nothing to reveal while the field still holds the sentinel: the
   * button used to un-mask six bullet characters, which reads as "the token is
   * literally ••••••". Offer it only once the seller has typed something, which
   * is the only case where the field contains a real value.
   */
  const isSentinel = value === MASKED_TOKEN;
  return (
    <Div className="relative">
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={revealed && !isSentinel ? "text" : "password"}
        placeholder={placeholder}
        helperText={
          isSentinel
            ? "A token is saved. Type a new one to replace it — the stored value is never sent back."
            : helperText
        }
      />
      {!isSentinel && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRevealed((r) => !r)}
          className="absolute right-3 top-8 text-[length:var(--appkit-text-xs)]"
        >
          {revealed ? "Hide" : "Reveal"}
        </Button>
      )}
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
  const [draft, setDraft] = React.useState<ConnectionValues>({
    phoneNumber: "",
    wabaId: "",
    catalogId: "",
    accessToken: "",
  });
  const [syncEnabled, setSyncEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!cfg) return;
    setDraft({
      phoneNumber: cfg.phoneNumber ?? "",
      wabaId: cfg.wabaId ?? "",
      catalogId: cfg.catalogId ?? "",
      accessToken: cfg.accessToken ?? "",
    });
    setSyncEnabled(cfg.catalogSyncEnabled ?? false);
  }, [cfg]);

  /*
   * The access token needs a renderer: it is a `text` field to the schema, and
   * the control is a masked input with a reveal that must stay suppressed while
   * the field still holds the server's sentinel.
   */
  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<ConnectionValues>(whatsappConnectionSchema, {
        renderers: {
          accessToken: ({ values, onChange }) => (
            <MaskedTokenInput
              label="System User Access Token"
              value={values.accessToken ?? ""}
              onChange={(v) => onChange({ accessToken: v })}
              placeholder="EAAxxxxxxxx…"
              helperText="Long-lived token with WhatsApp Business permissions"
            />
          ),
        },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, draft, { scope: "store:whatsapp" });
  const form = useFormShellState(whatsappConnectionSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  /*
   * The CONNECTION form. Credentials only.
   *
   * 🛑 It used to also send `catalogSyncEnabled` — the one key it sent
   * unconditionally — while the toggle for it lives in Section 3, outside this
   * form and below its Save button. A seller flipped the sync toggle, saw it
   * move, pressed the Sync button beside it, and the setting was never
   * persisted: the only control that saved it was "Save & Connect", two cards
   * up and labelled for credentials.
   *
   * The toggle now owns its own write (`syncToggleMutation`), so the control
   * and the thing that persists it are in the same place.
   */
  const saveMutation = useApiMutation({
    errorMessage: "Failed to save settings.",
    mutationFn: async () => {
      const v = visibleValues(whatsappConnectionSchema, draft) as ConnectionValues;
      const payload: Record<string, JsonValue> = {};
      if (v.phoneNumber) payload.phoneNumber = v.phoneNumber;
      if (v.wabaId) payload.wabaId = v.wabaId;
      if (v.catalogId) payload.catalogId = v.catalogId;
      // Only send accessToken if user has typed a new value (not the masked placeholder)
      if (v.accessToken && v.accessToken !== MASKED_TOKEN) payload.accessToken = v.accessToken;
      return apiClient.put(WHATSAPP_SELLER_ENDPOINTS.SETTINGS, payload);
    },
    onSuccess: () => {
      showToast("WhatsApp settings saved", "success");
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
  });

  /** Persists the catalog-sync toggle on flip — see the note above. */
  const syncToggleMutation = useApiMutation({
    errorMessage: "Could not change the catalog-sync setting.",
    mutationFn: async (next: boolean) =>
      apiClient.put(WHATSAPP_SELLER_ENDPOINTS.SETTINGS, { catalogSyncEnabled: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
    onError: () => {
      // Put the switch back where the server still has it.
      setSyncEnabled((prev) => !prev);
    },
  });

  const handleSyncToggle = (next: boolean) => {
    setSyncEnabled(next);
    syncToggleMutation.mutate(next);
  };

  // Catalog sync mutation (push: site → WhatsApp)
  const syncMutation = useApiMutation({
    errorMessage: "Catalog sync failed.",
    mutationFn: async () => apiClient.post(WHATSAPP_SELLER_ENDPOINTS.CATALOG_SYNC, {}),
    onSuccess: (res: JsonValue) => {
      const r = (res as any) ?? {};
      showToast(
        `Synced ${r.successCount ?? 0} product${(r.successCount ?? 0) !== 1 ? "s" : ""} to WhatsApp catalog`,
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
    },
  });

  // Catalog import (pull: WhatsApp → site). Runs as the `whatsappCatalogImport`
  // async job — the route only enqueues, so the result arrives over the
  // useBulkEvent RTDB channel rather than in the POST response.
  const bulkEvent = useBulkEvent({ rtdbPath: RTDB_PATHS.BULK_EVENTS });
  const [importing, setImporting] = React.useState(false);

  const startImport = async () => {
    setImporting(true);
    try {
      const res = (await apiClient.post(WHATSAPP_SELLER_ENDPOINTS.CATALOG_IMPORT, {})) as {
        data?: { jobId?: string; customToken?: string };
      };
      const { jobId, customToken } = res.data ?? {};
      if (jobId && customToken) {
        bulkEvent.subscribe(jobId, customToken);
      } else {
        setImporting(false);
        showToast("Failed to start catalog import.", "error");
      }
    } catch (err) {
      const e = normalizeError(err);
      setImporting(false);
      showToast(
        toUserMessage(e.code, undefined, { fallback: "Failed to start catalog import." }),
        "error",
      );
    }
  };

  React.useEffect(() => {
    if (bulkEvent.status === "success") {
      setImporting(false);
      const summary = bulkEvent.result?.summary;
      const imported = summary?.succeeded ?? 0;
      const skipped = summary?.skipped ?? 0;
      showToast(
        `Imported ${imported} product${imported !== 1 ? "s" : ""} from WhatsApp (${skipped} already synced)`,
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["store", "whatsapp-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["store", "products"] });
    } else if (bulkEvent.status === "failed" || bulkEvent.status === "timeout") {
      setImporting(false);
      showToast(bulkEvent.error ?? "Catalog import failed.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkEvent.status]);

  if (!hasCapability) {
    return (
      <Div className="max-w-xl mx-auto" paddingY="y-xl" paddingX="x-md">
        <Alert variant="warning">
          <Text weight="medium">WhatsApp catalog sync is not enabled for your store.</Text>
          <Text className="mt-1" size="sm">
            Contact LetItRip support to request access to the WhatsApp Business integration.
          </Text>
        </Alert>
      </Div>
    );
  }

  return (
    <Stack gap="xl" className="max-w-2xl mx-auto" paddingY="y-lg" paddingX="x-md">

      {/* ── Section 1: Step-by-step setup guide ─────────────────────────── */}
      <Section>
        <Heading level={2} className="mb-4" color="primary" size="base" weight="semibold">
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
                <Row textWeight="bold" textSize="xs"
                  className={`flex-shrink-0 w-6 h-6 mt-0.5 ${ done ? "bg-[var(--appkit-color-success)] text-white" : "bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)] dark:text-[var(--appkit-color-text-faint)]" }`} align="center" justify="center" rounded="full"
                >
                  {done ? "✓" : step.n}
                </Row>
                <Div>
                  <Text size="sm" weight="medium" color="primary">{step.title}</Text>
                  <Text className="mt-0.5" color="muted" size="xs">{step.body}</Text>
                </Div>
              </Row>
            );
          })}
        </Stack>
      </Section>

      {/* ── Section 2: Connection form ──────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Row justify="between" align="center" className="mb-4">
          <Heading level={2} size="sm" weight="semibold" color="primary">Connection</Heading>
          {isLoading ? null : cfg?.connected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <Badge variant="default">Not configured</Badge>
          )}
        </Row>

        <FormShellContext.Provider value={form.shellCtx}>
          <FormErrorSummary />
          <SectionForm<ConnectionValues>
            sections={sections}
            values={draft}
            onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
            onSubmit={() => {
              // SectionForm scrolls to the first bad section and then submits
              // regardless, so the guard lives here.
              form.clearErrors();
              const parsed = whatsappConnectionSchema.safeParse(
                visibleValues(whatsappConnectionSchema, draft),
              );
              if (!parsed.success) {
                applyZodIssues(parsed.error.issues, form.setFieldError);
                return;
              }
              saveMutation.mutate();
            }}
            onValidationChange={() => form.validate(draft)}
            schema={whatsappConnectionSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            submitLabel={ACTIONS.STORE["whatsapp-connect"].label}
            isLoading={saveMutation.isPending}
          />
        </FormShellContext.Provider>
      </Section>

      {/* ── Section 3: Catalog sync ─────────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="mb-4" color="primary" size="sm" weight="semibold">Catalog Sync</Heading>

        <Row justify="between" align="center" className="mb-4">
          <Div>
            <Text size="sm" color="muted">Enable catalog sync</Text>
            <Text size="xs" color="muted">
              When enabled, your published standard products can be synced to WhatsApp.
            </Text>
          </Div>
          <Toggle
            checked={syncEnabled}
            onChange={handleSyncToggle}
            disabled={!cfg?.connected || syncToggleMutation.isPending}
          />
        </Row>

        {cfg?.lastCatalogSyncAt && (
          <Row color="muted" textSize="xs" gap="sm" align="center" className="mb-3">
            <Text>Last sync: {new Date(cfg.lastCatalogSyncAt).toLocaleString("en-IN")}</Text>
            {cfg.lastSyncCount !== undefined && <Text>· {cfg.lastSyncCount} products</Text>}
            {cfg.lastSyncStatus && (
              <Badge variant={STATUS_VARIANT[cfg.lastSyncStatus] ?? "default"}>
                {cfg.lastSyncStatus}
              </Badge>
            )}
          </Row>
        )}

        <Text className="mb-3" color="faint" size="xs">
          Only published standard products are synced. Auctions and pre-orders are excluded.
          Batches of up to 50 products per call.
        </Text>

        <Row gap="3" >
          <Button
            onClick={() => syncMutation.mutate()}
            isLoading={syncMutation.isPending}
            disabled={!cfg?.connected || !syncEnabled || syncMutation.isPending}
            variant="secondary"
          >
            {syncMutation.isPending ? "Syncing…" : ACTIONS.STORE["whatsapp-catalog-sync"].label}
          </Button>
          <Button
            onClick={() => void startImport()}
            isLoading={importing}
            disabled={!cfg?.connected || !syncEnabled || importing}
            variant="secondary"
          >
            {importing ? "Importing…" : ACTIONS.STORE["whatsapp-catalog-import"].label}
          </Button>
        </Row>

        <Text className="mt-3" color="faint" size="xs">
          <Span weight="bold">Push</Span> sends your published standard products to WhatsApp.{" "}
          <Span weight="bold">Import</Span> creates draft products from your WhatsApp catalog.
          Products are matched by slug in the description field.
        </Text>
      </Section>

      {/* ── Section 4: Announcement preview ─────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="mb-2" color="primary" size="sm" weight="semibold">
          Purchase Announcement Preview
        </Heading>
        <Text className="mb-3" color="muted" size="xs">
          This message is sent automatically to your phone and the platform admin when a new order is placed.
        </Text>
        <Div textSize="sm" className="font-mono" color="primary" surface="muted" padding="inline" rounded="lg">
          {buildPurchaseAnnouncementMessage({
            buyerName: "Ravi K.",
            firstItemName: "Charizard PSA 9",
            additionalItemCount: 2,
            totalAmount: 4500,
            orderId: "order-3-20260510-a1b2c3",
          })}
        </Div>
      </Section>

      {/* ── Section 5: Catalog preview ───────────────────────────────────── */}
      <Section className={CLS_SECTION_CARD}>
        <Heading level={2} className="mb-2" color="primary" size="sm" weight="semibold">
          Catalog Preview
        </Heading>
        <Text className="mb-4" color="muted" size="xs">
          This is how your products appear in the WhatsApp Catalog when a buyer taps "View Catalog" in the chat. Only published standard products are included.
        </Text>

        {/* Simulated WhatsApp catalog tile grid */}
        <Div className={`${__O.hidden} bg-[var(--appkit-color-whatsapp-bg)] bg-[var(--appkit-color-surface-elevated)] ${__P.p3}`} rounded="xl" border="default">
          <Row gap="sm" align="center" className="mb-3">
            <Row className="w-8 h-8 bg-[var(--appkit-color-whatsapp)]" align="center" justify="center" rounded="full">
              <Text color="inverse" size="xs" weight="bold">W</Text>
            </Row>
            <Div>
              <Text size="xs" weight="semibold" color="primary">
                {cfg?.connected ? "Your Store" : "Store Name"}
              </Text>
              <Text className="text-[10px]" color="muted">WhatsApp Business</Text>
            </Div>
          </Row>

          <Div layout="grid" gap="2" className="grid-cols-2">
            {SAMPLE_CATALOG_ITEMS.map((item) => (
              <Div key={item.id} surface="card" className={`${__O.hidden}`}>
                <Row className="aspect-square" surface="subtle" align="center" justify="center">
                  <Text size="2xl">{item.emoji}</Text>
                </Row>
                <Div padding="xs">
                  <Text className="line-clamp-2 leading-tight" color="primary" size="xs" weight="medium">
                    {item.name}
                  </Text>
                  <Text className="text-[var(--appkit-color-whatsapp)] mt-0.5" size="xs" weight="semibold">
                    {item.price}
                  </Text>
                </Div>
              </Div>
            ))}
          </Div>

          <Div className="mt-3 text-center">
            <Text className="text-[10px]" color="muted">
              {cfg?.lastSyncCount
                ? `${cfg.lastSyncCount} products synced to catalog`
                : "Sync your products to populate the catalog"}
            </Text>
          </Div>
        </Div>

        {!cfg?.connected && (
          <Text className="text-warning mt-2" size="xs">
            Connect your WhatsApp Business account above to enable the catalog.
          </Text>
        )}
      </Section>

    </Stack>
  );
}
