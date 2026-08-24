"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import type { FirestoreDocument } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, BackgroundRenderer, Button, Div, Form, FormActions, Grid, Input, PaginatedSelect, Row, Select, Slider, Span, Stack, StackedViewShell, Tabs, TabsContent, TabsList, TabsTrigger, Text, Textarea, Toggle, useToast } from "../../../ui";
import type { SelectOption } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { MediaUploadField } from "../../media/upload/MediaUploadField";
import { useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { FEATURE_FLAG_META, type FeatureFlagKey } from "../schemas/firestore";
import { NOTIFICATION_TYPE_TABS } from "../../../constants/notification-types";
import {
  ThemeManagerView,
  type ThemeManagerValue,
} from "../../site-settings/components/ThemeManagerView";
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from "../../../tokens/themes";
import {
  DEFAULT_AUCTION_BID_INCREMENT_TIERS,
  type BidIncrementTier,
} from "../../../_internal/shared/features/auctions/config";
import type { AboutHowItem, AboutValueItem, AboutMilestone, AboutTeamMember } from "../../about/schemas/firestore";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminSiteSettingsViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
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
function SaveAllBar({ isPending, onSave }: { isPending: boolean; onSave: () => void }) {
  return (
    <FormActions align="right">
      <Button type="button" isLoading={isPending} disabled={isPending} onClick={onSave}>
        {isPending ? "Saving…" : "Save all changes"}
      </Button>
    </FormActions>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminSiteSettingsView({
  labels = {},
  ...rest
}: AdminSiteSettingsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { upload } = useMediaUpload();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.ADMIN_SITE);
      return (res as any)?.data ?? res;
    },
  });

  const s = (data ?? {}) as any;

  // ① Branding
  const [siteName, setSiteName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [faviconUrl, setFaviconUrl] = React.useState("");
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState("");

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

  // ③ Announcement
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(false);
  const [announcementText, setAnnouncementText] = React.useState("");
  const [announcementLink, setAnnouncementLink] = React.useState("");
  const [announcementBg, setAnnouncementBg] = React.useState("");

  // ④ SEO
  const [seoTitle, setSeoTitle] = React.useState("");
  const [seoDescription, setSeoDescription] = React.useState("");
  const [seoOgImage, setSeoOgImage] = React.useState("");
  const [seoNoIndex, setSeoNoIndex] = React.useState(false);
  const [canonicalUrl, setCanonicalUrl] = React.useState("");

  // ⑤ Contact & Social
  const [supportEmail, setSupportEmail] = React.useState("");
  const [supportPhone, setSupportPhone] = React.useState("");
  const [supportAddress, setSupportAddress] = React.useState("");
  const [supportHours, setSupportHours] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [youtube, setYoutube] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");
  const [pinterest, setPinterest] = React.useState("");

  // ⑥ Watermark
  const [watermarkType, setWatermarkType] = React.useState<"text" | "image">("text");
  const [watermarkText, setWatermarkText] = React.useState("letitrip.in");
  const [watermarkImageUrl, setWatermarkImageUrl] = React.useState("");
  const [watermarkSize, setWatermarkSize] = React.useState(10);
  const [watermarkOpacity, setWatermarkOpacity] = React.useState(10);
  // 4 corners + center are picked from the Select; "custom" is only ever set
  // by the offset toggle below, never a 6th Select option (keeps the picker
  // at 5 options — see PaginatedSelect rule for >5).
  const [watermarkPosition, setWatermarkPosition] = React.useState<
    "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  >("center");
  const [watermarkUseCustomOffset, setWatermarkUseCustomOffset] = React.useState(false);
  const [watermarkOffsetX, setWatermarkOffsetX] = React.useState(0);
  const [watermarkOffsetY, setWatermarkOffsetY] = React.useState(0);
  const watermarkPreviewRef = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = watermarkPreviewRef.current;
    if (!el) return;
    el.style.fontSize = `${Math.max(10, watermarkSize / 5)}px`;
    el.style.opacity = String(watermarkOpacity / 100);
  }, [watermarkSize, watermarkOpacity]);

  // ⑦ Fees — all read/written under commissions key
  const [laborHourlyRate, setLaborHourlyRate] = React.useState(200);
  const [laborMaxHoursPerDay, setLaborMaxHoursPerDay] = React.useState(6);

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
  const [platformFeePercent, setPlatformFeePercent] = React.useState(5);
  const [gstPercent, setGstPercent] = React.useState(18);
  const [minimumTransactionFee, setMinimumTransactionFee] = React.useState(0);
  const [platformFeeMax, setPlatformFeeMax] = React.useState(10);
  const [gatewayFeePercent, setGatewayFeePercent] = React.useState(2);
  const [payoutHoldDays, setPayoutHoldDays] = React.useState(7);
  const [minPayoutAmount, setMinPayoutAmount] = React.useState(100);
  const [auctionListingFee, setAuctionListingFee] = React.useState(0);
  const [preOrderListingFee, setPreOrderListingFee] = React.useState(0);
  const [featuredSlotFee, setFeaturedSlotFee] = React.useState(999);
  const [promotedSlotFee, setPromotedSlotFee] = React.useState(499);
  const [whatsappNotifyFeeEnabled, setWhatsappNotifyFeeEnabled] = React.useState(false);
  const [whatsappNotifyFee, setWhatsappNotifyFee] = React.useState(10);
  const [giftWrapFeeEnabled, setGiftWrapFeeEnabled] = React.useState(false);
  const [giftWrapFee, setGiftWrapFee] = React.useState(49);
  const [shipmentProtectionFeeEnabled, setShipmentProtectionFeeEnabled] = React.useState(false);
  const [shipmentProtectionFeePercent, setShipmentProtectionFeePercent] = React.useState(2);
  const [shipmentProtectionFeeMin, setShipmentProtectionFeeMin] = React.useState(30);
  const [codDepositPercent, setCodDepositPercent] = React.useState(10);
  const [sellerShippingFixed, setSellerShippingFixed] = React.useState(0);
  const [platformShippingPercent, setPlatformShippingPercent] = React.useState(10);
  const [platformShippingFixedMin, setPlatformShippingFixedMin] = React.useState(0);

  // ⑧ Integrations
  const [razorpayKeyId, setRazorpayKeyId] = React.useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = React.useState("");
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = React.useState("");
  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpFrom, setSmtpFrom] = React.useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = React.useState("");
  const [googlePlaceId, setGooglePlaceId] = React.useState("");
  const [gaMeasurementId, setGaMeasurementId] = React.useState("");
  const [fbPixelId, setFbPixelId] = React.useState("");
  const [gtmContainerId, setGtmContainerId] = React.useState("");
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
  const [upiManualEnabled, setUpiManualEnabled] = React.useState(true);
  const [codEnabled, setCodEnabled] = React.useState(true);
  const [otpCheckoutThreshold, setOtpCheckoutThreshold] = React.useState(5000);

  // Feature flags — generic, data-driven off FEATURE_FLAG_META (12 boolean platform flags).
  const [featureFlags, setFeatureFlags] = React.useState<Record<string, boolean>>({});
  // Per-listing-type / per-category-type visibility flags.
  const [listingTypeFlags, setListingTypeFlags] = React.useState<Record<string, boolean>>({});
  const [categoryTypeFlags, setCategoryTypeFlags] = React.useState<Record<string, boolean>>({});
  // Per-channel notification-type allowlists — empty array means "all types".
  const [notifEmailTypes, setNotifEmailTypes] = React.useState<string[]>([]);
  const [notifWhatsappTypes, setNotifWhatsappTypes] = React.useState<string[]>([]);

  // ⑩ Auction
  const [bidIncrementTiers, setBidIncrementTiers] = React.useState<BidIncrementTier[]>(DEFAULT_AUCTION_BID_INCREMENT_TIERS);
  const [autoExtendWindow, setAutoExtendWindow] = React.useState(5);
  const [settlementGrace, setSettlementGrace] = React.useState(24);

  // ⑪ Platform Limits
  const [maxProductsPerStore, setMaxProductsPerStore] = React.useState(100);
  const [maxImagesPerProduct, setMaxImagesPerProduct] = React.useState(10);
  const [maxVideoSizeMb, setMaxVideoSizeMb] = React.useState(100);
  const [maxCustomFields, setMaxCustomFields] = React.useState(50);
  const [maxCustomSections, setMaxCustomSections] = React.useState(3);
  const [orderCancelWindow, setOrderCancelWindow] = React.useState(24);

  // ⑫ Legal
  const [termsHtml, setTermsHtml] = React.useState("");
  const [privacyHtml, setPrivacyHtml] = React.useState("");
  const [refundHtml, setRefundHtml] = React.useState("");
  const [shippingPolicyHtml, setShippingPolicyHtml] = React.useState("");
  const [cookieHtml, setCookieHtml] = React.useState("");
  const [ethicsHtml, setEthicsHtml] = React.useState("");
  const [conductHtml, setConductHtml] = React.useState("");

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
  const [digestCcRecipients, setDigestCcRecipients] = React.useState("");

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
    setSiteName(s.siteName ?? "");
    setTagline(s.tagline ?? "");
    setLogoUrl(s.logo ?? "");
    setFaviconUrl(s.favicon ?? "");
    setMaintenanceMode(s.maintenance?.enabled ?? false);
    setMaintenanceMessage(s.maintenance?.message ?? "");

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

    setAnnouncementEnabled(s.announcementBar?.enabled ?? false);
    setAnnouncementText(s.announcementBar?.message ?? "");
    setAnnouncementLink(s.announcementBar?.link ?? "");
    setAnnouncementBg(s.announcementBar?.backgroundColor ?? "");

    setSeoTitle(s.seo?.defaultTitle ?? "");
    setSeoDescription(s.seo?.defaultDescription ?? "");
    setSeoOgImage(s.seo?.defaultOgImage ?? "");
    setSeoNoIndex(s.seo?.noIndex ?? false);
    setCanonicalUrl(s.seo?.canonicalBaseUrl ?? "");

    setSupportEmail(s.contact?.email ?? "");
    setSupportPhone(s.contact?.phone ?? "");
    setSupportAddress(s.contact?.address ?? "");
    setSupportHours(s.contact?.supportHours ?? "");
    setInstagram(s.socialLinks?.instagram ?? "");
    setTwitter(s.socialLinks?.twitter ?? "");
    setFacebook(s.socialLinks?.facebook ?? "");
    setYoutube(s.socialLinks?.youtube ?? "");
    setWhatsapp(s.contact?.whatsappNumber ?? "");
    setLinkedin(s.socialLinks?.linkedin ?? "");
    setPinterest(s.socialLinks?.pinterest ?? "");

    setWatermarkType(s.watermark?.type ?? "text");
    setWatermarkText(s.watermark?.text ?? "letitrip.in");
    setWatermarkImageUrl(s.watermark?.imageUrl ?? "");
    setWatermarkSize(s.watermark?.size ?? 10);
    setWatermarkOpacity(s.watermark?.opacity ?? 10);
    const loadedPosition = s.watermark?.position ?? "center";
    setWatermarkUseCustomOffset(loadedPosition === "custom");
    setWatermarkPosition(loadedPosition === "custom" ? "center" : (loadedPosition as typeof watermarkPosition));
    setWatermarkOffsetX(s.watermark?.offsetX ?? 0);
    setWatermarkOffsetY(s.watermark?.offsetY ?? 0);

    setPlatformFeePercent(s.commissions?.platformFeePercent ?? 5);
    setGstPercent(s.commissions?.gstPercent ?? 18);
    setMinimumTransactionFee(s.commissions?.minimumTransactionFee ?? 0);
    setPlatformFeeMax(s.commissions?.platformFeeMax ?? 10);
    setGatewayFeePercent(s.commissions?.gatewayFeePercent ?? 2);
    setPayoutHoldDays(s.commissions?.payoutHoldDays ?? 7);
    setMinPayoutAmount(s.commissions?.minPayoutAmount ?? 100);
    setAuctionListingFee(s.commissions?.auctionListingFee ?? 0);
    setPreOrderListingFee(s.commissions?.preOrderListingFee ?? 0);
    setFeaturedSlotFee(s.commissions?.featuredSlotFee ?? 999);
    setPromotedSlotFee(s.commissions?.promotedSlotFee ?? 499);
    setWhatsappNotifyFeeEnabled(s.commissions?.whatsappNotifyFeeEnabled ?? false);
    setWhatsappNotifyFee(s.commissions?.whatsappNotifyFee ?? 10);
    setGiftWrapFeeEnabled(s.commissions?.giftWrapFeeEnabled ?? false);
    setGiftWrapFee(s.commissions?.giftWrapFee ?? 49);
    setShipmentProtectionFeeEnabled(s.commissions?.shipmentProtectionFeeEnabled ?? false);
    setShipmentProtectionFeePercent(s.commissions?.shipmentProtectionFeePercent ?? 2);
    setShipmentProtectionFeeMin(s.commissions?.shipmentProtectionFeeMin ?? 30);
    setCodDepositPercent(s.commissions?.codDepositPercent ?? 10);
    setSellerShippingFixed(s.commissions?.sellerShippingFixed ?? 0);
    setPlatformShippingPercent(s.commissions?.platformShippingPercent ?? 10);
    setPlatformShippingFixedMin(s.commissions?.platformShippingFixedMin ?? 0);

    setLaborHourlyRate(s.laborRate?.hourlyRate ?? 200);
    setLaborMaxHoursPerDay(s.laborRate?.maxHoursPerDay ?? 6);

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
    setGoogleMapsApiKey(s.credentialsMasked?.googleMapsApiKey ?? "");
    setGooglePlaceId(s.credentialsMasked?.googlePlaceId ?? "");
    setSmtpHost(s.emailSettings?.host ?? "");
    setSmtpPort(String(s.emailSettings?.port ?? 587));
    setSmtpUser(s.emailSettings?.user ?? "");
    setSmtpFrom(s.emailSettings?.fromAddress ?? "");
    setGaMeasurementId(s.integrations?.googleAnalyticsId ?? "");
    setFbPixelId(s.integrations?.facebookPixelId ?? "");
    setGtmContainerId(s.integrations?.gtmContainerId ?? "");
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
    setUpiManualEnabled(s.payment?.upiManualEnabled ?? true);
    setCodEnabled(s.payment?.codEnabled ?? true);
    setOtpCheckoutThreshold(s.payment?.otpCheckoutThreshold ?? 5000);

    setFeatureFlags((s.featureFlags as Record<string, boolean> | undefined) ?? {});
    setListingTypeFlags((s.featureFlags?.listingTypes as Record<string, boolean> | undefined) ?? {});
    setCategoryTypeFlags((s.featureFlags?.categoryTypes as Record<string, boolean> | undefined) ?? {});
    setNotifEmailTypes(s.notificationChannels?.email?.types ?? []);
    setNotifWhatsappTypes(s.notificationChannels?.whatsapp?.types ?? []);

    setBidIncrementTiers(s.auctionConfig?.bidIncrementTiers ?? DEFAULT_AUCTION_BID_INCREMENT_TIERS);
    setAutoExtendWindow(s.auctionConfig?.autoExtendWindowMinutes ?? 5);
    setSettlementGrace(s.auctionConfig?.settlementGracePeriodHours ?? 24);

    setMaxProductsPerStore(s.platformLimits?.maxProductsPerStore ?? 100);
    setMaxImagesPerProduct(s.platformLimits?.maxImagesPerProduct ?? 10);
    setMaxVideoSizeMb(s.platformLimits?.maxVideoSizeMb ?? 100);
    setMaxCustomFields(s.platformLimits?.maxCustomFieldsPerProduct ?? 50);
    setMaxCustomSections(s.platformLimits?.maxCustomSectionsPerProduct ?? 3);
    setOrderCancelWindow(s.platformLimits?.orderCancellationWindowHours ?? 24);

    setTermsHtml(s.legalPages?.terms ?? "");
    setPrivacyHtml(s.legalPages?.privacy ?? "");
    setRefundHtml(s.legalPages?.refundPolicy ?? "");
    setShippingPolicyHtml(s.legalPages?.shipping ?? "");
    setCookieHtml(s.legalPages?.cookies ?? "");
    setEthicsHtml(s.legalPages?.ethics ?? "");
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
    setDigestCcRecipients((s.emailSettings?.dailyDigest?.ccRecipients ?? []).join("\n"));

    originalMaskedRef.current = {
      razorpayKeyId: s.credentialsMasked?.razorpayKeyId ?? "",
      razorpayKeySecret: s.credentialsMasked?.razorpayKeySecret ?? "",
      razorpayWebhookSecret: s.credentialsMasked?.razorpayWebhookSecret ?? "",
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
      siteName, tagline, logo: logoUrl, favicon: faviconUrl,
      maintenance: { enabled: maintenanceMode, message: maintenanceMessage },
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
      announcementBar: { enabled: announcementEnabled, message: announcementText, link: announcementLink, backgroundColor: announcementBg },
      seo: { defaultTitle: seoTitle, defaultDescription: seoDescription, defaultOgImage: seoOgImage, noIndex: seoNoIndex, canonicalBaseUrl: canonicalUrl },
      contact: { email: supportEmail, phone: supportPhone, address: supportAddress, supportHours, whatsappNumber: whatsapp },
      socialLinks: { instagram, twitter, facebook, youtube, linkedin, pinterest },
      watermark: {
        type: watermarkType,
        text: watermarkText,
        imageUrl: watermarkImageUrl,
        size: watermarkSize,
        opacity: watermarkOpacity,
        position: watermarkUseCustomOffset ? "custom" : watermarkPosition,
        offsetX: watermarkOffsetX,
        offsetY: watermarkOffsetY,
      },
      commissions: { platformFeePercent, gstPercent, minimumTransactionFee, platformFeeMax, gatewayFeePercent, payoutHoldDays, minPayoutAmount, auctionListingFee, preOrderListingFee, featuredSlotFee, promotedSlotFee, whatsappNotifyFeeEnabled, whatsappNotifyFee, giftWrapFeeEnabled, giftWrapFee, shipmentProtectionFeeEnabled, shipmentProtectionFeePercent, shipmentProtectionFeeMin, codDepositPercent, sellerShippingFixed, platformShippingPercent, platformShippingFixedMin },
      laborRate: { hourlyRate: laborHourlyRate, maxHoursPerDay: laborMaxHoursPerDay },
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
          ccRecipients: splitEmailList(digestCcRecipients),
        },
      },
      integrations: { googleAnalyticsId: gaMeasurementId, facebookPixelId: fbPixelId, gtmContainerId },
      shipping: { freeShippingThreshold, defaultCarrier, maxDeliveryRadius },
      payment: { razorpayEnabled, upiManualEnabled, codEnabled, otpCheckoutThreshold },
      auctionConfig: { bidIncrementTiers: bidIncrementTiers as unknown as FirestoreDocument[], autoExtendWindowMinutes: autoExtendWindow, settlementGracePeriodHours: settlementGrace },
      platformLimits: { maxProductsPerStore, maxImagesPerProduct, maxVideoSizeMb, maxCustomFieldsPerProduct: maxCustomFields, maxCustomSectionsPerProduct: maxCustomSections, orderCancellationWindowHours: orderCancelWindow },
      legalPages: { terms: termsHtml, privacy: privacyHtml, refundPolicy: refundHtml, shipping: shippingPolicyHtml, cookies: cookieHtml, ethics: ethicsHtml, codeOfConduct: conductHtml },
      // Spreading the raw `featureFlags` object captured at load (not hand-picking keys)
      // preserves `adminCheckoutBypass` through this save even though it's not editable
      // here — Firestore's update() replaces nested maps wholesale, so omitting a key
      // here would silently wipe it (it's edited exclusively via its own dedicated,
      // audit-logged route — see the note above the Feature Flags tab).
      featureFlags: { ...featureFlags, listingTypes: listingTypeFlags, categoryTypes: categoryTypeFlags },
      notificationChannels: {
        inApp: { enabled: true, readOnly: true },
        email: { enabled: notifEmailEnabled, minPriority: notifEmailMinPriority, types: notifEmailTypes },
        whatsapp: { enabled: notifWhatsappEnabled, minPriority: notifWhatsappMinPriority, otpEnabled: notifWhatsappOtpEnabled, types: notifWhatsappTypes },
        sms: { enabled: notifSmsEnabled, minPriority: notifSmsMinPriority },
      },
    };
  }

  const saveAllMutation = useApiMutation({
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
    onError: (err: Error) =>
      showToast((err as Error)?.message ?? "Failed to save site settings.", "error"),
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
  const LISTING_TYPE_KEYS = ["standard", "auction", "pre-order", "prize-draw", "bundle", "classified", "digital-code", "live"] as const;
  const CATEGORY_TYPE_KEYS = ["category", "sublisting", "brand", "bundle"] as const;
  const NOTIF_TYPE_OPTIONS = NOTIFICATION_TYPE_TABS.filter((t) => t.id !== "All").map((t) => ({ value: t.id, label: t.label }));

  return (
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
        <Tabs key="tabs" defaultValue="branding">
          <TabsList>
            {[
              ["about", "⓪ About"],
              ["branding", "① Branding"],
              ["appearance", "② Appearance"],
              ["themes", "②ᵃ Themes"],
              ["announcement", "③ Announcement"],
              ["seo", "④ SEO"],
              ["contact", "⑤ Contact & Social"],
              ["watermark", "⑥ Watermark"],
              ["fees", "⑦ Fees"],
              ["integrations", "⑧ Integrations"],
              ["shipping", "⑨ Shipping"],
              ["auction", "⑩ Auction"],
              ["limits", "⑪ Limits"],
              ["legal", "⑫ Legal"],
              ["whatsapp", "⑬ WhatsApp"],
              ["notifications", "⑭ Notifications"],
              ["procurement", "⑮ Procurement"],
              ["emi", "⑯ EMI"],
              ["gst", "⑰ GST"],
              ["featureflags", "⑱ Feature Flags"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ⓪ About Page */}
          <TabsContent value="about">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Text size="xs" color="muted">
                Override the About page content. Leave blank to use the platform defaults.
              </Text>
              <Input label="Hero title" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="About LetItRip" />
              <Input label="Hero subtitle" value={aboutSubtitle} onChange={(e) => setAboutSubtitle(e.target.value)} placeholder="Connecting buyers, sellers, and bidders in one vibrant marketplace" />
              <Input label="Mission section title" value={aboutMissionTitle} onChange={(e) => setAboutMissionTitle(e.target.value)} placeholder="Our Mission" />
              <>
                <Text className="mb-1" color="muted" size="sm" weight="medium">Mission text</Text>
                <Textarea
                  value={aboutMissionText}
                  onChange={(e) => setAboutMissionText(e.target.value)}
                  placeholder="LetItRip was built to democratise commerce…"
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
                <Input label="Team section subtitle" value={aboutTeamSubtitle} onChange={(e) => setAboutTeamSubtitle(e.target.value)} placeholder="The people building LetItRip" />
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
            </Form>
          </TabsContent>

          {/* ① Branding */}
          <TabsContent value="branding">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Input label="Site name" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="LetItRip" />
              <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="India's Largest Collectibles Marketplace" />
              <ImageUpload label="Logo" currentImage={logoUrl} onUpload={(file) => upload(file, "store")} onChange={setLogoUrl} />
              <ImageUpload label="Favicon" currentImage={faviconUrl} onUpload={(file) => upload(file, "store")} onChange={setFaviconUrl} />
              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Toggle label="Maintenance mode" checked={maintenanceMode} onChange={setMaintenanceMode} />
                <Input label="Maintenance message" value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} placeholder="We're back soon." disabled={!maintenanceMode} />
              </Stack>
            </Form>
          </TabsContent>

          {/* ② Appearance — site-wide background (homepage/nav/dashboard shells) */}
          <TabsContent value="appearance">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
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
            </Form>
          </TabsContent>

          {/* ②ᵃ Themes — admin-authored theme records */}
          <TabsContent value="themes">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                saveAllMutation.mutate();
              }}
              className="pt-[var(--appkit-space-4)]" spacing="md"
            >
              <ThemeManagerView
                value={themeRegistry}
                onChange={setThemeRegistry}
                previewOrigin="/"
              />
            </Form>
          </TabsContent>

          {/* ③ Announcement */}
          <TabsContent value="announcement">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Toggle label="Show announcement bar" checked={announcementEnabled} onChange={setAnnouncementEnabled} />
              <Input label="Announcement text" value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="🎉 Free shipping on orders ₹999+" disabled={!announcementEnabled} />
              <Input label="Link URL (optional)" value={announcementLink} onChange={(e) => setAnnouncementLink(e.target.value)} placeholder={String(ROUTES.PUBLIC.PRODUCTS)} disabled={!announcementEnabled} />
              <Stack gap="none">
                <Text size="sm" weight="medium" color="muted" className="mb-1">Background color</Text>
                <Input type="color" value={announcementBg || "#1d4ed8"} onChange={(e) => setAnnouncementBg(e.target.value)} className="h-10 w-32 cursor-pointer" bare disabled={!announcementEnabled} /> {/* audit-hex-tokens-ok: native color picker requires literal hex string fallback */}
              </Stack>
            </Form>
          </TabsContent>

          {/* ④ SEO */}
          <TabsContent value="seo">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Input label="Default meta title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="LetItRip — Buy, Sell & Auction Collectibles in India" maxLength={60} helperText="Max 60 chars. Use {page} token for dynamic insertion." />
              <Input label="Default meta description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="India's largest collectibles marketplace…" maxLength={160} helperText="Max 160 chars." />
              <ImageUpload label="Default OG image" currentImage={seoOgImage} onUpload={(file) => upload(file, "store")} onChange={setSeoOgImage} />
              <Input label="Canonical base URL" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://letitrip.in" />
              <Toggle label="Robots noindex (disables search indexing — use carefully)" checked={seoNoIndex} onChange={setSeoNoIndex} />
            </Form>
          </TabsContent>

          {/* ⑤ Contact & Social */}
          <TabsContent value="contact">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Grid cols={2} gap="md">
                <Input label="Support email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} type="email" placeholder="support@letitrip.in" />
                <Input label="Support phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </Grid>
              <Input label="Physical address" value={supportAddress} onChange={(e) => setSupportAddress(e.target.value)} placeholder="Mumbai, Maharashtra, India" />
              <Input label="Support hours" value={supportHours} onChange={(e) => setSupportHours(e.target.value)} placeholder="Mon–Fri, 10 AM – 6 PM IST" />
              <Text className="pt-[0.5rem]" color="muted" size="sm" weight="medium">Social links</Text>
              <Grid cols={2} gap="md">
                <Input label="Instagram URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/letitrip" />
                <Input label="Twitter / X URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/letitrip" />
                <Input label="Facebook URL" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/letitrip" />
                <Input label="YouTube URL" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@letitrip" />
                <Input label="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91XXXXXXXXXX" />
                <Input label="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/letitrip" />
                <Input label="Pinterest URL" value={pinterest} onChange={(e) => setPinterest(e.target.value)} placeholder="https://pinterest.com/letitrip" />
              </Grid>
            </Form>
          </TabsContent>

          {/* ⑥ Watermark */}
          <TabsContent value="watermark">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Select
                label="Watermark type"
                options={[{ label: "Text", value: "text" }, { label: "Image", value: "image" }]}
                value={watermarkType}
                onValueChange={(v) => setWatermarkType(v as "text" | "image")}
              />
              {watermarkType === "text" ? (
                <Input label="Watermark text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="letitrip.in" />
              ) : (
                <ImageUpload label="Watermark image" currentImage={watermarkImageUrl} onUpload={(file) => upload(file, "store")} onChange={setWatermarkImageUrl} />
              )}
              <Slider label={`Size — ${watermarkSize}% of image width`} value={watermarkSize} onChange={setWatermarkSize} min={5} max={100} step={5} />
              <Slider label={`Opacity — ${watermarkOpacity}%`} value={watermarkOpacity} onChange={setWatermarkOpacity} min={5} max={100} step={5} />
              <Select
                label="Position"
                options={[
                  { label: "Center", value: "center" },
                  { label: "Top left", value: "top-left" },
                  { label: "Top right", value: "top-right" },
                  { label: "Bottom left", value: "bottom-left" },
                  { label: "Bottom right", value: "bottom-right" },
                ]}
                value={watermarkPosition}
                onValueChange={(v) => setWatermarkPosition(v as typeof watermarkPosition)}
                disabled={watermarkUseCustomOffset}
              />
              <Toggle
                checked={watermarkUseCustomOffset}
                onChange={setWatermarkUseCustomOffset}
                label="Use a custom X/Y offset instead"
              />
              {watermarkUseCustomOffset && (
                <Grid cols={2} gap="md">
                  <Input
                    label="X offset (%) — + right / − left of center"
                    value={String(watermarkOffsetX)}
                    onChange={(e) => setWatermarkOffsetX(Math.max(-45, Math.min(45, parseInt(e.target.value) || 0)))}
                    type="number"
                    min={-45}
                    max={45}
                  />
                  <Input
                    label="Y offset (%) — + down / − up from center"
                    value={String(watermarkOffsetY)}
                    onChange={(e) => setWatermarkOffsetY(Math.max(-45, Math.min(45, parseInt(e.target.value) || 0)))}
                    type="number"
                    min={-45}
                    max={45}
                  />
                </Grid>
              )}
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
                    {watermarkText}
                  </Span>
                </Row>
              </Stack>
            </Form>
          </TabsContent>

          {/* ⑦ Fees & Commissions */}
          <TabsContent value="fees">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Grid cols={2} gap="md">
                <Input label="Platform fee — our cut (%)" helperText="% charged on order value. Buyer pays this." value={String(platformFeePercent)} onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
                <Input label="GST on platform fee (%)" helperText="Applied to our fee only (not full order). Usually 18%." value={String(gstPercent)} onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
                <Input label="Razorpay gateway cost (%)" helperText="Gateway's own fee — absorbed by platform, not passed through." value={String(gatewayFeePercent)} onChange={(e) => setGatewayFeePercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={10} step={0.01} />
                <Input label="Minimum transaction fee (₹)" helperText="Per-transaction floor. Total charge will never be below base + this." value={String(minimumTransactionFee)} onChange={(e) => setMinimumTransactionFee(parseFloat(e.target.value) || 0)} type="number" min={0} step={0.01} />
                <Input label="Maximum platform fee (₹)" helperText="Ceiling on the buyer's platform commission, charged once per checkout on every payment method. GST is calculated on the capped amount." value={String(platformFeeMax)} onChange={(e) => setPlatformFeeMax(parseFloat(e.target.value) || 0)} type="number" min={0} step={0.01} />
                <Input label="Seller payout hold (days)" value={String(payoutHoldDays)} onChange={(e) => setPayoutHoldDays(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Minimum payout amount (₹)" value={String(minPayoutAmount)} onChange={(e) => setMinPayoutAmount(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Auction listing fee (₹)" value={String(auctionListingFee)} onChange={(e) => setAuctionListingFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Pre-order listing fee (₹)" value={String(preOrderListingFee)} onChange={(e) => setPreOrderListingFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Featured slot fee (₹)" value={String(featuredSlotFee)} onChange={(e) => setFeaturedSlotFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Promoted slot fee (₹)" value={String(promotedSlotFee)} onChange={(e) => setPromotedSlotFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="COD deposit (%)" helperText="% of order collected upfront on COD orders; remainder paid on delivery." value={String(codDepositPercent)} onChange={(e) => setCodDepositPercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
              </Grid>
              <Toggle
                checked={whatsappNotifyFeeEnabled}
                onChange={setWhatsappNotifyFeeEnabled}
                label="Offer the WhatsApp order-updates addon at checkout"
              />
              <Grid cols={2} gap="md">
                <Input
                  label="WhatsApp addon fee (₹)"
                  helperText="Flat fee charged to the buyer when they opt in. Requires WhatsApp credentials + at least one approved template — see the WhatsApp tab."
                  value={String(whatsappNotifyFee)}
                  onChange={(e) => setWhatsappNotifyFee(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  disabled={!whatsappNotifyFeeEnabled}
                />
              </Grid>
              <Toggle
                checked={giftWrapFeeEnabled}
                onChange={setGiftWrapFeeEnabled}
                label="Offer the gift-wrap addon at checkout"
              />
              <Grid cols={2} gap="md">
                <Input
                  label="Gift wrap fee (₹)"
                  helperText="Flat fee charged to the buyer when they opt in."
                  value={String(giftWrapFee)}
                  onChange={(e) => setGiftWrapFee(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  disabled={!giftWrapFeeEnabled}
                />
              </Grid>
              <Toggle
                checked={shipmentProtectionFeeEnabled}
                onChange={setShipmentProtectionFeeEnabled}
                label="Offer the shipment-protection addon at checkout"
              />
              <Grid cols={2} gap="md">
                <Input
                  label="Shipment protection (%)"
                  helperText="% of order subtotal, charged when the buyer opts in."
                  value={String(shipmentProtectionFeePercent)}
                  onChange={(e) => setShipmentProtectionFeePercent(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  disabled={!shipmentProtectionFeeEnabled}
                />
                <Input
                  label="Shipment protection minimum (₹)"
                  helperText="Floor for the shipment-protection fee."
                  value={String(shipmentProtectionFeeMin)}
                  onChange={(e) => setShipmentProtectionFeeMin(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  disabled={!shipmentProtectionFeeEnabled}
                />
              </Grid>
            </Form>
          </TabsContent>

          {/* ⑮ Procurement — labor rate feeding Feature A shipment cost calc */}
          <TabsContent value="procurement">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Text size="xs" color="muted">
                Used to compute each procurement shipment's labor cost (hours spent × hourly rate) and its
                estimated processing time (hours spent ÷ max hours/day).
              </Text>
              <Grid cols={2} gap="md">
                <Input
                  label="Hourly rate (₹)"
                  helperText="Your effective hourly wage for sorting/categorizing/listing a shipment."
                  value={String(laborHourlyRate)}
                  onChange={(e) => setLaborHourlyRate(Math.round((parseFloat(e.target.value) || 0) * 100) / 100)}
                  type="number"
                  min={0}
                />
                <Input
                  label="Max hours per day"
                  helperText="Used only to project how many days a shipment's tracked hours will take."
                  value={String(laborMaxHoursPerDay)}
                  onChange={(e) => setLaborMaxHoursPerDay(parseFloat(e.target.value) || 0)}
                  type="number"
                  min={0}
                  max={24}
                />
              </Grid>
            </Form>
          </TabsContent>

          {/* ⑯ EMI — site-wide installment financing settings */}
          <TabsContent value="emi">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
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
            </Form>
          </TabsContent>

          {/* ⑰ GST — Indian tax compliance settings */}
          <TabsContent value="gst">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
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
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AAAAA0000A1Z5"
                  maxLength={15}
                />
                <Input
                  label="Legal name"
                  helperText="Registered business name for invoices."
                  value={gstLegalName}
                  onChange={(e) => setGstLegalName(e.target.value)}
                  placeholder="LetItRip Collectibles Pvt Ltd"
                />
              </Grid>
              <Stack gap="xs">
                <Text size="sm" weight="semibold">Registered address</Text>
                <Textarea
                  value={gstAddress}
                  onChange={(e) => setGstAddress(e.target.value)}
                  placeholder="Registered business address for GST invoices…"
                  rows={3}
                />
              </Stack>
            </Form>
          </TabsContent>

          {/* ⑱ Feature Flags */}
          <TabsContent value="featureflags">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="lg">
              <Text size="xs" color="muted">
                Site-wide platform feature toggles. Disabling a flag hides that feature's nav entries
                and pages — existing data is untouched, it just becomes unreachable until re-enabled.
              </Text>
              <Grid cols={2} gap="md">
                {FEATURE_FLAG_META.map((flag) => (
                  <Stack key={flag.key} gap="xs">
                    <Toggle
                      label={`${flag.icon} ${flag.labelKey}`}
                      checked={featureFlags[flag.key] ?? false}
                      onChange={(v) => setFeatureFlags((prev) => ({ ...prev, [flag.key]: v }))}
                    />
                    <Text size="xs" color="muted">{flag.descKey}</Text>
                  </Stack>
                ))}
              </Grid>

              {/* Admin checkout bypass is intentionally NOT editable here — it has its
                  own dedicated, audit-logged toggle on the Admin Dashboard page (Quick
                  Actions → Dev Settings), which calls a route that logs actorUid+reason
                  on every use. audit-checkout-bypass.mjs enforces that flag exclusively
                  through that route; a second write path here would violate it. */}

              <Stack gap="xs">
                <Text size="sm" weight="semibold">Listing types</Text>
                <Text size="xs" color="muted">Disabled types are hidden from listings and reject create/add-to-cart.</Text>
                <Grid cols={2} gap="sm">
                  {LISTING_TYPE_KEYS.map((key) => (
                    <Toggle
                      key={key}
                      label={key}
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
            </Form>
          </TabsContent>

          {/* ⑧ Integrations & Keys */}
          <TabsContent value="integrations">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Text size="xs" color="muted">Keys are masked in transit and stored encrypted. Click Reveal to view.</Text>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Razorpay</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Razorpay Key ID" value={razorpayKeyId} onChange={setRazorpayKeyId} placeholder="rzp_live_…" />
                  <MaskedInput label="Razorpay Key Secret" value={razorpayKeySecret} onChange={setRazorpayKeySecret} placeholder="••••••••" />
                  <MaskedInput label="Razorpay Webhook Secret" value={razorpayWebhookSecret} onChange={setRazorpayWebhookSecret} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">SMTP / Email</Text>
                <Grid cols={2} gap="md">
                  <Input label="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" />
                  <Input label="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} type="number" placeholder="587" />
                  <Input label="SMTP user" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="apikey" />
                </Grid>
                <Input label="From address" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="noreply@letitrip.in" type="email" />
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
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Meta (Instagram &amp; Facebook Social Feed)</Text>
                <Text size="xs" color="muted">Used by the Social Feed section to fetch Instagram and Facebook posts via Meta Graph API v19.</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Page Access Token" value={metaPageAccessToken} onChange={setMetaPageAccessToken} placeholder="EAAxxxxxxx…" />
                  <Input label="Page ID (or handle)" value={metaPageId} onChange={(e) => setMetaPageId(e.target.value)} placeholder="letitrip" />
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
            </Form>
          </TabsContent>

          {/* ⑨ Shipping Defaults */}
          <TabsContent value="shipping">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Text size="sm" weight="medium" color="muted">Payment methods</Text>
              <Toggle label="Razorpay (online card/UPI) enabled — disabled by default, manual payment is the default" checked={razorpayEnabled} onChange={setRazorpayEnabled} />
              <Toggle label="Manual UPI/bank transfer enabled" checked={upiManualEnabled} onChange={setUpiManualEnabled} />
              <Toggle label="Cash on delivery (COD) enabled" checked={codEnabled} onChange={setCodEnabled} />
              <Input label="Free shipping threshold (₹)" value={String(freeShippingThreshold)} onChange={(e) => setFreeShippingThreshold(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Orders above this amount get free shipping." />
              <Select label="Default carrier" options={CARRIER_OPTIONS} value={defaultCarrier} onValueChange={setDefaultCarrier} />
              <Input label="Max delivery radius (km, 0 = no limit)" value={String(maxDeliveryRadius)} onChange={(e) => setMaxDeliveryRadius(parseInt(e.target.value) || 0)} type="number" min={0} />
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
            </Form>
          </TabsContent>

          {/* ⑩ Auction Config */}
          <TabsContent value="auction">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
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
              <Input label="Auto-extend window (minutes before end)" value={String(autoExtendWindow)} onChange={(e) => setAutoExtendWindow(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Extend auction end time if a bid arrives within this window." />
              <Input label="Settlement grace period (hours)" value={String(settlementGrace)} onChange={(e) => setSettlementGrace(parseInt(e.target.value) || 0)} type="number" min={1} helperText="Time winner has to pay before the auction is re-listed." />
            </Form>
          </TabsContent>

          {/* ⑪ Platform Limits */}
          <TabsContent value="limits">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              <Grid cols={2} gap="md">
                <Input label="Max products per store" value={String(maxProductsPerStore)} onChange={(e) => setMaxProductsPerStore(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max images per product" value={String(maxImagesPerProduct)} onChange={(e) => setMaxImagesPerProduct(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max video size (MB)" value={String(maxVideoSizeMb)} onChange={(e) => setMaxVideoSizeMb(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max custom fields per product" value={String(maxCustomFields)} onChange={(e) => setMaxCustomFields(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Max custom sections per product" value={String(maxCustomSections)} onChange={(e) => setMaxCustomSections(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Order cancellation window (hours)" value={String(orderCancelWindow)} onChange={(e) => setOrderCancelWindow(parseInt(e.target.value) || 0)} type="number" min={0} />
              </Grid>
            </Form>
          </TabsContent>

          {/* ⑬ WhatsApp Business Cloud API */}
          <TabsContent value="whatsapp">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
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
            </Form>
          </TabsContent>

          {/* ⑭ Notification Channels */}
          <TabsContent value="notifications">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="lg">
              <Text size="xs" color="muted">
                In-app notifications are always on. Enable external channels below to let the platform
                fan out to email, WhatsApp, or SMS. Users can further restrict which types they receive.
              </Text>

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
                <Toggle label="Email notifications" checked={notifEmailEnabled} onChange={setNotifEmailEnabled} />
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
                      <Input label="From email" value={notifFromEmail} onChange={(e) => setNotifFromEmail(e.target.value)} placeholder="noreply@letitrip.in" type="email" />
                      <Input label="From name" value={notifFromName} onChange={(e) => setNotifFromName(e.target.value)} placeholder="LetItRip" />
                    </Grid>
                    <Text size="xs" weight="medium" color="muted" className="pt-[0.25rem]">Notification types (leave empty to send all types)</Text>
                    <PaginatedSelect<string>
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
                <Toggle label="Daily status digest" checked={digestEnabled} onChange={setDigestEnabled} />
                {digestEnabled && (
                  <Stack gap="md" className={NOTIF_CHANNEL_INDENT}>
                    <Text size="xs" color="muted">
                      Sent every morning at 10:00 IST with the previous 24 hours of order activity. Its arrival doubles as the platform health check — if it stops landing, something needs a look.
                    </Text>
                    <Textarea
                      label="Recipients (To)"
                      value={digestRecipients}
                      onChange={(e) => setDigestRecipients(e.target.value)}
                      placeholder={"support@letitrip.in\nmohasin@letitrip.in"}
                      rows={4}
                      helperText="One address per line."
                    />
                    <Textarea
                      label="CC recipients"
                      value={digestCcRecipients}
                      onChange={(e) => setDigestCcRecipients(e.target.value)}
                      placeholder="One address per line"
                      rows={3}
                      helperText="Optional — anyone else who should receive a copy."
                    />
                  </Stack>
                )}
              </Stack>

              {/* WhatsApp channel */}
              <Stack gap="md" rounded="lg" border="default" padding="md">
                <Toggle label="WhatsApp notifications" checked={notifWhatsappEnabled} onChange={setNotifWhatsappEnabled} />
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
                    <Text size="xs" weight="medium" color="muted" className="pt-[0.25rem]">Notification types (leave empty to send all types)</Text>
                    <PaginatedSelect<string>
                      multiple
                      options={NOTIF_TYPE_OPTIONS}
                      value={notifWhatsappTypes}
                      onChange={(values) => setNotifWhatsappTypes(values)}
                      placeholder="All notification types"
                    />
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

            </Form>
          </TabsContent>

          {/* ⑫ Legal Policies */}
          <TabsContent value="legal">
            <Form onSubmit={(e) => { e.preventDefault(); saveAllMutation.mutate(); }} className="pt-[var(--appkit-space-4)]" spacing="md">
              {[
                ["Terms of Service", termsHtml, setTermsHtml],
                ["Privacy Policy", privacyHtml, setPrivacyHtml],
                ["Refund Policy", refundHtml, setRefundHtml],
                ["Shipping Policy", shippingPolicyHtml, setShippingPolicyHtml],
                ["Cookie Policy", cookieHtml, setCookieHtml],
                ["Our Ethics", ethicsHtml, setEthicsHtml],
                ["Code of Conduct", conductHtml, setConductHtml],
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
            </Form>
          </TabsContent>
        </Tabs>,
        <SaveAllBar key="save-all" isPending={saveAllMutation.isPending} onSave={() => saveAllMutation.mutate()} />,
      ]}
    />
  );
}
