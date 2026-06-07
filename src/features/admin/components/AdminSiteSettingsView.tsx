"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Div, Form, FormActions, Grid, Input, Row, Select, Slider, Span, Stack, StackedViewShell, Tabs, TabsContent, TabsList, TabsTrigger, Text, Textarea, Toggle, useToast } from "../../../ui";
import type { SelectOption } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const __O = {
  hidden: "overflow-hidden",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminSiteSettingsViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
}

// --- Helpers -----------------------------------------------------------------

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
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="absolute right-3 top-8 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        {revealed ? "Hide" : "Reveal"}
      </button>
    </Div>
  );
}

const NOTIF_CHANNEL_INDENT = "space-y-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700";
const CLS_TEXTAREA = "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-3 text-sm text-zinc-800 dark:text-zinc-200 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500";
const PRIORITY_OPTIONS: SelectOption[] = [
  { label: "Low (send all)", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Critical only", value: "critical" },
];

function GroupSaveButton({ isPending }: { isPending: boolean }) {
  return (
    <FormActions align="right">
      <Button type="submit" isLoading={isPending} disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
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

  // ② Appearance
  const [primaryColor, setPrimaryColor] = React.useState("");
  const [secondaryColor, setSecondaryColor] = React.useState("");
  const [accentColor, setAccentColor] = React.useState("");
  const [defaultTheme, setDefaultTheme] = React.useState("light");
  const [fontFamily, setFontFamily] = React.useState("inter");

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
  const [watermarkSize, setWatermarkSize] = React.useState(30);
  const [watermarkOpacity, setWatermarkOpacity] = React.useState(20);

  // ⑦ Fees — all read/written under commissions key
  const [platformFeePercent, setPlatformFeePercent] = React.useState(5);
  const [gstPercent, setGstPercent] = React.useState(18);
  const [minimumTransactionFee, setMinimumTransactionFee] = React.useState(0);
  const [gatewayFeePercent, setGatewayFeePercent] = React.useState(2);
  const [payoutHoldDays, setPayoutHoldDays] = React.useState(7);
  const [minPayoutAmount, setMinPayoutAmount] = React.useState(100);
  const [auctionListingFee, setAuctionListingFee] = React.useState(0);
  const [preOrderListingFee, setPreOrderListingFee] = React.useState(0);
  const [featuredSlotFee, setFeaturedSlotFee] = React.useState(999);
  const [promotedSlotFee, setPromotedSlotFee] = React.useState(499);

  // ⑧ Integrations
  const [razorpayKeyId, setRazorpayKeyId] = React.useState("");
  const [razorpaySecret, setRazorpaySecret] = React.useState("");
  const [shiprocketToken, setShiprocketToken] = React.useState("");
  const [smtpHost, setSmtpHost] = React.useState("");
  const [smtpPort, setSmtpPort] = React.useState("587");
  const [smtpUser, setSmtpUser] = React.useState("");
  const [smtpPassword, setSmtpPassword] = React.useState("");
  const [smtpFrom, setSmtpFrom] = React.useState("");
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
  const [codEnabled, setCodEnabled] = React.useState(true);
  const [defaultCarrier, setDefaultCarrier] = React.useState("shiprocket");
  const [maxDeliveryRadius, setMaxDeliveryRadius] = React.useState(0);

  // ⑩ Auction
  const [minBidIncrement, setMinBidIncrement] = React.useState(50);
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

  // ⑬ WhatsApp Business Cloud API (platform-level)
  const [waPhoneNumberId, setWaPhoneNumberId] = React.useState("");
  const [waCloudApiToken, setWaCloudApiToken] = React.useState("");
  const [waAdminNotifyNumbers, setWaAdminNotifyNumbers] = React.useState("");

  // ⓪ About
  const [aboutTitle, setAboutTitle] = React.useState("");
  const [aboutSubtitle, setAboutSubtitle] = React.useState("");
  const [aboutMissionTitle, setAboutMissionTitle] = React.useState("");
  const [aboutMissionText, setAboutMissionText] = React.useState("");
  const [aboutCtaTitle, setAboutCtaTitle] = React.useState("");

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

  // Populate from query data
  React.useEffect(() => {
    if (!s || !Object.keys(s).length) return;
    setSiteName(s.siteName ?? "");
    setTagline(s.tagline ?? "");
    setLogoUrl(s.logo ?? "");
    setFaviconUrl(s.favicon ?? "");
    setMaintenanceMode(s.maintenance?.enabled ?? false);
    setMaintenanceMessage(s.maintenance?.message ?? "");

    setPrimaryColor(s.appearance?.primaryColor ?? "");
    setSecondaryColor(s.appearance?.secondaryColor ?? "");
    setAccentColor(s.appearance?.accentColor ?? "");
    setDefaultTheme(s.appearance?.defaultTheme ?? "light");
    setFontFamily(s.appearance?.fontFamily ?? "inter");

    setAnnouncementEnabled(s.announcementBar?.enabled ?? false);
    setAnnouncementText(s.announcementBar?.text ?? s.announcementBar?.message ?? "");
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
    setWatermarkSize(s.watermark?.size ?? 30);
    setWatermarkOpacity(s.watermark?.opacity ?? 20);

    setPlatformFeePercent(s.commissions?.platformFeePercent ?? 5);
    setGstPercent(s.commissions?.gstPercent ?? 18);
    setMinimumTransactionFee(s.commissions?.minimumTransactionFee ?? 0);
    setGatewayFeePercent(s.commissions?.gatewayFeePercent ?? 2);
    setPayoutHoldDays(s.commissions?.payoutHoldDays ?? 7);
    setMinPayoutAmount(s.commissions?.minPayoutAmount ?? 100);
    setAuctionListingFee(s.commissions?.auctionListingFee ?? 0);
    setPreOrderListingFee(s.commissions?.preOrderListingFee ?? 0);
    setFeaturedSlotFee(s.commissions?.featuredSlotFee ?? 999);
    setPromotedSlotFee(s.commissions?.promotedSlotFee ?? 499);

    setRazorpayKeyId(s.credentialsMasked?.razorpayKeyId ?? "");
    setRazorpaySecret(s.credentialsMasked?.razorpaySecret ?? "");
    setShiprocketToken(s.credentialsMasked?.shiprocketToken ?? "");
    setSmtpHost(s.emailSettings?.host ?? "");
    setSmtpPort(String(s.emailSettings?.port ?? 587));
    setSmtpUser(s.emailSettings?.user ?? "");
    setSmtpPassword(s.credentialsMasked?.smtpPassword ?? "");
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

    setFreeShippingThreshold(Math.round((s.shipping?.freeShippingThreshold ?? 99900) / 100));
    setCodEnabled(s.shipping?.codEnabled ?? true);
    setDefaultCarrier(s.shipping?.defaultCarrier ?? "shiprocket");
    setMaxDeliveryRadius(s.shipping?.maxDeliveryRadius ?? 0);

    setMinBidIncrement(Math.round((s.auctionConfig?.minBidIncrement ?? 5000) / 100));
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

    setAboutTitle(s.aboutContent?.title ?? "");
    setAboutSubtitle(s.aboutContent?.subtitle ?? "");
    setAboutMissionTitle(s.aboutContent?.missionTitle ?? "");
    setAboutMissionText(s.aboutContent?.missionText ?? "");
    setAboutCtaTitle(s.aboutContent?.ctaTitle ?? "");

    setWaPhoneNumberId(s.credentialsMasked?.whatsappPhoneNumberId ?? "");
    setWaCloudApiToken(s.credentialsMasked?.whatsappCloudApiToken ?? "");
    setWaAdminNotifyNumbers(s.credentialsMasked?.whatsappAdminNotifyNumbers ?? "");

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
  }, [data]);

  function useSave(group: string, payload: () => Record<string, unknown>) {
    return useMutation({
      mutationFn: async () => {
        await apiClient.put(ADMIN_ENDPOINTS.ADMIN_SITE, payload());
      },
      onSuccess: () => {
        showToast(`${group} saved.`, "success");
        queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      },
      onError: (err: unknown) =>
        showToast((err as Error)?.message ?? `Failed to save ${group}.`, "error"),
    });
  }

  const brandingMutation = useSave("Branding", () => ({
    siteName, tagline, logo: logoUrl, favicon: faviconUrl,
    maintenance: { enabled: maintenanceMode, message: maintenanceMessage },
  }));
  const appearanceMutation = useSave("Appearance", () => ({
    appearance: { primaryColor, secondaryColor, accentColor, defaultTheme, fontFamily },
  }));
  const announcementMutation = useSave("Announcement", () => ({
    announcementBar: { enabled: announcementEnabled, text: announcementText, link: announcementLink, backgroundColor: announcementBg },
  }));
  const seoMutation = useSave("SEO", () => ({
    seo: { defaultTitle: seoTitle, defaultDescription: seoDescription, defaultOgImage: seoOgImage, noIndex: seoNoIndex, canonicalBaseUrl: canonicalUrl },
  }));
  const contactMutation = useSave("Contact & Social", () => ({
    contact: { email: supportEmail, phone: supportPhone, address: supportAddress, supportHours, whatsappNumber: whatsapp },
    socialLinks: { instagram, twitter, facebook, youtube, linkedin, pinterest },
  }));
  const watermarkMutation = useSave("Watermark", () => ({
    watermark: { type: watermarkType, text: watermarkText, imageUrl: watermarkImageUrl, size: watermarkSize, opacity: watermarkOpacity },
  }));
  const feesMutation = useSave("Fees", () => ({
    commissions: { platformFeePercent, gstPercent, minimumTransactionFee, gatewayFeePercent, payoutHoldDays, minPayoutAmount, auctionListingFee, preOrderListingFee, featuredSlotFee, promotedSlotFee },
  }));
  const integrationsMutation = useSave("Integrations", () => ({
    credentials: {
      razorpayKeyId, razorpaySecret, shiprocketToken, smtpPassword,
      metaPageAccessToken, metaPageId,
      tiktokClientKey, tiktokClientSecret, tiktokAccessToken,
      deviantartClientId, deviantartClientSecret,
    },
    emailSettings: { host: smtpHost, port: Number(smtpPort), user: smtpUser, fromAddress: smtpFrom },
    integrations: { googleAnalyticsId: gaMeasurementId, facebookPixelId: fbPixelId, gtmContainerId },
  }));
  const shippingMutation = useSave("Shipping", () => ({
    shipping: { freeShippingThreshold: freeShippingThreshold * 100, codEnabled, defaultCarrier, maxDeliveryRadius },
  }));
  const auctionMutation = useSave("Auction Config", () => ({
    auctionConfig: { minBidIncrement: minBidIncrement * 100, autoExtendWindowMinutes: autoExtendWindow, settlementGracePeriodHours: settlementGrace },
  }));
  const limitsMutation = useSave("Platform Limits", () => ({
    platformLimits: { maxProductsPerStore, maxImagesPerProduct, maxVideoSizeMb, maxCustomFieldsPerProduct: maxCustomFields, maxCustomSectionsPerProduct: maxCustomSections, orderCancellationWindowHours: orderCancelWindow },
  }));
  const whatsappMutation = useSave("WhatsApp", () => ({
    credentials: {
      whatsappPhoneNumberId: waPhoneNumberId,
      whatsappCloudApiToken: waCloudApiToken,
      whatsappAdminNotifyNumbers: waAdminNotifyNumbers,
    },
  }));

  const legalMutation = useSave("Legal Policies", () => ({
    legalPages: { terms: termsHtml, privacy: privacyHtml, refundPolicy: refundHtml, shipping: shippingPolicyHtml, cookies: cookieHtml },
  }));
  const aboutMutation = useSave("About Page", () => ({
    aboutContent: { title: aboutTitle, subtitle: aboutSubtitle, missionTitle: aboutMissionTitle, missionText: aboutMissionText, ctaTitle: aboutCtaTitle },
  }));
  const notifChannelsMutation = useSave("Notification Channels", () => ({
    notificationChannels: {
      inApp: { enabled: true, readOnly: true },
      email: { enabled: notifEmailEnabled, minPriority: notifEmailMinPriority },
      whatsapp: { enabled: notifWhatsappEnabled, minPriority: notifWhatsappMinPriority, otpEnabled: notifWhatsappOtpEnabled },
      sms: { enabled: notifSmsEnabled, minPriority: notifSmsMinPriority },
    },
    credentials: { resendApiKey },
    emailSettings: { fromEmail: notifFromEmail, fromName: notifFromName },
  }));

  const FONT_OPTIONS = [
    { label: "Inter", value: "inter" },
    { label: "Poppins", value: "poppins" },
    { label: "Roboto", value: "roboto" },
    { label: "Nunito", value: "nunito" },
  ];
  const THEME_OPTIONS = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "System", value: "system" },
  ];
  const CARRIER_OPTIONS = [
    { label: "Shiprocket", value: "shiprocket" },
    { label: "Delhivery", value: "delhivery" },
    { label: "Bluedart", value: "bluedart" },
    { label: "FedEx", value: "fedex" },
  ];

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
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ⓪ About Page */}
          <TabsContent value="about">
            <Form onSubmit={(e) => { e.preventDefault(); aboutMutation.mutate(); }} className="space-y-4 pt-4">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Override the About page hero and mission text. Leave blank to use the platform defaults.
              </Text>
              <Input label="Hero title" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} placeholder="About LetItRip" />
              <Input label="Hero subtitle" value={aboutSubtitle} onChange={(e) => setAboutSubtitle(e.target.value)} placeholder="Connecting buyers, sellers, and bidders in one vibrant marketplace" />
              <Input label="Mission section title" value={aboutMissionTitle} onChange={(e) => setAboutMissionTitle(e.target.value)} placeholder="Our Mission" />
              <>
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mission text</Text>
                <textarea
                  value={aboutMissionText}
                  onChange={(e) => setAboutMissionText(e.target.value)}
                  placeholder="LetItRip was built to democratise commerce…"
                  rows={4}
                  className={CLS_TEXTAREA}
                />
              </>
              <Input label="CTA banner title" value={aboutCtaTitle} onChange={(e) => setAboutCtaTitle(e.target.value)} placeholder="Ready to get started?" />
              <GroupSaveButton isPending={aboutMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ① Branding */}
          <TabsContent value="branding">
            <Form onSubmit={(e) => { e.preventDefault(); brandingMutation.mutate(); }} className="space-y-4 pt-4">
              <Input label="Site name" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="LetItRip" />
              <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="India's Largest Collectibles Marketplace" />
              <ImageUpload label="Logo" currentImage={logoUrl} onUpload={(file) => upload(file, "store")} onChange={setLogoUrl} />
              <ImageUpload label="Favicon" currentImage={faviconUrl} onUpload={(file) => upload(file, "store")} onChange={setFaviconUrl} />
              <Stack gap="sm" rounded="lg" border="default" padding="md">
                <Toggle label="Maintenance mode" checked={maintenanceMode} onChange={setMaintenanceMode} />
                <Input label="Maintenance message" value={maintenanceMessage} onChange={(e) => setMaintenanceMessage(e.target.value)} placeholder="We're back soon." disabled={!maintenanceMode} />
              </Stack>
              <GroupSaveButton isPending={brandingMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ② Appearance */}
          <TabsContent value="appearance">
            <Form onSubmit={(e) => { e.preventDefault(); appearanceMutation.mutate(); }} className="space-y-4 pt-4">
              <Grid gap="md" className="grid-cols-3">
                <Stack gap="none">
                  <Text size="sm" weight="medium" color="muted" className="mb-1">Primary color</Text>
                  <input type="color" value={primaryColor || "#000000"} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-full rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                </Stack>
                <Stack gap="none">
                  <Text size="sm" weight="medium" color="muted" className="mb-1">Secondary color</Text>
                  <input type="color" value={secondaryColor || "#000000"} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-full rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                </Stack>
                <Stack gap="none">
                  <Text size="sm" weight="medium" color="muted" className="mb-1">Accent color</Text>
                  <input type="color" value={accentColor || "#000000"} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-full rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                </Stack>
              </Grid>
              <Grid cols={2} gap="md">
                <Select label="Default theme" options={THEME_OPTIONS} value={defaultTheme} onValueChange={setDefaultTheme} />
                <Select label="Font family" options={FONT_OPTIONS} value={fontFamily} onValueChange={setFontFamily} />
              </Grid>
              <GroupSaveButton isPending={appearanceMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ③ Announcement */}
          <TabsContent value="announcement">
            <Form onSubmit={(e) => { e.preventDefault(); announcementMutation.mutate(); }} className="space-y-4 pt-4">
              <Toggle label="Show announcement bar" checked={announcementEnabled} onChange={setAnnouncementEnabled} />
              <Input label="Announcement text" value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="🎉 Free shipping on orders ₹999+" disabled={!announcementEnabled} />
              <Input label="Link URL (optional)" value={announcementLink} onChange={(e) => setAnnouncementLink(e.target.value)} placeholder="/products" disabled={!announcementEnabled} />
              <Stack gap="none">
                <Text size="sm" weight="medium" color="muted" className="mb-1">Background color</Text>
                <input type="color" value={announcementBg || "#1d4ed8"} onChange={(e) => setAnnouncementBg(e.target.value)} className="h-10 w-32 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer" disabled={!announcementEnabled} />
              </Stack>
              <GroupSaveButton isPending={announcementMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ④ SEO */}
          <TabsContent value="seo">
            <Form onSubmit={(e) => { e.preventDefault(); seoMutation.mutate(); }} className="space-y-4 pt-4">
              <Input label="Default meta title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="LetItRip — Buy, Sell & Auction Collectibles in India" maxLength={60} helperText="Max 60 chars. Use {page} token for dynamic insertion." />
              <Input label="Default meta description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="India's largest collectibles marketplace…" maxLength={160} helperText="Max 160 chars." />
              <ImageUpload label="Default OG image" currentImage={seoOgImage} onUpload={(file) => upload(file, "store")} onChange={setSeoOgImage} />
              <Input label="Canonical base URL" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://letitrip.in" />
              <Toggle label="Robots noindex (disables search indexing — use carefully)" checked={seoNoIndex} onChange={setSeoNoIndex} />
              <GroupSaveButton isPending={seoMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑤ Contact & Social */}
          <TabsContent value="contact">
            <Form onSubmit={(e) => { e.preventDefault(); contactMutation.mutate(); }} className="space-y-4 pt-4">
              <Grid cols={2} gap="md">
                <Input label="Support email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} type="email" placeholder="support@letitrip.in" />
                <Input label="Support phone" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </Grid>
              <Input label="Physical address" value={supportAddress} onChange={(e) => setSupportAddress(e.target.value)} placeholder="Mumbai, Maharashtra, India" />
              <Input label="Support hours" value={supportHours} onChange={(e) => setSupportHours(e.target.value)} placeholder="Mon–Fri, 10 AM – 6 PM IST" />
              <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400 pt-2">Social links</Text>
              <Grid cols={2} gap="md">
                <Input label="Instagram URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/letitrip" />
                <Input label="Twitter / X URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/letitrip" />
                <Input label="Facebook URL" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/letitrip" />
                <Input label="YouTube URL" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@letitrip" />
                <Input label="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91XXXXXXXXXX" />
                <Input label="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/letitrip" />
                <Input label="Pinterest URL" value={pinterest} onChange={(e) => setPinterest(e.target.value)} placeholder="https://pinterest.com/letitrip" />
              </Grid>
              <GroupSaveButton isPending={contactMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑥ Watermark */}
          <TabsContent value="watermark">
            <Form onSubmit={(e) => { e.preventDefault(); watermarkMutation.mutate(); }} className="space-y-4 pt-4">
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
              <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="md">
                <Text size="xs" color="muted">Preview (text watermark only)</Text>
                <Row surface="default" justify="end" align="end" className={`relative h-32 ${__O.hidden} rounded`}>
                  <Span
                    weight="medium"
                    className="text-zinc-400 select-none p-2"
                    style={{ fontSize: `${Math.max(10, watermarkSize / 5)}px`, opacity: watermarkOpacity / 100 }}
                  >
                    {watermarkText}
                  </Span>
                </Row>
              </Stack>
              <GroupSaveButton isPending={watermarkMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑦ Fees & Commissions */}
          <TabsContent value="fees">
            <Form onSubmit={(e) => { e.preventDefault(); feesMutation.mutate(); }} className="space-y-4 pt-4">
              <Grid cols={2} gap="md">
                <Input label="Platform fee — our cut (%)" helperText="% charged on order value. Buyer pays this." value={String(platformFeePercent)} onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
                <Input label="GST on platform fee (%)" helperText="Applied to our fee only (not full order). Usually 18%." value={String(gstPercent)} onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={100} step={0.1} />
                <Input label="Razorpay gateway cost (%)" helperText="Gateway's own fee — absorbed by platform, not passed through." value={String(gatewayFeePercent)} onChange={(e) => setGatewayFeePercent(parseFloat(e.target.value) || 0)} type="number" min={0} max={10} step={0.01} />
                <Input label="Minimum transaction fee (₹)" helperText="Per-transaction floor. Total charge will never be below base + this." value={String(minimumTransactionFee)} onChange={(e) => setMinimumTransactionFee(parseFloat(e.target.value) || 0)} type="number" min={0} step={0.01} />
                <Input label="Seller payout hold (days)" value={String(payoutHoldDays)} onChange={(e) => setPayoutHoldDays(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Minimum payout amount (₹)" value={String(minPayoutAmount)} onChange={(e) => setMinPayoutAmount(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Auction listing fee (₹)" value={String(auctionListingFee)} onChange={(e) => setAuctionListingFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Pre-order listing fee (₹)" value={String(preOrderListingFee)} onChange={(e) => setPreOrderListingFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Featured slot fee (₹)" value={String(featuredSlotFee)} onChange={(e) => setFeaturedSlotFee(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Promoted slot fee (₹)" value={String(promotedSlotFee)} onChange={(e) => setPromotedSlotFee(parseInt(e.target.value) || 0)} type="number" min={0} />
              </Grid>
              <GroupSaveButton isPending={feesMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑧ Integrations & Keys */}
          <TabsContent value="integrations">
            <Form onSubmit={(e) => { e.preventDefault(); integrationsMutation.mutate(); }} className="space-y-4 pt-4">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">Keys are masked in transit and stored encrypted. Click Reveal to view.</Text>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Razorpay</Text>
                <Grid cols={2} gap="md">
                  <MaskedInput label="Razorpay Key ID" value={razorpayKeyId} onChange={setRazorpayKeyId} placeholder="rzp_live_…" />
                  <MaskedInput label="Razorpay Secret" value={razorpaySecret} onChange={setRazorpaySecret} placeholder="••••••••" />
                </Grid>
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">Shiprocket</Text>
                <MaskedInput label="Shiprocket API token" value={shiprocketToken} onChange={setShiprocketToken} placeholder="••••••••" />
              </Stack>
              <Stack gap="sm">
                <Text size="sm" weight="medium" color="muted">SMTP / Email</Text>
                <Grid cols={2} gap="md">
                  <Input label="SMTP host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" />
                  <Input label="SMTP port" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} type="number" placeholder="587" />
                  <Input label="SMTP user" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="apikey" />
                  <MaskedInput label="SMTP password" value={smtpPassword} onChange={setSmtpPassword} placeholder="••••••••" />
                </Grid>
                <Input label="From address" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="noreply@letitrip.in" type="email" />
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
              <GroupSaveButton isPending={integrationsMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑨ Shipping Defaults */}
          <TabsContent value="shipping">
            <Form onSubmit={(e) => { e.preventDefault(); shippingMutation.mutate(); }} className="space-y-4 pt-4">
              <Input label="Free shipping threshold (₹)" value={String(freeShippingThreshold)} onChange={(e) => setFreeShippingThreshold(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Orders above this amount get free shipping." />
              <Toggle label="Cash on delivery (COD) enabled" checked={codEnabled} onChange={setCodEnabled} />
              <Select label="Default carrier" options={CARRIER_OPTIONS} value={defaultCarrier} onValueChange={setDefaultCarrier} />
              <Input label="Max delivery radius (km, 0 = no limit)" value={String(maxDeliveryRadius)} onChange={(e) => setMaxDeliveryRadius(parseInt(e.target.value) || 0)} type="number" min={0} />
              <GroupSaveButton isPending={shippingMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑩ Auction Config */}
          <TabsContent value="auction">
            <Form onSubmit={(e) => { e.preventDefault(); auctionMutation.mutate(); }} className="space-y-4 pt-4">
              <Input label="Minimum bid increment (₹)" value={String(minBidIncrement)} onChange={(e) => setMinBidIncrement(parseInt(e.target.value) || 0)} type="number" min={1} helperText="Global default — individual auctions may override." />
              <Input label="Auto-extend window (minutes before end)" value={String(autoExtendWindow)} onChange={(e) => setAutoExtendWindow(parseInt(e.target.value) || 0)} type="number" min={0} helperText="Extend auction end time if a bid arrives within this window." />
              <Input label="Settlement grace period (hours)" value={String(settlementGrace)} onChange={(e) => setSettlementGrace(parseInt(e.target.value) || 0)} type="number" min={1} helperText="Time winner has to pay before the auction is re-listed." />
              <GroupSaveButton isPending={auctionMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑪ Platform Limits */}
          <TabsContent value="limits">
            <Form onSubmit={(e) => { e.preventDefault(); limitsMutation.mutate(); }} className="space-y-4 pt-4">
              <Grid cols={2} gap="md">
                <Input label="Max products per store" value={String(maxProductsPerStore)} onChange={(e) => setMaxProductsPerStore(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max images per product" value={String(maxImagesPerProduct)} onChange={(e) => setMaxImagesPerProduct(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max video size (MB)" value={String(maxVideoSizeMb)} onChange={(e) => setMaxVideoSizeMb(parseInt(e.target.value) || 0)} type="number" min={1} />
                <Input label="Max custom fields per product" value={String(maxCustomFields)} onChange={(e) => setMaxCustomFields(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Max custom sections per product" value={String(maxCustomSections)} onChange={(e) => setMaxCustomSections(parseInt(e.target.value) || 0)} type="number" min={0} />
                <Input label="Order cancellation window (hours)" value={String(orderCancelWindow)} onChange={(e) => setOrderCancelWindow(parseInt(e.target.value) || 0)} type="number" min={0} />
              </Grid>
              <GroupSaveButton isPending={limitsMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑬ WhatsApp Business Cloud API */}
          <TabsContent value="whatsapp">
            <Form onSubmit={(e) => { e.preventDefault(); whatsappMutation.mutate(); }} className="space-y-4 pt-4">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
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
              <GroupSaveButton isPending={whatsappMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑭ Notification Channels */}
          <TabsContent value="notifications">
            <Form onSubmit={(e) => { e.preventDefault(); notifChannelsMutation.mutate(); }} className="space-y-6 pt-4">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                In-app notifications are always on. Enable external channels below to let the platform
                fan out to email, WhatsApp, or SMS. Users can further restrict which types they receive.
              </Text>

              {/* In-app — read-only */}
              <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="md">
                <Row justify="between" gap="sm">
                  <Text size="sm" weight="medium" color="muted">In-app (notification bell)</Text>
                  <Span size="xs" weight="semibold" className="rounded-full bg-success-surface px-2 py-0.5 text-success">Always on</Span>
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
                    <Text size="xs" weight="medium" color="muted" className="pt-1">Resend API (for transactional email)</Text>
                    <MaskedInput label="Resend API Key" value={resendApiKey} onChange={setResendApiKey} placeholder="re_live_…" helperText="Get your key at resend.com — used for all transactional notifications." />
                    <Grid cols={2} gap="md">
                      <Input label="From email" value={notifFromEmail} onChange={(e) => setNotifFromEmail(e.target.value)} placeholder="noreply@letitrip.in" type="email" />
                      <Input label="From name" value={notifFromName} onChange={(e) => setNotifFromName(e.target.value)} placeholder="LetItRip" />
                    </Grid>
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

              <GroupSaveButton isPending={notifChannelsMutation.isPending} />
            </Form>
          </TabsContent>

          {/* ⑫ Legal Policies */}
          <TabsContent value="legal">
            <Form onSubmit={(e) => { e.preventDefault(); legalMutation.mutate(); }} className="space-y-5 pt-4">
              {[
                ["Terms of Service", termsHtml, setTermsHtml],
                ["Privacy Policy", privacyHtml, setPrivacyHtml],
                ["Refund Policy", refundHtml, setRefundHtml],
                ["Shipping Policy", shippingPolicyHtml, setShippingPolicyHtml],
                ["Cookie Policy", cookieHtml, setCookieHtml],
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
              <GroupSaveButton isPending={legalMutation.isPending} />
            </Form>
          </TabsContent>
        </Tabs>,
      ]}
    />
  );
}
