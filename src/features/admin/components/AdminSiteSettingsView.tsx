"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import type { FirestoreDocument } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, BackgroundRenderer, Button, Div, FormActions, Grid, Input, PaginatedSelect, Row, Select, Slider, Span, Stack, StackedViewShell, Tabs, TabsContent, TabsList, TabsTrigger, Text, Textarea, Toggle, useToast } from "../../../ui";
import type { SelectOption } from "../../../ui/components/Select";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { ImageUpload } from "../../media/upload/ImageUpload";
/*
 * One definition of the floor, shared with the Zod schema that enforces it
 * and the resolver that honours it. `payout-hold.ts` and its only dependency
 * `business-days.ts` are pure TypeScript with no firebase-admin and no
 * `_internal/server` reach, so this is safe in a `"use client"` file.
 */
import { PAYOUT_HOLD_FLOOR_DAYS } from "../../../_internal/shared/fees/payout-hold";
import { MediaUploadField } from "../../media/upload/MediaUploadField";
import { useMediaUpload } from "../../media/hooks/useMedia";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { NOTIFICATION_TYPE_TABS } from "../../../constants/notification-types";
import {
  ALL_LISTING_TYPES,
  ALL_BROWSE_PAGES,
} from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import {
  SITE_SETTINGS_TABS,
  isSiteSettingsTabId,
  type SiteSettingsTabId,
} from "../constants/site-settings-tabs";
import {
  ThemeManagerView,
  type ThemeManagerValue,
} from "../../site-settings/components/ThemeManagerView";
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from "../../../tokens/themes";
import {
  DEFAULT_COLLECTOR_DROP_BID_INCREMENT_TIERS,
  type BidIncrementTier,
} from "../../../_internal/shared/features/collector-drops/config";
import { validateGstEnablement } from "../../../_internal/shared/features/site-settings/gst-registration";
import type { AboutHowItem, AboutValueItem, AboutMilestone, AboutTeamMember } from "../../about/schemas/firestore";
/*
 * 🛑 The SAME constant the checkout page and the server-side gate read. An
 * admin screen that defaulted its own input to a different number would show
 * a cap that is not the cap being enforced until somebody pressed Save.
 */
import { COD_MAX_ORDER_VALUE_FALLBACK } from "../schemas/firestore";
import { siteSettingsFormSchema } from "../schemas/site-settings-form";
import {
  siteSettingsBrandingFormSchema,
  type SiteSettingsBrandingFormValues,
} from "../schemas/site-settings-branding-form";
import {
  siteSettingsAnnouncementFormSchema,
  type SiteSettingsAnnouncementFormValues,
} from "../schemas/site-settings-announcement-form";
import {
  siteSettingsSeoFormSchema,
  type SiteSettingsSeoFormValues,
} from "../schemas/site-settings-seo-form";
import {
  siteSettingsContactFormSchema,
  type SiteSettingsContactFormValues,
} from "../schemas/site-settings-contact-form";
import {
  siteSettingsWatermarkFormSchema,
  type SiteSettingsWatermarkFormValues,
} from "../schemas/site-settings-watermark-form";
import {
  siteSettingsFeesFormSchema,
  type SiteSettingsFeesFormValues,
} from "../schemas/site-settings-fees-form";
import {
  siteSettingsProcurementFormSchema,
  type SiteSettingsProcurementFormValues,
} from "../schemas/site-settings-procurement-form";
import {
  siteSettingsLimitsFormSchema,
  type SiteSettingsLimitsFormValues,
} from "../schemas/site-settings-limits-form";
import {
  siteSettingsNotificationsFormSchema,
  type SiteSettingsNotificationsFormValues,
} from "../schemas/site-settings-notifications-form";
import {
  siteSettingsShippingFormSchema,
  type SiteSettingsShippingFormValues,
} from "../schemas/site-settings-shipping-form";
import {
  siteSettingsGstFormSchema,
  type SiteSettingsGstFormValues,
} from "../schemas/site-settings-gst-form";
import {
  siteSettingsEmiFormSchema,
  type SiteSettingsEmiFormValues,
} from "../schemas/site-settings-emi-form";
import {
  siteSettingsLegalFormSchema,
  type SiteSettingsLegalFormValues,
  LEGAL_PAGE_FIELDS,
} from "../schemas/site-settings-legal-form";
import {
  siteSettingsWhatsappFormSchema,
  type SiteSettingsWhatsappFormValues,
} from "../schemas/site-settings-whatsapp-form";
import {
  siteSettingsIntegrationsFormSchema,
  type SiteSettingsIntegrationsFormValues,
  MASKED_CREDENTIAL_FIELDS,
} from "../schemas/site-settings-integrations-form";
import {
  siteSettingsCollectorDropFormSchema,
  type SiteSettingsCollectorDropFormValues,
} from "../schemas/site-settings-collector-drop-form";
import {
  siteSettingsListingsFormSchema,
  type SiteSettingsListingsFormValues,
} from "../schemas/site-settings-listings-form";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { SectionForm } from "../../shell/SectionForm";
import { buildSectionsFromSchema, resolveFields } from "../../shell/build-sections";
import { useFieldVisibility } from "../../shell/useFieldVisibility";
import { swapFieldOrder } from "../../shell/field-ui-meta";
import { useEditMode } from "../../../_internal/client/edit-mode/EditModeProvider";
import { useFormShellState, FormShellContext, applyZodIssues, FieldInput, FieldTextarea } from "../../../ui/forms";
import { getBrandName, getBrandDomain } from "../../../core/brand-resolver";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminSiteSettingsViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

// --- Helpers -----------------------------------------------------------------

/** Parses a newline- or comma-separated address list into a clean string[]. */
function splitEmailList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function MaskedInput({
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
        textSize="xs"
        textColor="faint"
        paddingX="none"
        paddingY="none"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-3 top-8"
      >
        {revealed ? "Hide" : "Reveal"}
      </Button>
    </Div>
  );
}

const PRIORITY_OPTIONS: SelectOption[] = [
  { label: "Low (send all)", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical only", value: "critical" },
];

/*
 * Moved to module scope from inside the component body (2026-11-04,
 * Shipping tab migration) — `buildSectionsFromSchema`'s `opts.options` is a
 * plain object evaluated eagerly at the point the `useMemo` factory runs,
 * unlike a `renderers` function value, so a component-scoped `const`
 * declared textually AFTER that `useMemo` call would be a TDZ error at
 * runtime. A module-level const has no such ordering constraint.
 */
const CARRIER_OPTIONS: SelectOption[] = [
  { label: "Custom / Other", value: "custom" },
  { label: "Shiprocket", value: "shiprocket" },
  { label: "Delhivery", value: "delhivery" },
  { label: "Bluedart", value: "bluedart" },
  { label: "FedEx", value: "fedex" },
];

/*
 * Shared by every gateway that has a sandbox/production split (PhonePe,
 * Cashfree). Was `PHONEPE_ENVIRONMENT_OPTIONS`; renamed when the second
 * gateway needed the identical two options, because a provider-named
 * constant used by two providers is how a name stops meaning anything.
 * Module scope for the same eager-evaluation reason as `CARRIER_OPTIONS`
 * above (2026-11-04, Integrations tab migration).
 */
const GATEWAY_ENVIRONMENT_OPTIONS: SelectOption[] = [
  { label: "Sandbox (test)", value: "sandbox" },
  { label: "Production (live)", value: "production" },
];

/** Single persistent save action for the whole settings form — every tab writes
 * into the same combined payload, so one save covers whichever tabs were edited
 * regardless of which one is currently active. */
/**
 * One tab panel's fields, as a SectionForm.
 *
 * 🛑 `hideActions`, and one section per tab rather than one form for the page.
 *
 * Tabs here are TASKS — "set up EMI", "configure the watermark" — and sections
 * are the fields within a task, so a SectionForm inside a tab panel is the
 * right nesting rather than tabs-inside-a-form. But the save is NOT per tab:
 * `buildFullPayload()` writes the whole `siteSettings` singleton every time, so
 * twenty Save rows would be twenty buttons each appearing to save its own tab
 * while all of them save everything. The single "Save all changes" bar below
 * the tabs stays the only submit, and it carries the one `FormErrorSummary`.
 */
function SettingsTabForm({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <SectionForm<FirestoreDocument>
      sections={[{ id, label, render: () => <>{children}</> }]}
      values={EMPTY_TAB_VALUES}
      // Every control in these panels writes through its own `useState` setter;
      // there is no generic path to route.
      onChange={() => undefined}
      onSubmit={() => undefined}
      hideActions
    />
  );
}

/**
 * A stable empty object, so `SectionForm`'s `values` identity does not change
 * on every render of a 20-tab page.
 */
const EMPTY_TAB_VALUES: FirestoreDocument = {};

function SaveAllBar({ isPending, onSave }: { isPending: boolean; onSave: () => void }) {
  return (
    <>
      {/* One summary for the whole settings document — every tab writes into
          the same payload and one save covers all of them, so a single place
          to read what is wrong is correct here. */}
      <FormErrorSummary />
      <FormActions align="right">
        <Button type="button" isLoading={isPending} disabled={isPending} onClick={onSave}>
          {isPending ? "Saving…" : "Save all changes"}
        </Button>
      </FormActions>
    </>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminSiteSettingsView({
  labels = {},
  pageRegionCards = [],
  ...rest
}: AdminSiteSettingsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  /*
   * The open tab comes from `?tab=`, so a deep link can reach a specific
   * control. It was `defaultValue="branding"` with no URL involvement at all,
   * which is why "search for the maintenance toggle" had nowhere to land: the
   * index could name the destination and the page could not honour it.
   *
   * Validated against the union rather than trusted — an unknown `?tab=` opens
   * the default tab, which looks like the search simply missed rather than
   * like a bad link.
   */
  const [activeTab, setActiveTab] = React.useState<SiteSettingsTabId>(() => {
    if (typeof window === "undefined") return "branding";
    const requested = new URLSearchParams(window.location.search).get("tab");
    return isSiteSettingsTabId(requested) ? requested : "branding";
  });
  const { upload } = useMediaUpload();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.ADMIN_SITE);
      return (res as any)?.data ?? res;
    },
  });

  const s = (data ?? {}) as any;

  // ① Branding — first tab migrated to the Universal Template System
  // (schema + buildSectionsFromSchema), 2026-11-04. One combined object
  // instead of eight useState calls; `chatEnabled` defaults false (D9,
  // opt-in) and `assistantEnabled` defaults true (kill switch on an
  // already-shipped path, matching assertAssistantEnabled's server-side
  // polarity) — same defaults the eight separate calls used.
  const [brandingForm, setBrandingForm] = React.useState<SiteSettingsBrandingFormValues>({
    siteName: "", tagline: "", logoUrl: "", faviconUrl: "",
    maintenanceMode: false, maintenanceMessage: "",
    chatEnabled: false, assistantEnabled: true,
  });
  const { editMode } = useEditMode();
  const {
    fields: brandingVisibilityFields,
    setVisible: setBrandingFieldVisible,
    fieldOrder: brandingFieldOrder,
    setFieldOrder: setBrandingFieldOrder,
  } = useFieldVisibility("admin-site-settings-branding");
  const brandingSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsBrandingFormValues>(siteSettingsBrandingFormSchema, {
        renderers: {
          logoUrl: ({ values, onChange }) => (
            <ImageUpload
              label="Logo"
              currentImage={(values.logoUrl as string) ?? ""}
              onUpload={(file) => upload(file, "store")}
              onChange={(url) => onChange({ logoUrl: url })}
            />
          ),
          faviconUrl: ({ values, onChange }) => (
            <ImageUpload
              label="Favicon"
              currentImage={(values.faviconUrl as string) ?? ""}
              onUpload={(file) => upload(file, "store")}
              onChange={(url) => onChange({ faviconUrl: url })}
            />
          ),
        },
        fieldVisibility: brandingVisibilityFields,
        editMode,
        onToggleFieldVisibility: setBrandingFieldVisible,
        fieldOrder: brandingFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setBrandingFieldOrder(
            swapFieldOrder(
              brandingFieldOrder,
              resolveFields(siteSettingsBrandingFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [brandingVisibilityFields, editMode, setBrandingFieldVisible, brandingFieldOrder, setBrandingFieldOrder, upload],
  );

  // ② Appearance — background image/gradient/color/video (light + dark).
  // The old primaryColor/secondaryColor/accentColor/fontFamily/defaultTheme
  // fields here were dead (saved to Firestore, never read back anywhere —
  // redundant with the working Theme Manager tab below). Removed 2026-08-09.
  const [lightBgType, setLightBgType] = React.useState<"color" | "gradient" | "image" | "video">("color");
  const [lightBgValue, setLightBgValue] = React.useState("");
  const [lightBgOverlayEnabled, setLightBgOverlayEnabled] = React.useState(false);
  const [lightBgOverlayColor, setLightBgOverlayColor] = React.useState("#000000");
  const [lightBgOverlayOpacity, setLightBgOverlayOpacity] = React.useState(30);
  const [darkBgType, setDarkBgType] = React.useState<"color" | "gradient" | "image" | "video">("color");
  const [darkBgValue, setDarkBgValue] = React.useState("");
  const [darkBgOverlayEnabled, setDarkBgOverlayEnabled] = React.useState(false);
  const [darkBgOverlayColor, setDarkBgOverlayColor] = React.useState("#000000");
  const [darkBgOverlayOpacity, setDarkBgOverlayOpacity] = React.useState(30);

  // Theme registry (custom themes + default-light / default-dark pointers).
  const [themeRegistry, setThemeRegistry] = React.useState<ThemeManagerValue>({
    themes: [],
    defaultLightThemeId: DEFAULT_LIGHT_THEME.id,
    defaultDarkThemeId: DEFAULT_DARK_THEME.id,
  });

  // ③ Announcement — second tab migrated to the Universal Template System,
  // 2026-11-04. One combined object instead of four useState calls.
  const [announcementForm, setAnnouncementForm] = React.useState<SiteSettingsAnnouncementFormValues>({
    announcementEnabled: false, announcementText: "", announcementLink: "", announcementBg: "",
  });
  const {
    fields: announcementVisibilityFields,
    setVisible: setAnnouncementFieldVisible,
    fieldOrder: announcementFieldOrder,
    setFieldOrder: setAnnouncementFieldOrder,
  } = useFieldVisibility("admin-site-settings-announcement");
  const announcementSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsAnnouncementFormValues>(siteSettingsAnnouncementFormSchema, {
        renderers: {
          announcementBg: ({ values, onChange }) => (
            <Stack gap="none">
              <Text size="sm" weight="medium" color="muted" className="mb-1">Background color</Text>
              <Input
                type="color"
                aria-label="Background color"
                value={(values.announcementBg as string) || "#1d4ed8"}
                onChange={(e) => onChange({ announcementBg: e.target.value })}
                className="h-10 w-32 cursor-pointer"
                bare
              /> {/* audit-hex-tokens-ok: native color picker requires literal hex string fallback */}
            </Stack>
          ),
        },
        fieldVisibility: announcementVisibilityFields,
        editMode,
        onToggleFieldVisibility: setAnnouncementFieldVisible,
        fieldOrder: announcementFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setAnnouncementFieldOrder(
            swapFieldOrder(
              announcementFieldOrder,
              resolveFields(siteSettingsAnnouncementFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [announcementVisibilityFields, editMode, setAnnouncementFieldVisible, announcementFieldOrder, setAnnouncementFieldOrder],
  );

  // ④ SEO — third tab migrated to the Universal Template System, 2026-11-04.
  const [seoForm, setSeoForm] = React.useState<SiteSettingsSeoFormValues>({
    seoTitle: "", seoDescription: "", seoOgImage: "", canonicalUrl: "", seoNoIndex: false,
  });
  const {
    fields: seoVisibilityFields,
    setVisible: setSeoFieldVisible,
    fieldOrder: seoFieldOrder,
    setFieldOrder: setSeoFieldOrder,
  } = useFieldVisibility("admin-site-settings-seo");
  const seoSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsSeoFormValues>(siteSettingsSeoFormSchema, {
        renderers: {
          seoOgImage: ({ values, onChange }) => (
            <ImageUpload
              label="Default OG image"
              currentImage={(values.seoOgImage as string) ?? ""}
              onUpload={(file) => upload(file, "store")}
              onChange={(url) => onChange({ seoOgImage: url })}
            />
          ),
        },
        fieldVisibility: seoVisibilityFields,
        editMode,
        onToggleFieldVisibility: setSeoFieldVisible,
        fieldOrder: seoFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setSeoFieldOrder(
            swapFieldOrder(
              seoFieldOrder,
              resolveFields(siteSettingsSeoFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [seoVisibilityFields, editMode, setSeoFieldVisible, seoFieldOrder, setSeoFieldOrder, upload],
  );

  // ⑤ Contact & Social — fourth tab migrated to the Universal Template
  // System, 2026-11-04. One combined object instead of twelve useState
  // calls.
  //
  // 🛑 `upiVpa` specifically is load-bearing, and its absence from this
  // object was a live bug until 2026-10-19 under the old per-field state.
  // `buildFullPayload()` writes the WHOLE `contact` group, so a key this
  // component does not carry is erased on the next save of ANY tab.
  // `contact.upiVpa` is the site-wide fallback `resolveDisplayedUpiId` uses
  // when a seller has no UPI configured or the store is admin-owned — i.e.
  // the VPA a manual-payment buyer is told to pay into. Carried through
  // unconditionally below, same as every other field in this object.
  const [contactForm, setContactForm] = React.useState<SiteSettingsContactFormValues>({
    supportEmail: "", supportPhone: "", supportAddress: "", supportHours: "",
    instagram: "", twitter: "", facebook: "", youtube: "", whatsapp: "",
    upiVpa: "", linkedin: "", pinterest: "",
  });
  const {
    fields: contactVisibilityFields,
    setVisible: setContactFieldVisible,
    fieldOrder: contactFieldOrder,
    setFieldOrder: setContactFieldOrder,
  } = useFieldVisibility("admin-site-settings-contact");
  const contactSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsContactFormValues>(siteSettingsContactFormSchema, {
        fieldVisibility: contactVisibilityFields,
        editMode,
        onToggleFieldVisibility: setContactFieldVisible,
        fieldOrder: contactFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setContactFieldOrder(
            swapFieldOrder(
              contactFieldOrder,
              resolveFields(siteSettingsContactFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [contactVisibilityFields, editMode, setContactFieldVisible, contactFieldOrder, setContactFieldOrder],
  );

  // ⑥ Watermark — fifth tab migrated to the Universal Template System,
  // 2026-11-04. One combined object instead of nine useState calls.
  //
  // "custom" is only ever set by the offset toggle, never a 6th Select
  // option (keeps the picker at 5 options — see PaginatedSelect rule for >5)
  // — `watermarkPosition` itself stays the 5-value enum; `buildFullPayload()`
  // still substitutes "custom" for the SAVED `position` key when the offset
  // toggle is on, exactly as the old single-field version did.
  const [watermarkForm, setWatermarkForm] = React.useState<SiteSettingsWatermarkFormValues>({
    watermarkType: "text", watermarkText: getBrandDomain(), watermarkImageUrl: "",
    watermarkSize: 10, watermarkOpacity: 10, watermarkPosition: "center",
    watermarkUseCustomOffset: false, watermarkOffsetX: 0, watermarkOffsetY: 0,
  });
  const {
    fields: watermarkVisibilityFields,
    setVisible: setWatermarkFieldVisible,
    fieldOrder: watermarkFieldOrder,
    setFieldOrder: setWatermarkFieldOrder,
  } = useFieldVisibility("admin-site-settings-watermark");
  const watermarkSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsWatermarkFormValues>(siteSettingsWatermarkFormSchema, {
        renderers: {
          watermarkImageUrl: ({ values, onChange }) => (
            <ImageUpload
              label="Watermark image"
              currentImage={(values.watermarkImageUrl as string) ?? ""}
              onUpload={(file) => upload(file, "store")}
              onChange={(url) => onChange({ watermarkImageUrl: url })}
            />
          ),
          watermarkSize: ({ values, onChange }) => (
            <Slider
              label={`Size — ${values.watermarkSize}% of image width`}
              value={values.watermarkSize as number}
              onChange={(v) => onChange({ watermarkSize: v })}
              min={5}
              max={100}
              step={5}
            />
          ),
          watermarkOpacity: ({ values, onChange }) => (
            <Slider
              label={`Opacity — ${values.watermarkOpacity}%`}
              value={values.watermarkOpacity as number}
              onChange={(v) => onChange({ watermarkOpacity: v })}
              min={5}
              max={100}
              step={5}
            />
          ),
          watermarkPosition: ({ values, onChange }) => (
            <Select
              label="Position"
              options={[
                { label: "Center", value: "center" },
                { label: "Top left", value: "top-left" },
                { label: "Top right", value: "top-right" },
                { label: "Bottom left", value: "bottom-left" },
                { label: "Bottom right", value: "bottom-right" },
              ]}
              value={values.watermarkPosition as string}
              onValueChange={(v) => onChange({ watermarkPosition: v as SiteSettingsWatermarkFormValues["watermarkPosition"] })}
              disabled={Boolean(values.watermarkUseCustomOffset)}
            />
          ),
          watermarkOffsetX: ({ values, onChange }) => (
            <Input
              label="X offset (%) — + right / − left of center"
              value={String(values.watermarkOffsetX)}
              onChange={(e) => onChange({ watermarkOffsetX: Math.max(-45, Math.min(45, parseInt(e.target.value) || 0)) })}
              type="number"
              min={-45}
              max={45}
            />
          ),
          watermarkOffsetY: ({ values, onChange }) => (
            <Input
              label="Y offset (%) — + down / − up from center"
              value={String(values.watermarkOffsetY)}
              onChange={(e) => onChange({ watermarkOffsetY: Math.max(-45, Math.min(45, parseInt(e.target.value) || 0)) })}
              type="number"
              min={-45}
              max={45}
            />
          ),
        },
        fieldVisibility: watermarkVisibilityFields,
        editMode,
        onToggleFieldVisibility: setWatermarkFieldVisible,
        fieldOrder: watermarkFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setWatermarkFieldOrder(
            swapFieldOrder(
              watermarkFieldOrder,
              resolveFields(siteSettingsWatermarkFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [watermarkVisibilityFields, editMode, setWatermarkFieldVisible, watermarkFieldOrder, setWatermarkFieldOrder, upload],
  );
  const watermarkPreviewRef = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = watermarkPreviewRef.current;
    if (!el) return;
    el.style.fontSize = `${Math.max(10, watermarkForm.watermarkSize / 5)}px`;
    el.style.opacity = String(watermarkForm.watermarkOpacity / 100);
  }, [watermarkForm.watermarkSize, watermarkForm.watermarkOpacity]);

  // ⑮ Procurement — seventh tab migrated to the Universal Template System,
  // 2026-11-04. Two useState calls collapsed into one combined object.
  const [procurementForm, setProcurementForm] = React.useState<SiteSettingsProcurementFormValues>({
    laborHourlyRate: 200, laborMaxHoursPerDay: 6,
  });
  const {
    fields: procurementVisibilityFields,
    setVisible: setProcurementFieldVisible,
    fieldOrder: procurementFieldOrder,
    setFieldOrder: setProcurementFieldOrder,
  } = useFieldVisibility("admin-site-settings-procurement");
  const procurementSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsProcurementFormValues>(siteSettingsProcurementFormSchema, {
        fieldVisibility: procurementVisibilityFields,
        editMode,
        onToggleFieldVisibility: setProcurementFieldVisible,
        fieldOrder: procurementFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setProcurementFieldOrder(
            swapFieldOrder(
              procurementFieldOrder,
              resolveFields(siteSettingsProcurementFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [procurementVisibilityFields, editMode, setProcurementFieldVisible, procurementFieldOrder, setProcurementFieldOrder],
  );

  // ⑯ EMI — twelfth tab migrated to the Universal Template System,
  // 2026-11-04. Seven useState calls collapsed into one combined object.
  const [emiForm, setEmiForm] = React.useState<SiteSettingsEmiFormValues>({
    emiEnabled: false, emiMinOrderValue: 10000, emiTenureOptionsText: "2,3,4,5,6",
    emiTokenPercent: 20, emiBillingDay: 5,
    emiSurchargePercentPerMonth: 2, emiSurchargeSellerSharePercent: 50,
  });
  const {
    fields: emiVisibilityFields,
    setVisible: setEmiFieldVisible,
    fieldOrder: emiFieldOrder,
    setFieldOrder: setEmiFieldOrder,
  } = useFieldVisibility("admin-site-settings-emi");
  const emiSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsEmiFormValues>(siteSettingsEmiFormSchema, {
        fieldVisibility: emiVisibilityFields,
        editMode,
        onToggleFieldVisibility: setEmiFieldVisible,
        fieldOrder: emiFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setEmiFieldOrder(
            swapFieldOrder(
              emiFieldOrder,
              resolveFields(siteSettingsEmiFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [emiVisibilityFields, editMode, setEmiFieldVisible, emiFieldOrder, setEmiFieldOrder],
  );

  // ⑰ GST — eleventh tab migrated to the Universal Template System,
  // 2026-11-04. Four useState calls collapsed into one combined object.
  //
  // `validateGstEnablement()` is shown inline, live, and ONLY while the
  // toggle is on — the same rule the server enforces. `/api/admin/site`
  // rejects the save, so without this the admin would get a generic "save
  // failed" with no indication of which of the four fields it meant. Live
  // rather than on-submit because the toggle is the action: an admin who
  // flips it on sees immediately what else is needed, instead of
  // discovering it after a round trip. Empty when the toggle is off, so an
  // admin editing their address with GST disabled is never shown errors
  // about it (Root Cause #74 — a summary that accuses before anything was
  // attempted). Computed LIVE inside each custom renderer below, against
  // that renderer's own `values` parameter, rather than a separate
  // `useMemo` — simpler, and provably reactive to exactly what's on screen.
  const [gstForm, setGstForm] = React.useState<SiteSettingsGstFormValues>({
    gstEnabled: false, gstin: "", gstLegalName: "", gstAddress: "",
  });
  const {
    fields: gstVisibilityFields,
    setVisible: setGstFieldVisible,
    fieldOrder: gstFieldOrder,
    setFieldOrder: setGstFieldOrder,
  } = useFieldVisibility("admin-site-settings-gst");
  const gstSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsGstFormValues>(siteSettingsGstFormSchema, {
        renderers: {
          gstin: ({ values, onChange }) => {
            const problems = validateGstEnablement({
              enabled: Boolean(values.gstEnabled),
              gstin: values.gstin as string | undefined,
              legalName: values.gstLegalName as string | undefined,
              address: values.gstAddress as string | undefined,
            });
            return (
              <FieldInput
                name="gstin"
                label="GSTIN"
                hint="15-character GST Identification Number."
                error={problems.gstin}
                value={(values.gstin as string) ?? ""}
                onChange={(v) => onChange({ gstin: v })}
                placeholder="29AAAAA0000A1Z5"
                maxLength={15}
              />
            );
          },
          gstLegalName: ({ values, onChange }) => {
            const problems = validateGstEnablement({
              enabled: Boolean(values.gstEnabled),
              gstin: values.gstin as string | undefined,
              legalName: values.gstLegalName as string | undefined,
              address: values.gstAddress as string | undefined,
            });
            return (
              <FieldInput
                name="gstLegalName"
                label="Legal name"
                hint="Registered business name for invoices."
                error={problems.legalName}
                value={(values.gstLegalName as string) ?? ""}
                onChange={(v) => onChange({ gstLegalName: v })}
                placeholder={`${getBrandName()} Pvt Ltd`}
              />
            );
          },
          gstAddress: ({ values, onChange }) => {
            const problems = validateGstEnablement({
              enabled: Boolean(values.gstEnabled),
              gstin: values.gstin as string | undefined,
              legalName: values.gstLegalName as string | undefined,
              address: values.gstAddress as string | undefined,
            });
            return (
              <FieldTextarea
                name="gstAddress"
                label="Registered address"
                error={problems.address}
                value={(values.gstAddress as string) ?? ""}
                onChange={(v) => onChange({ gstAddress: v })}
                placeholder="Registered business address for GST invoices…"
                rows={3}
              />
            );
          },
        },
        fieldVisibility: gstVisibilityFields,
        editMode,
        onToggleFieldVisibility: setGstFieldVisible,
        fieldOrder: gstFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setGstFieldOrder(
            swapFieldOrder(
              gstFieldOrder,
              resolveFields(siteSettingsGstFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [gstVisibilityFields, editMode, setGstFieldVisible, gstFieldOrder, setGstFieldOrder],
  );
  // ⑦ Fees & Commissions — sixth tab migrated to the Universal Template
  // System, 2026-11-04. Twenty-four useState calls collapsed into one
  // combined object. 🛑 D13 — `saleProtectionFee*`/`codHandlingFee*` had NO
  // state, NO field and NO control at all until that fix, while
  // `updateSingleton` replaced the whole `commissions` map on every save —
  // so the first save of any commissions field silently deleted them (sale
  // protection stopped being sold, COD handling reverted to code defaults).
  // The repository now writes dotted paths, so an omitted key survives, but
  // the controls still have to exist. `saleProtectionFeeEnabled` defaults
  // true to match the platform-tier default (the SELLER tier is the opt-in).
  const [feesForm, setFeesForm] = React.useState<SiteSettingsFeesFormValues>({
    platformFeePercent: 5, gstPercent: 18, minimumTransactionFee: 0, platformFeeMax: 10,
    gatewayFeePercent: 2, payoutHoldDays: 7, minPayoutAmount: 100,
    collectorDropListingFee: 0, preOrderListingFee: 0, featuredSlotFee: 999, promotedSlotFee: 499,
    codDepositPercent: 10,
    whatsappNotifyFeeEnabled: false, whatsappNotifyFee: 10,
    giftWrapFeeEnabled: false, giftWrapFee: 49,
    shipmentProtectionFeeEnabled: false, shipmentProtectionFeePercent: 2, shipmentProtectionFeeMin: 30,
    saleProtectionFeeEnabled: true, saleProtectionFeePercent: 3, saleProtectionFeeMin: 49,
    codHandlingFeePercent: 10, codHandlingFeeCap: 200,
  });
  const {
    fields: feesVisibilityFields,
    setVisible: setFeesFieldVisible,
    fieldOrder: feesFieldOrder,
    setFieldOrder: setFeesFieldOrder,
  } = useFieldVisibility("admin-site-settings-fees");
  const feesSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsFeesFormValues>(siteSettingsFeesFormSchema, {
        fieldVisibility: feesVisibilityFields,
        editMode,
        onToggleFieldVisibility: setFeesFieldVisible,
        fieldOrder: feesFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setFeesFieldOrder(
            swapFieldOrder(
              feesFieldOrder,
              resolveFields(siteSettingsFeesFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [feesVisibilityFields, editMode, setFeesFieldVisible, feesFieldOrder, setFeesFieldOrder],
  );

  // ⑧ Integrations — fifteenth tab migrated to the Universal Template
  // System, 2026-11-04, and the largest by field count (30). Thirty
  // useState calls collapsed into one combined object.
  //
  // D7b — Microsoft Clarity. Blank keeps it OFF; there is no enable toggle,
  // and the absence of an id IS the off state (the same shape as the other
  // three analytics fields).
  const [integrationsForm, setIntegrationsForm] = React.useState<SiteSettingsIntegrationsFormValues>({
    razorpayKeyId: "", razorpayKeySecret: "", razorpayWebhookSecret: "",
    cashfreeAppId: "", cashfreeSecretKey: "", cashfreeEnvironment: "sandbox", cashfreeWebhookSecret: "",
    phonepeClientId: "", phonepeClientSecret: "", phonepeClientVersion: "1",
    phonepeEnvironment: "sandbox", phonepeWebhookUsername: "", phonepeWebhookPassword: "",
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpFrom: "",
    googleMapsApiKey: "", googlePlaceId: "",
    gaMeasurementId: "", fbPixelId: "", gtmContainerId: "", clarityProjectId: "",
    metaPageAccessToken: "", metaPageId: "",
    tiktokClientKey: "", tiktokClientSecret: "", tiktokAccessToken: "",
    deviantartClientId: "", deviantartClientSecret: "",
  });
  const {
    fields: integrationsVisibilityFields,
    setVisible: setIntegrationsFieldVisible,
    fieldOrder: integrationsFieldOrder,
    setFieldOrder: setIntegrationsFieldOrder,
  } = useFieldVisibility("admin-site-settings-integrations");
  const integrationsSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsIntegrationsFormValues>(siteSettingsIntegrationsFormSchema, {
        renderers: {
          ...Object.fromEntries(
            MASKED_CREDENTIAL_FIELDS.map(({ name, label, placeholder }) => [
              name,
              ({ values, onChange }: {
                values: SiteSettingsIntegrationsFormValues;
                onChange: (partial: Partial<SiteSettingsIntegrationsFormValues>) => void;
              }) => (
                <MaskedInput
                  label={label}
                  value={(values[name] as string) ?? ""}
                  onChange={(v) => onChange({ [name]: v } as Partial<SiteSettingsIntegrationsFormValues>)}
                  placeholder={placeholder}
                />
              ),
            ]),
          ),
        },
        options: {
          phonepeEnvironment: GATEWAY_ENVIRONMENT_OPTIONS,
          cashfreeEnvironment: GATEWAY_ENVIRONMENT_OPTIONS,
        },
        fieldVisibility: integrationsVisibilityFields,
        editMode,
        onToggleFieldVisibility: setIntegrationsFieldVisible,
        fieldOrder: integrationsFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setIntegrationsFieldOrder(
            swapFieldOrder(
              integrationsFieldOrder,
              resolveFields(siteSettingsIntegrationsFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [integrationsVisibilityFields, editMode, setIntegrationsFieldVisible, integrationsFieldOrder, setIntegrationsFieldOrder],
  );

  // ⑨ Shipping (Payment methods + Shipping Defaults + Seller shipping charge
  // defaults) — tenth tab migrated to the Universal Template System,
  // 2026-11-04. Fourteen useState calls collapsed into one combined object,
  // including the 3 `commissions.*` fields shared with the Fees tab (its
  // buildFullPayload() spread now reads them from `shippingForm` instead of
  // bare vars — see that schema's own header for the seam).
  //
  // 🛑 `platformStoreId` defaults to EMPTY, which means "every store is
  // third-party" and therefore refuses online collection for every cart.
  // That is the fail-closed direction and it must not be "helpfully"
  // defaulted to a store id here — a wrong guess would authorise collecting
  // another seller's money into the platform's own account (the RBI
  // commingling), and it would present as a completely successful checkout.
  const [shippingForm, setShippingForm] = React.useState<SiteSettingsShippingFormValues>({
    razorpayEnabled: false, phonepeEnabled: false, cashfreeEnabled: false,
    platformStoreId: "", upiManualEnabled: true, codEnabled: true,
    freeShippingThreshold: 999, defaultCarrier: "custom", maxDeliveryRadius: 0,
    codMaxOrderValue: COD_MAX_ORDER_VALUE_FALLBACK, otpCheckoutThreshold: 5000,
    sellerShippingFixed: 0, platformShippingPercent: 10, platformShippingFixedMin: 0,
  });
  const {
    fields: shippingVisibilityFields,
    setVisible: setShippingFieldVisible,
    fieldOrder: shippingFieldOrder,
    setFieldOrder: setShippingFieldOrder,
  } = useFieldVisibility("admin-site-settings-shipping");
  const shippingSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsShippingFormValues>(siteSettingsShippingFormSchema, {
        options: { defaultCarrier: CARRIER_OPTIONS },
        fieldVisibility: shippingVisibilityFields,
        editMode,
        onToggleFieldVisibility: setShippingFieldVisible,
        fieldOrder: shippingFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setShippingFieldOrder(
            swapFieldOrder(
              shippingFieldOrder,
              resolveFields(siteSettingsShippingFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [shippingVisibilityFields, editMode, setShippingFieldVisible, shippingFieldOrder, setShippingFieldOrder],
  );

  // ⑱ Listings — seventeenth tab migrated to the Universal Template
  // System, 2026-11-04. Three Record<string, boolean> useState calls
  // collapsed into one combined object. All three are DYNAMIC
  // registry-driven toggle grids (keys come from LISTING_TYPE_KEYS/
  // CATEGORY_TYPE_KEYS/BROWSE_PAGE_KEYS, declared further down this
  // component body) rather than fixed scalar fields — see
  // site-settings-listings-form.ts's header for why that's a Record field
  // with a custom renderer rather than per-key schema fields.
  const [listingsForm, setListingsForm] = React.useState<SiteSettingsListingsFormValues>({
    listingTypeFlags: {}, categoryTypeFlags: {}, browsePageFlags: {},
  });
  const {
    fields: listingsVisibilityFields,
    setVisible: setListingsFieldVisible,
    fieldOrder: listingsFieldOrder,
    setFieldOrder: setListingsFieldOrder,
  } = useFieldVisibility("admin-site-settings-listings");
  const listingsSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsListingsFormValues>(siteSettingsListingsFormSchema, {
        renderers: {
          listingTypeFlags: ({ values, onChange }) => {
            const flags = (values.listingTypeFlags as Record<string, boolean>) ?? {};
            return (
              <Grid cols={2} gap="sm">
                {LISTING_TYPE_KEYS.map((key) => (
                  <Toggle
                    key={key}
                    // The plugin's own display label, not the raw key — the
                    // literal version rendered "pre-order" and
                    // "digital-code" at an admin.
                    label={pluginFor(key).typeLabel}
                    checked={flags[key] ?? true}
                    onChange={(v) => onChange({ listingTypeFlags: { ...flags, [key]: v } })}
                  />
                ))}
              </Grid>
            );
          },
          categoryTypeFlags: ({ values, onChange }) => {
            const flags = (values.categoryTypeFlags as Record<string, boolean>) ?? {};
            return (
              <Grid cols={2} gap="sm">
                {CATEGORY_TYPE_KEYS.map((key) => (
                  <Toggle
                    key={key}
                    label={key}
                    checked={flags[key] ?? true}
                    onChange={(v) => onChange({ categoryTypeFlags: { ...flags, [key]: v } })}
                  />
                ))}
              </Grid>
            );
          },
          browsePageFlags: ({ values, onChange }) => {
            const flags = (values.browsePageFlags as Record<string, boolean>) ?? {};
            return (
              <Grid cols={2} gap="sm">
                {/* The hint sits BESIDE the toggle rather than inside its
                    `label`: Toggle has no `description` prop, and widening a
                    primitive used on ~70 surfaces to carry a hint for four
                    rows is the wrong trade. */}
                {BROWSE_PAGE_KEYS.map((key) => (
                  <Stack key={key} gap="xs">
                    <Toggle
                      label={BROWSE_PAGE_META[key]?.label ?? key}
                      checked={flags[key] ?? true}
                      onChange={(v) => onChange({ browsePageFlags: { ...flags, [key]: v } })}
                    />
                    <Text size="xs" color="muted">{BROWSE_PAGE_META[key]?.hint}</Text>
                  </Stack>
                ))}
              </Grid>
            );
          },
        },
        fieldVisibility: listingsVisibilityFields,
        editMode,
        onToggleFieldVisibility: setListingsFieldVisible,
        fieldOrder: listingsFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setListingsFieldOrder(
            swapFieldOrder(
              listingsFieldOrder,
              resolveFields(siteSettingsListingsFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [listingsVisibilityFields, editMode, setListingsFieldVisible, listingsFieldOrder, setListingsFieldOrder],
  );

  // ⑩ Collector Drop — sixteenth tab migrated to the Universal Template
  // System, 2026-11-04. Three useState calls collapsed into one combined
  // object. `bidIncrementTiers` keeps its original hand-written add/remove
  // UI as a custom renderer — see site-settings-collector-drop-form.ts's
  // header for why it does not fit the generic `<Repeater>` primitive.
  const [collectorDropForm, setCollectorDropForm] = React.useState<SiteSettingsCollectorDropFormValues>({
    bidIncrementTiers: DEFAULT_COLLECTOR_DROP_BID_INCREMENT_TIERS,
    autoExtendWindow: 5, settlementGrace: 24,
  });
  const {
    fields: collectorDropVisibilityFields,
    setVisible: setCollectorDropFieldVisible,
    fieldOrder: collectorDropFieldOrder,
    setFieldOrder: setCollectorDropFieldOrder,
  } = useFieldVisibility("admin-site-settings-collector-drop");
  const collectorDropSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsCollectorDropFormValues>(siteSettingsCollectorDropFormSchema, {
        renderers: {
          bidIncrementTiers: ({ values, onChange }) => {
            const tiers = (values.bidIncrementTiers as BidIncrementTier[]) ?? [];
            const setTiers = (next: BidIncrementTier[]) => onChange({ bidIncrementTiers: next });
            return (
              <Stack gap="sm">
                {tiers.map((tier, i) => {
                  const isLast = i === tiers.length - 1;
                  return (
                    <Grid align="end" key={i} gap="xs" className="grid-cols-12">
                      <Div className="col-span-5">
                        {isLast ? (
                          <>
                            <Text size="xs" weight="medium" className="mb-1">Up to (₹)</Text>
                            <Text size="sm" color="muted">and above</Text>
                          </>
                        ) : (
                          <Input
                            label="Up to (₹)"
                            type="number"
                            min={1}
                            value={String(tier.upTo ?? "")}
                            onChange={(e) => setTiers(tiers.map((t, j) => (j === i ? { ...t, upTo: parseInt(e.target.value) || 0 } : t)))}
                          />
                        )}
                      </Div>
                      <Div className="col-span-5">
                        <Input
                          label="Increment (₹)"
                          type="number"
                          min={1}
                          value={String(tier.increment)}
                          onChange={(e) => setTiers(tiers.map((t, j) => (j === i ? { ...t, increment: parseInt(e.target.value) || 0 } : t)))}
                        />
                      </Div>
                      <Row centered className="col-span-2" padding="b-xs">
                        <Button
                          variant="ghost"
                          type="button"
                          disabled={tiers.length <= 1}
                          onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                          aria-label="Remove tier"
                        >
                          ×
                        </Button>
                      </Row>
                    </Grid>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTiers([
                      ...tiers.slice(0, -1),
                      { upTo: 100, increment: 10 },
                      tiers[tiers.length - 1] ?? { upTo: null, increment: 1000 },
                    ])
                  }
                >
                  + Add tier
                </Button>
              </Stack>
            );
          },
        },
        fieldVisibility: collectorDropVisibilityFields,
        editMode,
        onToggleFieldVisibility: setCollectorDropFieldVisible,
        fieldOrder: collectorDropFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setCollectorDropFieldOrder(
            swapFieldOrder(
              collectorDropFieldOrder,
              resolveFields(siteSettingsCollectorDropFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [collectorDropVisibilityFields, editMode, setCollectorDropFieldVisible, collectorDropFieldOrder, setCollectorDropFieldOrder],
  );

  // ⑪ Platform Limits — eighth tab migrated to the Universal Template
  // System, 2026-11-04. Three useState calls collapsed into one combined
  // object.
  const [limitsForm, setLimitsForm] = React.useState<SiteSettingsLimitsFormValues>({
    maxProductsPerStore: 100, maxCustomFields: 50, orderCancelWindow: 24,
  });
  const {
    fields: limitsVisibilityFields,
    setVisible: setLimitsFieldVisible,
    fieldOrder: limitsFieldOrder,
    setFieldOrder: setLimitsFieldOrder,
  } = useFieldVisibility("admin-site-settings-limits");
  const limitsSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsLimitsFormValues>(siteSettingsLimitsFormSchema, {
        fieldVisibility: limitsVisibilityFields,
        editMode,
        onToggleFieldVisibility: setLimitsFieldVisible,
        fieldOrder: limitsFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setLimitsFieldOrder(
            swapFieldOrder(
              limitsFieldOrder,
              resolveFields(siteSettingsLimitsFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [limitsVisibilityFields, editMode, setLimitsFieldVisible, limitsFieldOrder, setLimitsFieldOrder],
  );

  // ⑫ Legal — thirteenth tab migrated to the Universal Template System,
  // 2026-11-04. Nine useState calls collapsed into one combined object.
  //
  // 🛑 D19 — `cancellation` and `grievance` are declared on
  // `SiteSettingsDocument.legalPages` and were once omitted from BOTH the
  // load and the payload here. Under the old wholesale-map replace that
  // meant an override written to either key was ERASED on the next
  // Legal-tab save — the same cause as D13, one group over, which is the
  // evidence that the repository fix (dotted paths) was the right level to
  // fix it at. The grievance page in particular is a statutory channel, so
  // an override silently reverting to the bundled default is a compliance
  // problem rather than a content one. Both are carried unconditionally
  // below, same as every other field.
  const [legalForm, setLegalForm] = React.useState<SiteSettingsLegalFormValues>({
    termsHtml: "", privacyHtml: "", refundHtml: "", shippingPolicyHtml: "",
    cookieHtml: "", ethicsHtml: "", conductHtml: "", cancellationHtml: "", grievanceHtml: "",
  });
  const {
    fields: legalVisibilityFields,
    setVisible: setLegalFieldVisible,
    fieldOrder: legalFieldOrder,
    setFieldOrder: setLegalFieldOrder,
  } = useFieldVisibility("admin-site-settings-legal");
  const legalSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsLegalFormValues>(siteSettingsLegalFormSchema, {
        renderers: Object.fromEntries(
          LEGAL_PAGE_FIELDS.map(({ name, label }) => [
            name,
            ({ values, onChange }: {
              values: SiteSettingsLegalFormValues;
              onChange: (partial: Partial<SiteSettingsLegalFormValues>) => void;
            }) => (
              <Textarea
                label={label}
                value={(values[name] as string) ?? ""}
                onChange={(e) => onChange({ [name]: e.target.value } as Partial<SiteSettingsLegalFormValues>)}
                placeholder={`Enter ${label} HTML here…`}
                rows={6}
                className="font-mono"
              />
            ),
          ]),
        ),
        fieldVisibility: legalVisibilityFields,
        editMode,
        onToggleFieldVisibility: setLegalFieldVisible,
        fieldOrder: legalFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setLegalFieldOrder(
            swapFieldOrder(
              legalFieldOrder,
              resolveFields(siteSettingsLegalFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [legalVisibilityFields, editMode, setLegalFieldVisible, legalFieldOrder, setLegalFieldOrder],
  );

  // ⑬ WhatsApp Business Cloud API (platform-level) — fourteenth tab
  // migrated to the Universal Template System, 2026-11-04. Ten useState
  // calls collapsed into one combined object.
  const [whatsappForm, setWhatsappForm] = React.useState<SiteSettingsWhatsappFormValues>({
    waPhoneNumberId: "", waCloudApiToken: "", waAdminNotifyNumbers: "",
    waTemplateLanguage: "en", waTemplateOrderPlaced: "", waTemplateOrderConfirmed: "",
    waTemplateOrderShipped: "", waTemplateOrderDelivered: "",
    waTemplateOrderCancelled: "", waTemplateRefundInitiated: "",
  });
  const {
    fields: whatsappVisibilityFields,
    setVisible: setWhatsappFieldVisible,
    fieldOrder: whatsappFieldOrder,
    setFieldOrder: setWhatsappFieldOrder,
  } = useFieldVisibility("admin-site-settings-whatsapp");
  const whatsappSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsWhatsappFormValues>(siteSettingsWhatsappFormSchema, {
        renderers: {
          waCloudApiToken: ({ values, onChange }) => (
            <MaskedInput
              label="Cloud API System User Token"
              value={(values.waCloudApiToken as string) ?? ""}
              onChange={(v) => onChange({ waCloudApiToken: v })}
              placeholder="EAAxxxxxxxx…"
              helperText="Long-lived system user access token with WhatsApp Business permissions"
            />
          ),
        },
        fieldVisibility: whatsappVisibilityFields,
        editMode,
        onToggleFieldVisibility: setWhatsappFieldVisible,
        fieldOrder: whatsappFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setWhatsappFieldOrder(
            swapFieldOrder(
              whatsappFieldOrder,
              resolveFields(siteSettingsWhatsappFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [whatsappVisibilityFields, editMode, setWhatsappFieldVisible, whatsappFieldOrder, setWhatsappFieldOrder],
  );

  // ⓪ About
  const [aboutTitle, setAboutTitle] = React.useState("");
  const [aboutSubtitle, setAboutSubtitle] = React.useState("");
  const [aboutMissionTitle, setAboutMissionTitle] = React.useState("");
  const [aboutMissionText, setAboutMissionText] = React.useState("");
  const [aboutHowItWorksTitle, setAboutHowItWorksTitle] = React.useState("");
  const [aboutHowItems, setAboutHowItems] = React.useState<AboutHowItem[]>([]);
  const [aboutValuesTitle, setAboutValuesTitle] = React.useState("");
  const [aboutValuesSubtitle, setAboutValuesSubtitle] = React.useState("");
  const [aboutValueItems, setAboutValueItems] = React.useState<AboutValueItem[]>([]);
  const [aboutMilestonesTitle, setAboutMilestonesTitle] = React.useState("");
  const [aboutMilestones, setAboutMilestones] = React.useState<AboutMilestone[]>([]);
  const [aboutTeamTitle, setAboutTeamTitle] = React.useState("");
  const [aboutTeamSubtitle, setAboutTeamSubtitle] = React.useState("");
  const [aboutTeamMembers, setAboutTeamMembers] = React.useState<AboutTeamMember[]>([]);
  const [aboutCtaTitle, setAboutCtaTitle] = React.useState("");
  const [aboutCtaSell, setAboutCtaSell] = React.useState("");
  const [aboutCtaShop, setAboutCtaShop] = React.useState("");

  // ⑭ Notification channels — ninth tab migrated to the Universal Template
  // System, 2026-11-04. Eighteen useState calls collapsed into one combined
  // object. Writes across FOUR save-payload groups in buildFullPayload()
  // (`messaging`, `notificationChannels`, part of `emailSettings`, and
  // `credentials.resendApiKey`) — see site-settings-notifications-form.ts's
  // header for the full breakdown.
  //
  // `msgEmailEnabled`/`msgWhatsappEnabled` suppress USER-facing mail only.
  // Staff mail — the daily digest, the payout summary — keeps flowing
  // regardless, because switching off customer email must never also blind
  // the operator.
  const [notificationsForm, setNotificationsForm] = React.useState<SiteSettingsNotificationsFormValues>({
    msgEmailEnabled: false, msgWhatsappEnabled: false, msgCeilingEmail: 80, msgCeilingWhatsapp: 200,
    notifEmailEnabled: false, notifEmailMinPriority: "normal", resendApiKey: "",
    notifFromEmail: "", notifFromName: "", notifEmailTypes: [],
    digestEnabled: false, digestRecipients: "",
    notifWhatsappEnabled: false, notifWhatsappMinPriority: "high",
    notifWhatsappOtpEnabled: false, notifWhatsappTypes: [],
    notifSmsEnabled: false, notifSmsMinPriority: "high",
  });
  const {
    fields: notificationsVisibilityFields,
    setVisible: setNotificationsFieldVisible,
    fieldOrder: notificationsFieldOrder,
    setFieldOrder: setNotificationsFieldOrder,
  } = useFieldVisibility("admin-site-settings-notifications");
  const notificationsSections = React.useMemo(
    () =>
      buildSectionsFromSchema<SiteSettingsNotificationsFormValues>(siteSettingsNotificationsFormSchema, {
        renderers: {
          resendApiKey: ({ values, onChange }) => (
            <MaskedInput
              label="Resend API Key"
              value={(values.resendApiKey as string) ?? ""}
              onChange={(v) => onChange({ resendApiKey: v })}
              placeholder="re_live_…"
              helperText="Get your key at resend.com — used for all transactional notifications."
            />
          ),
          notifEmailTypes: ({ values, onChange }) => (
            <PaginatedSelect<string>
              ariaLabel="Notification types"
              multiple
              options={NOTIF_TYPE_OPTIONS}
              value={values.notifEmailTypes as string[]}
              onChange={(v) => onChange({ notifEmailTypes: v })}
              placeholder="All notification types"
            />
          ),
          notifWhatsappTypes: ({ values, onChange }) => (
            <PaginatedSelect<string>
              multiple
              ariaLabel="Notification types to send over WhatsApp"
              options={NOTIF_TYPE_OPTIONS}
              value={values.notifWhatsappTypes as string[]}
              onChange={(v) => onChange({ notifWhatsappTypes: v })}
              placeholder="All notification types"
            />
          ),
        },
        options: {
          notifEmailMinPriority: PRIORITY_OPTIONS,
          notifWhatsappMinPriority: PRIORITY_OPTIONS,
          notifSmsMinPriority: PRIORITY_OPTIONS,
        },
        fieldVisibility: notificationsVisibilityFields,
        editMode,
        onToggleFieldVisibility: setNotificationsFieldVisible,
        fieldOrder: notificationsFieldOrder,
        onMoveField: (fieldName, neighborName) =>
          setNotificationsFieldOrder(
            swapFieldOrder(
              notificationsFieldOrder,
              resolveFields(siteSettingsNotificationsFormSchema).map((f) => f.name),
              fieldName,
              neighborName,
            ),
          ),
      }),
    [notificationsVisibilityFields, editMode, setNotificationsFieldVisible, notificationsFieldOrder, setNotificationsFieldOrder],
  );

  // Snapshot of the masked placeholder strings the server returned for every
  // credentials.* field, captured once per load. A combined single-save has
  // to send the FULL credentials object on every save (not just the group the
  // admin actually edited), so any untouched field must resolve back to "" —
  // sending its still-masked display value would re-encrypt the mask itself
  // and destroy the real secret. Comparing against this snapshot is how we
  // tell "unedited" from "admin actually typed a new value".
  const originalMaskedRef = React.useRef<Record<string, string>>({});
  const maskedOrReal = (field: string, current: string): string =>
    current !== (originalMaskedRef.current[field] ?? "") ? current : "";

  // Populate from query data
  React.useEffect(() => {
    if (!s || !Object.keys(s).length) return;
    setBrandingForm({
      siteName: s.siteName ?? "",
      tagline: s.tagline ?? "",
      logoUrl: s.logo ?? "",
      faviconUrl: s.favicon ?? "",
      maintenanceMode: s.maintenance?.enabled ?? false,
      maintenanceMessage: s.maintenance?.message ?? "",
      chatEnabled: s.chat?.enabled ?? false,
      assistantEnabled: s.assistant?.enabled ?? true,
    });

    setLightBgType(s.background?.light?.type ?? "color");
    setLightBgValue(s.background?.light?.value ?? "");
    setLightBgOverlayEnabled(s.background?.light?.overlay?.enabled ?? false);
    setLightBgOverlayColor(s.background?.light?.overlay?.color ?? "#000000");
    setLightBgOverlayOpacity(Math.round((s.background?.light?.overlay?.opacity ?? 0.3) * 100));
    setDarkBgType(s.background?.dark?.type ?? "color");
    setDarkBgValue(s.background?.dark?.value ?? "");
    setDarkBgOverlayEnabled(s.background?.dark?.overlay?.enabled ?? false);
    setDarkBgOverlayColor(s.background?.dark?.overlay?.color ?? "#000000");
    setDarkBgOverlayOpacity(Math.round((s.background?.dark?.overlay?.opacity ?? 0.3) * 100));

    const themeBlock = (s as FirestoreDocument).theme as
      | {
          themes?: Array<FirestoreDocument>;
          defaultLightThemeId?: string;
          defaultDarkThemeId?: string;
        }
      | undefined;
    setThemeRegistry({
      themes: (themeBlock?.themes ?? []) as unknown as ThemeManagerValue["themes"],
      defaultLightThemeId:
        themeBlock?.defaultLightThemeId ?? DEFAULT_LIGHT_THEME.id,
      defaultDarkThemeId:
        themeBlock?.defaultDarkThemeId ?? DEFAULT_DARK_THEME.id,
    });

    setAnnouncementForm({
      announcementEnabled: s.announcementBar?.enabled ?? false,
      announcementText: s.announcementBar?.message ?? "",
      announcementLink: s.announcementBar?.link ?? "",
      announcementBg: s.announcementBar?.backgroundColor ?? "",
    });

    setSeoForm({
      seoTitle: s.seo?.defaultTitle ?? "",
      seoDescription: s.seo?.defaultDescription ?? "",
      seoOgImage: s.seo?.defaultOgImage ?? "",
      seoNoIndex: s.seo?.noIndex ?? false,
      canonicalUrl: s.seo?.canonicalBaseUrl ?? "",
    });

    setContactForm({
      supportEmail: s.contact?.email ?? "",
      supportPhone: s.contact?.phone ?? "",
      supportAddress: s.contact?.address ?? "",
      supportHours: s.contact?.supportHours ?? "",
      instagram: s.socialLinks?.instagram ?? "",
      twitter: s.socialLinks?.twitter ?? "",
      facebook: s.socialLinks?.facebook ?? "",
      youtube: s.socialLinks?.youtube ?? "",
      whatsapp: s.contact?.whatsappNumber ?? "",
      upiVpa: s.contact?.upiVpa ?? "",
      linkedin: s.socialLinks?.linkedin ?? "",
      pinterest: s.socialLinks?.pinterest ?? "",
    });

    const loadedWatermarkPosition = s.watermark?.position ?? "center";
    setWatermarkForm({
      watermarkType: s.watermark?.type ?? "text",
      watermarkText: s.watermark?.text ?? getBrandDomain(),
      watermarkImageUrl: s.watermark?.imageUrl ?? "",
      watermarkSize: s.watermark?.size ?? 10,
      watermarkOpacity: s.watermark?.opacity ?? 10,
      watermarkUseCustomOffset: loadedWatermarkPosition === "custom",
      watermarkPosition:
        loadedWatermarkPosition === "custom"
          ? "center"
          : (loadedWatermarkPosition as SiteSettingsWatermarkFormValues["watermarkPosition"]),
      watermarkOffsetX: s.watermark?.offsetX ?? 0,
      watermarkOffsetY: s.watermark?.offsetY ?? 0,
    });

    setFeesForm({
      platformFeePercent: s.commissions?.platformFeePercent ?? 5,
      gstPercent: s.commissions?.gstPercent ?? 18,
      minimumTransactionFee: s.commissions?.minimumTransactionFee ?? 0,
      platformFeeMax: s.commissions?.platformFeeMax ?? 10,
      gatewayFeePercent: s.commissions?.gatewayFeePercent ?? 2,
      /*
       * 🛑 Clamped UP to the floor on load, deliberately.
       *
       * The live document is seeded `2`, and the payload Zod schema now
       * refuses anything below `PAYOUT_HOLD_FLOOR_DAYS` (7) — so without this
       * clamp an admin opening this tab would load 2, change something
       * unrelated, and be blocked from saving by a field they never touched.
       * The honoured value is already 7 (`resolvePayoutHoldDays` clamps at
       * read time), so showing 7 is showing the truth, not silently
       * overriding them.
       */
      payoutHoldDays: Math.max(s.commissions?.payoutHoldDays ?? 7, PAYOUT_HOLD_FLOOR_DAYS),
      minPayoutAmount: s.commissions?.minPayoutAmount ?? 100,
      collectorDropListingFee: s.commissions?.collectorDropListingFee ?? 0,
      preOrderListingFee: s.commissions?.preOrderListingFee ?? 0,
      featuredSlotFee: s.commissions?.featuredSlotFee ?? 999,
      promotedSlotFee: s.commissions?.promotedSlotFee ?? 499,
      codDepositPercent: s.commissions?.codDepositPercent ?? 10,
      whatsappNotifyFeeEnabled: s.commissions?.whatsappNotifyFeeEnabled ?? false,
      whatsappNotifyFee: s.commissions?.whatsappNotifyFee ?? 10,
      giftWrapFeeEnabled: s.commissions?.giftWrapFeeEnabled ?? false,
      giftWrapFee: s.commissions?.giftWrapFee ?? 49,
      shipmentProtectionFeeEnabled: s.commissions?.shipmentProtectionFeeEnabled ?? false,
      shipmentProtectionFeePercent: s.commissions?.shipmentProtectionFeePercent ?? 2,
      shipmentProtectionFeeMin: s.commissions?.shipmentProtectionFeeMin ?? 30,
      saleProtectionFeeEnabled: s.commissions?.saleProtectionFeeEnabled ?? true,
      saleProtectionFeePercent: s.commissions?.saleProtectionFeePercent ?? 3,
      saleProtectionFeeMin: s.commissions?.saleProtectionFeeMin ?? 49,
      codHandlingFeePercent: s.commissions?.codHandlingFeePercent ?? 10,
      codHandlingFeeCap: s.commissions?.codHandlingFeeCap ?? 200,
    });

    setProcurementForm({
      laborHourlyRate: s.laborRate?.hourlyRate ?? 200,
      laborMaxHoursPerDay: s.laborRate?.maxHoursPerDay ?? 6,
    });

    setEmiForm({
      emiEnabled: s.emi?.enabled ?? false,
      emiMinOrderValue: s.emi?.minOrderValue ?? 10000,
      emiTenureOptionsText: (s.emi?.tenureOptions ?? [2, 3, 4, 5, 6]).join(","),
      emiTokenPercent: s.emi?.tokenPercent ?? 20,
      emiBillingDay: s.emi?.billingDay ?? 5,
      emiSurchargePercentPerMonth: s.emi?.surchargePercentPerMonth ?? 2,
      emiSurchargeSellerSharePercent: s.emi?.surchargeSellerSharePercent ?? 50,
    });

    setGstForm({
      gstEnabled: s.gst?.enabled ?? false,
      gstin: s.gst?.gstin ?? "",
      gstLegalName: s.gst?.legalName ?? "",
      gstAddress: s.gst?.address ?? "",
    });

    setIntegrationsForm({
      razorpayKeyId: s.credentialsMasked?.razorpayKeyId ?? "",
      razorpayKeySecret: s.credentialsMasked?.razorpayKeySecret ?? "",
      razorpayWebhookSecret: s.credentialsMasked?.razorpayWebhookSecret ?? "",
      cashfreeAppId: s.credentialsMasked?.cashfreeAppId ?? "",
      cashfreeSecretKey: s.credentialsMasked?.cashfreeSecretKey ?? "",
      cashfreeEnvironment: s.credentialsMasked?.cashfreeEnvironment ?? "sandbox",
      cashfreeWebhookSecret: s.credentialsMasked?.cashfreeWebhookSecret ?? "",
      phonepeClientId: s.credentialsMasked?.phonepeClientId ?? "",
      phonepeClientSecret: s.credentialsMasked?.phonepeClientSecret ?? "",
      phonepeClientVersion: s.credentialsMasked?.phonepeClientVersion ?? "1",
      phonepeEnvironment: s.credentialsMasked?.phonepeEnvironment ?? "sandbox",
      phonepeWebhookUsername: s.credentialsMasked?.phonepeWebhookUsername ?? "",
      phonepeWebhookPassword: s.credentialsMasked?.phonepeWebhookPassword ?? "",
      googleMapsApiKey: s.credentialsMasked?.googleMapsApiKey ?? "",
      googlePlaceId: s.credentialsMasked?.googlePlaceId ?? "",
      smtpHost: s.emailSettings?.host ?? "",
      smtpPort: String(s.emailSettings?.port ?? 587),
      smtpUser: s.emailSettings?.user ?? "",
      smtpFrom: s.emailSettings?.fromAddress ?? "",
      gaMeasurementId: s.integrations?.googleAnalyticsId ?? "",
      fbPixelId: s.integrations?.facebookPixelId ?? "",
      gtmContainerId: s.integrations?.gtmContainerId ?? "",
      clarityProjectId: s.integrations?.clarityProjectId ?? "",
      metaPageAccessToken: s.credentialsMasked?.metaPageAccessToken ?? "",
      metaPageId: s.credentialsMasked?.metaPageId ?? "",
      tiktokClientKey: s.credentialsMasked?.tiktokClientKey ?? "",
      tiktokClientSecret: s.credentialsMasked?.tiktokClientSecret ?? "",
      tiktokAccessToken: s.credentialsMasked?.tiktokAccessToken ?? "",
      deviantartClientId: s.credentialsMasked?.deviantartClientId ?? "",
      deviantartClientSecret: s.credentialsMasked?.deviantartClientSecret ?? "",
    });

    /*
     * 🛑 The HYDRATE leg, and skipping it is the live risk this file's own
     * comments name: a key that is SAVED but never hydrated renders its
     * default — here the empty string — and the next save writes that default
     * over the stored value. For this field that silently turns online
     * collection off for the whole site on the first unrelated settings save.
     */
    setShippingForm({
      razorpayEnabled: s.payment?.razorpayEnabled ?? false,
      phonepeEnabled: s.payment?.phonepeEnabled ?? false,
      cashfreeEnabled: s.payment?.cashfreeEnabled ?? false,
      platformStoreId: s.payment?.platformStoreId ?? "",
      upiManualEnabled: s.payment?.upiManualEnabled ?? true,
      codEnabled: s.payment?.codEnabled ?? true,
      otpCheckoutThreshold: s.payment?.otpCheckoutThreshold ?? 5000,
      codMaxOrderValue: s.payment?.codMaxOrderValue ?? COD_MAX_ORDER_VALUE_FALLBACK,
      freeShippingThreshold: s.shipping?.freeShippingThreshold ?? 999,
      defaultCarrier: s.shipping?.defaultCarrier ?? "custom",
      maxDeliveryRadius: s.shipping?.maxDeliveryRadius ?? 0,
      sellerShippingFixed: s.commissions?.sellerShippingFixed ?? 0,
      platformShippingPercent: s.commissions?.platformShippingPercent ?? 10,
      platformShippingFixedMin: s.commissions?.platformShippingFixedMin ?? 0,
    });

    setListingsForm({
      listingTypeFlags: (s.listings?.listingTypes as Record<string, boolean> | undefined) ?? {},
      categoryTypeFlags: (s.listings?.categoryTypes as Record<string, boolean> | undefined) ?? {},
      browsePageFlags: (s.listings?.browsePages as Record<string, boolean> | undefined) ?? {},
    });

    setCollectorDropForm({
      bidIncrementTiers: s.collectorDropConfig?.bidIncrementTiers ?? DEFAULT_COLLECTOR_DROP_BID_INCREMENT_TIERS,
      autoExtendWindow: s.collectorDropConfig?.autoExtendWindowMinutes ?? 5,
      settlementGrace: s.collectorDropConfig?.settlementGracePeriodHours ?? 24,
    });

    setLimitsForm({
      maxProductsPerStore: s.platformLimits?.maxProductsPerStore ?? 100,
      maxCustomFields: s.platformLimits?.maxCustomFieldsPerProduct ?? 50,
      orderCancelWindow: s.platformLimits?.orderCancellationWindowHours ?? 24,
    });

    setLegalForm({
      termsHtml: s.legalPages?.terms ?? "",
      privacyHtml: s.legalPages?.privacy ?? "",
      refundHtml: s.legalPages?.refundPolicy ?? "",
      shippingPolicyHtml: s.legalPages?.shipping ?? "",
      cookieHtml: s.legalPages?.cookies ?? "",
      ethicsHtml: s.legalPages?.ethics ?? "",
      cancellationHtml: s.legalPages?.cancellation ?? "",
      grievanceHtml: s.legalPages?.grievance ?? "",
      conductHtml: s.legalPages?.codeOfConduct ?? "",
    });

    setAboutTitle(s.aboutContent?.title ?? "");
    setAboutSubtitle(s.aboutContent?.subtitle ?? "");
    setAboutMissionTitle(s.aboutContent?.missionTitle ?? "");
    setAboutMissionText(s.aboutContent?.missionText ?? "");
    setAboutHowItWorksTitle(s.aboutContent?.howItWorksTitle ?? "");
    setAboutHowItems(s.aboutContent?.howItems ?? []);
    setAboutValuesTitle(s.aboutContent?.valuesTitle ?? "");
    setAboutValuesSubtitle(s.aboutContent?.valuesSubtitle ?? "");
    setAboutValueItems(s.aboutContent?.valueItems ?? []);
    setAboutMilestonesTitle(s.aboutContent?.milestonesTitle ?? "");
    setAboutMilestones(s.aboutContent?.milestones ?? []);
    setAboutTeamTitle(s.aboutContent?.teamTitle ?? "");
    setAboutTeamSubtitle(s.aboutContent?.teamSubtitle ?? "");
    setAboutTeamMembers(s.aboutContent?.teamMembers ?? []);
    setAboutCtaTitle(s.aboutContent?.ctaTitle ?? "");
    setAboutCtaSell(s.aboutContent?.ctaSell ?? "");
    setAboutCtaShop(s.aboutContent?.ctaShop ?? "");

    setWhatsappForm({
      waPhoneNumberId: s.credentialsMasked?.whatsappPhoneNumberId ?? "",
      waCloudApiToken: s.credentialsMasked?.whatsappCloudApiToken ?? "",
      waAdminNotifyNumbers: s.credentialsMasked?.whatsappAdminNotifyNumbers ?? "",
      waTemplateLanguage: s.credentialsMasked?.whatsappTemplateLanguage ?? "en",
      waTemplateOrderPlaced: s.credentialsMasked?.whatsappTemplateOrderPlaced ?? "",
      waTemplateOrderConfirmed: s.credentialsMasked?.whatsappTemplateOrderConfirmed ?? "",
      waTemplateOrderShipped: s.credentialsMasked?.whatsappTemplateOrderShipped ?? "",
      waTemplateOrderDelivered: s.credentialsMasked?.whatsappTemplateOrderDelivered ?? "",
      waTemplateOrderCancelled: s.credentialsMasked?.whatsappTemplateOrderCancelled ?? "",
      waTemplateRefundInitiated: s.credentialsMasked?.whatsappTemplateRefundInitiated ?? "",
    });

    setNotificationsForm({
      notifEmailEnabled: s.notificationChannels?.email?.enabled ?? false,
      notifEmailMinPriority: s.notificationChannels?.email?.minPriority ?? "normal",
      notifWhatsappEnabled: s.notificationChannels?.whatsapp?.enabled ?? false,
      notifWhatsappMinPriority: s.notificationChannels?.whatsapp?.minPriority ?? "high",
      notifWhatsappOtpEnabled: s.notificationChannels?.whatsapp?.otpEnabled ?? false,
      notifSmsEnabled: s.notificationChannels?.sms?.enabled ?? false,
      notifSmsMinPriority: s.notificationChannels?.sms?.minPriority ?? "high",
      notifEmailTypes: s.notificationChannels?.email?.types ?? [],
      notifWhatsappTypes: s.notificationChannels?.whatsapp?.types ?? [],
      resendApiKey: s.credentialsMasked?.resendApiKey ?? "",
      notifFromEmail: s.emailSettings?.fromEmail ?? "",
      notifFromName: s.emailSettings?.fromName ?? "",
      digestEnabled: s.emailSettings?.dailyDigest?.enabled ?? false,
      digestRecipients: (s.emailSettings?.dailyDigest?.recipients ?? []).join("\n"),
      // Defaults mirror MESSAGE_BUDGET_DEFAULTS — both channels OFF, so a
      // settings document written before this feature existed reads as
      // quiet rather than as "on and unmetered".
      msgEmailEnabled: s.messaging?.emailEnabled ?? false,
      msgWhatsappEnabled: s.messaging?.whatsappEnabled ?? false,
      msgCeilingEmail: s.messaging?.dailyCeiling?.email ?? 80,
      msgCeilingWhatsapp: s.messaging?.dailyCeiling?.whatsapp ?? 200,
    });

    originalMaskedRef.current = {
      razorpayKeyId: s.credentialsMasked?.razorpayKeyId ?? "",
      razorpayKeySecret: s.credentialsMasked?.razorpayKeySecret ?? "",
      razorpayWebhookSecret: s.credentialsMasked?.razorpayWebhookSecret ?? "",
      cashfreeAppId: s.credentialsMasked?.cashfreeAppId ?? "",
      cashfreeSecretKey: s.credentialsMasked?.cashfreeSecretKey ?? "",
      cashfreeEnvironment: s.credentialsMasked?.cashfreeEnvironment ?? "",
      cashfreeWebhookSecret: s.credentialsMasked?.cashfreeWebhookSecret ?? "",
      phonepeClientId: s.credentialsMasked?.phonepeClientId ?? "",
      phonepeClientSecret: s.credentialsMasked?.phonepeClientSecret ?? "",
      phonepeClientVersion: s.credentialsMasked?.phonepeClientVersion ?? "",
      phonepeEnvironment: s.credentialsMasked?.phonepeEnvironment ?? "",
      phonepeWebhookUsername: s.credentialsMasked?.phonepeWebhookUsername ?? "",
      phonepeWebhookPassword: s.credentialsMasked?.phonepeWebhookPassword ?? "",
      googleMapsApiKey: s.credentialsMasked?.googleMapsApiKey ?? "",
      googlePlaceId: s.credentialsMasked?.googlePlaceId ?? "",
      metaPageAccessToken: s.credentialsMasked?.metaPageAccessToken ?? "",
      metaPageId: s.credentialsMasked?.metaPageId ?? "",
      tiktokClientKey: s.credentialsMasked?.tiktokClientKey ?? "",
      tiktokClientSecret: s.credentialsMasked?.tiktokClientSecret ?? "",
      tiktokAccessToken: s.credentialsMasked?.tiktokAccessToken ?? "",
      deviantartClientId: s.credentialsMasked?.deviantartClientId ?? "",
      deviantartClientSecret: s.credentialsMasked?.deviantartClientSecret ?? "",
      whatsappPhoneNumberId: s.credentialsMasked?.whatsappPhoneNumberId ?? "",
      whatsappCloudApiToken: s.credentialsMasked?.whatsappCloudApiToken ?? "",
      whatsappAdminNotifyNumbers: s.credentialsMasked?.whatsappAdminNotifyNumbers ?? "",
      whatsappTemplateLanguage: s.credentialsMasked?.whatsappTemplateLanguage ?? "en",
      whatsappTemplateOrderPlaced: s.credentialsMasked?.whatsappTemplateOrderPlaced ?? "",
      whatsappTemplateOrderConfirmed: s.credentialsMasked?.whatsappTemplateOrderConfirmed ?? "",
      whatsappTemplateOrderShipped: s.credentialsMasked?.whatsappTemplateOrderShipped ?? "",
      whatsappTemplateOrderDelivered: s.credentialsMasked?.whatsappTemplateOrderDelivered ?? "",
      whatsappTemplateOrderCancelled: s.credentialsMasked?.whatsappTemplateOrderCancelled ?? "",
      whatsappTemplateRefundInitiated: s.credentialsMasked?.whatsappTemplateRefundInitiated ?? "",
      resendApiKey: s.credentialsMasked?.resendApiKey ?? "",
    };
  }, [data]);

  // Single combined payload — every group's current field values, assembled
  // into one PUT. Every step/tab is independently jumpable and there is one
  // save action for the whole form, not 19 per-tab mutations.
  function buildFullPayload(): FirestoreDocument {
    return {
      aboutContent: {
        title: aboutTitle,
        subtitle: aboutSubtitle,
        missionTitle: aboutMissionTitle,
        missionText: aboutMissionText,
        howItWorksTitle: aboutHowItWorksTitle,
        howItems: aboutHowItems as unknown as FirestoreDocument[],
        valuesTitle: aboutValuesTitle,
        valuesSubtitle: aboutValuesSubtitle,
        valueItems: aboutValueItems as unknown as FirestoreDocument[],
        milestonesTitle: aboutMilestonesTitle,
        milestones: aboutMilestones as unknown as FirestoreDocument[],
        teamTitle: aboutTeamTitle,
        teamSubtitle: aboutTeamSubtitle,
        teamMembers: aboutTeamMembers as unknown as FirestoreDocument[],
        ctaTitle: aboutCtaTitle,
        ctaSell: aboutCtaSell,
        ctaShop: aboutCtaShop,
      },
      siteName: brandingForm.siteName, tagline: brandingForm.tagline,
      logo: brandingForm.logoUrl, favicon: brandingForm.faviconUrl,
      maintenance: { enabled: brandingForm.maintenanceMode, message: brandingForm.maintenanceMessage },
      chat: { enabled: brandingForm.chatEnabled },
      assistant: { enabled: brandingForm.assistantEnabled },
      background: {
        light: {
          type: lightBgType,
          value: lightBgValue,
          overlay: { enabled: lightBgOverlayEnabled, color: lightBgOverlayColor, opacity: lightBgOverlayOpacity / 100 },
        },
        dark: {
          type: darkBgType,
          value: darkBgValue,
          overlay: { enabled: darkBgOverlayEnabled, color: darkBgOverlayColor, opacity: darkBgOverlayOpacity / 100 },
        },
      },
      theme: {
        themes: themeRegistry.themes as unknown as FirestoreDocument[],
        defaultLightThemeId: themeRegistry.defaultLightThemeId,
        defaultDarkThemeId: themeRegistry.defaultDarkThemeId,
      },
      // message, not text — text was never read by AnnouncementBar or the homepage.
      announcementBar: {
        enabled: announcementForm.announcementEnabled,
        message: announcementForm.announcementText,
        link: announcementForm.announcementLink,
        backgroundColor: announcementForm.announcementBg,
      },
      seo: {
        defaultTitle: seoForm.seoTitle,
        defaultDescription: seoForm.seoDescription,
        defaultOgImage: seoForm.seoOgImage,
        noIndex: seoForm.seoNoIndex,
        canonicalBaseUrl: seoForm.canonicalUrl,
      },
      contact: {
        email: contactForm.supportEmail,
        phone: contactForm.supportPhone,
        address: contactForm.supportAddress,
        supportHours: contactForm.supportHours,
        whatsappNumber: contactForm.whatsapp,
        upiVpa: contactForm.upiVpa,
      },
      socialLinks: {
        instagram: contactForm.instagram,
        twitter: contactForm.twitter,
        facebook: contactForm.facebook,
        youtube: contactForm.youtube,
        linkedin: contactForm.linkedin,
        pinterest: contactForm.pinterest,
      },
      watermark: {
        type: watermarkForm.watermarkType,
        text: watermarkForm.watermarkText,
        imageUrl: watermarkForm.watermarkImageUrl,
        size: watermarkForm.watermarkSize,
        opacity: watermarkForm.watermarkOpacity,
        position: watermarkForm.watermarkUseCustomOffset ? "custom" : watermarkForm.watermarkPosition,
        offsetX: watermarkForm.watermarkOffsetX,
        offsetY: watermarkForm.watermarkOffsetY,
      },
      commissions: {
        ...feesForm,
        sellerShippingFixed: shippingForm.sellerShippingFixed,
        platformShippingPercent: shippingForm.platformShippingPercent,
        platformShippingFixedMin: shippingForm.platformShippingFixedMin,
      },
      laborRate: { hourlyRate: procurementForm.laborHourlyRate, maxHoursPerDay: procurementForm.laborMaxHoursPerDay },
      emi: {
        enabled: emiForm.emiEnabled,
        minOrderValue: emiForm.emiMinOrderValue,
        tenureOptions: (emiForm.emiTenureOptionsText ?? "")
          .split(",")
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v) && v > 0),
        tokenPercent: emiForm.emiTokenPercent,
        billingDay: emiForm.emiBillingDay,
        surchargePercentPerMonth: emiForm.emiSurchargePercentPerMonth,
        surchargeSellerSharePercent: emiForm.emiSurchargeSellerSharePercent,
      },
      gst: {
        enabled: gstForm.gstEnabled,
        gstin: (gstForm.gstin ?? "").trim().toUpperCase(),
        legalName: (gstForm.gstLegalName ?? "").trim(),
        address: (gstForm.gstAddress ?? "").trim(),
      },
      // Masked credential fields resolve to "" when untouched — the repository's
      // mergeEncryptedCredentials preserves the existing encrypted value for any
      // "" field, so an unedited tab never overwrites a real secret with its
      // own masked display string.
      credentials: {
        razorpayKeyId: maskedOrReal("razorpayKeyId", integrationsForm.razorpayKeyId ?? ""),
        razorpayKeySecret: maskedOrReal("razorpayKeySecret", integrationsForm.razorpayKeySecret ?? ""),
        razorpayWebhookSecret: maskedOrReal("razorpayWebhookSecret", integrationsForm.razorpayWebhookSecret ?? ""),
        cashfreeAppId: maskedOrReal("cashfreeAppId", integrationsForm.cashfreeAppId ?? ""),
        cashfreeSecretKey: maskedOrReal("cashfreeSecretKey", integrationsForm.cashfreeSecretKey ?? ""),
        cashfreeEnvironment: maskedOrReal("cashfreeEnvironment", integrationsForm.cashfreeEnvironment ?? ""),
        cashfreeWebhookSecret: maskedOrReal("cashfreeWebhookSecret", integrationsForm.cashfreeWebhookSecret ?? ""),
        phonepeClientId: maskedOrReal("phonepeClientId", integrationsForm.phonepeClientId ?? ""),
        phonepeClientSecret: maskedOrReal("phonepeClientSecret", integrationsForm.phonepeClientSecret ?? ""),
        phonepeClientVersion: maskedOrReal("phonepeClientVersion", integrationsForm.phonepeClientVersion ?? ""),
        phonepeEnvironment: maskedOrReal("phonepeEnvironment", integrationsForm.phonepeEnvironment ?? ""),
        phonepeWebhookUsername: maskedOrReal("phonepeWebhookUsername", integrationsForm.phonepeWebhookUsername ?? ""),
        phonepeWebhookPassword: maskedOrReal("phonepeWebhookPassword", integrationsForm.phonepeWebhookPassword ?? ""),
        googleMapsApiKey: maskedOrReal("googleMapsApiKey", integrationsForm.googleMapsApiKey ?? ""),
        googlePlaceId: maskedOrReal("googlePlaceId", integrationsForm.googlePlaceId ?? ""),
        metaPageAccessToken: maskedOrReal("metaPageAccessToken", integrationsForm.metaPageAccessToken ?? ""),
        metaPageId: maskedOrReal("metaPageId", integrationsForm.metaPageId ?? ""),
        tiktokClientKey: maskedOrReal("tiktokClientKey", integrationsForm.tiktokClientKey ?? ""),
        tiktokClientSecret: maskedOrReal("tiktokClientSecret", integrationsForm.tiktokClientSecret ?? ""),
        tiktokAccessToken: maskedOrReal("tiktokAccessToken", integrationsForm.tiktokAccessToken ?? ""),
        deviantartClientId: maskedOrReal("deviantartClientId", integrationsForm.deviantartClientId ?? ""),
        deviantartClientSecret: maskedOrReal("deviantartClientSecret", integrationsForm.deviantartClientSecret ?? ""),
        whatsappPhoneNumberId: maskedOrReal("whatsappPhoneNumberId", whatsappForm.waPhoneNumberId ?? ""),
        whatsappCloudApiToken: maskedOrReal("whatsappCloudApiToken", whatsappForm.waCloudApiToken ?? ""),
        whatsappAdminNotifyNumbers: maskedOrReal("whatsappAdminNotifyNumbers", whatsappForm.waAdminNotifyNumbers ?? ""),
        whatsappTemplateLanguage: maskedOrReal("whatsappTemplateLanguage", whatsappForm.waTemplateLanguage ?? ""),
        whatsappTemplateOrderPlaced: maskedOrReal("whatsappTemplateOrderPlaced", whatsappForm.waTemplateOrderPlaced ?? ""),
        whatsappTemplateOrderConfirmed: maskedOrReal("whatsappTemplateOrderConfirmed", whatsappForm.waTemplateOrderConfirmed ?? ""),
        whatsappTemplateOrderShipped: maskedOrReal("whatsappTemplateOrderShipped", whatsappForm.waTemplateOrderShipped ?? ""),
        whatsappTemplateOrderDelivered: maskedOrReal("whatsappTemplateOrderDelivered", whatsappForm.waTemplateOrderDelivered ?? ""),
        whatsappTemplateOrderCancelled: maskedOrReal("whatsappTemplateOrderCancelled", whatsappForm.waTemplateOrderCancelled ?? ""),
        whatsappTemplateRefundInitiated: maskedOrReal("whatsappTemplateRefundInitiated", whatsappForm.waTemplateRefundInitiated ?? ""),
        resendApiKey: maskedOrReal("resendApiKey", notificationsForm.resendApiKey ?? ""),
      },
      emailSettings: {
        host: integrationsForm.smtpHost,
        port: Number(integrationsForm.smtpPort),
        user: integrationsForm.smtpUser,
        fromAddress: integrationsForm.smtpFrom,
        fromEmail: notificationsForm.notifFromEmail, fromName: notificationsForm.notifFromName,
        dailyDigest: {
          enabled: notificationsForm.digestEnabled,
          recipients: splitEmailList(notificationsForm.digestRecipients ?? ""),
          // Always empty — the CC field is gone (see the Notifications tab).
          // Sent explicitly rather than omitted so a save clears any CC list a
          // pre-existing document still carries.
          ccRecipients: [],
        },
      },
      messaging: {
        emailEnabled: notificationsForm.msgEmailEnabled,
        whatsappEnabled: notificationsForm.msgWhatsappEnabled,
        dailyCeiling: {
          email: notificationsForm.msgCeilingEmail,
          whatsapp: notificationsForm.msgCeilingWhatsapp,
          // No SMS sender exists; the ceiling is carried so one cannot ship
          // uncapped if somebody adds a provider later.
          sms: 50,
        },
      },
      integrations: {
        googleAnalyticsId: integrationsForm.gaMeasurementId,
        facebookPixelId: integrationsForm.fbPixelId,
        gtmContainerId: integrationsForm.gtmContainerId,
        clarityProjectId: integrationsForm.clarityProjectId,
      },
      shipping: {
        freeShippingThreshold: shippingForm.freeShippingThreshold,
        defaultCarrier: shippingForm.defaultCarrier,
        maxDeliveryRadius: shippingForm.maxDeliveryRadius,
      },
      /*
       * `platformStoreId` is trimmed and sent as `undefined` when blank rather
       * than as `""` — the resolver treats an empty-ish value as unset anyway,
       * but writing a literal empty string would record a DECISION ("no store
       * is ours") where none was made, and a stored `""` reads differently
       * from an absent key to anyone inspecting the document.
       */
      payment: {
        razorpayEnabled: shippingForm.razorpayEnabled,
        phonepeEnabled: shippingForm.phonepeEnabled,
        cashfreeEnabled: shippingForm.cashfreeEnabled,
        platformStoreId: (shippingForm.platformStoreId ?? "").trim() || undefined,
        upiManualEnabled: shippingForm.upiManualEnabled,
        codEnabled: shippingForm.codEnabled,
        codMaxOrderValue: shippingForm.codMaxOrderValue,
        otpCheckoutThreshold: shippingForm.otpCheckoutThreshold,
      },
      collectorDropConfig: {
        bidIncrementTiers: collectorDropForm.bidIncrementTiers as unknown as FirestoreDocument[],
        autoExtendWindowMinutes: collectorDropForm.autoExtendWindow,
        settlementGracePeriodHours: collectorDropForm.settlementGrace,
      },
      platformLimits: {
        maxProductsPerStore: limitsForm.maxProductsPerStore,
        maxCustomFieldsPerProduct: limitsForm.maxCustomFields,
        orderCancellationWindowHours: limitsForm.orderCancelWindow,
      },
      legalPages: {
        terms: legalForm.termsHtml,
        privacy: legalForm.privacyHtml,
        refundPolicy: legalForm.refundHtml,
        shipping: legalForm.shippingPolicyHtml,
        cookies: legalForm.cookieHtml,
        ethics: legalForm.ethicsHtml,
        codeOfConduct: legalForm.conductHtml,
        cancellation: legalForm.cancellationHtml,
        grievance: legalForm.grievanceHtml,
      },
      // Both keys are always sent: Firestore's update() replaces a nested map
      // wholesale, so omitting one here would wipe it. The load-time spread this
      // used to carry existed to preserve `adminCheckoutBypass`, which is now a
      // permission rather than a stored flag.
      listings: {
        listingTypes: listingsForm.listingTypeFlags,
        categoryTypes: listingsForm.categoryTypeFlags,
        browsePages: listingsForm.browsePageFlags,
      },
      notificationChannels: {
        inApp: { enabled: true, readOnly: true },
        email: {
          enabled: notificationsForm.notifEmailEnabled,
          minPriority: notificationsForm.notifEmailMinPriority,
          types: notificationsForm.notifEmailTypes,
        },
        whatsapp: {
          enabled: notificationsForm.notifWhatsappEnabled,
          minPriority: notificationsForm.notifWhatsappMinPriority,
          otpEnabled: notificationsForm.notifWhatsappOtpEnabled,
          types: notificationsForm.notifWhatsappTypes,
        },
        sms: { enabled: notificationsForm.notifSmsEnabled, minPriority: notificationsForm.notifSmsMinPriority },
      },
    };
  }

  /*
   * 🛑 ONE FormShellContext for the page, mounted below around both the tabs and
   * the save bar.
   *
   * There was none. Each of the twenty `<Form schema={siteSettingsFormSchema}>`
   * tags mounted its OWN provider inside its own tab panel, and `SaveAllBar` —
   * which renders the only `<FormErrorSummary />` — sits outside all twenty. So
   * the summary read the default context and could never display anything, and
   * nothing ever called `validate`: the schema was mounted twenty times and
   * inert every time.
   */
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(siteSettingsFormSchema);

  const saveAllMutation = useApiMutation({
    errorMessage: "Failed to save site settings.",
    mutationFn: async () => {
      await apiClient.put(ADMIN_ENDPOINTS.ADMIN_SITE, buildFullPayload());
    },
    onSuccess: () => {
      showToast("Site settings saved.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      // Public-facing consumers (Navbar, checkout, watermark, etc.) read via the
      // shared useSiteSettings() hook under a different key — must invalidate both.
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
  });

  const BG_TYPE_OPTIONS: SelectOption[] = [
    { label: "Solid color", value: "color" },
    { label: "Gradient", value: "gradient" },
    { label: "Image", value: "image" },
    { label: "Video", value: "video" },
  ];
  /*
   * 🛑 DERIVED. This was a hand-written literal and it had drifted in both
   * directions at once: `art` and `stickers` were MISSING — so an admin had no
   * way to disable either, and the panel's own promise ("disabled types are
   * hidden from listings and reject create/add-to-cart") simply did not apply
   * to two of the nine — while a dead `"bundle"` was still listed, rendering a
   * toggle for a value that stopped being a `listingType` in SB-UNI-D and that
   * `useListingTypeFlags` cannot read. Toggling it did nothing, forever.
   *
   * `CATEGORY_TYPE_KEYS` below is a SEPARATE block that correctly owns
   * `bundle`, which is what makes dropping it here safe rather than a
   * regression.
   *
   * Registered in `audit-listing-type-tab-coverage`'s STAYS_DERIVED.
   */
  const LISTING_TYPE_KEYS = ALL_LISTING_TYPES;
  const CATEGORY_TYPE_KEYS = ["category", "sublisting", "brand", "bundle"] as const;
  /* Derived for the same reason LISTING_TYPE_KEYS is — a hand-written copy of
   * a union in this file has already drifted once, in both directions. */
  const BROWSE_PAGE_KEYS = ALL_BROWSE_PAGES;
  /** What each section actually withdraws, in the admin's own vocabulary. */
  const BROWSE_PAGE_META: Record<string, { label: string; hint: string }> = {
    categories: { label: "Categories", hint: "/categories and every category page" },
    brands: { label: "Brands", hint: "/brands and every brand page" },
    franchise: { label: "Franchises", hint: "/franchise and every franchise page" },
    stores: { label: "Stores & Sellers", hint: "/stores, /sellers and every storefront" },
  };
  const NOTIF_TYPE_OPTIONS = NOTIFICATION_TYPE_TABS.filter((t) => t.id !== "All").map((t) => ({ value: t.id, label: t.label }));

  /*
   * Validate the payload that is actually sent, then save.
   *
   * The parsed OUTPUT is deliberately discarded — `siteSettingsFormSchema` is
   * `.passthrough()` precisely because `buildFullPayload()` writes keys the
   * TypeScript interface does not declare, and saving the parsed object instead
   * of the payload would be the closed-schema data loss that comment exists to
   * prevent. This reads the issues and sends the original.
   */
  const handleSaveAll = () => {
    clearErrors();
    const parsed = siteSettingsFormSchema.safeParse(buildFullPayload());
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveAllMutation.mutate();
  };

  return (
    <>
      <AdminComposableRegion pageId="admin-site" initialCards={pageRegionCards} />
      <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Site Settings"}
      sections={[
        isLoading ? (
          <Alert key="loading" variant="info" title="Loading">
            Fetching site settings…
          </Alert>
        ) : null,
        error ? (
          <Alert key="error" variant="error" title="Load failed">
            {error instanceof Error ? error.message : "Unknown error"}
          </Alert>
        ) : null,
        <FormShellContext.Provider key="settings-form" value={shellCtx}>
        <Tabs
          value={activeTab}
          /*
           * `Tabs` hands back a bare string, so it is narrowed here rather
           * than cast. An unknown value is ignored instead of being written
           * into state — the same reason `?tab=` is validated on the way in.
           */
          onChange={(next) => {
            if (isSiteSettingsTabId(next)) setActiveTab(next);
          }}
        >
          <TabsList>
            {SITE_SETTINGS_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ⓪ About Page */}
          <TabsContent value="about">
            <SettingsTabForm id="about" label="About">
              <Text size="xs" color="muted">
                Override the About page content. Leave blank to use the platform defaults.
              </Text>
              <Input label="Hero title" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder={`About ${getBrandName()}`} />
              <Input label="Hero subtitle" value={aboutSubtitle} onChange={(e) => setAboutSubtitle(e.target.value)} placeholder="Connecting buyers, sellers, and bidders in one vibrant marketplace" />
              <Input label="Mission section title" value={aboutMissionTitle} onChange={(e) => setAboutMissionTitle(e.target.value)} placeholder="Our Mission" />
              <>
                <Textarea
                  label="Mission text"
                  value={aboutMissionText}
                  onChange={(e) => setAboutMissionText(e.target.value)}
                  placeholder={`${getBrandName()} was built to democratise commerce…`}
                  rows={4}
                />
              </>

              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Input label={'"How it works" section title'} value={aboutHowItWorksTitle} onChange={(e) => setAboutHowItWorksTitle(e.target.value)} placeholder="How It Works" />
                {aboutHowItems.map((item, i) => (
                  <Stack key={i} gap="sm" rounded="lg" border="default" padding="sm">
                    <Row justify="between" align="center">
                      <Text size="xs" weight="medium" color="muted">Step {i + 1}</Text>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAboutHowItems(aboutHowItems.filter((_, idx) => idx !== i))}>✕</Button>
                    </Row>
                    <Input label="Icon (emoji)" value={item.icon} onChange={(e) => { const next = [...aboutHowItems]; next[i] = { ...item, icon: e.target.value }; setAboutHowItems(next); }} placeholder="🛒" />
                    <Input label="Title" value={item.title} onChange={(e) => { const next = [...aboutHowItems]; next[i] = { ...item, title: e.target.value }; setAboutHowItems(next); }} />
                    <Textarea value={item.text} onChange={(e) => { const next = [...aboutHowItems]; next[i] = { ...item, text: e.target.value }; setAboutHowItems(next); }} rows={2} />
                  </Stack>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setAboutHowItems([...aboutHowItems, { title: "", text: "", icon: "✨", tone: "indigo" }])}>+ Add step</Button>
              </Stack>

              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Input label="Values section title" value={aboutValuesTitle} onChange={(e) => setAboutValuesTitle(e.target.value)} placeholder="Our Values" />
                <Input label="Values section subtitle" value={aboutValuesSubtitle} onChange={(e) => setAboutValuesSubtitle(e.target.value)} placeholder="Optional intro line under the heading" />
                {aboutValueItems.map((item, i) => (
                  <Stack key={i} gap="sm" rounded="lg" border="default" padding="sm">
                    <Row justify="between" align="center">
                      <Text size="xs" weight="medium" color="muted">Value {i + 1}</Text>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAboutValueItems(aboutValueItems.filter((_, idx) => idx !== i))}>✕</Button>
                    </Row>
                    <Input label="Icon (emoji)" value={item.icon} onChange={(e) => { const next = [...aboutValueItems]; next[i] = { ...item, icon: e.target.value }; setAboutValueItems(next); }} placeholder="🛡️" />
                    <Input label="Title" value={item.title} onChange={(e) => { const next = [...aboutValueItems]; next[i] = { ...item, title: e.target.value }; setAboutValueItems(next); }} />
                    <Textarea label="Text" value={item.text} onChange={(e) => { const next = [...aboutValueItems]; next[i] = { ...item, text: e.target.value }; setAboutValueItems(next); }} rows={2} />
                    <Textarea label="Detail (optional)" value={item.detail ?? ""} onChange={(e) => { const next = [...aboutValueItems]; next[i] = { ...item, detail: e.target.value }; setAboutValueItems(next); }} rows={2} placeholder="How this value is actually enforced" />
                  </Stack>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setAboutValueItems([...aboutValueItems, { title: "", text: "", icon: "✨" }])}>+ Add value</Button>
              </Stack>

              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Input label="Milestones section title" value={aboutMilestonesTitle} onChange={(e) => setAboutMilestonesTitle(e.target.value)} placeholder="Our Journey" />
                {aboutMilestones.map((item, i) => (
                  <Stack key={i} gap="sm" rounded="lg" border="default" padding="sm">
                    <Row justify="between" align="center">
                      <Text size="xs" weight="medium" color="muted">Milestone {i + 1}</Text>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAboutMilestones(aboutMilestones.filter((_, idx) => idx !== i))}>✕</Button>
                    </Row>
                    <Input label="Year" value={item.year} onChange={(e) => { const next = [...aboutMilestones]; next[i] = { ...item, year: e.target.value }; setAboutMilestones(next); }} placeholder="2024" />
                    <Textarea value={item.text} onChange={(e) => { const next = [...aboutMilestones]; next[i] = { ...item, text: e.target.value }; setAboutMilestones(next); }} rows={2} />
                  </Stack>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setAboutMilestones([...aboutMilestones, { year: "", text: "" }])}>+ Add milestone</Button>
              </Stack>

              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Input label="Team section title" value={aboutTeamTitle} onChange={(e) => setAboutTeamTitle(e.target.value)} placeholder="Meet the Team" />
                <Input label="Team section subtitle" value={aboutTeamSubtitle} onChange={(e) => setAboutTeamSubtitle(e.target.value)} placeholder={`The people building ${getBrandName()}`} />
                {aboutTeamMembers.map((member, i) => (
                  <Stack key={i} gap="sm" rounded="lg" border="default" padding="sm">
                    <Row justify="between" align="center">
                      <Text size="xs" weight="medium" color="muted">Team member {i + 1}</Text>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAboutTeamMembers(aboutTeamMembers.filter((_, idx) => idx !== i))}>✕</Button>
                    </Row>
                    <ImageUpload
                      label="Photo"
                      currentImage={member.photoUrl}
                      onUpload={(file) => upload(file, "store")}
                      onChange={(url) => { const next = [...aboutTeamMembers]; next[i] = { ...member, photoUrl: url }; setAboutTeamMembers(next); }}
                    />
                    <Input label="Name" value={member.name} onChange={(e) => { const next = [...aboutTeamMembers]; next[i] = { ...member, name: e.target.value }; setAboutTeamMembers(next); }} />
                    <Input label="Role" value={member.role} onChange={(e) => { const next = [...aboutTeamMembers]; next[i] = { ...member, role: e.target.value }; setAboutTeamMembers(next); }} placeholder="Founder & Developer" />
                    <Textarea value={member.bio} onChange={(e) => { const next = [...aboutTeamMembers]; next[i] = { ...member, bio: e.target.value }; setAboutTeamMembers(next); }} rows={3} />
                    <Row gap="md">
                      <Toggle label="Founder" checked={!!member.isFounder} onChange={(v) => { const next = [...aboutTeamMembers]; next[i] = { ...member, isFounder: v }; setAboutTeamMembers(next); }} />
                      <Toggle label="Developer" checked={!!member.isDeveloper} onChange={(v) => { const next = [...aboutTeamMembers]; next[i] = { ...member, isDeveloper: v }; setAboutTeamMembers(next); }} />
                    </Row>
                  </Stack>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={() => setAboutTeamMembers([...aboutTeamMembers, { name: "", role: "", bio: "" }])}>+ Add team member</Button>
              </Stack>

              <Input label="CTA banner title" value={aboutCtaTitle} onChange={(e) => setAboutCtaTitle(e.target.value)} placeholder="Ready to get started?" />
              <Input label="Sell CTA copy" value={aboutCtaSell} onChange={(e) => setAboutCtaSell(e.target.value)} placeholder="Start selling in minutes" />
              <Input label="Shop CTA copy" value={aboutCtaShop} onChange={(e) => setAboutCtaShop(e.target.value)} placeholder="Browse the marketplace" />
            </SettingsTabForm>
          </TabsContent>

          {/* ① Branding */}
          <TabsContent value="branding">
            {/*
              First tab migrated to the Universal Template System (Phase 3B,
              admin site-settings form rebuild, 2026-11-04) — schema +
              buildSectionsFromSchema instead of hand-written JSX, with
              field-visibility (hide/reorder) wired the same as the
              shipping-config pilot. `maintenanceMessage`'s old
              `disabled={!maintenanceMode}` became the schema's `when`
              predicate instead (hidden, not just disabled, when maintenance
              mode is off). `id="setting-maintenance-mode"` /
              `id="setting-chat-enabled"` / `id="setting-assistant-enabled"`
              anchors (used by `?tab=branding#setting-...` deep links) are
              NOT preserved field-by-field — the generator does not expose a
              per-field DOM id — tracked as a follow-up for whichever deep
              links actually resolve to these three today.
            */}
            <SectionForm<SiteSettingsBrandingFormValues>
              sections={brandingSections}
              values={brandingForm}
              onChange={(partial) => setBrandingForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsBrandingFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ② Appearance — site-wide background (homepage/nav/dashboard shells) */}
          <TabsContent value="appearance">
            <SettingsTabForm id="appearance" label="Appearance">
              <Text size="xs" color="muted">
                Sets the background behind the public shell, dashboard sidebars, and any
                Section/Card that opts into it. Leave the value blank for a plain surface.
              </Text>
              <Grid cols={2} gap="lg">
                <Stack gap="sm" rounded="lg" border="default" padding="md">
                  <Text size="sm" weight="semibold">Light mode</Text>
                  <Select
                    label="Type"
                    options={BG_TYPE_OPTIONS}
                    value={lightBgType}
                    onValueChange={(v) => setLightBgType(v as typeof lightBgType)}
                  />
                  {lightBgType === "color" ? (
                    <Input type="color" label="Color" value={lightBgValue || "#ffffff"} onChange={(e) => setLightBgValue(e.target.value)} className="h-10 w-full cursor-pointer" bare /> /* audit-hex-tokens-ok: native color picker requires literal hex string fallback */
                  ) : lightBgType === "gradient" ? (
                    <Textarea label="CSS gradient expression" rows={2} value={lightBgValue} onChange={(e) => setLightBgValue(e.target.value)} placeholder="linear-gradient(...)" />
                  ) : (
                    <MediaUploadField
                      label={lightBgType === "video" ? "Background video" : "Background image"}
                      kind={lightBgType === "video" ? "video" : "image"}
                      value={lightBgValue}
                      onChange={setLightBgValue}
                      onUpload={(file: File) => upload(file, "store")}
                    />
                  )}
                  <Toggle label="Dim overlay" checked={lightBgOverlayEnabled} onChange={setLightBgOverlayEnabled} />
                  {lightBgOverlayEnabled && (
                    <>
                      <Input type="color" label="Overlay color" value={lightBgOverlayColor} onChange={(e) => setLightBgOverlayColor(e.target.value)} className="h-10 w-full cursor-pointer" bare /> {/* audit-hex-tokens-ok: native color picker requires literal hex string fallback */}
                      <Slider label="Overlay opacity" min={0} max={100} value={lightBgOverlayOpacity} onChange={setLightBgOverlayOpacity} />
                    </>
                  )}
                  <Text size="xs" color="muted">Preview</Text>
                  <Div className="relative h-24 w-full" overflow="hidden" rounded="md" border="default">
                    <BackgroundRenderer
                      mode="light"
                      lightMode={{
                        type: lightBgType,
                        value: lightBgValue,
                        overlay: { enabled: lightBgOverlayEnabled, color: lightBgOverlayColor, opacity: lightBgOverlayOpacity / 100 },
                      }}
                      darkMode={{ type: "color", value: "" }}
                    />
                  </Div>
                </Stack>

                <Stack gap="sm" rounded="lg" border="default" padding="md">
                  <Text size="sm" weight="semibold">Dark mode</Text>
                  <Select
                    label="Type"
                    options={BG_TYPE_OPTIONS}
                    value={darkBgType}
                    onValueChange={(v) => setDarkBgType(v as typeof darkBgType)}
                  />
                  {darkBgType === "color" ? (
                    <Input type="color" label="Color" value={darkBgValue || "#000000"} onChange={(e) => setDarkBgValue(e.target.value)} className="h-10 w-full cursor-pointer" bare /> /* audit-hex-tokens-ok: native color picker requires literal hex string fallback */
                  ) : darkBgType === "gradient" ? (
                    <Textarea label="CSS gradient expression" rows={2} value={darkBgValue} onChange={(e) => setDarkBgValue(e.target.value)} placeholder="linear-gradient(...)" />
                  ) : (
                    <MediaUploadField
                      label={darkBgType === "video" ? "Background video" : "Background image"}
                      kind={darkBgType === "video" ? "video" : "image"}
                      value={darkBgValue}
                      onChange={setDarkBgValue}
                      onUpload={(file: File) => upload(file, "store")}
                    />
                  )}
                  <Toggle label="Dim overlay" checked={darkBgOverlayEnabled} onChange={setDarkBgOverlayEnabled} />
                  {darkBgOverlayEnabled && (
                    <>
                      <Input type="color" label="Overlay color" value={darkBgOverlayColor} onChange={(e) => setDarkBgOverlayColor(e.target.value)} className="h-10 w-full cursor-pointer" bare /> {/* audit-hex-tokens-ok: native color picker requires literal hex string fallback */}
                      <Slider label="Overlay opacity" min={0} max={100} value={darkBgOverlayOpacity} onChange={setDarkBgOverlayOpacity} />
                    </>
                  )}
                  <Text size="xs" color="muted">Preview</Text>
                  <Div className="relative h-24 w-full" overflow="hidden" rounded="md" border="default">
                    <BackgroundRenderer
                      mode="dark"
                      lightMode={{ type: "color", value: "" }}
                      darkMode={{
                        type: darkBgType,
                        value: darkBgValue,
                        overlay: { enabled: darkBgOverlayEnabled, color: darkBgOverlayColor, opacity: darkBgOverlayOpacity / 100 },
                      }}
                    />
                  </Div>
                </Stack>
              </Grid>
            </SettingsTabForm>
          </TabsContent>

          {/* ②ᵃ Themes — admin-authored theme records */}
          <TabsContent value="themes">
            <SettingsTabForm id="themes" label="Themes">
              <ThemeManagerView
                value={themeRegistry}
                onChange={setThemeRegistry}
                previewOrigin="/"
              />
            </SettingsTabForm>
          </TabsContent>

          {/* ③ Announcement */}
          <TabsContent value="announcement">
            {/*
              Second tab migrated to the Universal Template System, same
              pattern as Branding. `announcementBg` keeps its custom
              `<Input type="color">` renderer — see `renderers` in
              `announcementSections` above — because no `color` FieldKind
              exists and adding one for a single field is not warranted.
            */}
            <SectionForm<SiteSettingsAnnouncementFormValues>
              sections={announcementSections}
              values={announcementForm}
              onChange={(partial) => setAnnouncementForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsAnnouncementFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ④ SEO */}
          <TabsContent value="seo">
            {/* Third tab migrated to the Universal Template System. */}
            <SectionForm<SiteSettingsSeoFormValues>
              sections={seoSections}
              values={seoForm}
              onChange={(partial) => setSeoForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsSeoFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑤ Contact & Social */}
          <TabsContent value="contact">
            {/* Fourth tab migrated to the Universal Template System. */}
            <SectionForm<SiteSettingsContactFormValues>
              sections={contactSections}
              values={contactForm}
              onChange={(partial) => setContactForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsContactFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑥ Watermark — fifth tab migrated to the Universal Template System. */}
          <TabsContent value="watermark">
            {/*
              `watermarkSize`/`watermarkOpacity`/`watermarkPosition`/
              `watermarkOffsetX`/`watermarkOffsetY` all use custom renderers
              (Slider/Select/Input) to preserve the original controls'
              fidelity — the generator's default `kind: "number"`/`"select"`
              fallbacks would lose the Slider track and the position-select's
              disabled-while-custom-offset wiring. The live text preview below
              stays hand-written JSX alongside the form, same as before.
            */}
            <SectionForm<SiteSettingsWatermarkFormValues>
              sections={watermarkSections}
              values={watermarkForm}
              onChange={(partial) => setWatermarkForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsWatermarkFormSchema}
              hideActions
            />
            <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="md">
              <Text size="xs" color="muted">Preview (text watermark only)</Text>
              <Row surface="default" justify="end" align="end" className={`relative h-32 ${__O.hidden}`} rounded="default">
                <Span
                  ref={watermarkPreviewRef}
                  weight="medium"
                  color="faint"
                  padding="1"
                  className="select-none"
                >
                  {watermarkForm.watermarkText}
                </Span>
              </Row>
            </Stack>
          </TabsContent>

          {/* ⑦ Fees & Commissions — sixth tab migrated to the Universal Template System. */}
          <TabsContent value="fees">
            {/*
              🛑 D57/D60 and D13's bug history (four fees that charge
              nobody, sale-protection/COD-handling fields that used to have
              no control at all) are preserved as `help` text on the
              relevant fields in site-settings-fees-form.ts rather than
              repeated here — read that schema file for the full context.
            */}
            <SectionForm<SiteSettingsFeesFormValues>
              sections={feesSections}
              values={feesForm}
              onChange={(partial) => setFeesForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsFeesFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑮ Procurement — seventh tab migrated to the Universal Template System. */}
          <TabsContent value="procurement">
            <Text size="xs" color="muted" className="mb-2">
              Used to compute each procurement shipment's labor cost (hours spent × hourly rate) and its
              estimated processing time (hours spent ÷ max hours/day).
            </Text>
            <SectionForm<SiteSettingsProcurementFormValues>
              sections={procurementSections}
              values={procurementForm}
              onChange={(partial) => setProcurementForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsProcurementFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑯ EMI — twelfth tab migrated to the Universal Template System. */}
          <TabsContent value="emi">
            <SectionForm<SiteSettingsEmiFormValues>
              sections={emiSections}
              values={emiForm}
              onChange={(partial) => setEmiForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsEmiFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑰ GST — eleventh tab migrated to the Universal Template System. */}
          <TabsContent value="gst">
            <SectionForm<SiteSettingsGstFormValues>
              sections={gstSections}
              values={gstForm}
              onChange={(partial) => setGstForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsGstFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑱ Listings — seventeenth tab migrated to the Universal Template System. */}
          <TabsContent value="listings">
            <SectionForm<SiteSettingsListingsFormValues>
              sections={listingsSections}
              values={listingsForm}
              onChange={(partial) => setListingsForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsListingsFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑧ Integrations & Keys — fifteenth tab migrated to the Universal Template System. */}
          <TabsContent value="integrations">
            <SectionForm<SiteSettingsIntegrationsFormValues>
              sections={integrationsSections}
              values={integrationsForm}
              onChange={(partial) => setIntegrationsForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsIntegrationsFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑨ Shipping Defaults — tenth tab migrated to the Universal Template System. */}
          <TabsContent value="shipping">
            <SectionForm<SiteSettingsShippingFormValues>
              sections={shippingSections}
              values={shippingForm}
              onChange={(partial) => setShippingForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsShippingFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑩ Collector Drop Config — sixteenth tab migrated to the Universal Template System. */}
          <TabsContent value="collector-drop">
            <SectionForm<SiteSettingsCollectorDropFormValues>
              sections={collectorDropSections}
              values={collectorDropForm}
              onChange={(partial) => setCollectorDropForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsCollectorDropFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑪ Platform Limits — eighth tab migrated to the Universal Template System. */}
          <TabsContent value="limits">
            {/*
              🛑 See site-settings-limits-form.ts's header for the preserved
              "this whole tab may be decorative" finding (D-era investigation
              into `maxCustomSectionsPerProduct`) — not acted on here, this
              migration changes rendering only.
            */}
            <SectionForm<SiteSettingsLimitsFormValues>
              sections={limitsSections}
              values={limitsForm}
              onChange={(partial) => setLimitsForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsLimitsFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑬ WhatsApp Business Cloud API — fourteenth tab migrated to the Universal Template System. */}
          <TabsContent value="whatsapp">
            <SectionForm<SiteSettingsWhatsappFormValues>
              sections={whatsappSections}
              values={whatsappForm}
              onChange={(partial) => setWhatsappForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsWhatsappFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑭ Notification Channels */}
          <TabsContent value="notifications">
            {/*
              Ninth tab migrated to the Universal Template System. See
              site-settings-notifications-form.ts's header for the full
              field→payload-group breakdown (this tab writes into FOUR
              separate groups) and for where the original section-level
              explanatory paragraphs moved to.
            */}
            <Text size="xs" color="muted" className="mb-2">
              In-app notifications are always on. Enable external channels below to let the platform
              fan out to email, WhatsApp, or SMS. Users can further restrict which types they receive.
            </Text>
            <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="md" className="mb-4">
              <Row justify="between" gap="sm">
                <Text size="sm" weight="medium" color="muted">In-app (notification bell)</Text>
                <Span color="success" surface="success-surface" size="xs" weight="semibold" rounded="full" padding="pill-xs">Always on</Span>
              </Row>
              <Text size="xs" color="muted">Displayed in the notification bell and inbox. Cannot be disabled.</Text>
            </Stack>
            <SectionForm<SiteSettingsNotificationsFormValues>
              sections={notificationsSections}
              values={notificationsForm}
              onChange={(partial) => setNotificationsForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsNotificationsFormSchema}
              hideActions
            />
          </TabsContent>

          {/* ⑫ Legal Policies — thirteenth tab migrated to the Universal Template System. */}
          <TabsContent value="legal">
            <SectionForm<SiteSettingsLegalFormValues>
              sections={legalSections}
              values={legalForm}
              onChange={(partial) => setLegalForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={() => undefined}
              schema={siteSettingsLegalFormSchema}
              hideActions
            />
          </TabsContent>
        </Tabs>
        <SaveAllBar isPending={saveAllMutation.isPending} onSave={handleSaveAll} />
        </FormShellContext.Provider>,
      ]}
      />
    </>
  );
}
