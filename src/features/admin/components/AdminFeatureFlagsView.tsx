"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Div, Form, FormActions, Input, Row, Stack, StackedViewShell, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

const __O = {
  hidden: "overflow-hidden",
} as const;

interface FlagData {
  flags: Record<string, unknown>;
  rollouts: Record<string, number>;
}

export interface AdminFeatureFlagsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: { title?: string };
  renderFlags?: () => React.ReactNode;
}

// Platform feature keys (flat booleans with rollout % support)
const PLATFORM_FLAGS = [
  { key: "blog",               label: "Blog Posts",         desc: "Publish articles for admins / sellers" },
  { key: "events",             label: "Events",             desc: "Raffles, spin wheels, polls" },
  { key: "reviews",            label: "Reviews",            desc: "Product review system" },
  { key: "wishlists",          label: "Wishlists",          desc: "Per-user saved lists" },
  { key: "coupons",            label: "Coupons",            desc: "Discount code system" },
  { key: "notifications",      label: "Notifications",      desc: "In-app notification feed" },
  { key: "chats",              label: "Live Chat",          desc: "Buyer-seller messaging" },
  { key: "sellerRegistration", label: "Seller Reg.",        desc: "New vendor registration" },
  { key: "smsVerification",    label: "SMS Verify",         desc: "SMS OTP verification" },
  { key: "translations",       label: "Translations",       desc: "Multi-language support" },
  { key: "seedPanel",          label: "Seed Panel",         desc: "Dev seed data panel" },
] as const;

// Listing type keys (nested under featureFlags.listingTypes — no rollout %)
const LISTING_TYPE_FLAGS = [
  { key: "standard",     label: "Standard",     desc: "Fixed-price products (Phase 1)" },
  { key: "auction",      label: "Auction",       desc: "eBay-style bidding (Phase 1)" },
  { key: "pre-order",    label: "Pre-order",     desc: "Future delivery + deposit (Phase 1)" },
  { key: "prize-draw",   label: "Prize Draw",    desc: "Raffle reveal window (Phase 1)" },
  { key: "classified",   label: "Classified",    desc: "Chat-only / no cart (Phase 2)" },
  { key: "digital-code", label: "Digital Code",  desc: "Steam-key instant delivery (Phase 2)" },
  { key: "live",         label: "Live Items",    desc: "Animals / plants + verification (Phase 2)" },
] as const;

// Category type keys (nested under featureFlags.categoryTypes — no rollout %)
const CATEGORY_TYPE_FLAGS = [
  { key: "category",   label: "Categories",  desc: "Standard hierarchy tier 1–3" },
  { key: "sublisting", label: "Sublistings", desc: "Grading / card-number sub-tiers" },
  { key: "brand",      label: "Brands",      desc: "Brand storefront pages" },
  { key: "bundle",     label: "Bundles",     desc: "Curated product collections" },
] as const;

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, defaultOpen = true, children }: AccordionSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Div className={`${__O.hidden}`} rounded="lg" border="default">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 text-left"
        aria-expanded={open}
      >
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          {title}
        </Text>
        <svg
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <Div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {children}
        </Div>
      )}
    </Div>
  );
}

interface FlagRowProps {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  rollout?: number;
  onRolloutChange?: (val: number) => void;
  showRollout?: boolean;
}

function FlagRow({ label, desc, checked, onChange, rollout, onRolloutChange, showRollout }: FlagRowProps) {
  return (
    <Row surface="default" padding="inline" align="center" justify="between" gap="md">
      <Div className="flex-1 min-w-0">
        <Toggle checked={checked} onChange={onChange} label={label} />
        <Text className="mt-0.5 ml-10 truncate" color="faint" size="xs">{desc}</Text>
      </Div>
      {showRollout && (
        <Stack className="w-28 shrink-0" gap="xs">
          <Text size="xs" color="muted">Rollout %</Text>
          <Input
            type="number"
            min={0}
            max={100}
            value={rollout ?? 100}
            onChange={(e) =>
              onRolloutChange?.(Math.min(100, Math.max(0, Number(e.target.value))))
            }
            disabled={!checked}
            className="w-full"
          />
        </Stack>
      )}
    </Row>
  );
}

export function AdminFeatureFlagsView({
  labels = {},
  renderFlags,
  ...rest
}: AdminFeatureFlagsViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading, error } = useQuery<FlagData>({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: FlagData }>(ADMIN_ENDPOINTS.FEATURE_FLAGS);
      return res.data ?? { flags: {}, rollouts: {} };
    },
  });

  const [flags, setFlags] = React.useState<Record<string, unknown>>({});
  const [rollouts, setRollouts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!data) return;
    setFlags(data.flags ?? {});
    setRollouts(data.rollouts ?? {});
  }, [data]);

  const getPlatformFlag = (key: string) => Boolean(flags[key]);
  const setPlatformFlag = (key: string, val: boolean) =>
    setFlags((prev) => ({ ...prev, [key]: val }));

  const getListingTypeFlag = (key: string) => {
    const lt = flags.listingTypes as Record<string, boolean> | undefined;
    return lt?.[key] ?? false;
  };
  const setListingTypeFlag = (key: string, val: boolean) =>
    setFlags((prev) => ({
      ...prev,
      listingTypes: { ...(prev.listingTypes as Record<string, boolean> ?? {}), [key]: val },
    }));

  const getCategoryTypeFlag = (key: string) => {
    const ct = flags.categoryTypes as Record<string, boolean> | undefined;
    return ct?.[key] ?? false;
  };
  const setCategoryTypeFlag = (key: string, val: boolean) =>
    setFlags((prev) => ({
      ...prev,
      categoryTypes: { ...(prev.categoryTypes as Record<string, boolean> ?? {}), [key]: val },
    }));

  const saveFlags = useApiMutation({
    mutationFn: async () => {
      await apiClient.put(ADMIN_ENDPOINTS.FEATURE_FLAGS, { flags, rollouts });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
      showToast("Feature flags saved.", "success");
    },
    onError: () => {
      showToast("Failed to save feature flags.", "error");
    },
  });

  const defaultFlags = () => (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        saveFlags.mutate();
      }} spacing="md">
      <AccordionSection title="Platform Features">
        {PLATFORM_FLAGS.map(({ key, label, desc }) => (
          <FlagRow
            key={key}
            label={label}
            desc={desc}
            checked={getPlatformFlag(key)}
            onChange={(val) => setPlatformFlag(key, val)}
            rollout={rollouts[key]}
            onRolloutChange={(val) => setRollouts((prev) => ({ ...prev, [key]: val }))}
            showRollout
          />
        ))}
      </AccordionSection>

      <AccordionSection title="Listing Types">
        {LISTING_TYPE_FLAGS.map(({ key, label, desc }) => (
          <FlagRow
            key={key}
            label={label}
            desc={desc}
            checked={getListingTypeFlag(key)}
            onChange={(val) => setListingTypeFlag(key, val)}
            showRollout={false}
          />
        ))}
      </AccordionSection>

      <AccordionSection title="Category Types">
        {CATEGORY_TYPE_FLAGS.map(({ key, label, desc }) => (
          <FlagRow
            key={key}
            label={label}
            desc={desc}
            checked={getCategoryTypeFlag(key)}
            onChange={(val) => setCategoryTypeFlag(key, val)}
            showRollout={false}
          />
        ))}
      </AccordionSection>

      <FormActions align="right">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setFlags(data?.flags ?? {});
            setRollouts(data?.rollouts ?? {});
          }}
          disabled={saveFlags.isPending}
        >
          Reset
        </Button>
        <Button
          type="submit"
          isLoading={saveFlags.isPending}
          disabled={saveFlags.isPending}
        >
          Save All Flags
        </Button>
      </FormActions>
    </Form>
  );

  const loadingAlert = isLoading ? (
    <Alert variant="info" title="Loading feature flags">
      Fetching feature flags…
    </Alert>
  ) : null;

  const errorAlert = error ? (
    <Alert variant="error" title="Could not load feature flags">
      {error instanceof Error ? error.message : "Unknown error"}
    </Alert>
  ) : null;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={labels.title ?? "Feature Flags"}
      sections={[loadingAlert, errorAlert, renderFlags?.() ?? defaultFlags()]}
    />
  );
}
