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
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { SectionForm } from "../../shell/SectionForm";
import { buildSectionsFromSchema, resolveFields } from "../../shell/build-sections";
import { useFieldVisibility } from "../../shell/useFieldVisibility";
import { swapFieldOrder } from "../../shell/field-ui-meta";
import { useEditMode } from "../../../_internal/client/edit-mode/EditModeProvider";
import { useFormShellState, FormShellContext, applyZodIssues } from "../../../ui/forms";
import { getBrandName, getBrandDomain, getBrandSupportEmail, getBrandNoreplyEmail } from "../../../core/brand-resolver";
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

const NOTIF_CHANNEL_INDENT = "space-y-4 pl-4 border-l-2 border-[var(--appkit-color-border)]";
const PRIORITY_OPTIONS: SelectOption[] = [
  { label: "Low (send all)", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical only", value: "critical" },
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

  // ⑯ EMI — site-wide installment settings
  const [emiEnabled, setEmiEnabled] = React.useState(false);
  const [emiMinOrderValue, setEmiMinOrderValue] = React.useState(10000);
  const [emiTenureOptionsText, setEmiTenureOptionsText] = React.useState("2,3,4,5,6");
  const [emiTokenPercent, setEmiTokenPercent] = React.useState(20);
  const [emiBillingDay, setEmiBillingDay] = React.useState(5);
  const [emiSurchargePercentPerMonth, setEmiSurchargePercentPerMonth] = React.useState(2);
  const [emiSurchargeSellerSharePercent, setEmiSurchargeSellerSharePercent] = React.useState(50);

  // ⑰ GST — Indian tax compliance
  const [gstEnabled, setGstEnabled] = React.useState(false);
  const [gstin, setGstin] = React.useState("");
  const [gstLegalName, setGstLegalName] = React.useState("");
  const [gstAddress, setGstAddress] = React.useState("");
  /*
   * Shown inline, live, and ONLY while the toggle is on — the same rule the
   * server enforces. `/api/admin/site` rejects the save, so without this the
   * admin would get a generic "save failed" with no indication of which of the
   * four fields it meant.
   *
   * Live rather than on-submit because the toggle is the action: an admin who
   * flips it on sees immediately what else is needed, instead of discovering
   * it after a round trip. Empty when the toggle is off, so an admin editing
   * their address with GST disabled is never shown errors about it
   * (Root Cause #74 — a summary that accuses before anything was attempted).
   */
  const gstProblems = React.useMemo(
    () =>
      validateGstEnablement({
        enabled: gstEnabled,
        gstin,
        legalName: gstLegalName,
        address: gstAddress,
      }),
    [gstEnabled, gstin, gstLegalName, gstAddress],
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
  const [sellerShippingFixed, setSellerShippingFixed] = React.useState(0);
  const [platformShippingPercent, setPlatformShippingPercent] = React.useState(10);
  const [platformShippingFixedMin, setPlatformShippingFixedMin] = React.useState(0);

  // ⑧ Integrations
  const [razorpayKeyId, setRazorpayKeyId] = React.useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = React.useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = React.useState("");
  const [cashfreeAppId, setCashfreeAppId] = React.useState("");
  const [cashfreeSecretKey, setCashfreeSecretKey] = React.useState("");
  const [cashfreeEnvironment, setCashfreeEnvironment] = React.useState("sandbox");
  const [cashfreeWebhookSecret, setCashfreeWebhookSecret] = React.useState("");
  const [phonepeClientId, setPhonepeClientId] = React.useState("");
  const [phonepeClientSecret, setPhonepeClientSecret] = React.useState("");
  const [phonepeClientVersion, setPhonepeClientVersion] = React.useState("1");
  const [phonepeEnvironment, setPhonepeEnvironment] = React.useState("sandbox");
  const [phonepeWebhookUsername, setPhonepeWebhookUsername] = React.useState("");
  const [phonepeWebhookPassword, setPhonepeWebhookPassword] = React.useState("");
  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpFrom, setSmtpFrom] = React.useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = React.useState("");
  const [googlePlaceId, setGooglePlaceId] = React.useState("");
  const [gaMeasurementId, setGaMeasurementId] = React.useState("");
  const [fbPixelId, setFbPixelId] = React.useState("");
  const [gtmContainerId, setGtmContainerId] = React.useState("");
  // D7b — Microsoft Clarity. Blank keeps it OFF; there is no enable toggle, and
  // the absence of an id IS the off state (the same shape as the other three).
  const [clarityProjectId, setClarityProjectId] = React.useState("");
  // Social platform API credentials (for Social Feed section)
  const [metaPageAccessToken, setMetaPageAccessToken] = React.useState("");
  const [metaPageId, setMetaPageId] = React.useState("");
  const [tiktokClientKey, setTiktokClientKey] = React.useState("");
  const [tiktokClientSecret, setTiktokClientSecret] = React.useState("");
  const [tiktokAccessToken, setTiktokAccessToken] = React.useState("");
  const [deviantartClientId, setDeviantartClientId] = React.useState("");
  const [deviantartClientSecret, setDeviantartClientSecret] = React.useState("");

  // ⑨ Shipping
  const [freeShippingThreshold, setFreeShippingThreshold] = React.useState(999);
  const [defaultCarrier, setDefaultCarrier] = React.useState("custom");
  const [maxDeliveryRadius, setMaxDeliveryRadius] = React.useState(0);

  // ⑨ Payment methods (siteSettings.payment — read by checkout for method eligibility)
  const [razorpayEnabled, setRazorpayEnabled] = React.useState(false);
  const [phonepeEnabled, setPhonepeEnabled] = React.useState(false);
  const [cashfreeEnabled, setCashfreeEnabled] = React.useState(false);
  /*
   * 🛑 Defaults to EMPTY, which means "every store is third-party" and
   * therefore refuses online collection for every cart. That is the
   * fail-closed direction and it must not be "helpfully" defaulted to a store
   * id here — a wrong guess would authorise collecting another seller's money
   * into the platform's own account (the RBI commingling), and it would
   * present as a completely successful checkout.
   */
  const [platformStoreId, setPlatformStoreId] = React.useState("");
  const [upiManualEnabled, setUpiManualEnabled] = React.useState(true);
  const [codEnabled, setCodEnabled] = React.useState(true);
  const [otpCheckoutThreshold, setOtpCheckoutThreshold] = React.useState(5000);
  const [codMaxOrderValue, setCodMaxOrderValue] = React.useState(
    COD_MAX_ORDER_VALUE_FALLBACK,
  );

  // Per-listing-type / per-category-type visibility flags.
  const [listingTypeFlags, setListingTypeFlags] = React.useState<Record<string, boolean>>({});
  const [categoryTypeFlags, setCategoryTypeFlags] = React.useState<Record<string, boolean>>({});
  const [browsePageFlags, setBrowsePageFlags] = React.useState<Record<string, boolean>>({});
  // Per-channel notification-type allowlists — empty array means "all types".
  const [notifEmailTypes, setNotifEmailTypes] = React.useState<string[]>([]);
  const [notifWhatsappTypes, setNotifWhatsappTypes] = React.useState<string[]>([]);

  // ⑩ Collector Drop
  const [bidIncrementTiers, setBidIncrementTiers] = React.useState<BidIncrementTier[]>(DEFAULT_COLLECTOR_DROP_BID_INCREMENT_TIERS);
  const [autoExtendWindow, setAutoExtendWindow] = React.useState(5);
  const [settlementGrace, setSettlementGrace] = React.useState(24);

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

  // ⑫ Legal
  const [termsHtml, setTermsHtml] = React.useState("");
  const [privacyHtml, setPrivacyHtml] = React.useState("");
  const [refundHtml, setRefundHtml] = React.useState("");
  const [shippingPolicyHtml, setShippingPolicyHtml] = React.useState("");
  const [cookieHtml, setCookieHtml] = React.useState("");
  const [ethicsHtml, setEthicsHtml] = React.useState("");
  const [conductHtml, setConductHtml] = React.useState("");
  /*
   * 🛑 D19 — `cancellation` and `grievance` are declared on
   * `SiteSettingsDocument.legalPages` and were omitted from BOTH the load and
   * the payload here. Under the old wholesale-map replace that meant an
   * override written to either key was ERASED on the next Legal-tab save —
   * the same cause as D13, one group over, which is the evidence that the
   * repository fix (dotted paths) was the right level to fix it at.
   *
   * The grievance page in particular is a statutory channel, so an override
   * silently reverting to the bundled default is a compliance problem rather
   * than a content one.
   */
  const [cancellationHtml, setCancellationHtml] = React.useState("");
  const [grievanceHtml, setGrievanceHtml] = React.useState("");

  // ⑬ WhatsApp Business Cloud API (platform-level)
  const [waPhoneNumberId, setWaPhoneNumberId] = React.useState("");
  const [waCloudApiToken, setWaCloudApiToken] = React.useState("");
  const [waAdminNotifyNumbers, setWaAdminNotifyNumbers] = React.useState("");
  const [waTemplateLanguage, setWaTemplateLanguage] = React.useState("en");
  const [waTemplateOrderPlaced, setWaTemplateOrderPlaced] = React.useState("");
  const [waTemplateOrderConfirmed, setWaTemplateOrderConfirmed] = React.useState("");
  const [waTemplateOrderShipped, setWaTemplateOrderShipped] = React.useState("");
  const [waTemplateOrderDelivered, setWaTemplateOrderDelivered] = React.useState("");
  const [waTemplateOrderCancelled, setWaTemplateOrderCancelled] = React.useState("");
  const [waTemplateRefundInitiated, setWaTemplateRefundInitiated] = React.useState("");

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

  // ⑭ Notification channels
  const [notifEmailEnabled, setNotifEmailEnabled] = React.useState(false);
  const [notifEmailMinPriority, setNotifEmailMinPriority] = React.useState("normal");
  const [notifWhatsappEnabled, setNotifWhatsappEnabled] = React.useState(false);
  const [notifWhatsappMinPriority, setNotifWhatsappMinPriority] = React.useState("high");
  const [notifWhatsappOtpEnabled, setNotifWhatsappOtpEnabled] = React.useState(false);
  const [notifSmsEnabled, setNotifSmsEnabled] = React.useState(false);
  const [notifSmsMinPriority, setNotifSmsMinPriority] = React.useState("high");
  // Resend API key + sender identity (used by the email channel)
  const [resendApiKey, setResendApiKey] = React.useState("");
  const [notifFromEmail, setNotifFromEmail] = React.useState("");
  const [notifFromName, setNotifFromName] = React.useState("");
  // Daily ops digest — recipients are edited as one-per-line text, split on save.
  const [digestEnabled, setDigestEnabled] = React.useState(false);
  const [digestRecipients, setDigestRecipients] = React.useState("");

  /*
   * Outbound messaging: the kill switch and the daily ceiling.
   *
   * `emailEnabled` suppresses USER-facing mail only. Staff mail — the daily
   * digest, the payout summary — keeps flowing regardless, because switching
   * off customer email must never also blind the operator.
   */
  const [msgEmailEnabled, setMsgEmailEnabled] = React.useState(false);
  const [msgWhatsappEnabled, setMsgWhatsappEnabled] = React.useState(false);
  const [msgCeilingEmail, setMsgCeilingEmail] = React.useState(80);
  const [msgCeilingWhatsapp, setMsgCeilingWhatsapp] = React.useState(200);

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
    setSellerShippingFixed(s.commissions?.sellerShippingFixed ?? 0);
    setPlatformShippingPercent(s.commissions?.platformShippingPercent ?? 10);
    setPlatformShippingFixedMin(s.commissions?.platformShippingFixedMin ?? 0);

    setProcurementForm({
      laborHourlyRate: s.laborRate?.hourlyRate ?? 200,
      laborMaxHoursPerDay: s.laborRate?.maxHoursPerDay ?? 6,
    });

    setEmiEnabled(s.emi?.enabled ?? false);
    setEmiMinOrderValue(s.emi?.minOrderValue ?? 10000);
    setEmiTenureOptionsText((s.emi?.tenureOptions ?? [2, 3, 4, 5, 6]).join(","));
    setEmiTokenPercent(s.emi?.tokenPercent ?? 20);
    setEmiBillingDay(s.emi?.billingDay ?? 5);
    setEmiSurchargePercentPerMonth(s.emi?.surchargePercentPerMonth ?? 2);
    setEmiSurchargeSellerSharePercent(s.emi?.surchargeSellerSharePercent ?? 50);

    setGstEnabled(s.gst?.enabled ?? false);
    setGstin(s.gst?.gstin ?? "");
    setGstLegalName(s.gst?.legalName ?? "");
    setGstAddress(s.gst?.address ?? "");

    setRazorpayKeyId(s.credentialsMasked?.razorpayKeyId ?? "");
    setRazorpayKeySecret(s.credentialsMasked?.razorpayKeySecret ?? "");
    setRazorpayWebhookSecret(s.credentialsMasked?.razorpayWebhookSecret ?? "");
    setCashfreeAppId(s.credentialsMasked?.cashfreeAppId ?? "");
    setCashfreeSecretKey(s.credentialsMasked?.cashfreeSecretKey ?? "");
    setCashfreeEnvironment(s.credentialsMasked?.cashfreeEnvironment ?? "sandbox");
    setCashfreeWebhookSecret(s.credentialsMasked?.cashfreeWebhookSecret ?? "");
    setPhonepeClientId(s.credentialsMasked?.phonepeClientId ?? "");
    setPhonepeClientSecret(s.credentialsMasked?.phonepeClientSecret ?? "");
    setPhonepeClientVersion(s.credentialsMasked?.phonepeClientVersion ?? "1");
    setPhonepeEnvironment(s.credentialsMasked?.phonepeEnvironment ?? "sandbox");
    setPhonepeWebhookUsername(s.credentialsMasked?.phonepeWebhookUsername ?? "");
    setPhonepeWebhookPassword(s.credentialsMasked?.phonepeWebhookPassword ?? "");
    setGoogleMapsApiKey(s.credentialsMasked?.googleMapsApiKey ?? "");
    setGooglePlaceId(s.credentialsMasked?.googlePlaceId ?? "");
    setSmtpHost(s.emailSettings?.host ?? "");
    setSmtpPort(String(s.emailSettings?.port ?? 587));
    setSmtpUser(s.emailSettings?.user ?? "");
    setSmtpFrom(s.emailSettings?.fromAddress ?? "");
    setGaMeasurementId(s.integrations?.googleAnalyticsId ?? "");
    setFbPixelId(s.integrations?.facebookPixelId ?? "");
    setGtmContainerId(s.integrations?.gtmContainerId ?? "");
    setClarityProjectId(s.integrations?.clarityProjectId ?? "");
    setMetaPageAccessToken(s.credentialsMasked?.metaPageAccessToken ?? "");
    setMetaPageId(s.credentialsMasked?.metaPageId ?? "");
    setTiktokClientKey(s.credentialsMasked?.tiktokClientKey ?? "");
    setTiktokClientSecret(s.credentialsMasked?.tiktokClientSecret ?? "");
    setTiktokAccessToken(s.credentialsMasked?.tiktokAccessToken ?? "");
    setDeviantartClientId(s.credentialsMasked?.deviantartClientId ?? "");
    setDeviantartClientSecret(s.credentialsMasked?.deviantartClientSecret ?? "");

    setFreeShippingThreshold(s.shipping?.freeShippingThreshold ?? 999);
    setDefaultCarrier(s.shipping?.defaultCarrier ?? "custom");
    setMaxDeliveryRadius(s.shipping?.maxDeliveryRadius ?? 0);

    setRazorpayEnabled(s.payment?.razorpayEnabled ?? false);
    setPhonepeEnabled(s.payment?.phonepeEnabled ?? false);
    setCashfreeEnabled(s.payment?.cashfreeEnabled ?? false);
    /*
     * 🛑 The HYDRATE leg, and skipping it is the live risk this file's own
     * comments name: a key that is SAVED but never hydrated renders its
     * default — here the empty string — and the next save writes that default
     * over the stored value. For this field that silently turns online
     * collection off for the whole site on the first unrelated settings save.
     */
    setPlatformStoreId(s.payment?.platformStoreId ?? "");
    setUpiManualEnabled(s.payment?.upiManualEnabled ?? true);
    setCodEnabled(s.payment?.codEnabled ?? true);
    setOtpCheckoutThreshold(s.payment?.otpCheckoutThreshold ?? 5000);
    setCodMaxOrderValue(s.payment?.codMaxOrderValue ?? COD_MAX_ORDER_VALUE_FALLBACK);

    setListingTypeFlags((s.listings?.listingTypes as Record<string, boolean> | undefined) ?? {});
    setCategoryTypeFlags((s.listings?.categoryTypes as Record<string, boolean> | undefined) ?? {});
    setBrowsePageFlags((s.listings?.browsePages as Record<string, boolean> | undefined) ?? {});
    setNotifEmailTypes(s.notificationChannels?.email?.types ?? []);
    setNotifWhatsappTypes(s.notificationChannels?.whatsapp?.types ?? []);

    setBidIncrementTiers(s.collectorDropConfig?.bidIncrementTiers ?? DEFAULT_COLLECTOR_DROP_BID_INCREMENT_TIERS);
    setAutoExtendWindow(s.collectorDropConfig?.autoExtendWindowMinutes ?? 5);
    setSettlementGrace(s.collectorDropConfig?.settlementGracePeriodHours ?? 24);

    setLimitsForm({
      maxProductsPerStore: s.platformLimits?.maxProductsPerStore ?? 100,
      maxCustomFields: s.platformLimits?.maxCustomFieldsPerProduct ?? 50,
      orderCancelWindow: s.platformLimits?.orderCancellationWindowHours ?? 24,
    });

    setTermsHtml(s.legalPages?.terms ?? "");
    setPrivacyHtml(s.legalPages?.privacy ?? "");
    setRefundHtml(s.legalPages?.refundPolicy ?? "");
    setShippingPolicyHtml(s.legalPages?.shipping ?? "");
    setCookieHtml(s.legalPages?.cookies ?? "");
    setEthicsHtml(s.legalPages?.ethics ?? "");
    setCancellationHtml(s.legalPages?.cancellation ?? "");
    setGrievanceHtml(s.legalPages?.grievance ?? "");
    setConductHtml(s.legalPages?.codeOfConduct ?? "");

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

    setWaPhoneNumberId(s.credentialsMasked?.whatsappPhoneNumberId ?? "");
    setWaCloudApiToken(s.credentialsMasked?.whatsappCloudApiToken ?? "");
    setWaAdminNotifyNumbers(s.credentialsMasked?.whatsappAdminNotifyNumbers ?? "");
    setWaTemplateLanguage(s.credentialsMasked?.whatsappTemplateLanguage ?? "en");
    setWaTemplateOrderPlaced(s.credentialsMasked?.whatsappTemplateOrderPlaced ?? "");
    setWaTemplateOrderConfirmed(s.credentialsMasked?.whatsappTemplateOrderConfirmed ?? "");
    setWaTemplateOrderShipped(s.credentialsMasked?.whatsappTemplateOrderShipped ?? "");
    setWaTemplateOrderDelivered(s.credentialsMasked?.whatsappTemplateOrderDelivered ?? "");
    setWaTemplateOrderCancelled(s.credentialsMasked?.whatsappTemplateOrderCancelled ?? "");
    setWaTemplateRefundInitiated(s.credentialsMasked?.whatsappTemplateRefundInitiated ?? "");

    setNotifEmailEnabled(s.notificationChannels?.email?.enabled ?? false);
    setNotifEmailMinPriority(s.notificationChannels?.email?.minPriority ?? "normal");
    setNotifWhatsappEnabled(s.notificationChannels?.whatsapp?.enabled ?? false);
    setNotifWhatsappMinPriority(s.notificationChannels?.whatsapp?.minPriority ?? "high");
    setNotifWhatsappOtpEnabled(s.notificationChannels?.whatsapp?.otpEnabled ?? false);
    setNotifSmsEnabled(s.notificationChannels?.sms?.enabled ?? false);
    setNotifSmsMinPriority(s.notificationChannels?.sms?.minPriority ?? "high");
    setResendApiKey(s.credentialsMasked?.resendApiKey ?? "");
    setNotifFromEmail(s.emailSettings?.fromEmail ?? "");
    setNotifFromName(s.emailSettings?.fromName ?? "");
    setDigestEnabled(s.emailSettings?.dailyDigest?.enabled ?? false);
    setDigestRecipients((s.emailSettings?.dailyDigest?.recipients ?? []).join("\n"));
    // Defaults mirror MESSAGE_BUDGET_DEFAULTS — both channels OFF, so a
    // settings document written before this feature existed reads as quiet
    // rather than as "on and unmetered".
    setMsgEmailEnabled(s.messaging?.emailEnabled ?? false);
    setMsgWhatsappEnabled(s.messaging?.whatsappEnabled ?? false);
    setMsgCeilingEmail(s.messaging?.dailyCeiling?.email ?? 80);
    setMsgCeilingWhatsapp(s.messaging?.dailyCeiling?.whatsapp ?? 200);

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
      commissions: { ...feesForm, sellerShippingFixed, platformShippingPercent, platformShippingFixedMin },
      laborRate: { hourlyRate: procurementForm.laborHourlyRate, maxHoursPerDay: procurementForm.laborMaxHoursPerDay },
      emi: {
        enabled: emiEnabled,
        minOrderValue: emiMinOrderValue,
        tenureOptions: emiTenureOptionsText
          .split(",")
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => !isNaN(v) && v > 0),
        tokenPercent: emiTokenPercent,
        billingDay: emiBillingDay,
        surchargePercentPerMonth: emiSurchargePercentPerMonth,
        surchargeSellerSharePercent: emiSurchargeSellerSharePercent,
      },
      gst: {
        enabled: gstEnabled,
        gstin: gstin.trim().toUpperCase(),
        legalName: gstLegalName.trim(),
        address: gstAddress.trim(),
      },
      // Masked credential fields resolve to "" when untouched — the repository's
      // mergeEncryptedCredentials preserves the existing encrypted value for any
      // "" field, so an unedited tab never overwrites a real secret with its
      // own masked display string.
      credentials: {
        razorpayKeyId: maskedOrReal("razorpayKeyId", razorpayKeyId),
        razorpayKeySecret: maskedOrReal("razorpayKeySecret", razorpayKeySecret),
        razorpayWebhookSecret: maskedOrReal("razorpayWebhookSecret", razorpayWebhookSecret),
        cashfreeAppId: maskedOrReal("cashfreeAppId", cashfreeAppId),
        cashfreeSecretKey: maskedOrReal("cashfreeSecretKey", cashfreeSecretKey),
        cashfreeEnvironment: maskedOrReal("cashfreeEnvironment", cashfreeEnvironment),
        cashfreeWebhookSecret: maskedOrReal("cashfreeWebhookSecret", cashfreeWebhookSecret),
        phonepeClientId: maskedOrReal("phonepeClientId", phonepeClientId),
        phonepeClientSecret: maskedOrReal("phonepeClientSecret", phonepeClientSecret),
        phonepeClientVersion: maskedOrReal("phonepeClientVersion", phonepeClientVersion),
        phonepeEnvironment: maskedOrReal("phonepeEnvironment", phonepeEnvironment),
        phonepeWebhookUsername: maskedOrReal("phonepeWebhookUsername", phonepeWebhookUsername),
        phonepeWebhookPassword: maskedOrReal("phonepeWebhookPassword", phonepeWebhookPassword),
        googleMapsApiKey: maskedOrReal("googleMapsApiKey", googleMapsApiKey),
        googlePlaceId: maskedOrReal("googlePlaceId", googlePlaceId),
        metaPageAccessToken: maskedOrReal("metaPageAccessToken", metaPageAccessToken),
        metaPageId: maskedOrReal("metaPageId", metaPageId),
        tiktokClientKey: maskedOrReal("tiktokClientKey", tiktokClientKey),
        tiktokClientSecret: maskedOrReal("tiktokClientSecret", tiktokClientSecret),
        tiktokAccessToken: maskedOrReal("tiktokAccessToken", tiktokAccessToken),
        deviantartClientId: maskedOrReal("deviantartClientId", deviantartClientId),
        deviantartClientSecret: maskedOrReal("deviantartClientSecret", deviantartClientSecret),
        whatsappPhoneNumberId: maskedOrReal("whatsappPhoneNumberId", waPhoneNumberId),
        whatsappCloudApiToken: maskedOrReal("whatsappCloudApiToken", waCloudApiToken),
        whatsappAdminNotifyNumbers: maskedOrReal("whatsappAdminNotifyNumbers", waAdminNotifyNumbers),
        whatsappTemplateLanguage: maskedOrReal("whatsappTemplateLanguage", waTemplateLanguage),
        whatsappTemplateOrderPlaced: maskedOrReal("whatsappTemplateOrderPlaced", waTemplateOrderPlaced),
        whatsappTemplateOrderConfirmed: maskedOrReal("whatsappTemplateOrderConfirmed", waTemplateOrderConfirmed),
        whatsappTemplateOrderShipped: maskedOrReal("whatsappTemplateOrderShipped", waTemplateOrderShipped),
        whatsappTemplateOrderDelivered: maskedOrReal("whatsappTemplateOrderDelivered", waTemplateOrderDelivered),
        whatsappTemplateOrderCancelled: maskedOrReal("whatsappTemplateOrderCancelled", waTemplateOrderCancelled),
        whatsappTemplateRefundInitiated: maskedOrReal("whatsappTemplateRefundInitiated", waTemplateRefundInitiated),
        resendApiKey: maskedOrReal("resendApiKey", resendApiKey),
      },
      emailSettings: {
        host: smtpHost, port: Number(smtpPort), user: smtpUser, fromAddress: smtpFrom,
        fromEmail: notifFromEmail, fromName: notifFromName,
        dailyDigest: {
          enabled: digestEnabled,
          recipients: splitEmailList(digestRecipients),
          // Always empty — the CC field is gone (see the Notifications tab).
          // Sent explicitly rather than omitted so a save clears any CC list a
          // pre-existing document still carries.
          ccRecipients: [],
        },
      },
      messaging: {
        emailEnabled: msgEmailEnabled,
        whatsappEnabled: msgWhatsappEnabled,
        dailyCeiling: {
          email: msgCeilingEmail,
          whatsapp: msgCeilingWhatsapp,
          // No SMS sender exists; the ceiling is carried so one cannot ship
          // uncapped if somebody adds a provider later.
          sms: 50,
        },
      },
      integrations: { googleAnalyticsId: gaMeasurementId, facebookPixelId: fbPixelId, gtmContainerId, clarityProjectId },
      shipping: { freeShippingThreshold, defaultCarrier, maxDeliveryRadius },
      /*
       * `platformStoreId` is trimmed and sent as `undefined` when blank rather
       * than as `""` — the resolver treats an empty-ish value as unset anyway,
       * but writing a literal empty string would record a DECISION ("no store
       * is ours") where none was made, and a stored `""` reads differently
       * from an absent key to anyone inspecting the document.
       */
      payment: { razorpayEnabled, phonepeEnabled, cashfreeEnabled, platformStoreId: platformStoreId.trim() || undefined, upiManualEnabled, codEnabled, codMaxOrderValue, otpCheckoutThreshold },
      collectorDropConfig: { bidIncrementTiers: bidIncrementTiers as unknown as FirestoreDocument[], autoExtendWindowMinutes: autoExtendWindow, settlementGracePeriodHours: settlementGrace },
      platformLimits: {
        maxProductsPerStore: limitsForm.maxProductsPerStore,
        maxCustomFieldsPerProduct: limitsForm.maxCustomFields,
        orderCancellationWindowHours: limitsForm.orderCancelWindow,
      },
      legalPages: { terms: termsHtml, privacy: privacyHtml, refundPolicy: refundHtml, shipping: shippingPolicyHtml, cookies: cookieHtml, ethics: ethicsHtml, codeOfConduct: conductHtml, cancellation: cancellationHtml, grievance: grievanceHtml },
      // Both keys are always sent: Firestore's update() replaces a nested map
      // wholesale, so omitting one here would wipe it. The load-time spread this
      // used to carry existed to preserve `adminCheckoutBypass`, which is now a
      // permission rather than a stored flag.
      listings: {
        listingTypes: listingTypeFlags,
        categoryTypes: categoryTypeFlags,
        browsePages: browsePageFlags,
      },
      notificationChannels: {
        inApp: { enabled: true, readOnly: true },
        email: { enabled: notifEmailEnabled, minPriority: notifEmailMinPriority, types: notifEmailTypes },
        whatsapp: { enabled: notifWhatsappEnabled, minPriority: notifWhatsappMinPriority, otpEnabled: notifWhatsappOtpEnabled, types: notifWhatsappTypes },
        sms: { enabled: notifSmsEnabled, minPriority: notifSmsMinPriority },
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
  const CARRIER_OPTIONS = [
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
   */
  const GATEWAY_ENVIRONMENT_OPTIONS = [
    { label: "Sandbox (test)", value: "sandbox" },
    { label: "Production (live)", value: "production" },
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

          {/* ⑯ EMI — site-wide installment financing settings */}
          <TabsContent value="emi">
            <SettingsTabForm id="emi" label="Emi">
              <Text size="xs" color="muted">
                A seller must also opt in via their own Payout Settings for EMI to appear at
                checkout on their items. See the "How EMI Works" public page for buyer-facing copy.
              </Text>
              <Toggle
                checked={emiEnabled}
                onChange={setEmiEnabled}
                label="Enable EMI platform-wide"
              />
              <Grid cols={2} gap="md">
                <Input
                  label="Minimum order value (₹)"
                  helperText="A seller's cart subtotal must exceed this for EMI to appear as an option."
                  value={String(emiMinOrderValue)}
                  onChange={(e) => setEmiMinOrderValue(Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
                  type="number"
                  min={0}
                />
                <Input
                  label="Tenure options (months, comma-separated)"
                  helperText="e.g. 2,3,4,5,6"
                  value={emiTenureOptionsText}
                  onChange={(e) => setEmiTenureOptionsText(e.target.value)}
                />
                <Input
                  label="Token / down-payment (%)"
                  helperText="Collected upfront at checkout."
                  value={String(emiTokenPercent)}
                  onChange={(e) => setEmiTokenPercent(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  max={100}
                />
                <Input
                  label="Billing day (1–10)"
                  helperText="Day of month each installment is due."
                  value={String(emiBillingDay)}
                  onChange={(e) => setEmiBillingDay(parseFloat(e.target.value) || 1)}
                  type="number"
                  min={1}
                  max={10}
                />
                <Input
                  label="Surcharge (% of principal per month)"
                  helperText="The 'excess EMI fee' the buyer pays for spreading payment."
                  value={String(emiSurchargePercentPerMonth)}
                  onChange={(e) => setEmiSurchargePercentPerMonth(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                />
                <Input
                  label="Seller's share of surcharge (%)"
                  helperText="The rest of the surcharge goes to the platform."
                  value={String(emiSurchargeSellerSharePercent)}
                  onChange={(e) => setEmiSurchargeSellerSharePercent(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  max={100}
                />
              </Grid>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑰ GST — Indian tax compliance settings */}
          <TabsContent value="gst">
            <SettingsTabForm id="gst" label="Gst">
              <Text size="xs" color="muted">
                Required before enabling GST-inclusive checkout (P-8). Also set a GST rate + HSN
                code on each taxable product for the tax breakdown to appear.
              </Text>
              <Toggle
                checked={gstEnabled}
                onChange={setGstEnabled}
                label="Enable GST on checkout"
              />
              <Grid cols={2} gap="md">
                <Input
                  label="GSTIN"
                  helperText="15-character GST Identification Number."
                  error={gstProblems.gstin}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AAAAA0000A1Z5"
                  maxLength={15}
                />
                <Input
                  label="Legal name"
                  helperText="Registered business name for invoices."
                  error={gstProblems.legalName}
                  value={gstLegalName}
                  onChange={(e) => setGstLegalName(e.target.value)}
                  placeholder={`${getBrandName()} Pvt Ltd`}
                />
              </Grid>
              <Stack gap="xs">
                <Textarea
                  label="Registered address"
                  value={gstAddress}
                  onChange={(e) => setGstAddress(e.target.value)}
                  placeholder="Registered business address for GST invoices…"
                  rows={3}
                />
                {gstProblems.address ? (
                  <Text size="sm" variant="error" role="alert">
                    {gstProblems.address}
                  </Text>
                ) : null}
              </Stack>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑱ Listings — what the marketplace offers */}
          <TabsContent value="listings">
            <SettingsTabForm id="listings" label="Listings">
              <Text size="xs" color="muted">
                Which listing and category types the marketplace offers. A disabled type is hidden
                from every browse surface and rejected on create and add-to-cart — existing data is
                untouched, it just becomes unreachable until re-enabled.
              </Text>

              {/* This tab was "Feature Flags" until 2026-08-29 and carried 12 more
                  toggles. Eleven of them had no reader anywhere in the codebase, so
                  an admin could switch "Wishlists" or "Reviews" off and watch
                  nothing happen; the twelfth (`offers`) is now governed by the two
                  gates a person actually sets — the listing type's capability and
                  the seller's own per-listing opt-in. What is left here are the two
                  controls that were never flags: standing decisions about the
                  catalogue. */}

              <Stack gap="xs">
                <Text size="sm" weight="semibold">Listing types</Text>
                <Text size="xs" color="muted">Disabled types are hidden from listings and reject create/add-to-cart.</Text>
                <Grid cols={2} gap="sm">
                  {LISTING_TYPE_KEYS.map((key) => (
                    <Toggle
                      key={key}
                      // The plugin's own display label, not the raw key — the
                      // literal version rendered "pre-order" and
                      // "digital-code" at an admin.
                      label={pluginFor(key).typeLabel}
                      checked={listingTypeFlags[key] ?? true}
                      onChange={(v) => setListingTypeFlags((prev) => ({ ...prev, [key]: v }))}
                    />
                  ))}
                </Grid>
              </Stack>

              <Stack gap="xs">
                <Text size="sm" weight="semibold">Category types</Text>
                <Grid cols={2} gap="sm">
                  {CATEGORY_TYPE_KEYS.map((key) => (
                    <Toggle
                      key={key}
                      label={key}
                      checked={categoryTypeFlags[key] ?? true}
                      onChange={(v) => setCategoryTypeFlags((prev) => ({ ...prev, [key]: v }))}
                    />
                  ))}
                </Grid>
              </Stack>

              {/*
                A THIRD axis, and the copy says so, because the three read as
                near-synonyms to anyone who has not been told otherwise:
                listing types are what we SELL, category types are what a
                taxonomy ROW may be, and these are whether a public ENTRY POINT
                is open. Switching "Brands" off here does not untag one product
                — brand rows keep driving every brand query. It closes the door.
              */}
              <Stack gap="xs">
                <Text size="sm" weight="semibold">Browse sections</Text>
                <Text size="xs" color="muted">
                  A closed section returns Not Found and disappears from the navbar, the sidebar,
                  the mobile menu, the footer and the sitemap. Products, categories and stores are
                  untouched — only the public way in is withdrawn, and re-opening restores it.
                </Text>
                <Grid cols={2} gap="sm">
                  {/* The hint sits BESIDE the toggle rather than inside its
                      `label`: Toggle has no `description` prop, and widening a
                      primitive used on ~70 surfaces to carry a hint for four
                      rows is the wrong trade. */}
                  {BROWSE_PAGE_KEYS.map((key) => (
                    <Stack key={key} gap="xs">
                      <Toggle
                        label={BROWSE_PAGE_META[key]?.label ?? key}
                        checked={browsePageFlags[key] ?? true}
                        onChange={(v) => setBrowsePageFlags((prev) => ({ ...prev, [key]: v }))}
                      />
                      <Text size="xs" color="muted">{BROWSE_PAGE_META[key]?.hint}</Text>
                    </Stack>
                  ))}
                </Grid>
              </Stack>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑧ Integrations & Keys */}
          <TabsContent value="integrations">
            <SettingsTabForm id="integrations" label="Integrations">
              <Text size="xs" color="muted">Keys are masked in transit and stored encrypted. Click Reveal to view.</Text>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Razorpay</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Razorpay Key ID" value={razorpayKeyId} onChange={setRazorpayKeyId} placeholder="rzp_test_… / rzp_live_…" />
                  <MaskedInput label="Razorpay Key Secret" value={razorpayKeySecret} onChange={setRazorpayKeySecret} placeholder="••••••••" />
                  <MaskedInput label="Razorpay Webhook Secret" value={razorpayWebhookSecret} onChange={setRazorpayWebhookSecret} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">PhonePe</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="PhonePe Client ID" value={phonepeClientId} onChange={setPhonepeClientId} placeholder="MERCHANTID_…" />
                  <MaskedInput label="PhonePe Client Secret" value={phonepeClientSecret} onChange={setPhonepeClientSecret} placeholder="••••••••" />
                  <Input label="PhonePe Client Version" value={phonepeClientVersion} onChange={(e) => setPhonepeClientVersion(e.target.value)} placeholder="1" />
                  <Select label="PhonePe Environment" options={GATEWAY_ENVIRONMENT_OPTIONS} value={phonepeEnvironment} onValueChange={setPhonepeEnvironment} />
                  <MaskedInput label="PhonePe Webhook Username" value={phonepeWebhookUsername} onChange={setPhonepeWebhookUsername} placeholder="••••••••" />
                  <MaskedInput label="PhonePe Webhook Password" value={phonepeWebhookPassword} onChange={setPhonepeWebhookPassword} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Cashfree Payments</Text>
                {/*
                  🛑 The App ID is NOT publishable, unlike Razorpay's Key ID —
                  Cashfree hands the browser a per-order payment_session_id, so
                  no Cashfree credential ever leaves the server. Both fields are
                  masked for that reason.
                */}
                <Grid cols={2} gap="md">
                  <MaskedInput label="Cashfree App ID" value={cashfreeAppId} onChange={setCashfreeAppId} placeholder="••••••••" />
                  <MaskedInput label="Cashfree Secret Key" value={cashfreeSecretKey} onChange={setCashfreeSecretKey} placeholder="••••••••" />
                  {/*
                    🛑 This Select shows NO selection once a value has been
                    stored, and that is the safe behaviour — do not "fix" it by
                    defaulting the hydrate to "sandbox".

                    Everything in `credentials` is masked generically, and
                    `maskSecret` returns "****" for anything under 12 chars — so
                    both "sandbox" and "production" come back as "****", which
                    matches no option. Because the state then equals
                    `originalMaskedRef`, `maskedOrReal` sends "" and the stored
                    value is PRESERVED.

                    Defaulting the display to "sandbox" instead would make the
                    state differ from the mask, so the next save of any tab would
                    write "sandbox" over a stored "production" — i.e. silently
                    point a live gateway at the sandbox API. Same shape as the
                    saved-but-never-hydrated hazard documented on
                    `SiteSettingsDocument.contact.upiVpa`. PhonePe's Environment
                    select above behaves identically, for the same reason.
                  */}
                  <Select label="Cashfree Environment" options={GATEWAY_ENVIRONMENT_OPTIONS} value={cashfreeEnvironment} onValueChange={setCashfreeEnvironment} />
                  <MaskedInput label="Cashfree Webhook Secret" value={cashfreeWebhookSecret} onChange={setCashfreeWebhookSecret} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">SMTP / Email</Text>
                <Grid cols={2} gap="md">
                  <Input label="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" />
                  <Input label="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} type="number" placeholder="587" />
                  <Input label="SMTP user" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="apikey" />
                </Grid>
                <Input label="From address" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder={getBrandNoreplyEmail()} type="email" />
                <Text size="xs" color="muted">
                  Transactional email is delivered through Resend — set the Resend API key below.
                  These SMTP fields are stored but not currently used for delivery.
                </Text>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Google Places (store reviews)</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Google Maps API key" value={googleMapsApiKey} onChange={setGoogleMapsApiKey} placeholder="••••••••" />
                  <Input label="Default Google Place ID" value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} placeholder="ChIJ…" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Analytics & Tracking</Text>
                <Grid cols={2} gap="md">
                  <Input label="Google Analytics ID" value={gaMeasurementId} onChange={(e) => setGaMeasurementId(e.target.value)} placeholder="G-XXXXXXXXXX" />
                  <Input label="Facebook Pixel ID" value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} placeholder="XXXXXXXXXXXXXXXX" />
                  <Input label="GTM Container ID" value={gtmContainerId} onChange={(e) => setGtmContainerId(e.target.value)} placeholder="GTM-XXXXXXX" />
                  {/* 🛑 The help text states the masking, because an admin
                      pasting an id here is switching on SESSION RECORDING on a
                      site with no consent gate. It ships masked (no text, no
                      input values) and the field should say so where the
                      decision is made, not only in a code comment. */}
                  <Input
                    label="Microsoft Clarity Project ID"
                    value={clarityProjectId}
                    onChange={(e) => setClarityProjectId(e.target.value)}
                    placeholder="abcdefghij"
                    helperText="Heatmaps and session replay. Recording is strictly masked — no text or input values are captured. Leave blank to keep Clarity off."
                  />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Meta (Instagram &amp; Facebook Social Feed)</Text>
                <Text size="xs" color="muted">Used by the Social Feed section to fetch Instagram and Facebook posts via Meta Graph API v19.</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Page Access Token" value={metaPageAccessToken} onChange={setMetaPageAccessToken} placeholder="EAAxxxxxxx…" />
                  <Input label="Page ID (or handle)" value={metaPageId} onChange={(e) => setMetaPageId(e.target.value)} placeholder="yourbrand" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">TikTok for Developers (Social Feed)</Text>
                <Text size="xs" color="muted">Client credentials + long-lived access token from TikTok for Developers. Used to list your account's public videos.</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Client Key" value={tiktokClientKey} onChange={setTiktokClientKey} placeholder="aw…" />
                  <MaskedInput label="Client Secret" value={tiktokClientSecret} onChange={setTiktokClientSecret} placeholder="••••••••" />
                  <MaskedInput label="Access Token (long-lived)" value={tiktokAccessToken} onChange={setTiktokAccessToken} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">DeviantArt OAuth2 (Social Feed)</Text>
                <Text size="xs" color="muted">Client credentials for DeviantArt gallery fetching (client-credentials OAuth2 flow — no user login required).</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Client ID" value={deviantartClientId} onChange={setDeviantartClientId} placeholder="1234" />
                  <MaskedInput label="Client Secret" value={deviantartClientSecret} onChange={setDeviantartClientSecret} placeholder="••••••••" />
                </Grid>
              </Stack>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑨ Shipping Defaults */}
          <TabsContent value="shipping">
            <SettingsTabForm id="shipping" label="Shipping">
              <Text size="sm" weight="medium" color="muted">Payment methods</Text>
              <Div id="setting-razorpay-enabled"><Toggle label="Razorpay (online card/UPI/netbanking) enabled — needs Key ID + Key Secret under Credentials" checked={razorpayEnabled} onChange={setRazorpayEnabled} /></Div>
              <Div id="setting-phonepe-enabled"><Toggle label="PhonePe (online card/UPI) enabled — when several are on, the first in the Razorpay → PhonePe → Cashfree order is the DEFAULT; carts needing split settlement still go to Cashfree" checked={phonepeEnabled} onChange={setPhonepeEnabled} /></Div>
              <Div id="setting-cashfree-enabled"><Toggle label="Cashfree Payments enabled — needs App ID + Secret Key under Credentials. Last in the default order, but REQUIRED for any cart holding another seller’s items: it is the only gateway that pays each seller directly at capture. Leave it off and those carts cannot be paid online at all" checked={cashfreeEnabled} onChange={setCashfreeEnabled} /></Div>
              <Input
                label="Platform's own store ID"
                /*
                  🛑 A free-text store id rather than a picker, deliberately.
                  This view loads no store list, and the cost of a typo is
                  FAIL-CLOSED and loud — an id naming no real store behaves
                  exactly like a blank one, so every cart becomes third-party
                  and online payment is refused with a reason, which an admin
                  notices immediately. A picker would be nicer; a wrong default
                  would be dangerous, and that is the trade this field is
                  placed on.
                */
                helperText="The one store whose stock this business may collect payment for into its own account. LEAVE BLANK AND NO CART CAN BE PAID ONLINE: any cart holding another seller's items must be collected by a gateway that settles their share directly to them at capture (Cashfree Easy Split), because a non-splitting capture puts their money in this business's account first. Blank means every store counts as another seller's."
                value={platformStoreId}
                onChange={(e) => setPlatformStoreId(e.target.value)}
                placeholder="store-your-official-slug"
              />
              <Div id="setting-manual-payment-enabled"><Toggle label="Manual UPI/bank transfer enabled" checked={upiManualEnabled} onChange={setUpiManualEnabled} /></Div>
              <Div id="setting-cod-enabled"><Toggle label="Cash on delivery (COD) enabled" checked={codEnabled} onChange={setCodEnabled} /></Div>
              <Input label="Free shipping threshold (₹)" value={String(freeShippingThreshold)} onChange={(e) => setFreeShippingThreshold(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Orders above this amount get free shipping." />
              <Select label="Default carrier" options={CARRIER_OPTIONS} value={defaultCarrier} onValueChange={setDefaultCarrier} />
              <Input label="Max delivery radius (km, 0 = no limit)" value={String(maxDeliveryRadius)} onChange={(e) => setMaxDeliveryRadius(parseInt(e.target.value) || 0)} type="number" min={0} />
              <Input
                label="COD maximum order value (₹)"
                /*
                  🛑 A MAXIMUM, sitting directly above a THRESHOLD that is a
                  minimum. The helper text says which way each one runs,
                  because the two fields look identical and mean opposite
                  things — and getting it backwards here either refuses every
                  COD order or refuses none.
                */
                helperText="Carts ABOVE this subtotal cannot pay by cash on delivery; the option is shown disabled with the reason. 0 = COD off for every cart."
                value={String(codMaxOrderValue)}
                onChange={(e) => setCodMaxOrderValue(parseInt(e.target.value) || 0)}
                type="number"
                min={0}
                disabled={!codEnabled}
              />
              <Input
                label="High-value checkout OTP threshold (₹)"
                helperText="Carts at or above this subtotal require an extra OTP verification step before payment (0 = disabled)."
                value={String(otpCheckoutThreshold)}
                onChange={(e) => setOtpCheckoutThreshold(parseInt(e.target.value) || 0)}
                type="number"
                min={0}
              />
              <Text size="sm" weight="medium" color="muted" className="pt-[var(--appkit-space-2)]">Seller shipping charge defaults</Text>
              <Grid cols={2} gap="md">
                <Input label="Seller shipping fixed (₹)" helperText="Flat shipping charge collected on the seller's behalf." value={String(sellerShippingFixed)} onChange={(e) => setSellerShippingFixed(parseFloat(e.target.value) || 0)} type="number" min={0} />
                <Input label="Platform shipping (%)" helperText="Platform's own shipping markup, as a % of order value." value={String(platformShippingPercent)} onChange={(e) => setPlatformShippingPercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
                <Input label="Platform shipping minimum (₹)" helperText="Floor for the platform shipping markup." value={String(platformShippingFixedMin)} onChange={(e) => setPlatformShippingFixedMin(parseFloat(e.target.value) || 0)} type="number" min={0} />
              </Grid>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑩ Collector Drop Config */}
          <TabsContent value="collector-drop">
            <SettingsTabForm id="collector-drop" label="Collector Drop">
              <Stack gap="sm" rounded="lg" border="default" padding="sm">
                <Text size="xs" weight="medium" color="muted">Bid increment tiers</Text>
                <Text size="xs" color="muted">
                  The minimum jump a new bid must clear, based on the current bid amount. A seller's per-listing override can require more than the matching tier, but can never undercut it.
                </Text>
                {bidIncrementTiers.map((tier, i) => {
                  const isLast = i === bidIncrementTiers.length - 1;
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
                            onChange={(e) => setBidIncrementTiers(bidIncrementTiers.map((t, j) => j === i ? { ...t, upTo: parseInt(e.target.value) || 0 } : t))}
                          />
                        )}
                      </Div>
                      <Div className="col-span-5">
                        <Input
                          label="Increment (₹)"
                          type="number"
                          min={1}
                          value={String(tier.increment)}
                          onChange={(e) => setBidIncrementTiers(bidIncrementTiers.map((t, j) => j === i ? { ...t, increment: parseInt(e.target.value) || 0 } : t))}
                        />
                      </Div>
                      <Row centered className="col-span-2" padding="b-xs">
                        <Button
                          variant="ghost"
                          type="button"
                          disabled={bidIncrementTiers.length <= 1}
                          onClick={() => setBidIncrementTiers(bidIncrementTiers.filter((_, j) => j !== i))}
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
                  onClick={() => setBidIncrementTiers([
                    ...bidIncrementTiers.slice(0, -1),
                    { upTo: 100, increment: 10 },
                    bidIncrementTiers[bidIncrementTiers.length - 1] ?? { upTo: null, increment: 1000 },
                  ])}
                >
                  + Add tier
                </Button>
              </Stack>
              <Input label="Auto-extend window (minutes before end)" value={String(autoExtendWindow)} onChange={(e) => setAutoExtendWindow(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Extend collector drop end time if a bid arrives within this window." />
              <Input label="Settlement grace period (hours)" value={String(settlementGrace)} onChange={(e) => setSettlementGrace(parseInt(e.target.value) || 0)} type="number" min={1} helperText="Time winner has to pay before the collector drop is re-listed." />
            </SettingsTabForm>
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

          {/* ⑬ WhatsApp Business Cloud API */}
          <TabsContent value="whatsapp">
            <SettingsTabForm id="whatsapp" label="Whatsapp">
              <Text size="xs" color="muted">
                Platform-level WhatsApp Business Cloud API credentials. Used for automated purchase
                announcements to admin numbers when orders are placed. Store owners configure their
                own credentials in Store → WhatsApp.
              </Text>
              <Input
                label="Phone Number ID"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                placeholder="987654321098765"
                helperText="From Meta for Developers → App → WhatsApp → API Setup"
              />
              <MaskedInput
                label="Cloud API System User Token"
                value={waCloudApiToken}
                onChange={setWaCloudApiToken}
                placeholder="EAAxxxxxxxx…"
                helperText="Long-lived system user access token with WhatsApp Business permissions"
              />
              <Input
                label="Admin Notify Numbers"
                value={waAdminNotifyNumbers}
                onChange={(e) => setWaAdminNotifyNumbers(e.target.value)}
                placeholder="919876543210,918765432109"
                helperText="Comma-separated, digits-only, include country code. These receive a WhatsApp message when any order is placed."
              />
              <Text size="xs" color="muted">
                Approved Meta message templates for the buyer-facing WhatsApp order-updates addon
                (Fees tab). Meta rejects business-initiated free-text WhatsApp messages outside a 24h
                customer-service window — a real template name here is required for that notification
                type to actually deliver. Leave blank to skip WhatsApp for that type (in-app + email
                still fire).
              </Text>
              <Input
                label="Template language code"
                value={waTemplateLanguage}
                onChange={(e) => setWaTemplateLanguage(e.target.value)}
                placeholder="en"
                helperText="BCP-47 code the templates below were approved in, e.g. en or en_US."
              />
              <Grid cols={2} gap="md">
                <Input label="Order placed template name" value={waTemplateOrderPlaced} onChange={(e) => setWaTemplateOrderPlaced(e.target.value)} placeholder="order_placed_update" />
                <Input label="Order confirmed template name" value={waTemplateOrderConfirmed} onChange={(e) => setWaTemplateOrderConfirmed(e.target.value)} placeholder="order_confirmed_update" />
                <Input label="Order shipped template name" value={waTemplateOrderShipped} onChange={(e) => setWaTemplateOrderShipped(e.target.value)} placeholder="order_shipped_update" />
                <Input label="Order delivered template name" value={waTemplateOrderDelivered} onChange={(e) => setWaTemplateOrderDelivered(e.target.value)} placeholder="order_delivered_update" />
                <Input label="Order cancelled template name" value={waTemplateOrderCancelled} onChange={(e) => setWaTemplateOrderCancelled(e.target.value)} placeholder="order_cancelled_update" />
                <Input label="Refund initiated template name" value={waTemplateRefundInitiated} onChange={(e) => setWaTemplateRefundInitiated(e.target.value)} placeholder="refund_initiated_update" />
              </Grid>
            </SettingsTabForm>
          </TabsContent>

          {/* ⑭ Notification Channels */}
          <TabsContent value="notifications">
            <SettingsTabForm id="notifications" label="Notifications">
              <Text size="xs" color="muted">
                In-app notifications are always on. Enable external channels below to let the platform
                fan out to email, WhatsApp, or SMS. Users can further restrict which types they receive.
              </Text>

              {/* Outbound budget — the kill switch and the daily ceiling. */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Text size="sm" weight="semibold">Outbound messaging budget</Text>
                <Text size="xs" color="muted">
                  The master switches. These suppress <Span weight="semibold">user-facing</Span> messages
                  only — the daily status digest always reaches staff, so turning customer email off
                  never leaves the site unwatched. Transactional messages (checkout verification codes,
                  order receipts) also keep sending, because suppressing those breaks checkout rather
                  than quietening it.
                </Text>
                <Toggle
                  label="Send user-facing email"
                  checked={msgEmailEnabled}
                  onChange={setMsgEmailEnabled}
                />
                <Toggle
                  label="Send user-facing WhatsApp"
                  checked={msgWhatsappEnabled}
                  onChange={setMsgWhatsappEnabled}
                />
                <Grid cols={2} gap="md">
                  <Input
                    label="Daily email ceiling"
                    type="number"
                    value={String(msgCeilingEmail)}
                    onChange={(e) => setMsgCeilingEmail(Number(e.target.value) || 0)}
                    helperText="Resend's free tier is 100/day. 80 leaves headroom for password-reset mail and in-flight sends."
                  />
                  <Input
                    label="Daily WhatsApp ceiling"
                    type="number"
                    value={String(msgCeilingWhatsapp)}
                    onChange={(e) => setMsgCeilingWhatsapp(Number(e.target.value) || 0)}
                    helperText="A sanity bound. Meta bills per conversation, not per message."
                  />
                </Grid>
                <Text size="xs" color="muted">
                  Some notification types never email regardless of these settings — losing a collector drop,
                  being outbid, marketing, review activity and ticket updates are shown in the
                  notification bell only. That is deliberate: those were the highest-volume sends and
                  the ones most likely to exhaust the day&apos;s allowance. A support reply can still be
                  emailed one-off from the ticket screen.
                </Text>
              </Stack>

              {/* In-app — read-only */}
              <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="md">
                <Row justify="between" gap="sm">
                  <Text size="sm" weight="medium" color="muted">In-app (notification bell)</Text>
                  <Span color="success" surface="success-surface" size="xs" weight="semibold" rounded="full" padding="pill-xs">Always on</Span>
                </Row>
                <Text size="xs" color="muted">Displayed in the notification bell and inbox. Cannot be disabled.</Text>
              </Stack>

              {/* Email channel */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Div id="setting-email-notifications"><Toggle label="Email notifications" checked={notifEmailEnabled} onChange={setNotifEmailEnabled} /></Div>
                {notifEmailEnabled && (
                  <Stack gap="md" className={NOTIF_CHANNEL_INDENT}>
                    <Select
                      label="Minimum priority to send email"
                      options={PRIORITY_OPTIONS}
                      value={notifEmailMinPriority}
                      onValueChange={setNotifEmailMinPriority}
                    />
                    <Text size="xs" weight="medium" color="muted" className="pt-[0.25rem]">Resend API (for transactional email)</Text>
                    <MaskedInput label="Resend API Key" value={resendApiKey} onChange={setResendApiKey} placeholder="re_live_…" helperText="Get your key at resend.com — used for all transactional notifications." />
                    <Grid cols={2} gap="md">
                      <Input label="From email" value={notifFromEmail} onChange={(e) => setNotifFromEmail(e.target.value)} placeholder={getBrandNoreplyEmail()} type="email" />
                      <Input label="From name" value={notifFromName} onChange={(e) => setNotifFromName(e.target.value)} placeholder={getBrandName()} />
                    </Grid>
                    <Text size="xs" weight="medium" color="muted" className="pt-[0.25rem]">Notification types (leave empty to send all types)</Text>
                    <PaginatedSelect<string>
                      ariaLabel="Notification types"
                      multiple
                      options={NOTIF_TYPE_OPTIONS}
                      value={notifEmailTypes}
                      onChange={(values) => setNotifEmailTypes(values)}
                      placeholder="All notification types"
                    />
                  </Stack>
                )}
              </Stack>

              {/* Daily status digest */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Div id="setting-daily-digest"><Toggle label="Daily status digest" checked={digestEnabled} onChange={setDigestEnabled} /></Div>
                {digestEnabled && (
                  <Stack gap="md" className={NOTIF_CHANNEL_INDENT}>
                    <Text size="xs" color="muted">
                      Sent every morning at 10:00 IST with the previous 24 hours of order activity. Its arrival doubles as the platform health check — if it stops landing, something needs a look.
                    </Text>
                    <Textarea
                      label="Recipients (To)"
                      value={digestRecipients}
                      onChange={(e) => setDigestRecipients(e.target.value)}
                      placeholder={getBrandSupportEmail()}
                      rows={3}
                      helperText="One address per line. Each address is billed as a separate send against the daily allowance — keep this list short."
                    />
                    {/*
                      * The CC field was removed 2026-09. Resend bills a CC as a
                      * separate delivery, so a 3-recipient TO plus one CC cost
                      * FOUR of the day's 100 emails for one report — and the
                      * digest is now the site's single most important message,
                      * carrying the contact queue, ticket backlog and payment
                      * proofs that used to be alerts of their own.
                      * `dailyStatusDigest` no longer reads `ccRecipients`; the
                      * field stays on the schema only so existing documents
                      * still validate.
                      */}
                  </Stack>
                )}
              </Stack>

              {/* WhatsApp channel */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Div id="setting-whatsapp-notifications"><Toggle label="WhatsApp notifications" checked={notifWhatsappEnabled} onChange={setNotifWhatsappEnabled} /></Div>
                {notifWhatsappEnabled && (
                  <Stack gap="md" className={NOTIF_CHANNEL_INDENT}>
                    <Select
                      label="Minimum priority to send WhatsApp"
                      options={PRIORITY_OPTIONS}
                      value={notifWhatsappMinPriority}
                      onValueChange={setNotifWhatsappMinPriority}
                    />
                    <Toggle
                      label="Enable WhatsApp OTP (for login and verification)"
                      checked={notifWhatsappOtpEnabled}
                      onChange={setNotifWhatsappOtpEnabled}
                    />
                    <Text size="xs" color="muted">
                      WhatsApp credentials are configured in the WhatsApp tab (⑬). OTP messages use the same phone number.
                    </Text>
                    {/*
                      The label is a PROP, not a <Text> above the control. A
                      <Text> renders a paragraph element, so the field looks
                      labelled to a sighted reader and has no accessible name
                      at all.

                      🛑 "paragraph element" spelled out rather than as a tag,
                      because `audit-html-wrappers` does not strip JSX comments
                      — it matched the tag written here and reported this file
                      as using a raw paragraph tag, which it does not. The
                      audit is the thing that is wrong; rewording is the
                      cheap, safe side of that trade rather than loosening a
                      rule that guards ~3,900 files.
                    */}
                    <PaginatedSelect<string>
                      multiple
                      ariaLabel="Notification types to send over WhatsApp"
                      options={NOTIF_TYPE_OPTIONS}
                      value={notifWhatsappTypes}
                      onChange={(values) => setNotifWhatsappTypes(values)}
                      placeholder="All notification types"
                    />
                    <Text size="xs" color="muted">Leave empty to send all types.</Text>
                  </Stack>
                )}
              </Stack>

              {/* SMS channel */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Toggle label="SMS notifications" checked={notifSmsEnabled} onChange={setNotifSmsEnabled} />
                {notifSmsEnabled && (
                  <Stack gap="md" className={NOTIF_CHANNEL_INDENT}>
                    <Select
                      label="Minimum priority to send SMS"
                      options={PRIORITY_OPTIONS}
                      value={notifSmsMinPriority}
                      onValueChange={setNotifSmsMinPriority}
                    />
                    <Text size="xs" color="muted">
                      SMS gateway credentials (e.g. Twilio, MSG91) can be configured in the Integrations tab once an SMS provider is connected.
                    </Text>
                  </Stack>
                )}
              </Stack>

            </SettingsTabForm>
          </TabsContent>

          {/* ⑫ Legal Policies */}
          <TabsContent value="legal">
            <SettingsTabForm id="legal" label="Legal">
              {[
                ["Terms of Service", termsHtml, setTermsHtml],
                ["Privacy Policy", privacyHtml, setPrivacyHtml],
                ["Refund Policy", refundHtml, setRefundHtml],
                ["Shipping Policy", shippingPolicyHtml, setShippingPolicyHtml],
                ["Cookie Policy", cookieHtml, setCookieHtml],
                ["Our Ethics", ethicsHtml, setEthicsHtml],
                ["Code of Conduct", conductHtml, setConductHtml],
                ["Cancellation Policy", cancellationHtml, setCancellationHtml],
                ["Grievance Redressal", grievanceHtml, setGrievanceHtml],
              ].map(([label, value, setter]) => (
                <Textarea
                  key={label as string}
                  label={label as string}
                  value={value as string}
                  onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  placeholder={`Enter ${label} HTML here…`}
                  rows={6}
                  className="font-mono"
                />
              ))}
            </SettingsTabForm>
          </TabsContent>
        </Tabs>
        <SaveAllBar isPending={saveAllMutation.isPending} onSave={handleSaveAll} />
        </FormShellContext.Provider>,
      ]}
      />
    </>
  );
}
