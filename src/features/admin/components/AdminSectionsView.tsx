"use client";
import { normalizeError } from "../../../errors/normalize";

import { useApiMutation, sortBy, sieveFilter, SIEVE_OP } from "@mohasinac/appkit/client";
import type { JsonArray, JsonObjectWithUndefined, JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { CategoryInlineSelect } from "../../seller/components/CategoryInlineSelect";
import { Badge, Button, Checkbox, ConfirmDeleteModal, Div, FilterChipGroup, Input, PaginatedSelect, Row, Select, SideDrawer, Span, Stack, Text, Textarea, Toggle, useToast } from "../../../ui";
import { ICON_KEY_OPTIONS } from "./sections/icon-options";
import { FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import {
  homepageSectionFormSchema,
  type HomepageSectionFormInput,
} from "../schemas/homepage-section-form";

/**
 * The modal's own draft shape.
 *
 * `order` is the raw string a text input holds — including `""`, which means
 * "auto-place". It is NOT `HomepageSectionFormInput["order"]`: `z.coerce`
 * schemas in zod 3 report their input type as the OUTPUT type (`number` here),
 * which is a known typing gap in the library rather than a claim about what the
 * control produces. The coercion is real and happens at parse time.
 */
type SectionModalDraft = Omit<HomepageSectionFormInput, "order"> & { order: string };
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants";
import { ROUTES } from "../../../next/routing/route-map";
import { useAdminSectionsListing } from "../hooks/useAdminSectionsListing";
import { toRecordArray, toRelativeDate } from "../hooks/useAdminListingData";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import { QuickEditMenu } from "./QuickEditMenu";
import { ALL_TAB } from "../constants/filter-tabs";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { HomepageSectionDocument } from "../../homepage/schemas";
import {
  type SectionTemplate,
  templatesForType,
  templateById,
  profileById,
} from "./sections/sectionTemplates";
import {
  SECTION_TYPE_OPTIONS,
  SUPPORTED_TYPED_BUILDERS,
  RESOURCE_SORT_OPTIONS,
  FAQ_CATEGORY_OPTIONS,
  DEFAULT_PRODUCTS_BUILDER,
  DEFAULT_AUCTIONS_BUILDER,
  DEFAULT_STATS_BUILDER,
  DEFAULT_PRE_ORDERS_BUILDER,
  DEFAULT_STORES_BUILDER,
  DEFAULT_EVENTS_BUILDER,
  DEFAULT_SOCIAL_FEED_BUILDER,
  DEFAULT_WELCOME_BUILDER,
  DEFAULT_TRUST_INDICATORS_BUILDER,
  DEFAULT_CATEGORIES_BUILDER,
  DEFAULT_BRANDS_BUILDER,
  DEFAULT_BANNER_BUILDER,
  DEFAULT_FEATURES_BUILDER,
  DEFAULT_REVIEWS_BUILDER,
  DEFAULT_WHATSAPP_BUILDER,
  DEFAULT_FAQ_BUILDER,
  DEFAULT_BLOG_BUILDER,
  DEFAULT_NEWSLETTER_BUILDER,
  DEFAULT_CAROUSEL_BUILDER,
  DEFAULT_CUSTOM_CARDS_BUILDER,
  DEFAULT_GOOGLE_REVIEWS_BUILDER,
  DEFAULT_FEATURED_BUNDLES_BUILDER,
  DEFAULT_PRIZE_DRAWS_BUILDER,
  DEFAULT_EVENT_RAFFLES_BUILDER,
  DEFAULT_COLLECTION_CARDS_BUILDER,
} from "./sections/adminSectionsTypes";
import type { SectionType, SectionPatchPayload, ResourceMode, ResourceSortBy, ResourceMaxCount, CategoryOption, ReorderItem, ProductsBuilderState, AuctionsBuilderState, StatsBuilderState, PreOrdersBuilderState, StoresBuilderState, EventsBuilderState, SocialFeedBuilderState, WelcomeBuilderState, TrustIndicatorsBuilderState, CategoriesBuilderState, BrandsBuilderState, BannerBuilderState, FeaturesBuilderState, ReviewsBuilderState, WhatsAppBuilderState, FAQBuilderState, BlogBuilderState, NewsletterBuilderState, CarouselBuilderState, CustomCardsCardBuilderEntry, CustomCardsBuilderState, GoogleReviewsBuilderState, FeaturedBundlesBuilderState, PrizeDrawsBuilderState, EventRafflesBuilderState, CollectionCardsBuilderState, CollectionCardEntryType } from "./sections/adminSectionsTypes";
import { toStringValue, buildProductsConfig, buildAuctionsConfig, buildStatsConfig, buildPreOrdersConfig, buildStoresConfig, buildEventsConfig, buildSocialFeedConfig, buildWelcomeConfig, buildTrustIndicatorsConfig, buildCategoriesConfig, buildBrandsConfig, buildBannerConfig, buildFeaturesConfig, buildReviewsConfig, buildWhatsAppConfig, buildFAQConfig, buildBlogConfig, buildNewsletterConfig, buildCarouselConfig, buildCustomCardsConfig, buildGoogleReviewsConfig, buildFeaturedBundlesConfig, buildPrizeDrawsConfig, buildEventRafflesConfig, buildCollectionCardsConfig, parseProductsBuilder, parseAuctionsBuilder, parseStatsBuilder, parsePreOrdersBuilder, parseStoresBuilder, parseEventsBuilder, parseSocialFeedBuilder, parseWelcomeBuilder, parseTrustIndicatorsBuilder, parseCategoriesBuilder, parseBrandsBuilder, parseBannerBuilder, parseFeaturesBuilder, parseReviewsBuilder, parseWhatsAppBuilder, parseFAQBuilder, parseBlogBuilder, parseNewsletterBuilder, parseCarouselBuilder, parseCustomCardsBuilder, parseGoogleReviewsBuilder, parseFeaturedBundlesBuilder, parsePrizeDrawsBuilder, parseEventRafflesBuilder, parseCollectionCardsBuilder } from "./sections/adminSectionsBuildParse";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
} as const;

const CLS_SECTION_PANEL = "rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-[var(--appkit-space-4)] space-y-3";
const LBL_FILTER_BY_CATEGORY = "Filter by category";
const PH_FILTER_BY_CATEGORY = "Filter by category…";
const LBL_MAX_ITEMS = "Max items";
const LBL_AUTOMATIC = "Automatic";
const LBL_MANUAL_IDS = "Manual IDs";
const LBL_SCROLL_INTERVAL = "Scroll interval (ms)";
// Shared by all 11 section builders that expose a "view all" link.
const LBL_VIEW_MORE = "View all link label";
const PH_VIEW_MORE = "View all →";
const HELP_VIEW_MORE = "Leave blank to use the default label.";

export interface AdminSectionsViewProps {
  children?: React.ReactNode;
}

interface SectionEditorPanelProps {
  /** The record being edited, or undefined when creating. */
  sectionId?: string;
  /** The raw document for `sectionId`, resolved by the parent. */
  section?: HomepageSectionDocument;
  /** Every section, for the create-mode duplicate-type warning. */
  siblingSections: HomepageSectionDocument[];
  /** The parent's full-set query is still in flight. */
  isSectionsLoading: boolean;
  /** Close the drawer — `ListingEditorContext.closePanel`. */
  onDone: () => void;
}

/**
 * The homepage-section editor: the envelope, 25 typed builders and the raw
 * JSON fallback.
 *
 * 🛑 THIS IS A SEPARATE COMPONENT FOR A MECHANICAL REASON, NOT FOR TIDINESS.
 * `usePanelUrlSync` lives inside `useAdminListing` inside `DataListingView`,
 * so the id of the row whose pencil was clicked is only readable inside the
 * `renderEditor(ctx)` callback. The hydrate effect below must run in a
 * component body, so the editor has to BE a component.
 *
 * 🛑 The caller MUST pass `key={ctx.editId ?? "create"}`. `isCreateOpen ||
 * isEditOpen` is a single boolean, so clicking row B's pencil while row A's
 * drawer is open does NOT unmount this component — `editId` simply changes.
 * Without the key, `hydratedRef` below sees "already hydrated" and the admin
 * edits B's record with A's values, then saves it. Silent cross-record
 * corruption, no error anywhere. The remount the key forces is also what
 * resets the 24 non-matching builders and `selectedTemplateId`, which the old
 * single-component version had to do by hand and did not.
 */
function SectionEditorPanel({
  sectionId,
  section,
  siblingSections,
  isSectionsLoading,
  onDone,
}: SectionEditorPanelProps) {
  const isCreate = !sectionId;
  const queryClient = useQueryClient();
  const [sectionType, setSectionType] = React.useState<SectionType>("products");
  /*
   * D1 — which template the admin picked, or "" for the type's defaults.
   * Cleared whenever the type changes, because a template belongs to exactly
   * one type and keeping a stale id would offer a selection that no longer
   * applies.
   */
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [enabled, setEnabled] = React.useState(true);
  const [order, setOrder] = React.useState("");
  /*
   * The RAW textarea contents — meaningful only for a section type with no
   * typed builder. For a typed builder `configJson` below is DERIVED from
   * `typedConfig`, because the textarea is `readOnly` in that case and was
   * therefore never an input: it is a preview.
   *
   * 🛑 This used to be plain state written by an effect on `typedConfig`,
   * which ran AFTER the hydrate effect and overwrote the stored document with
   * a builder-generated config on every open. Deriving removes the race by
   * construction rather than by ordering, and removes a second render per
   * builder keystroke.
   */
  const [rawConfigJson, setRawConfigJson] = React.useState("{}");
  const [productsBuilder, setProductsBuilder] = React.useState<ProductsBuilderState>(DEFAULT_PRODUCTS_BUILDER);
  const [auctionsBuilder, setAuctionsBuilder] = React.useState<AuctionsBuilderState>(DEFAULT_AUCTIONS_BUILDER);
  const [statsBuilder, setStatsBuilder] = React.useState<StatsBuilderState>(DEFAULT_STATS_BUILDER);
  const [preOrdersBuilder, setPreOrdersBuilder] = React.useState<PreOrdersBuilderState>(DEFAULT_PRE_ORDERS_BUILDER);
  const [storesBuilder, setStoresBuilder] = React.useState<StoresBuilderState>(DEFAULT_STORES_BUILDER);
  const [eventsBuilder, setEventsBuilder] = React.useState<EventsBuilderState>(DEFAULT_EVENTS_BUILDER);
  const [socialFeedBuilder, setSocialFeedBuilder] = React.useState<SocialFeedBuilderState>(DEFAULT_SOCIAL_FEED_BUILDER);
  const [welcomeBuilder, setWelcomeBuilder] = React.useState<WelcomeBuilderState>(DEFAULT_WELCOME_BUILDER);
  const [trustIndicatorsBuilder, setTrustIndicatorsBuilder] = React.useState<TrustIndicatorsBuilderState>(DEFAULT_TRUST_INDICATORS_BUILDER);
  const [categoriesBuilder, setCategoriesBuilder] = React.useState<CategoriesBuilderState>(DEFAULT_CATEGORIES_BUILDER);
  const [brandsBuilder, setBrandsBuilder] = React.useState<BrandsBuilderState>(DEFAULT_BRANDS_BUILDER);
  const [bannerBuilder, setBannerBuilder] = React.useState<BannerBuilderState>(DEFAULT_BANNER_BUILDER);
  const [featuresBuilder, setFeaturesBuilder] = React.useState<FeaturesBuilderState>(DEFAULT_FEATURES_BUILDER);
  const [reviewsBuilder, setReviewsBuilder] = React.useState<ReviewsBuilderState>(DEFAULT_REVIEWS_BUILDER);
  const [whatsappBuilder, setWhatsappBuilder] = React.useState<WhatsAppBuilderState>(DEFAULT_WHATSAPP_BUILDER);
  const [faqBuilder, setFaqBuilder] = React.useState<FAQBuilderState>(DEFAULT_FAQ_BUILDER);
  const [blogBuilder, setBlogBuilder] = React.useState<BlogBuilderState>(DEFAULT_BLOG_BUILDER);
  const [newsletterBuilder, setNewsletterBuilder] = React.useState<NewsletterBuilderState>(DEFAULT_NEWSLETTER_BUILDER);
  const [carouselBuilder, setCarouselBuilder] = React.useState<CarouselBuilderState>(DEFAULT_CAROUSEL_BUILDER);
  const [customCardsBuilder, setCustomCardsBuilder] = React.useState<CustomCardsBuilderState>(DEFAULT_CUSTOM_CARDS_BUILDER);
  const [googleReviewsBuilder, setGoogleReviewsBuilder] = React.useState<GoogleReviewsBuilderState>(DEFAULT_GOOGLE_REVIEWS_BUILDER);
  const [featuredBundlesBuilder, setFeaturedBundlesBuilder] = React.useState<FeaturedBundlesBuilderState>(DEFAULT_FEATURED_BUNDLES_BUILDER);
  const [prizeDrawsBuilder, setPrizeDrawsBuilder] = React.useState<PrizeDrawsBuilderState>(DEFAULT_PRIZE_DRAWS_BUILDER);
  const [eventRafflesBuilder, setEventRafflesBuilder] = React.useState<EventRafflesBuilderState>(DEFAULT_EVENT_RAFFLES_BUILDER);
  const [collectionCardsBuilder, setCollectionCardsBuilder] = React.useState<CollectionCardsBuilderState>(DEFAULT_COLLECTION_CARDS_BUILDER);
  const toast = useToast();

  const isTypedBuilder = SUPPORTED_TYPED_BUILDERS.includes(sectionType);

  const duplicateOfType = React.useMemo(
    () => (isCreate ? siblingSections.find((s) => s.type === sectionType) : undefined),
    [isCreate, siblingSections, sectionType],
  );

  const categoriesQuery = useQuery<{ items?: JsonValue[] }>({
    queryKey: ["admin", "sections", "categories", "options"],
    queryFn: () =>
      apiClient.get<{ items?: JsonValue[] }>(
        `${ADMIN_ENDPOINTS.CATEGORIES}?page=1&pageSize=100&sorts=name`,
      ),
    staleTime: 60_000,
  });

  const categoryOptions = React.useMemo<CategoryOption[]>(() => {
    const items = Array.isArray(categoriesQuery.data?.items)
      ? categoriesQuery.data.items
      : [];
    return items
      .map((item) => {
        const row = (item ?? {}) as Record<string, JsonValue>;
        const id = toStringValue(row.id);
        const name = toStringValue(row.name);
        if (!id || !name) {
          return null;
        }
        return { id, name };
      })
      .filter((item): item is CategoryOption => item !== null);
  }, [categoriesQuery.data?.items]);

  const typedConfig = React.useMemo(() => {
    switch (sectionType) {
      case "products": return buildProductsConfig(productsBuilder);
      case "auctions": return buildAuctionsConfig(auctionsBuilder);
      case "stats": return buildStatsConfig(statsBuilder);
      case "pre-orders": return buildPreOrdersConfig(preOrdersBuilder);
      case "stores": return buildStoresConfig(storesBuilder);
      case "events": return buildEventsConfig(eventsBuilder);
      case "social-feed": return buildSocialFeedConfig(socialFeedBuilder);
      case "welcome": return buildWelcomeConfig(welcomeBuilder);
      case "trust-indicators": return buildTrustIndicatorsConfig(trustIndicatorsBuilder);
      case "categories": return buildCategoriesConfig(categoriesBuilder);
      case "brands": return buildBrandsConfig(brandsBuilder);
      case "banner": return buildBannerConfig(bannerBuilder);
      case "features": return buildFeaturesConfig(featuresBuilder);
      case "reviews": return buildReviewsConfig(reviewsBuilder);
      case "whatsapp-community": return buildWhatsAppConfig(whatsappBuilder);
      case "faq": return buildFAQConfig(faqBuilder);
      case "blog-articles": return buildBlogConfig(blogBuilder);
      case "newsletter": return buildNewsletterConfig(newsletterBuilder);
      case "carousel": return buildCarouselConfig(carouselBuilder);
      case "custom-cards": return buildCustomCardsConfig(customCardsBuilder);
      case "google-reviews": return buildGoogleReviewsConfig(googleReviewsBuilder);
      case "featured-bundles": return buildFeaturedBundlesConfig(featuredBundlesBuilder);
      case "prize-draws": return buildPrizeDrawsConfig(prizeDrawsBuilder);
      case "event-raffles": return buildEventRafflesConfig(eventRafflesBuilder);
      case "collection-cards": return buildCollectionCardsConfig(collectionCardsBuilder);
      default: return null;
    }
  }, [
    sectionType,
    productsBuilder,
    auctionsBuilder,
    statsBuilder,
    preOrdersBuilder,
    storesBuilder,
    eventsBuilder,
    socialFeedBuilder,
    welcomeBuilder,
    trustIndicatorsBuilder,
    categoriesBuilder,
    brandsBuilder,
    bannerBuilder,
    featuresBuilder,
    reviewsBuilder,
    whatsappBuilder,
    faqBuilder,
    blogBuilder,
    newsletterBuilder,
    carouselBuilder,
    customCardsBuilder,
    googleReviewsBuilder,
    featuredBundlesBuilder,
    prizeDrawsBuilder,
    eventRafflesBuilder,
    collectionCardsBuilder,
  ]);

  /**
   * What the Generated-config preview shows and what the save sends.
   *
   * Derived for a typed builder, raw state otherwise. `typedConfig` is null
   * for the three types with no builder (`how-it-works`, `testimonials`,
   * `promo-grid`), which is the same set `isTypedBuilder` is false for — so
   * the two branches agree and neither can strand the other.
   */
  const configJson = React.useMemo(
    () => (isTypedBuilder && typedConfig ? JSON.stringify(typedConfig, null, 2) : rawConfigJson),
    [isTypedBuilder, typedConfig, rawConfigJson],
  );

  const saveSection = useApiMutation({
    errorMessage: "Failed to save section.",
    mutationFn: async () => {
      let parsedConfig: Record<string, JsonValue>;
      try {
        parsedConfig = JSON.parse(configJson) as Record<string, JsonValue>;
      } catch (_err) {
        void normalizeError(_err);
        throw new Error("Config must be valid JSON.");
      }

      if (isCreate) {
        await apiClient.post(ADMIN_ENDPOINTS.SECTIONS, {
          type: sectionType,
          enabled,
          ...(order.trim() ? { order: Number(order) } : {}),
          config: parsedConfig,
        });
        return;
      }

      /*
       * `config` is sent unconditionally and that is deliberate. The
       * repository MERGES it (`{...existing.config, ...data.config}`), which
       * costs one extra read — the price of a guaranteed-correct write. A
       * "diff and skip" would save that read and silently drop an admin's
       * edit whenever the comparison was wrong, which is the worse failure.
       *
       * The reads worth saving are the per-ROW ones, and those already omit
       * `config`: the enable/disable toggle and the reorder save both send a
       * single scalar and short-circuit the merge.
       */
      const payload: SectionPatchPayload = {
        enabled,
        config: parsedConfig,
      };
      if (order.trim()) {
        payload.order = Number(order);
      }

      await apiClient.patch(`${ADMIN_ENDPOINTS.SECTIONS}/${sectionId}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "sections", "listing"] });
      // Public-facing useHomepageSections() reads under a separate key.
      await queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.showToast(isCreate ? "Section created." : "Section updated.", "success");
      onDone();
    },
  });

  /**
   * Hydrate the builders from the stored document — ONCE per mounted record.
   *
   * 🛑 `hydratedRef` is not an optimisation. The old deps included the whole
   * `sections` array, which is a fresh identity after every refetch — and with
   * `refetchOnWindowFocus` plus a 30s `staleTime`, alt-tabbing away mid-edit
   * and coming back re-ran this and silently reverted every builder change the
   * admin had made. No error, no prompt, just their work gone.
   *
   * The ref is only correct because the caller remounts on `editId` (see the
   * 🛑 on this component). Ref and key are a pair; neither works alone.
   */
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!section || hydratedRef.current) return;
    hydratedRef.current = true;

    setSectionType(section.type as SectionType);
    setEnabled(Boolean(section.enabled));
    setOrder(String(section.order ?? ""));
    const selectedConfig = (section.config ?? {}) as JsonObjectWithUndefined;
    setRawConfigJson(JSON.stringify(selectedConfig, null, 2));

    switch (section.type) {
      case "products": setProductsBuilder(parseProductsBuilder(selectedConfig)); break;
      case "auctions": setAuctionsBuilder(parseAuctionsBuilder(selectedConfig)); break;
      case "stats": setStatsBuilder(parseStatsBuilder(selectedConfig)); break;
      case "pre-orders": setPreOrdersBuilder(parsePreOrdersBuilder(selectedConfig)); break;
      case "stores": setStoresBuilder(parseStoresBuilder(selectedConfig)); break;
      case "events": setEventsBuilder(parseEventsBuilder(selectedConfig)); break;
      case "social-feed": setSocialFeedBuilder(parseSocialFeedBuilder(selectedConfig)); break;
      case "welcome": setWelcomeBuilder(parseWelcomeBuilder(selectedConfig)); break;
      case "trust-indicators": setTrustIndicatorsBuilder(parseTrustIndicatorsBuilder(selectedConfig)); break;
      case "categories": setCategoriesBuilder(parseCategoriesBuilder(selectedConfig)); break;
      case "brands": setBrandsBuilder(parseBrandsBuilder(selectedConfig)); break;
      case "banner": setBannerBuilder(parseBannerBuilder(selectedConfig)); break;
      case "features": setFeaturesBuilder(parseFeaturesBuilder(selectedConfig)); break;
      case "reviews": setReviewsBuilder(parseReviewsBuilder(selectedConfig)); break;
      case "whatsapp-community": setWhatsappBuilder(parseWhatsAppBuilder(selectedConfig)); break;
      case "faq": setFaqBuilder(parseFAQBuilder(selectedConfig)); break;
      case "blog-articles": setBlogBuilder(parseBlogBuilder(selectedConfig)); break;
      case "newsletter": setNewsletterBuilder(parseNewsletterBuilder(selectedConfig)); break;
      case "carousel": setCarouselBuilder(parseCarouselBuilder(selectedConfig)); break;
      case "custom-cards": setCustomCardsBuilder(parseCustomCardsBuilder(selectedConfig)); break;
      case "google-reviews": setGoogleReviewsBuilder(parseGoogleReviewsBuilder(selectedConfig)); break;
      case "featured-bundles": setFeaturedBundlesBuilder(parseFeaturedBundlesBuilder(selectedConfig)); break;
      case "prize-draws": setPrizeDrawsBuilder(parsePrizeDrawsBuilder(selectedConfig)); break;
      case "event-raffles": setEventRafflesBuilder(parseEventRafflesBuilder(selectedConfig)); break;
      case "collection-cards": setCollectionCardsBuilder(parseCollectionCardsBuilder(selectedConfig)); break;
    }
  }, [section]);

  /**
   * D1 — set the builder for one section type, from a TEMPLATE or from the
   * type's default.
   *
   * 🛑 ONE function for both, because they are the same operation: "set the
   * builder for this type". This was a 25-arm switch serving only the reset,
   * and a template pick would have been a second 25-arm switch beside it —
   * two enumerations of one union, which is Root Cause #61 in the shape this
   * codebase has already paid for ten times.
   *
   * Narrowing works because `SectionTemplate` is discriminated on
   * `sectionType`: inside each case, `template.builder` is known to be exactly
   * that type's state. A raw `SectionConfig` could not be narrowed this way at
   * all — it is a non-discriminated union of 25 untagged interfaces.
   *
   * `template` undefined means "use the default", so the existing
   * reset-on-type-change behaviour is this function called with one argument
   * and is byte-identical.
   */
  const applyBuilderFor = React.useCallback((
    type: SectionType,
    template?: SectionTemplate,
  ) => {
    const pick = <T,>(fallback: T): T =>
      template && template.sectionType === type ? (template.builder as T) : fallback;

    switch (type) {
      case "products": setProductsBuilder(pick(DEFAULT_PRODUCTS_BUILDER)); break;
      case "auctions": setAuctionsBuilder(pick(DEFAULT_AUCTIONS_BUILDER)); break;
      case "stats": setStatsBuilder(pick(DEFAULT_STATS_BUILDER)); break;
      case "pre-orders": setPreOrdersBuilder(pick(DEFAULT_PRE_ORDERS_BUILDER)); break;
      case "stores": setStoresBuilder(pick(DEFAULT_STORES_BUILDER)); break;
      case "events": setEventsBuilder(pick(DEFAULT_EVENTS_BUILDER)); break;
      case "social-feed": setSocialFeedBuilder(pick(DEFAULT_SOCIAL_FEED_BUILDER)); break;
      case "welcome": setWelcomeBuilder(pick(DEFAULT_WELCOME_BUILDER)); break;
      case "trust-indicators": setTrustIndicatorsBuilder(pick(DEFAULT_TRUST_INDICATORS_BUILDER)); break;
      case "categories": setCategoriesBuilder(pick(DEFAULT_CATEGORIES_BUILDER)); break;
      case "brands": setBrandsBuilder(pick(DEFAULT_BRANDS_BUILDER)); break;
      case "banner": setBannerBuilder(pick(DEFAULT_BANNER_BUILDER)); break;
      case "features": setFeaturesBuilder(pick(DEFAULT_FEATURES_BUILDER)); break;
      case "reviews": setReviewsBuilder(pick(DEFAULT_REVIEWS_BUILDER)); break;
      case "whatsapp-community": setWhatsappBuilder(pick(DEFAULT_WHATSAPP_BUILDER)); break;
      case "faq": setFaqBuilder(pick(DEFAULT_FAQ_BUILDER)); break;
      case "blog-articles": setBlogBuilder(pick(DEFAULT_BLOG_BUILDER)); break;
      case "newsletter": setNewsletterBuilder(pick(DEFAULT_NEWSLETTER_BUILDER)); break;
      case "carousel": setCarouselBuilder(pick(DEFAULT_CAROUSEL_BUILDER)); break;
      case "custom-cards": setCustomCardsBuilder(pick(DEFAULT_CUSTOM_CARDS_BUILDER)); break;
      case "google-reviews": setGoogleReviewsBuilder(pick(DEFAULT_GOOGLE_REVIEWS_BUILDER)); break;
      case "featured-bundles": setFeaturedBundlesBuilder(pick(DEFAULT_FEATURED_BUNDLES_BUILDER)); break;
      case "prize-draws": setPrizeDrawsBuilder(pick(DEFAULT_PRIZE_DRAWS_BUILDER)); break;
      case "event-raffles": setEventRafflesBuilder(pick(DEFAULT_EVENT_RAFFLES_BUILDER)); break;
      case "collection-cards": setCollectionCardsBuilder(pick(DEFAULT_COLLECTION_CARDS_BUILDER)); break;
    }
     
  }, []);

  /*
   * Reset to the type's defaults when the admin picks a different type while
   * creating. Unchanged behaviour — it is now `applyBuilderFor(type)` with no
   * template rather than its own 25-arm switch.
   */
  React.useEffect(() => {
    if (!isCreate) return;
    applyBuilderFor(sectionType);
    setSelectedTemplateId("");
  }, [isCreate, sectionType, applyBuilderFor]);

  function toggleCategorySelection(
    ids: string[],
    categoryId: string,
    checked: boolean,
  ): string[] {
    if (checked) {
      if (ids.includes(categoryId)) {
        return ids;
      }
      return [...ids, categoryId];
    }
    return ids.filter((id) => id !== categoryId);
  }

  function renderProductsCategorySelectors(): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={productsBuilder.selectedCategoryIds.includes(category.id)}
                label={category.name}
                onChange={(event) =>
                  setProductsBuilder((prev) => ({
                    ...prev,
                    selectedCategoryIds: toggleCategorySelection(
                      prev.selectedCategoryIds,
                      category.id,
                      event.target.checked,
                    ),
                  }))
                }
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderProductsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Products Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={productsBuilder.title}
          onChange={(event) =>
            setProductsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label={LBL_VIEW_MORE}
          value={productsBuilder.viewMoreLabel}
          onChange={(event) =>
            setProductsBuilder((prev) => ({ ...prev, viewMoreLabel: event.target.value }))
          }
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />

        <Input
          label="Subtitle"
          value={productsBuilder.subtitle}
          onChange={(event) =>
            setProductsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max products"
          type="number"
          min={1}
          max={50}
          value={String(productsBuilder.maxItems)}
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={productsBuilder.status}
          onValueChange={(value) =>
            setProductsBuilder((prev) => ({
              ...prev,
              status: value as ProductsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Published", value: "published" },
            { label: "Draft", value: "draft" },
          ]}
        />

        <Select
          label="Sort by"
          value={productsBuilder.sortBy}
          onValueChange={(value) => setProductsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={productsBuilder.filterByCategory}
            onChange={(id) => setProductsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(productsBuilder.maxCount)}
          onValueChange={(v) => setProductsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={productsBuilder.loop} label="Loop carousel" onChange={(e) => setProductsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={productsBuilder.resourceMode}
          onValueChange={(value) =>
            setProductsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderProductsCategorySelectors()}

        {productsBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={productsBuilder.manualResourceIds ? productsBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setProductsBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select products…"
          />
        ) : null}

        <Checkbox
          checked={productsBuilder.featuredOnly}
          label="Featured only"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              featuredOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={productsBuilder.inStockOnly}
          label="In-stock only"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              inStockOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={productsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(productsBuilder.scrollInterval)}
          onChange={(event) =>
            setProductsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderAuctionsCategorySelectors(): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={auctionsBuilder.selectedCategoryIds.includes(category.id)}
                label={category.name}
                onChange={(event) =>
                  setAuctionsBuilder((prev) => ({
                    ...prev,
                    selectedCategoryIds: toggleCategorySelection(
                      prev.selectedCategoryIds,
                      category.id,
                      event.target.checked,
                    ),
                  }))
                }
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderAuctionsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Auctions Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={auctionsBuilder.title}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label={LBL_VIEW_MORE}
          value={auctionsBuilder.viewMoreLabel}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({ ...prev, viewMoreLabel: event.target.value }))
          }
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />

        <Input
          label="Subtitle"
          value={auctionsBuilder.subtitle}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max auctions"
          type="number"
          min={1}
          max={50}
          value={String(auctionsBuilder.maxItems)}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={auctionsBuilder.status}
          onValueChange={(value) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              status: value as AuctionsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Ended", value: "ended" },
          ]}
        />

        <Select
          label="Sort by"
          value={auctionsBuilder.sortBy}
          onValueChange={(value) => setAuctionsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={auctionsBuilder.filterByCategory}
            onChange={(id) => setAuctionsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(auctionsBuilder.maxCount)}
          onValueChange={(v) => setAuctionsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={auctionsBuilder.loop} label="Loop carousel" onChange={(e) => setAuctionsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={auctionsBuilder.resourceMode}
          onValueChange={(value) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderAuctionsCategorySelectors()}

        {auctionsBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={auctionsBuilder.manualResourceIds ? auctionsBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setAuctionsBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select auctions…"
          />
        ) : null}

        <Checkbox
          checked={auctionsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(auctionsBuilder.scrollInterval)}
          onChange={(event) =>
            setAuctionsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderStatsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Stats Section Builder
        </Text>

        <Input
          label="Section title"
          value={statsBuilder.title}
          onChange={(event) =>
            setStatsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
          helperText="Optional internal title for stats configuration."
        />

        {statsBuilder.stats.map((stat, index) => (
          <Stack key={`stat-row-${index}`} className={`${__P.p3}`} gap="3" rounded="md" border="default">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Stat {index + 1}
            </Text>
            <Input
              label="Key"
              value={stat.key}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], key: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
            <Input
              label="Label"
              value={stat.label}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], label: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
            <Input
              label="Value"
              value={stat.value}
              onChange={(event) =>
                setStatsBuilder((prev) => {
                  const next = [...prev.stats];
                  next[index] = { ...next[index], value: event.target.value };
                  return { ...prev, stats: next };
                })
              }
            />
          </Stack>
        ))}
      </Div>
    );
  }

  function renderCategorySelector(
    selectedIds: string[],
    onToggle: (categoryId: string, checked: boolean) => void,
  ): React.ReactNode {
    return (
      <Stack gap="sm">
        <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
          Category selectors
        </Text>
        {categoriesQuery.isLoading ? (
          <Text size="sm" color="muted">Loading categories...</Text>
        ) : categoryOptions.length === 0 ? (
          <Text size="sm" color="muted">No categories available.</Text>
        ) : (
          <Div layout="grid" gap="2" className="grid-cols-1 sm:grid-cols-2">
            {categoryOptions.map((category) => (
              <Checkbox
                key={category.id}
                checked={selectedIds.includes(category.id)}
                label={category.name}
                onChange={(event) => onToggle(category.id, event.target.checked)}
              />
            ))}
          </Div>
        )}
      </Stack>
    );
  }

  function renderPreOrdersBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Pre-Orders Carousel Builder
        </Text>

        <Input
          label="Section title"
          value={preOrdersBuilder.title}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label={LBL_VIEW_MORE}
          value={preOrdersBuilder.viewMoreLabel}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({ ...prev, viewMoreLabel: event.target.value }))
          }
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />

        <Input
          label="Subtitle"
          value={preOrdersBuilder.subtitle}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max pre-orders"
          type="number"
          min={1}
          max={50}
          value={String(preOrdersBuilder.maxItems)}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={preOrdersBuilder.status}
          onValueChange={(value) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              status: value as PreOrdersBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Closed", value: "closed" },
          ]}
        />

        <Select
          label="Sort by"
          value={preOrdersBuilder.sortBy}
          onValueChange={(value) => setPreOrdersBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={preOrdersBuilder.filterByCategory}
            onChange={(id) => setPreOrdersBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(preOrdersBuilder.maxCount)}
          onValueChange={(v) => setPreOrdersBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={preOrdersBuilder.loop} label="Loop carousel" onChange={(e) => setPreOrdersBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={preOrdersBuilder.resourceMode}
          onValueChange={(value) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(preOrdersBuilder.selectedCategoryIds, (categoryId, checked) => {
          setPreOrdersBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {preOrdersBuilder.resourceMode === "manual" ? (
          <ProductInlineSelect
            scope="admin"
            multiple
            value={preOrdersBuilder.manualResourceIds ? preOrdersBuilder.manualResourceIds.split(",").map((s) => s.trim()).filter(Boolean) : []}
            onChange={(ids) =>
              setPreOrdersBuilder((prev) => ({ ...prev, manualResourceIds: ids.join(",") }))
            }
            placeholder="Search and select pre-orders…"
          />
        ) : null}

        <Checkbox
          checked={preOrdersBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(preOrdersBuilder.scrollInterval)}
          onChange={(event) =>
            setPreOrdersBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderStoresBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Stores Section Builder
        </Text>

        <Input
          label="Section title"
          value={storesBuilder.title}
          onChange={(event) =>
            setStoresBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label={LBL_VIEW_MORE}
          value={storesBuilder.viewMoreLabel}
          onChange={(event) =>
            setStoresBuilder((prev) => ({ ...prev, viewMoreLabel: event.target.value }))
          }
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />

        <Input
          label="Subtitle"
          value={storesBuilder.subtitle}
          onChange={(event) =>
            setStoresBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max stores"
          type="number"
          min={1}
          max={30}
          value={String(storesBuilder.maxItems)}
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={storesBuilder.status}
          onValueChange={(value) =>
            setStoresBuilder((prev) => ({
              ...prev,
              status: value as StoresBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Pending", value: "pending" },
            { label: "Disabled", value: "disabled" },
          ]}
        />

        <Select
          label="Sort by"
          value={storesBuilder.sortBy}
          onValueChange={(value) => setStoresBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={storesBuilder.filterByCategory}
            onChange={(id) => setStoresBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(storesBuilder.maxCount)}
          onValueChange={(v) => setStoresBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={storesBuilder.loop} label="Loop carousel" onChange={(e) => setStoresBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={storesBuilder.resourceMode}
          onValueChange={(value) =>
            setStoresBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(storesBuilder.selectedCategoryIds, (categoryId, checked) => {
          setStoresBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {storesBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual store resource IDs (comma-separated)"
            value={storesBuilder.manualResourceIds}
            onChange={(event) =>
              setStoresBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
          />
        ) : null}

        <Checkbox
          checked={storesBuilder.verifiedOnly}
          label="Verified stores only"
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              verifiedOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={storesBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(storesBuilder.scrollInterval)}
          onChange={(event) =>
            setStoresBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderEventsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Events Section Builder
        </Text>

        <Input
          label="Section title"
          value={eventsBuilder.title}
          onChange={(event) =>
            setEventsBuilder((prev) => ({ ...prev, title: event.target.value }))
          }
        />

        <Input
          label={LBL_VIEW_MORE}
          value={eventsBuilder.viewMoreLabel}
          onChange={(event) =>
            setEventsBuilder((prev) => ({ ...prev, viewMoreLabel: event.target.value }))
          }
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />

        <Input
          label="Subtitle"
          value={eventsBuilder.subtitle}
          onChange={(event) =>
            setEventsBuilder((prev) => ({ ...prev, subtitle: event.target.value }))
          }
        />

        <Input
          label="Max events"
          type="number"
          min={1}
          max={30}
          value={String(eventsBuilder.maxItems)}
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Number(event.target.value) || 1),
            }))
          }
        />

        <Select
          label="Status filter"
          value={eventsBuilder.status}
          onValueChange={(value) =>
            setEventsBuilder((prev) => ({
              ...prev,
              status: value as EventsBuilderState["status"],
            }))
          }
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Ended", value: "ended" },
          ]}
        />

        <Select
          label="Sort by"
          value={eventsBuilder.sortBy}
          onValueChange={(value) => setEventsBuilder((prev) => ({ ...prev, sortBy: value as ResourceSortBy }))}
          options={[...RESOURCE_SORT_OPTIONS]}
        />

        <Stack gap="xs">
          <Text size="sm" weight="medium">{LBL_FILTER_BY_CATEGORY}</Text>
          <CategoryInlineSelect
            value={eventsBuilder.filterByCategory}
            onChange={(id) => setEventsBuilder((prev) => ({ ...prev, filterByCategory: id }))}
            placeholder={PH_FILTER_BY_CATEGORY}
          />
        </Stack>

        <Select
          label={LBL_MAX_ITEMS}
          value={String(eventsBuilder.maxCount)}
          onValueChange={(v) => setEventsBuilder((prev) => ({ ...prev, maxCount: Number(v) as ResourceMaxCount }))}
          options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]}
        />

        <Checkbox checked={eventsBuilder.loop} label="Loop carousel" onChange={(e) => setEventsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />

        <Select
          label="Resource mode"
          value={eventsBuilder.resourceMode}
          onValueChange={(value) =>
            setEventsBuilder((prev) => ({
              ...prev,
              resourceMode: value as ResourceMode,
            }))
          }
          options={[
            { label: LBL_AUTOMATIC, value: "automatic" },
            { label: LBL_MANUAL_IDS, value: "manual" },
          ]}
        />

        {renderCategorySelector(eventsBuilder.selectedCategoryIds, (categoryId, checked) => {
          setEventsBuilder((prev) => ({
            ...prev,
            selectedCategoryIds: toggleCategorySelection(prev.selectedCategoryIds, categoryId, checked),
          }));
        })}

        {eventsBuilder.resourceMode === "manual" ? (
          <Textarea
            label="Manual event resource IDs (comma-separated)"
            value={eventsBuilder.manualResourceIds}
            onChange={(event) =>
              setEventsBuilder((prev) => ({
                ...prev,
                manualResourceIds: event.target.value,
              }))
            }
            rows={3}
          />
        ) : null}

        <Checkbox
          checked={eventsBuilder.featuredOnly}
          label="Featured events only"
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              featuredOnly: event.target.checked,
            }))
          }
        />

        <Checkbox
          checked={eventsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              autoScroll: event.target.checked,
            }))
          }
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(eventsBuilder.scrollInterval)}
          onChange={(event) =>
            setEventsBuilder((prev) => ({
              ...prev,
              scrollInterval: Math.max(1000, Number(event.target.value) || 1000),
            }))
          }
        />
      </Div>
    );
  }

  function renderFAQBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">FAQ Section Builder</Text>
        <Input label="Section title" value={faqBuilder.title} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label={LBL_VIEW_MORE} value={faqBuilder.viewMoreLabel} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))} placeholder={PH_VIEW_MORE} helperText={HELP_VIEW_MORE} />
        <Input label="Subtitle" value={faqBuilder.subtitle} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Input label="Display count" type="number" min={1} max={20} value={String(faqBuilder.displayCount)} onChange={(e) => setFaqBuilder((prev) => ({ ...prev, displayCount: Math.min(20, Math.max(1, Number(e.target.value) || 1)) }))} />
        <Checkbox checked={faqBuilder.showOnHomepage} label="Show on homepage" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, showOnHomepage: e.target.checked }))} />
        <Checkbox checked={faqBuilder.expandedByDefault} label="Expanded by default" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, expandedByDefault: e.target.checked }))} />
        <Checkbox checked={faqBuilder.linkToFullPage} label="Link to full FAQ page" onChange={(e) => setFaqBuilder((prev) => ({ ...prev, linkToFullPage: e.target.checked }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Categories</Text>
          <Div layout="grid" gap="2" className="grid-cols-2">
            {FAQ_CATEGORY_OPTIONS.map((opt) => (
              <Checkbox
                key={opt.value}
                checked={faqBuilder.categories.includes(opt.value)}
                label={opt.label}
                onChange={(e) => setFaqBuilder((prev) => ({
                  ...prev,
                  categories: e.target.checked
                    ? [...prev.categories, opt.value]
                    : prev.categories.filter((c) => c !== opt.value),
                }))}
              />
            ))}
          </Div>
        </Stack>
      </Div>
    );
  }

  function renderBlogBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Blog Articles Builder</Text>
        <Input label="Section title" value={blogBuilder.title} onChange={(e) => setBlogBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label={LBL_VIEW_MORE} value={blogBuilder.viewMoreLabel} onChange={(e) => setBlogBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))} placeholder={PH_VIEW_MORE} helperText={HELP_VIEW_MORE} />
        <Select label="Max articles" value={String(blogBuilder.maxArticles)} onValueChange={(v) => setBlogBuilder((prev) => ({ ...prev, maxArticles: Number(v) }))} options={[{ label: "3", value: "3" }, { label: "4", value: "4" }, { label: "6", value: "6" }]} />
        <Checkbox checked={blogBuilder.showReadTime} label="Show read time" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showReadTime: e.target.checked }))} />
        <Checkbox checked={blogBuilder.showAuthor} label="Show author" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showAuthor: e.target.checked }))} />
        <Checkbox checked={blogBuilder.showThumbnails} label="Show thumbnails" onChange={(e) => setBlogBuilder((prev) => ({ ...prev, showThumbnails: e.target.checked }))} />
      </Div>
    );
  }

  function renderNewsletterBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Newsletter Section Builder</Text>
        <Input label="Title" value={newsletterBuilder.title} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Textarea label="Description" value={newsletterBuilder.description} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
        {/* "Email placeholder" and "Button text" removed — the subscribe form
            is supplied by the consumer app, so neither had an element here to
            apply to. */}
        <Input label="Privacy text" value={newsletterBuilder.privacyText} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, privacyText: e.target.value }))} />
        <Input label="Privacy link" value={newsletterBuilder.privacyLink} onChange={(e) => setNewsletterBuilder((prev) => ({ ...prev, privacyLink: e.target.value }))} placeholder={String(ROUTES.PUBLIC.PRIVACY)} />
      </Div>
    );
  }

  function renderBannerBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Banner Section Builder</Text>
        <Select label="Height" value={bannerBuilder.height} onValueChange={(v) => setBannerBuilder((prev) => ({ ...prev, height: v as BannerBuilderState["height"] }))} options={[{ label: "Small (200px)", value: "sm" }, { label: "Medium (300px)", value: "md" }, { label: "Large (400px)", value: "lg" }, { label: "Extra Large (500px)", value: "xl" }]} />
        <Input label="Background image URL" type="url" value={bannerBuilder.backgroundImage} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, backgroundImage: e.target.value }))} placeholder="https://..." />
        <Input label="Background color (CSS token)" value={bannerBuilder.backgroundColor} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, backgroundColor: e.target.value }))} placeholder="var(--appkit-color-primary)" />
        <Input label="Gradient from (CSS token)" value={bannerBuilder.gradientFrom} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, gradientFrom: e.target.value }))} placeholder="var(--appkit-color-primary)" />
        <Input label="Gradient to (CSS token)" value={bannerBuilder.gradientTo} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, gradientTo: e.target.value }))} placeholder="var(--appkit-color-secondary)" />
        <Input label="Content title" value={bannerBuilder.contentTitle} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentTitle: e.target.value }))} />
        <Input label="Content subtitle" value={bannerBuilder.contentSubtitle} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentSubtitle: e.target.value }))} />
        <Textarea label="Content description" value={bannerBuilder.contentDescription} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, contentDescription: e.target.value }))} rows={2} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Buttons (max 3)</Text>
          {bannerBuilder.buttons.map((btn, index) => (
            <Stack key={`banner-btn-${index}`} rounded="md" padding="xs" border="default" gap="sm">
              <Row align="center" justify="between"><Text size="xs" color="muted">Button {index + 1}</Text><Button type="button" variant="ghost" size="sm" onClick={() => setBannerBuilder((prev) => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }))}>Remove</Button></Row>
              <Input label="Text" value={btn.text} onChange={(e) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], text: e.target.value }; return { ...prev, buttons: next }; })} />
              <Input label="Link" value={btn.link} onChange={(e) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], link: e.target.value }; return { ...prev, buttons: next }; })} />
              <Select label="Variant" value={btn.variant} onValueChange={(v) => setBannerBuilder((prev) => { const next = [...prev.buttons]; next[index] = { ...next[index], variant: v as "primary" | "secondary" | "outline" }; return { ...prev, buttons: next }; })} options={[{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Outline", value: "outline" }]} />
            </Stack>
          ))}
          {bannerBuilder.buttons.length < 3 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setBannerBuilder((prev) => ({ ...prev, buttons: [...prev.buttons, { text: "", link: "", variant: "primary" }] }))}>+ Add button</Button>
          ) : null}
        </Stack>
        <Checkbox checked={bannerBuilder.clickable} label="Make entire banner clickable" onChange={(e) => setBannerBuilder((prev) => ({ ...prev, clickable: e.target.checked }))} />
        {bannerBuilder.clickable ? (
          <Input label="Click link" value={bannerBuilder.clickLink} onChange={(e) => setBannerBuilder((prev) => ({ ...prev, clickLink: e.target.value }))} placeholder={String(ROUTES.PUBLIC.PRODUCTS)} />
        ) : null}
      </Div>
    );
  }

  function renderFeaturesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Features Section Builder</Text>
        <Input label="Section title" value={featuresBuilder.title} onChange={(e) => setFeaturesBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Feature items</Text>
          {featuresBuilder.features.map((feature, index) => (
            <Row key={`feat-${index}`} align="center" gap="sm">
              <Input value={feature} onChange={(e) => setFeaturesBuilder((prev) => { const next = [...prev.features]; next[index] = e.target.value; return { ...prev, features: next }; })} className="flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setFeaturesBuilder((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }))}>✕</Button>
            </Row>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setFeaturesBuilder((prev) => ({ ...prev, features: [...prev.features, ""] }))}>+ Add feature</Button>
        </Stack>
      </Div>
    );
  }

  function renderReviewsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Reviews Section Builder</Text>
        <Input label="Section title" value={reviewsBuilder.title} onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label={LBL_VIEW_MORE} value={reviewsBuilder.viewMoreLabel} onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))} placeholder={PH_VIEW_MORE} helperText={HELP_VIEW_MORE} />
        {/* The "Reviews source" picker and its Google Place ID input are gone.
            This section only ever renders platform reviews, so choosing
            "Google Business Reviews" here silently did nothing. Add a
            `google-reviews` section instead — it has a real placeId field. */}
        <Select label="Max reviews" value={String(reviewsBuilder.maxReviews)} onValueChange={(v) => setReviewsBuilder((prev) => ({ ...prev, maxReviews: Number(v) }))} options={[{ label: "5", value: "5" }, { label: "10", value: "10" }, { label: "20", value: "20" }]} />
        <Select label="Items per view" value={String(reviewsBuilder.itemsPerView)} onValueChange={(v) => setReviewsBuilder((prev) => ({ ...prev, itemsPerView: Number(v) }))} options={[{ label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" }]} />
        <Checkbox checked={reviewsBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(reviewsBuilder.scrollInterval)} onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
        <Checkbox checked={reviewsBuilder.loop} label="Loop carousel" onChange={(e) => setReviewsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />
      </Div>
    );
  }

  function renderWhatsAppBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">WhatsApp Community Builder</Text>
        <Input label="Title" value={whatsappBuilder.title} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Textarea label="Description" value={whatsappBuilder.description} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
        <Input label="WhatsApp group link" type="url" value={whatsappBuilder.groupLink} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, groupLink: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
        <Input label="Member count" type="number" min={0} value={String(whatsappBuilder.memberCount)} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, memberCount: Math.max(0, Number(e.target.value) || 0) }))} />
        <Stack gap="sm">
          <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Benefits</Text>
          {whatsappBuilder.benefits.map((benefit, index) => (
            <Row key={`wb-${index}`} align="center" gap="sm">
              <Input value={benefit} onChange={(e) => setWhatsappBuilder((prev) => { const next = [...prev.benefits]; next[index] = e.target.value; return { ...prev, benefits: next }; })} className="flex-1" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setWhatsappBuilder((prev) => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== index) }))}>✕</Button>
            </Row>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setWhatsappBuilder((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }))}>+ Add benefit</Button>
        </Stack>
        <Input label="Button text" value={whatsappBuilder.buttonText} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, buttonText: e.target.value }))} />
        <Input label="Testimonial (optional)" value={whatsappBuilder.testimonial} onChange={(e) => setWhatsappBuilder((prev) => ({ ...prev, testimonial: e.target.value }))} />
      </Div>
    );
  }

  function renderWelcomeBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Welcome Section Builder</Text>
        <Input label="Headline (h1)" value={welcomeBuilder.h1} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, h1: e.target.value }))} />
        <Input label="Subtitle" value={welcomeBuilder.subtitle} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Textarea label="Description" value={welcomeBuilder.description} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
        <Checkbox checked={welcomeBuilder.showCTA} label="Show CTA button" onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, showCTA: e.target.checked }))} />
        {welcomeBuilder.showCTA ? (
          <>
            <Input label="CTA text" value={welcomeBuilder.ctaText} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, ctaText: e.target.value }))} />
            <Input label="CTA link" value={welcomeBuilder.ctaLink} onChange={(e) => setWelcomeBuilder((prev) => ({ ...prev, ctaLink: e.target.value }))} placeholder={String(ROUTES.PUBLIC.PRODUCTS)} />
          </>
        ) : null}
      </Div>
    );
  }

  function renderTrustIndicatorsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Trust Indicators Builder</Text>
        <Input label="Section title" value={trustIndicatorsBuilder.title} onChange={(e) => setTrustIndicatorsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        {trustIndicatorsBuilder.indicators.map((ind, index) => (
          <Stack key={ind.id} className={`${__P.p3}`} gap="sm" rounded="md" border="default">
            <Row align="center" justify="between">
              <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Indicator {index + 1}</Text>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTrustIndicatorsBuilder((prev) => ({ ...prev, indicators: prev.indicators.filter((_, i) => i !== index) }))}>Remove</Button>
            </Row>
            {/* A picker, not free text: an unrecognised value now resolves to
                no icon at all, so the field must not accept one. */}
            <Stack gap="xs">
              <Text color="muted" size="xs" weight="semibold">Icon</Text>
              <PaginatedSelect
                options={ICON_KEY_OPTIONS}
                value={ind.icon || null}
                ariaLabel={`Icon for indicator ${index + 1}`}
                placeholder="Choose an icon"
                onChange={(value) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], icon: value ?? "" }; return { ...prev, indicators: next }; })}
              />
            </Stack>
            <Input label="Title" value={ind.title} onChange={(e) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], title: e.target.value }; return { ...prev, indicators: next }; })} />
            <Input label="Description" value={ind.description} onChange={(e) => setTrustIndicatorsBuilder((prev) => { const next = [...prev.indicators]; next[index] = { ...next[index], description: e.target.value }; return { ...prev, indicators: next }; })} />
          </Stack>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setTrustIndicatorsBuilder((prev) => ({ ...prev, indicators: [...prev.indicators, { id: `ti-${Date.now()}`, icon: "verify", title: "", description: "" }] }))}>+ Add indicator</Button>
      </Div>
    );
  }

  function renderCategoriesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Categories Section Builder</Text>
        <Input label="Section title" value={categoriesBuilder.title} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label={LBL_VIEW_MORE} value={categoriesBuilder.viewMoreLabel} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))} placeholder={PH_VIEW_MORE} helperText={HELP_VIEW_MORE} />
        <Input label="Max categories (4–12)" type="number" min={4} max={12} value={String(categoriesBuilder.maxCategories)} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, maxCategories: Math.min(12, Math.max(4, Number(e.target.value) || 4)) }))} />
        <Checkbox checked={categoriesBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(categoriesBuilder.scrollInterval)} onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
        <Checkbox checked={categoriesBuilder.loop} label="Loop carousel" onChange={(e) => setCategoriesBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />
      </Div>
    );
  }

  function renderBrandsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Brands Section Builder</Text>
        <Input label="Section title" value={brandsBuilder.title} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, title: e.target.value }))} />
        <Input label={LBL_VIEW_MORE} value={brandsBuilder.viewMoreLabel} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))} placeholder={PH_VIEW_MORE} helperText={HELP_VIEW_MORE} />
        <Input label="Subtitle" value={brandsBuilder.subtitle} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))} />
        <Input label="Max brands" type="number" min={1} max={30} value={String(brandsBuilder.maxBrands)} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, maxBrands: Math.max(1, Number(e.target.value) || 1) }))} />
        <Checkbox checked={brandsBuilder.autoScroll} label="Auto-scroll" onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))} />
        <Input label={LBL_SCROLL_INTERVAL} type="number" min={1000} step={500} value={String(brandsBuilder.scrollInterval)} onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, scrollInterval: Math.max(1000, Number(e.target.value) || 1000) }))} />
        <Checkbox checked={brandsBuilder.loop} label="Loop carousel" onChange={(e) => setBrandsBuilder((prev) => ({ ...prev, loop: e.target.checked }))} />
      </Div>
    );
  }

  function renderCarouselBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Carousel Section Builder
        </Text>

        <Input
          label="Section title"
          value={carouselBuilder.title}
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Hero Carousel"
        />

        <Select
          label="Slide height"
          value={carouselBuilder.height}
          onValueChange={(value) =>
            setCarouselBuilder((prev) => ({ ...prev, height: value as CarouselBuilderState["height"] }))
          }
          options={[
            { label: "Viewport (100vh)", value: "viewport" },
            { label: "Tall (80vh)", value: "tall" },
            { label: "Medium (60vh)", value: "medium" },
          ]}
        />

        <Input
          label="Default autoplay delay (ms)"
          type="number"
          min={1000}
          step={500}
          value={String(carouselBuilder.defaultAutoplayDelayMs)}
          onChange={(e) =>
            setCarouselBuilder((prev) => ({
              ...prev,
              defaultAutoplayDelayMs: Math.max(1000, Number(e.target.value) || 5000),
            }))
          }
        />

        <Checkbox
          checked={carouselBuilder.pauseOnHover}
          label="Pause on hover"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, pauseOnHover: e.target.checked }))}
        />

        <Checkbox
          checked={carouselBuilder.showDots}
          label="Show navigation dots"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, showDots: e.target.checked }))}
        />

        <Checkbox
          checked={carouselBuilder.showArrows}
          label="Show prev/next arrows"
          onChange={(e) => setCarouselBuilder((prev) => ({ ...prev, showArrows: e.target.checked }))}
        />
      </Div>
    );
  }

  function renderCustomCardsBuilder(): React.ReactNode {
    function addCard() {
      setCustomCardsBuilder((prev) => ({
        ...prev,
        cards: [
          ...prev.cards,
          {
            id: `card-${prev.cards.length + 1}`,
            image: "",
            imageAlt: "",
            eyebrow: "",
            title: "",
            body: "",
            link: "",
            backgroundColor: "",
            textColor: "",
            borderRadius: "md",
            shadowLevel: "sm",
          },
        ],
      }));
    }

    function removeCard(index: number) {
      setCustomCardsBuilder((prev) => ({
        ...prev,
        cards: prev.cards.filter((_, i) => i !== index),
      }));
    }

    function updateCard(index: number, patch: Partial<CustomCardsCardBuilderEntry>) {
      setCustomCardsBuilder((prev) => {
        const next = [...prev.cards];
        next[index] = { ...next[index], ...patch };
        return { ...prev, cards: next };
      });
    }

    function renderCardFields(card: CustomCardsCardBuilderEntry, index: number): React.ReactNode {
      return (
        <Stack
          key={`custom-card-${index}`} rounded="md" padding="sm" border="default" gap="3">
          <Row align="center" justify="between">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Card {index + 1}
            </Text>
            <Button type="button" variant="outline" size="sm" onClick={() => removeCard(index)}>
              Remove
            </Button>
          </Row>
          <Input label="ID / slug" value={card.id} onChange={(e) => updateCard(index, { id: e.target.value })} placeholder="card-1" />
          <Input label="Image URL" value={card.image} onChange={(e) => updateCard(index, { image: e.target.value })} placeholder="https://..." />
          <Input label="Image alt text" value={card.imageAlt} onChange={(e) => updateCard(index, { imageAlt: e.target.value })} />
          <Input label="Eyebrow (small label above title)" value={card.eyebrow} onChange={(e) => updateCard(index, { eyebrow: e.target.value })} />
          <Input label="Title" value={card.title} onChange={(e) => updateCard(index, { title: e.target.value })} />
          <Input label="Body / description" value={card.body} onChange={(e) => updateCard(index, { body: e.target.value })} />
          <Input label="Link (href)" value={card.link} onChange={(e) => updateCard(index, { link: e.target.value })} placeholder="/categories/..." />
          <Input label="Background colour" value={card.backgroundColor} onChange={(e) => updateCard(index, { backgroundColor: e.target.value })} placeholder="#ffffff or var(--appkit-color-primary)" /> {/* audit-hex-tokens-ok: descriptive placeholder showing valid color input format */}
          <Input label="Text colour" value={card.textColor} onChange={(e) => updateCard(index, { textColor: e.target.value })} placeholder="#000000" /> {/* audit-hex-tokens-ok: descriptive placeholder showing valid color input format */}
          <Select
            label="Border radius"
            value={card.borderRadius}
            onValueChange={(value) => updateCard(index, { borderRadius: value as CustomCardsCardBuilderEntry["borderRadius"] })}
            options={[
              { label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" },
              { label: "Large", value: "lg" }, { label: "XL", value: "xl" }, { label: "Full (pill)", value: "full" },
            ]}
          />
          <Select
            label="Shadow level"
            value={card.shadowLevel}
            onValueChange={(value) => updateCard(index, { shadowLevel: value as CustomCardsCardBuilderEntry["shadowLevel"] })}
            options={[
              { label: "None", value: "none" }, { label: "Small", value: "sm" },
              { label: "Medium", value: "md" }, { label: "Large", value: "lg" },
            ]}
          />
        </Stack>
      );
    }

    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Custom Cards Builder
        </Text>

        <Input
          label="Section title"
          value={customCardsBuilder.title}
          onChange={(e) => setCustomCardsBuilder((prev) => ({ ...prev, title: e.target.value }))}
        />

        <Select
          label="Layout"
          value={customCardsBuilder.layout}
          onValueChange={(value) =>
            setCustomCardsBuilder((prev) => ({ ...prev, layout: value as CustomCardsBuilderState["layout"] }))
          }
          options={[
            { label: "Grid", value: "grid" },
            { label: "Row (horizontal scroll)", value: "row" },
            { label: "Masonry", value: "masonry" },
          ]}
        />

        <Select
          label="Columns"
          value={String(customCardsBuilder.columns)}
          onValueChange={(value) =>
            setCustomCardsBuilder((prev) => ({ ...prev, columns: Number(value) as CustomCardsBuilderState["columns"] }))
          }
          options={[
            { label: "1 column", value: "1" },
            { label: "2 columns", value: "2" },
            { label: "3 columns", value: "3" },
            { label: "4 columns", value: "4" },
          ]}
        />

        <Checkbox
          checked={customCardsBuilder.autoScroll}
          label="Auto-scroll"
          onChange={(e) => setCustomCardsBuilder((prev) => ({ ...prev, autoScroll: e.target.checked }))}
        />

        <Input
          label={LBL_SCROLL_INTERVAL}
          type="number"
          min={1000}
          step={500}
          value={String(customCardsBuilder.scrollIntervalMs)}
          onChange={(e) =>
            setCustomCardsBuilder((prev) => ({
              ...prev,
              scrollIntervalMs: Math.max(1000, Number(e.target.value) || 4000),
            }))
          }
        />

        <Checkbox
          checked={customCardsBuilder.loop}
          label="Loop carousel"
          onChange={(e) => setCustomCardsBuilder((prev) => ({ ...prev, loop: e.target.checked }))}
        />

        <Stack gap="3">
          <Row align="center" justify="between">
            <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
              Cards ({customCardsBuilder.cards.length})
            </Text>
            <Button type="button" variant="outline" size="sm" onClick={addCard}>
              Add card
            </Button>
          </Row>

          {customCardsBuilder.cards.map((card, index) => renderCardFields(card, index))}

          {customCardsBuilder.cards.length === 0 ? (
            <Text size="sm" color="muted">No cards added yet. Click "Add card" to start.</Text>
          ) : null}
        </Stack>
      </Div>
    );
  }

  function renderGoogleReviewsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Google Reviews Builder
        </Text>

        <Input
          label="Google Place ID"
          value={googleReviewsBuilder.placeId}
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, placeId: e.target.value }))}
          placeholder="ChIJ..."
          helperText="Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id"
        />

        <Input
          label="Max reviews to show"
          type="number"
          min={1}
          max={20}
          value={String(googleReviewsBuilder.maxReviews)}
          onChange={(e) =>
            setGoogleReviewsBuilder((prev) => ({
              ...prev,
              maxReviews: Math.max(1, Math.min(20, Number(e.target.value) || 6)),
            }))
          }
        />

        <Select
          label="Minimum star rating to show"
          value={String(googleReviewsBuilder.minRating)}
          onValueChange={(value) =>
            setGoogleReviewsBuilder((prev) => ({ ...prev, minRating: Number(value) }))
          }
          options={[
            { label: "All ratings (0★+)", value: "0" },
            { label: "3★ and above", value: "3" },
            { label: "4★ and above", value: "4" },
            { label: "5★ only", value: "5" },
          ]}
        />

        <Select
          label="Layout"
          value={googleReviewsBuilder.layout}
          onValueChange={(value) =>
            setGoogleReviewsBuilder((prev) => ({ ...prev, layout: value as GoogleReviewsBuilderState["layout"] }))
          }
          options={[
            { label: "Grid", value: "grid" },
            { label: "Carousel", value: "carousel" },
          ]}
        />

        <Checkbox
          checked={googleReviewsBuilder.showRating}
          label="Show star rating on each review"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, showRating: e.target.checked }))}
        />

        <Checkbox
          checked={googleReviewsBuilder.showDate}
          label="Show review date"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, showDate: e.target.checked }))}
        />

        <Checkbox
          checked={googleReviewsBuilder.linkToGoogleMaps}
          label="Link to Google Maps listing"
          onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, linkToGoogleMaps: e.target.checked }))}
        />

        {googleReviewsBuilder.linkToGoogleMaps ? (
          <Input
            label="Google Maps URL"
            value={googleReviewsBuilder.googleMapsUrl}
            onChange={(e) => setGoogleReviewsBuilder((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
            placeholder="https://maps.google.com/..."
          />
        ) : null}
      </Div>
    );
  }

  function renderFeaturedBundlesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Featured Bundles Builder
        </Text>
        <Input
          label="Section title"
          value={featuredBundlesBuilder.title}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Curated Bundles"
        />
        <Input
          label={LBL_VIEW_MORE}
          value={featuredBundlesBuilder.viewMoreLabel}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, viewMoreLabel: e.target.value }))}
          placeholder={PH_VIEW_MORE}
          helperText={HELP_VIEW_MORE}
        />
        <Input
          label="Subtitle"
          value={featuredBundlesBuilder.subtitle}
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Everything you need in one deal"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={12}
          value={String(featuredBundlesBuilder.maxItems)}
          onChange={(e) =>
            setFeaturedBundlesBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(12, Number(e.target.value) || 8)),
            }))
          }
        />
        {/* "Filter by store", "Filter by category" and "Sort by" removed.
            Bundles arrive pre-fetched from listFeaturedBundles(8), which takes
            neither a scope nor a sort, so all three controls wrote config
            nothing read. Per-section fetching would breach the SSR
            round-trip budget (Rule #6). */}
        <Checkbox
          checked={featuredBundlesBuilder.showSavingsBadge}
          label="Show savings % badge on each bundle"
          onChange={(e) => setFeaturedBundlesBuilder((prev) => ({ ...prev, showSavingsBadge: e.target.checked }))}
        />
      </Div>
    );
  }

  function renderPrizeDrawsBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Prize Draws Builder
        </Text>
        <Input
          label="Section title"
          value={prizeDrawsBuilder.title}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Prize Draws"
        />
        <Input
          label="Subtitle"
          value={prizeDrawsBuilder.subtitle}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Enter for a chance to win rare collectibles"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={12}
          value={String(prizeDrawsBuilder.maxItems)}
          onChange={(e) =>
            setPrizeDrawsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(12, Number(e.target.value) || 6)),
            }))
          }
        />
        <Input
          label="Filter by store (storeId)"
          value={prizeDrawsBuilder.storeId}
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, storeId: e.target.value }))}
          placeholder="Leave blank for all stores"
        />
        <Select
          label="Reveal status"
          value={prizeDrawsBuilder.revealStatus}
          onValueChange={(value) =>
            setPrizeDrawsBuilder((prev) => ({ ...prev, revealStatus: value as PrizeDrawsBuilderState["revealStatus"] }))
          }
          options={[
            { label: "All (pending + open)", value: "all" },
            { label: "Pending only", value: "pending" },
            { label: "Open only", value: "open" },
          ]}
        />
        <Checkbox
          checked={prizeDrawsBuilder.showCountdown}
          label="Show countdown to reveal window"
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, showCountdown: e.target.checked }))}
        />
        <Checkbox
          checked={prizeDrawsBuilder.showEntriesRemaining}
          label="Show entries-remaining bar"
          onChange={(e) => setPrizeDrawsBuilder((prev) => ({ ...prev, showEntriesRemaining: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          Prize-draw listing type is added with the prize-draw feature; until then this section renders an empty state.
        </Text>
      </Div>
    );
  }

  function renderEventRafflesBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Event Raffles Builder
        </Text>
        <Input
          label="Section title"
          value={eventRafflesBuilder.title}
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Live Raffles & Spin Wheels"
        />
        <Input
          label="Subtitle"
          value={eventRafflesBuilder.subtitle}
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Participate in community events and win prizes"
        />
        <Input
          label="Max items"
          type="number"
          min={1}
          max={8}
          value={String(eventRafflesBuilder.maxItems)}
          onChange={(e) =>
            setEventRafflesBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(1, Math.min(8, Number(e.target.value) || 4)),
            }))
          }
        />
        <Select
          label="Raffle type"
          value={eventRafflesBuilder.raffleType}
          onValueChange={(value) =>
            setEventRafflesBuilder((prev) => ({ ...prev, raffleType: value as EventRafflesBuilderState["raffleType"] }))
          }
          options={[
            { label: "All raffles", value: "all" },
            { label: "Raffle only", value: "raffle" },
            { label: "Spin wheel only", value: "spin_wheel" },
          ]}
        />
        <Checkbox
          checked={eventRafflesBuilder.showEntryCount}
          label="Show entry count on each event"
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, showEntryCount: e.target.checked }))}
        />
        <Checkbox
          checked={eventRafflesBuilder.showCountdown}
          label="Show countdown to event start/end"
          onChange={(e) => setEventRafflesBuilder((prev) => ({ ...prev, showCountdown: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          The hasRaffle flag on events ships with the raffle feature; until then this section renders an empty state.
        </Text>
      </Div>
    );
  }

  const COLLECTION_CARD_TYPE_OPTIONS: { label: string; value: CollectionCardEntryType }[] = [
    { label: "Products", value: "products" },
    { label: "Auctions", value: "auctions" },
    { label: "Pre-orders", value: "pre-orders" },
    { label: "Stores", value: "stores" },
    { label: "Events", value: "events" },
    { label: "Blog posts", value: "blog-posts" },
    { label: "Reviews", value: "reviews" },
    { label: "Brands", value: "brands" },
    { label: "Categories", value: "categories" },
  ];

  function renderCollectionEntry(entry: { type: CollectionCardEntryType; label: string; limit: number }, idx: number): React.ReactNode {
    return (
      <Stack
        key={`collection-${idx}`} rounded="lg" padding="sm" border="default" gap="sm">
        <Select
          label={`Collection ${idx + 1} type`}
          value={entry.type}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) =>
                i === idx ? { ...c, type: value as CollectionCardEntryType } : c,
              ),
            }))
          }
          options={COLLECTION_CARD_TYPE_OPTIONS}
        />
        <Input
          label="Display label (optional)"
          value={entry.label}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c)),
            }))
          }
          placeholder="Leave blank to use the type name"
        />
        <Input
          label="Items in this collection"
          type="number"
          min={1}
          max={20}
          value={String(entry.limit)}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.map((c, i) =>
                i === idx ? { ...c, limit: Math.max(1, Math.min(20, Number(e.target.value) || 4)) } : c,
              ),
            }))
          }
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              collections: prev.collections.filter((_, i) => i !== idx),
            }))
          }
        >
          Remove
        </Button>
      </Stack>
    );
  }

  function renderCollectionCardsBuilder(): React.ReactNode {
    const entries = collectionCardsBuilder.collections;
    const canAdd = entries.length < 3;
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">
          Collection Cards Builder
        </Text>
        <Input
          label="Section title"
          value={collectionCardsBuilder.title}
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Featured Collections"
        />
        <Input
          label="Subtitle"
          value={collectionCardsBuilder.subtitle}
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Hand-picked across the marketplace"
        />
        <Select
          label="Layout"
          value={collectionCardsBuilder.layout}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({ ...prev, layout: value as CollectionCardsBuilderState["layout"] }))
          }
          options={[
            { label: "Carousel", value: "carousel" },
            { label: "Grid", value: "grid" },
            { label: "Mixed row", value: "mixed-row" },
          ]}
        />
        <Select
          label="Items per row"
          value={String(collectionCardsBuilder.itemsPerRow)}
          onValueChange={(value) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              itemsPerRow: Number(value) as CollectionCardsBuilderState["itemsPerRow"],
            }))
          }
          options={[
            { label: "3", value: "3" },
            { label: "4", value: "4" },
            { label: "5", value: "5" },
          ]}
        />
        <Input
          label="Max total items"
          type="number"
          min={4}
          max={20}
          value={String(collectionCardsBuilder.maxItems)}
          onChange={(e) =>
            setCollectionCardsBuilder((prev) => ({
              ...prev,
              maxItems: Math.max(4, Math.min(20, Number(e.target.value) || 12)),
            }))
          }
        />
        <Checkbox
          checked={collectionCardsBuilder.showCollectionTabs}
          label="Show collection tabs (filter chips)"
          onChange={(e) => setCollectionCardsBuilder((prev) => ({ ...prev, showCollectionTabs: e.target.checked }))}
        />

        <Stack gap="3">
          <Text size="sm" weight="semibold" color="primary">
            Collections ({entries.length}/3)
          </Text>
          {entries.map((entry, idx) => renderCollectionEntry(entry, idx))}
          {canAdd ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setCollectionCardsBuilder((prev) => ({
                  ...prev,
                  collections: [
                    ...prev.collections,
                    { type: "products", label: "", limit: 4, storeId: "", categorySlug: "", brandSlug: "", featuredOnly: false },
                  ],
                }))
              }
            >
              + Add collection
            </Button>
          ) : (
            <Text size="xs" color="muted">
              Maximum of 3 collections per section.
            </Text>
          )}
        </Stack>

        <Text size="xs" color="muted">
          Data fetching wires into the per-resource repositories — the section renders an
          empty state until the wiring lands.
        </Text>
      </Div>
    );
  }

  function renderSocialFeedBuilder(): React.ReactNode {
    return (
      <Div className={CLS_SECTION_PANEL}>
        <Text size="sm" weight="semibold" color="primary">Social Feed Builder</Text>
        <Input
          label="Section title"
          value={socialFeedBuilder.title}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="LetItRip on Instagram"
        />
        <Input
          label="Subtitle"
          value={socialFeedBuilder.subtitle}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Follow us for daily collection showcases"
        />
        <Select
          label="Platform"
          value={socialFeedBuilder.platform}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, platform: v as SocialFeedBuilderState["platform"] }))}
          options={[
            { label: "Instagram", value: "instagram" },
            { label: "Facebook", value: "facebook" },
            { label: "TikTok", value: "tiktok" },
            { label: "DeviantArt", value: "deviantart" },
          ]}
        />
        <Input
          label="Account handle / username"
          value={socialFeedBuilder.handle}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, handle: e.target.value }))}
          placeholder="letitrip"
        />
        <Select
          label="Post type"
          value={socialFeedBuilder.postType}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, postType: v as SocialFeedBuilderState["postType"] }))}
          options={[
            { label: "All", value: "all" },
            { label: "Images only", value: "images" },
            { label: "Videos only", value: "videos" },
            { label: "Reels only", value: "reels" },
          ]}
        />
        <Input
          label="Post count (1–12)"
          type="number"
          min={1}
          max={12}
          value={String(socialFeedBuilder.count)}
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, count: Math.min(12, Math.max(1, Number(e.target.value) || 9)) }))}
        />
        <Select
          label="Layout"
          value={socialFeedBuilder.layout}
          onValueChange={(v) => setSocialFeedBuilder((prev) => ({ ...prev, layout: v as SocialFeedBuilderState["layout"] }))}
          options={[
            { label: "Grid", value: "grid" },
            { label: "Masonry", value: "masonry" },
            { label: "Carousel (horizontal scroll)", value: "carousel" },
          ]}
        />
        <Checkbox
          checked={socialFeedBuilder.showCaption}
          label="Show caption on hover"
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, showCaption: e.target.checked }))}
        />
        <Checkbox
          checked={socialFeedBuilder.showStats}
          label="Show like / view / comment counts on hover"
          onChange={(e) => setSocialFeedBuilder((prev) => ({ ...prev, showStats: e.target.checked }))}
        />
        <Text size="xs" color="muted">
          Social platform credentials (access tokens, client IDs) must be set in ⑧ Integrations before this section will load live posts.
        </Text>
      </Div>
    );
  }

  function renderTypedBuilder(): React.ReactNode {
    switch (sectionType) {
      case "products": return renderProductsBuilder();
      case "auctions": return renderAuctionsBuilder();
      case "stats": return renderStatsBuilder();
      case "pre-orders": return renderPreOrdersBuilder();
      case "stores": return renderStoresBuilder();
      case "events": return renderEventsBuilder();
      case "social-feed": return renderSocialFeedBuilder();
      case "welcome": return renderWelcomeBuilder();
      case "trust-indicators": return renderTrustIndicatorsBuilder();
      case "categories": return renderCategoriesBuilder();
      case "brands": return renderBrandsBuilder();
      case "banner": return renderBannerBuilder();
      case "features": return renderFeaturesBuilder();
      case "reviews": return renderReviewsBuilder();
      case "whatsapp-community": return renderWhatsAppBuilder();
      case "faq": return renderFAQBuilder();
      case "blog-articles": return renderBlogBuilder();
      case "newsletter": return renderNewsletterBuilder();
      case "carousel": return renderCarouselBuilder();
      case "custom-cards": return renderCustomCardsBuilder();
      case "google-reviews": return renderGoogleReviewsBuilder();
      case "featured-bundles": return renderFeaturedBundlesBuilder();
      case "prize-draws": return renderPrizeDrawsBuilder();
      case "event-raffles": return renderEventRafflesBuilder();
      case "collection-cards": return renderCollectionCardsBuilder();
      default: return null;
    }
  }

  /**
   * The modal's fields, as three hand-written sections.
   *
   * The envelope (type / order / enabled) could derive from
   * `homepageSectionFormSchema`, but the builder cannot: it is 22 discriminated
   * shapes rendered by `renderTypedBuilder()`, and `configJson` is annotated
   * `kind: "list"`, which has no control. So all three are hand-written and the
   * schema stays what VALIDATES rather than what renders — the
   * `AdminCategoryEditorView` arrangement.
   *
   * The builder section is `when`-gated on the chosen type having one, which is
   * what makes it disappear for a raw-JSON section type instead of rendering an
   * empty panel.
   */
  const modalSections = React.useMemo<SectionDef<SectionModalDraft>[]>(() => [
    {
      id: "basics",
      label: "Section",
      required: true,
      fields: ["sectionType", "order", "enabled"],
      render: () => (
        <Stack gap="md">
          {/*
            * 🛑 There is deliberately NO "Mode" select and NO "Section"
            * select here any more.
            *
            * They were how this editor used to choose its record: open the
            * modal from a toolbar button, switch Mode from Create to Edit,
            * then find the section again in a dropdown by `type (#order)` —
            * while the row you had just clicked past played no part. Deleting
            * them IS the fix. The row chose the record; a control to re-choose
            * it is a second, contradictable source of truth sitting directly
            * above the fields it would silently repoint.
            */}
          <Select
            label="Section type"
            value={sectionType}
            onValueChange={(value) => setSectionType(value as SectionType)}
            options={SECTION_TYPE_OPTIONS.map((type) => ({
              label: type,
              value: type,
            }))}
            disabled={!isCreate}
            helperText={
              isCreate
                ? undefined
                : "A section's type is fixed — its config has a different shape per type."
            }
          />
          {/*
            * A WARNING, never a block.
            *
            * `createHomepageSectionId` suffixes a timestamp, so creating a
            * second section of a type succeeds and the surface renders BOTH.
            * Sometimes that is what the admin wants — two `custom-cards`
            * strips in different places is a real layout. A second
            * `newsletter` is not. The schema expresses no uniqueness rule, so
            * enforcing one here would be policy with nothing behind it; the
            * honest move is to say what will happen and let them decide.
            */}
          {isCreate && duplicateOfType && (
            <Text size="xs" color="warning">
              A {sectionType} section already exists on this surface (#{duplicateOfType.order}).
              Every enabled section is rendered, so a second one shows this type twice.
            </Text>
          )}
          {/*
            * D1 — START FROM A TEMPLATE.
            *
            * 🛑 CREATE MODE ONLY, and only when this type actually has one.
            * In edit mode it would silently replace an admin's authored
            * section with a preset, which is the all-or-nothing failure that
            * ruled out whole-page layouts in the first place.
            *
            * It sets the builder and nothing else, so drag-drop reorder, the
            * 30-deep undo stack and revert-to-server all keep working on the
            * result — a template is `create-with-preset`, not a second
            * rendering path.
            */}
          {isCreate && templatesForType(sectionType).length > 0 && (
            <>
              <Select
                label="Start from a template"
                value={selectedTemplateId}
                onValueChange={(value) => {
                  setSelectedTemplateId(value);
                  // "" means the type's own defaults — `applyBuilderFor` takes
                  // no template and behaves exactly as the reset effect does.
                  applyBuilderFor(sectionType, templateById(value));
                }}
                options={[
                  { label: "Blank — this type's defaults", value: "" },
                  ...templatesForType(sectionType).map((t) => ({ label: t.label, value: t.id })),
                ]}
              />
              {(() => {
                const t = templateById(selectedTemplateId);
                if (!t) return null;
                const p = profileById(t.sourceProfileId);
                return (
                  <Div surface="muted" padding="sm" rounded="md">
                    {t.notes && <Text size="xs" color="muted">{t.notes}</Text>}
                    {p && (
                      <Text size="xs" color="faint">
                        {p.label} · {p.platform} · {p.measured.products.toLocaleString()} products ·{" "}
                        {Math.round(p.measured.soldOutShare * 100)}% sold out
                        {p.measured.uniqueInternalLinks ? ` · ${p.measured.uniqueInternalLinks} internal links` : ""}
                      </Text>
                    )}
                  </Div>
                );
              })()}
            </>
          )}
          {/*
            * The placeholder differs by mode because the empty value MEANS
            * something different in each. On create it is "auto-place after
            * the last section"; on edit it is "leave the order as it is" —
            * the create wording read as an instruction to re-auto-place.
            */}
          <Input
            label="Order"
            type="number"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
            placeholder={isCreate ? "Leave empty to auto-place" : "Leave empty to keep the current order"}
            helperText={
              isCreate
                ? undefined
                : "Reorder sections in the toolbar is the easier way to move several at once."
            }
          />
          <Select
            label="Enabled"
            value={enabled ? "true" : "false"}
            onValueChange={(value) => setEnabled(value === "true")}
            options={[
              { label: "Enabled", value: "true" },
              { label: "Disabled", value: "false" },
            ]}
          />
        </Stack>
      ),
    },
    {
      id: "builder",
      label: "Content",
      when: () => isTypedBuilder,
      render: () => <>{renderTypedBuilder()}</>,
    },
    {
      id: "config",
      label: isTypedBuilder ? "Generated config" : "Section config (JSON)",
      fields: ["configJson"],
      render: () => (
        <Textarea
          label={isTypedBuilder ? "Generated config (JSON preview)" : "Section config (JSON)"}
          value={configJson}
          onChange={(event) => setRawConfigJson(event.target.value)}
          rows={10}
          readOnly={isTypedBuilder}
          helperText={
            isTypedBuilder
              ? "Generated from the typed controls above. It shows only the keys those controls know about — any other key already stored on this section is preserved on save and simply isn't shown here."
              : "Provide section config JSON for this section type."
          }
        />
      ),
    },
  /*
   * `selectedTemplateId` and `applyBuilderFor` are read by the template
   * picker and were both missing from this list. The notes panel under the
   * picker refreshed anyway — but only by ACCIDENT, because picking a
   * template also mutates builder state, which changes `configJson`, which
   * is in the list. Naming them makes the panel's correctness depend on the
   * thing it actually reads.
   */
  ], [
    isCreate, sectionType, order, enabled, duplicateOfType, selectedTemplateId,
    applyBuilderFor, isTypedBuilder, configJson, renderTypedBuilder,
  ]);

  /** What the nav and the error summary key on. */
  const draft = React.useMemo<SectionModalDraft>(
    () => ({ sectionType, order, enabled, configJson }),
    [sectionType, order, enabled, configJson],
  );
  const nav = useSectionFormNav(modalSections, draft, { scope: "admin:homepage-sections" });
  const form = useFormShellState(homepageSectionFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });


  /*
   * A deep link (`?panel=edit&id=…`) can name a section that no longer
   * exists — the delete confirm may have been accepted in another tab while
   * this URL sat in history. Say so, rather than rendering a form bound to
   * nothing and letting Save create a section the admin meant to edit.
   */
  if (sectionId && !section && !isSectionsLoading) {
    return (
      <Stack gap="md" padding="md">
        <Text size="sm" color="muted">
          This section no longer exists — it may have been deleted.
        </Text>
        <Row>
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Close
          </Button>
        </Row>
      </Stack>
    );
  }

  return (
    <FormShellContext.Provider value={form.shellCtx}>
      <FormErrorSummary />
      <SectionForm<SectionModalDraft>
        sections={modalSections}
        values={draft}
        /*
         * Each control writes through its own setter — `setSectionType`,
         * `setOrder`, `setEnabled` — and several do more than store a value.
         * So this routes nothing generically.
         */
        onChange={() => undefined}
        onSubmit={() => {
          form.clearErrors();
          const parsed = homepageSectionFormSchema.safeParse(draft);
          if (!parsed.success) {
            applyZodIssues(parsed.error.issues, form.setFieldError);
            return;
          }
          saveSection.mutate();
        }}
        onValidationChange={() => form.validate(draft)}
        schema={homepageSectionFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        submitLabel={
          saveSection.isPending
            ? "Saving..."
            : isCreate
              ? "Create section"
              : "Update section"
        }
        cancelLabel="Cancel"
        onCancel={onDone}
        isLoading={saveSection.isPending}
      />
    </FormShellContext.Provider>
  );
}

// ─── Listing ─────────────────────────────────────────────────────────────────

interface AdminSectionsResponse {
  items?: JsonArray;
  total?: number;
}

interface SectionRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  updatedAt: string;
  /** Read by the Status column and the toggle, so badge and switch share a source. */
  enabled: boolean;
  order: number;
}

/*
 * 🛑 Not registered in `filter-tabs.ts`. `audit-filter-tab-enums` cross-checks
 * chip ids against a backing STRING enum, and `enabled` is a boolean — the
 * same out-of-scope category as ADMIN_CART_OWNERSHIP_TABS.
 */
const SECTION_ENABLED_TABS = [
  ALL_TAB,
  { id: "true", label: "Enabled" },
  { id: "false", label: "Disabled" },
] as const;

/** Reorder renumbers 1..N GLOBALLY — see the full-set query in the component. */
function normalizeOrder(items: Array<{ id: string; type: string; order: number }>) {
  return items.map((item, index) => ({ ...item, order: index + 1 }));
}

function cloneReorderItems(items: ReorderItem[]): ReorderItem[] {
  return items.map((item) => ({ ...item }));
}

function isSameReorder(a: ReorderItem[], b: ReorderItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return Boolean(other) && item.id === other.id && item.order === other.order;
  });
}

/**
 * The homepage/surface sections listing.
 *
 * Was a bare `<DataTable rows>` with no `columns`, no `renderRowActions`, no
 * `onRowClick` and no `rowHrefTemplate` — so `isInteractive` was false and
 * every row was inert, including the blank avatar circles that come from
 * `buildDefaultColumns(undefined)`. The only way to edit a section was a
 * toolbar button, a "Mode" dropdown, and a second dropdown to re-find the row
 * you had just clicked past.
 */
export function AdminSectionsView({ children }: AdminSectionsViewProps) {
  const hasChildren = React.Children.count(children) > 0;
  const queryClient = useQueryClient();
  const toast = useToast();

  const [reorderOpen, setReorderOpen] = React.useState(false);
  const [reorderDraft, setReorderDraft] = React.useState<ReorderItem[]>([]);
  const [reorderServerSnapshot, setReorderServerSnapshot] = React.useState<ReorderItem[]>([]);
  const [reorderUndoStack, setReorderUndoStack] = React.useState<ReorderItem[][]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  /**
   * Optimistic `enabled` per row, keyed by id.
   *
   * 🛑 Rollback DELETES the key; it never writes back a captured previous
   * value. Capturing `overrides[id]` yields `undefined` on the first toggle of
   * a row, and writing that back renders as `false` — so a failed toggle of a
   * row the server holds as `true` would leave the UI asserting the opposite.
   * The key is also deleted on SUCCESS, after the refetch settles, or a stale
   * override pins the row and masks every later server-side change to it.
   */
  const [enabledOverrides, setEnabledOverrides] = React.useState<Record<string, boolean>>({});

  /*
   * The reorder panel needs EVERY section, not the current page.
   * `normalizeOrder` assigns `index + 1` globally, so feeding it the
   * DataListingView rows — which are paginated, filtered and sortable — would
   * renumber a partial set 1..N and PATCH wrong orders onto real rows.
   */
  const { sections, total, isLoading } = useAdminSectionsListing({ page: 1, pageSize: 50 });
  const isReorderTruncated = total > sections.length;

  const sectionOrderMap = React.useMemo(
    () => new Map(sections.map((section) => [section.id, section.order])),
    [sections],
  );

  React.useEffect(() => {
    const sorted = [...sections]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({ id: section.id, type: section.type, order: section.order }));
    setReorderDraft(normalizeOrder(sorted));
    /*
     * 🛑 The RAW server orders, not the normalized ones.
     *
     * Orders can legitimately have a gap — a delete leaves one — and
     * snapshotting the normalized list claims the server holds 1..N when it
     * does not. "Reset to server" would then reset to an order the server
     * never had, and `hasReorderChanges` (which compares against the real
     * `sectionOrderMap`) could not agree with it. Unreachable while every row
     * was 1..N; reachable the moment delete shipped.
     */
    setReorderServerSnapshot(sorted);
    setReorderUndoStack([]);
  }, [sections]);

  const clearOverride = React.useCallback((id: string) => {
    setEnabledOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const invalidateSections = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "sections", "listing"] });
    // Public-facing useHomepageSections() reads under a separate key.
    await queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
  }, [queryClient]);

  const toggleEnabled = React.useCallback(
    async (id: string, next: boolean) => {
      setEnabledOverrides((prev) => ({ ...prev, [id]: next }));
      try {
        /*
         * `config` is deliberately omitted: HomepageSectionsRepository.update
         * short-circuits its merge READ when `data.config` is absent, so an
         * enable/disable costs one write and no read.
         */
        await apiClient.patch(`${ADMIN_ENDPOINTS.SECTIONS}/${id}`, { enabled: next });
        await invalidateSections();
        clearOverride(id);
        toast.showToast(next ? "Section enabled." : "Section disabled.", "success");
      } catch (err) {
        const normalized = normalizeError(err);
        clearOverride(id);
        toast.showToast(normalized.message || "Failed to update section.", "error");
      }
    },
    [clearOverride, invalidateSections, toast],
  );

  const deleteSection = useApiMutation({
    errorMessage: "Failed to delete section.",
    mutationFn: async (id: string) => {
      await apiClient.delete(`${ADMIN_ENDPOINTS.SECTIONS}/${id}`);
    },
    onSuccess: async () => {
      await invalidateSections();
      toast.showToast("Section deleted.", "success");
    },
  });

  const reorderSections = useApiMutation({
    errorMessage: "Failed to reorder sections.",
    mutationFn: async () => {
      await Promise.all(
        reorderDraft.map((item) =>
          apiClient.patch(`${ADMIN_ENDPOINTS.SECTIONS}/${item.id}`, { order: item.order }),
        ),
      );
    },
    onSuccess: async () => {
      await invalidateSections();
      setReorderServerSnapshot(cloneReorderItems(reorderDraft));
      setReorderUndoStack([]);
      toast.showToast("Section order updated.", "success");
    },
  });

  const pushUndoSnapshot = React.useCallback((snapshot: ReorderItem[]) => {
    setReorderUndoStack((history) => [cloneReorderItems(snapshot), ...history].slice(0, 30));
  }, []);

  const applyReorderChange = React.useCallback(
    (transform: (previous: ReorderItem[]) => ReorderItem[]) => {
      setReorderDraft((prev) => {
        const next = transform(prev);
        if (isSameReorder(prev, next)) return prev;
        pushUndoSnapshot(prev);
        return next;
      });
    },
    [pushUndoSnapshot],
  );

  function moveReorderItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= reorderDraft.length) return;
    applyReorderChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return normalizeOrder(next);
    });
  }

  function updateReorderItemOrder(index: number, nextOrder: number) {
    applyReorderChange((prev) => {
      const clamped = Math.min(Math.max(1, nextOrder), prev.length);
      const sorted = [...prev];
      const [item] = sorted.splice(index, 1);
      sorted.splice(clamped - 1, 0, item);
      return normalizeOrder(sorted);
    });
  }

  function moveItemToIndex(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    applyReorderChange((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return normalizeOrder(next);
    });
  }

  function handleReorderDrop(targetIndex: number) {
    if (dragIndex !== null) moveItemToIndex(dragIndex, targetIndex);
    setDragIndex(null);
  }

  function reindexDraft() {
    applyReorderChange((prev) => normalizeOrder(prev));
  }

  function resetToServerOrder() {
    applyReorderChange(() => cloneReorderItems(reorderServerSnapshot));
  }

  function undoReorderChange() {
    if (reorderUndoStack.length === 0) return;
    const [latest, ...rest] = reorderUndoStack;
    setReorderUndoStack(rest);
    setReorderDraft(cloneReorderItems(latest));
  }

  const hasReorderChanges = reorderDraft.some(
    (item) => sectionOrderMap.get(item.id) !== item.order,
  );
  const canUndoReorderChanges = reorderUndoStack.length > 0;

  const config: ListingViewConfig<AdminSectionsResponse, SectionRow> = {
    portal: "admin",
    title: "Homepage Sections",
    subtitle: "The blocks that make up the homepage, in order.",
    // Search intentionally absent: this endpoint does not read `q`, and the
    // repository's sieveQuery has no text-search concept at all, so the box
    // would accept typing and change nothing — audit-listing-search-capability
    // tracks it.
    emptyLabel: "No sections yet",
    queryKey: ["admin", "sections", "listing"],
    endpoint: ADMIN_ENDPOINTS.SECTIONS,
    pageSize: 50,
    initialView: "table",
    filterKeys: ["enabled"],
    defaultSort: sortBy("order", "ASC"),
    /*
     * 🛑 TWO options, and the omissions are measured rather than lazy.
     *
     * The ONLY composite index on `homepageSections` is (enabled ASC, order
     * ASC). `canFilter`/`canSort` in SIEVE_FIELDS govern whether sievejs
     * BUILDS a clause; the index governs whether Firestore SERVES it:
     *
     *   • "Type A–Z" — `type` is canSort:false and sieve runs with
     *     throwExceptions:false, so the clause is dropped SILENTLY. The
     *     dropdown would change and the list would not (Root Cause #62).
     *   • "-updatedAt" / "-createdAt" — these ARE canSort:true, so they look
     *     safe. They work alone and FAILED_PRECONDITION the moment the
     *     Enabled filter is also active, because no (enabled, updatedAt)
     *     index exists. A sort that breaks only in combination is worse than
     *     one that is absent. Add the index first if either is wanted.
     */
    sortOptions: [
      { value: sortBy("order", "ASC"), label: "Display order" },
      { value: sortBy("order"), label: "Display order (last first)" },
    ],
    mapRows: (response) =>
      toRecordArray(response.items).map((item, index) => {
        const id = toStringValue(item.id, `section-${index}`);
        const type = toStringValue(item.type, "unknown");
        const surface = toStringValue(item.surface, "homepage");
        const enabled = enabledOverrides[id] ?? Boolean(item.enabled);
        return {
          id,
          primary: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " "),
          /*
           * The ID, not "Order: N • Enabled" — both of those are their own
           * columns now, and the id is the only thing that distinguishes two
           * sections of the SAME type, a state the id generator's timestamp
           * suffix makes reachable. `surface` shows only when it is not the
           * default, so a homepage row carries no redundant word.
           */
          secondary: surface === "homepage" ? id : `${id} · ${surface}`,
          status: enabled ? "Active" : "Inactive",
          // Not `new Date(...).toLocaleDateString()`: that yields "Invalid
          // Date" on a Firestore {toDate()} shape.
          updatedAt: toRelativeDate(item.updatedAt ?? item.createdAt),
          enabled,
          order: typeof item.order === "number" ? item.order : 0,
        };
      }),
    getTotal: (response, mappedRows) =>
      typeof response.total === "number" ? response.total : mappedRows.length,
    /*
     * The explicit "true"/"false" test is load-bearing. Anything else yields
     * NO clause, so a hand-typed `?enabled=banana` shows every row — rather
     * than a clause that matches nothing and renders as a confident empty
     * list, which is the shape that reads as an answer.
     */
    buildFilters: (state) =>
      state.enabled === "true" || state.enabled === "false"
        ? sieveFilter("enabled", SIEVE_OP.EQ, state.enabled === "true")
        : undefined,
    renderFilterPanel: ({ pendingFilters, setPendingFilters }) => (
      <FilterChipGroup
        label="Status"
        tabs={SECTION_ENABLED_TABS}
        value={pendingFilters.enabled ?? ""}
        onChange={(id) => setPendingFilters((prev) => ({ ...prev, enabled: id }))}
      />
    ),
    columns: [
      {
        key: "primary",
        header: "Section",
        render: (row) => (
          <Stack gap="none" className="min-w-0">
            <Text weight="medium" color="primary" className="truncate">{row.primary}</Text>
            <Text size="xs" color="muted" family="mono" className="truncate">{row.secondary}</Text>
          </Stack>
        ),
      },
      {
        key: "order",
        header: "Order",
        className: "w-20",
        render: (row) => <Span size="sm" color="muted" numeric>{String(row.order)}</Span>,
      },
      {
        key: "status",
        header: "Status",
        className: "w-28",
        render: (row) => (
          <Badge variant={row.enabled ? "active" : "inactive"} size="xs">
            {row.enabled ? "Enabled" : "Disabled"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        className: "w-32",
        render: (row) => <Span size="sm" color="muted">{row.updatedAt}</Span>,
      },
    ],
    /*
     * 🛑 The toggle lives HERE and not in a column, on purpose.
     *
     * `initialView` only applies to an admin with no saved view preference,
     * and DataListingView suppresses the table entirely below `md` — so a
     * column-only control is invisible to anyone on a phone and to anyone
     * whose stored preference is the card view. `renderRowActions` renders
     * inside an already-click-stopped container in all three renderers (table
     * cell, list card, grid card), so unlike a normal column cell it needs no
     * stopPropagation wrapper of its own.
     *
     * `ariaLabel` carries the record name because a page of 28 switches that
     * all announce "Toggle" names nothing.
     */
    renderRowActions: (row) => (
      <>
        <Toggle
          size="sm"
          checked={row.enabled}
          ariaLabel={
            row.enabled
              ? `${ACTIONS.ADMIN["disable-section"].label} ${row.primary}`
              : `${ACTIONS.ADMIN["enable-section"].label} ${row.primary}`
          }
          onChange={(next) => {
            void toggleEnabled(row.id, next);
          }}
        />
        <QuickEditMenu
          actions={[
            {
              label: ACTIONS.ADMIN["delete-section"].label,
              destructive: true,
              onClick: () => setDeleteTargetId(row.id),
            },
          ]}
        />
      </>
    ),
    primaryAction: {
      label: "Add Section",
      onClick: ({ openCreatePanel }) => openCreatePanel(),
    },
    toolbarExtra: (
      <Button type="button" variant="outline" size="sm" onClick={() => setReorderOpen(true)}>
        Reorder sections
      </Button>
    ),
    /*
     * 🛑 `key` is REQUIRED — see the comment on SectionEditorPanel. Without it,
     * clicking row B's pencil while row A's drawer is open edits B's record
     * with A's values.
     *
     * No `onRowClick`: declaring one would OVERRIDE DataListingView's default,
     * which already opens this editor. `renderEditor` alone is what makes the
     * rows clickable and injects the per-row pencil.
     */
    renderEditor: ({ editId, closePanel }) => (
      <SectionEditorPanel
        key={editId ?? "create"}
        sectionId={editId ?? undefined}
        /*
         * From the parent's own full-set query, NOT from the mapped listing
         * rows: a `?panel=edit&id=…` deep link to a row that is filtered out
         * or on another page must still resolve, and the row shape has
         * already dropped `config`.
         */
        section={editId ? sections.find((s) => s.id === editId) : undefined}
        siblingSections={sections}
        isSectionsLoading={isLoading}
        onDone={closePanel}
      />
    ),
    resolveEditorTitle: ({ isCreate }) =>
      isCreate ? "Add Homepage Section" : "Edit Homepage Section",
  };

  /*
   * Passthrough mode (detail view).
   *
   * 🛑 Still below every hook. The list it guards shrank a lot when the editor
   * moved into its own component — `modalSections`, `draft`, `nav` and `form`
   * all left — but the reason the return sits here is unchanged, and the
   * remaining hooks are no less order-sensitive: a short-circuit above them
   * skips their calls in passthrough mode, so the hook ORDER differs between
   * the two render paths and React reads one hook's state out of another's
   * slot. That bug has now been fixed here twice.
   */
  if (hasChildren) {
    return <>{children}</>;
  }

  return (
    <>
      <DataListingView<AdminSectionsResponse, SectionRow> config={config} />

      {/*
        The reorder panel is a drawer rather than a `renderAboveContent` slot.
        That slot renders between the toolbar and the table, always — and this
        panel shows the FULL set in global order while the table beneath it is
        paginated, filtered and possibly sorted last-first. Two adjacent lists
        of the same records in different sequences, one of them the
        authoritative control for the other's Order column, is an ambiguity
        that does not exist today and that the slot would create.

        🛑 The drawer is a SIBLING of DataListingView, not part of
        `toolbarExtra`: ListingToolbar wraps its extra slot in StickyToolbar,
        whose backdrop-blur establishes a containing block for position:fixed,
        which would trap the drawer under the toolbar's z-index.
      */}
      <SideDrawer
        isOpen={reorderOpen}
        onClose={() => setReorderOpen(false)}
        title="Reorder sections"
        footer={
          <Row align="center" justify="end" gap="sm" wrap>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reindexDraft}
              disabled={reorderSections.isPending || reorderDraft.length === 0}
            >
              Reindex 1..N
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={undoReorderChange}
              disabled={reorderSections.isPending || !canUndoReorderChanges}
            >
              Undo unsaved
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToServerOrder}
              disabled={reorderSections.isPending || !hasReorderChanges}
            >
              Reset to server
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => reorderSections.mutate()}
              disabled={!hasReorderChanges || reorderSections.isPending || isReorderTruncated}
            >
              {reorderSections.isPending ? "Saving order..." : "Save order"}
            </Button>
          </Row>
        }
      >
        <Stack gap="sm">
          {/*
            Saving a TRUNCATED set would renumber it 1..N and PATCH those
            orders onto real rows — the panel reads one page while the orders
            it writes are global. Unreachable at 28 section types; reachable
            via duplicates, which the id generator permits.
          */}
          {isReorderTruncated && (
            <Div textSize="sm" color="error" surface="danger-surface" padding="inline" rounded="xl">
              Showing {sections.length} of {total} sections. Saving a partial set would renumber
              the rest, so Save order is disabled.
            </Div>
          )}
          {reorderDraft.length === 0 ? (
            <Text size="sm" color="muted">No sections to reorder.</Text>
          ) : (
            reorderDraft.map((item, index) => (
              <Div layout="grid" gap="2" align="center"
                key={`reorder-${item.id}`}
                className="grid-cols-[auto_1fr_auto_auto_auto]" rounded="md" padding="xs" border="default"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleReorderDrop(index)}
                onDragEnd={() => setDragIndex(null)}
              >
                <Text size="sm" weight="semibold" color="muted">≡</Text>
                <Text size="sm" color="primary">
                  {item.type} #{item.order}
                </Text>
                <Input
                  type="number"
                  min={1}
                  max={reorderDraft.length}
                  value={String(item.order)}
                  aria-label={`Order for ${item.type}`}
                  onChange={(event) =>
                    updateReorderItemOrder(index, Number(event.target.value) || 1)
                  }
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveReorderItem(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveReorderItem(index, 1)}
                  disabled={index === reorderDraft.length - 1}
                >
                  Down
                </Button>
              </Div>
            ))
          )}
        </Stack>
      </SideDrawer>

      {/*
        Rule #7: every confirmation string comes from the ActionDef, not from
        this view. QuickEditMenu calls `onClick` directly and has no
        confirmation path of its own, so the dialog is rendered here and fed
        from the registry rather than hard-coded the way AdminCarouselView
        does it.
      */}
      {deleteTargetId && (
        <ConfirmDeleteModal
          isOpen
          title={ACTIONS.ADMIN["delete-section"].confirmation?.title}
          message={ACTIONS.ADMIN["delete-section"].confirmation?.body}
          confirmText={ACTIONS.ADMIN["delete-section"].confirmation?.confirmLabel}
          isDeleting={deleteSection.isPending}
          onConfirm={() => {
            deleteSection.mutate(deleteTargetId);
            setDeleteTargetId(null);
          }}
          onClose={() => setDeleteTargetId(null)}
        />
      )}
    </>
  );
}
