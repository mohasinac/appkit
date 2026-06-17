import React from "react";
import {
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Shield,
  Headphones,
  CheckCircle2,
  Circle,
  BookOpen,
} from "lucide-react";
import { Div, Heading, Row, Section, Stack, Text } from "../../../ui";
import type { StoreDocument } from "../schemas";
import { ROUTES } from "../../../next/routing/route-map";

const CLS_CHECK_ICON = "w-5 h-5 flex-shrink-0 text-emerald-500";
const CLS_SUCCESS_BOX = "rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-5 py-4";
const CLS_SUCCESS_BODY = "text-sm font-medium text-emerald-700 dark:text-emerald-400";

// -- Guide cards ---------------------------------------------------------------

interface GuideCard {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

const GUIDE_CARDS: GuideCard[] = [
  {
    Icon: Package,
    title: "Listings",
    description: "Add products, auctions, and pre-orders. Learn condition grades, media tips, and pricing.",
    href: String(ROUTES.STORE.GUIDE_LISTINGS),
  },
  {
    Icon: ShoppingBag,
    title: "Orders",
    description: "Process, ship, and handle returns. Understand the full order lifecycle step by step.",
    href: String(ROUTES.STORE.GUIDE_ORDERS),
  },
  {
    Icon: Wallet,
    title: "Finance",
    description: "Payout cycles, commissions, coupons, and promoted listings explained.",
    href: String(ROUTES.STORE.GUIDE_FINANCE),
  },
  {
    Icon: Settings,
    title: "Settings",
    description: "Store profile, shipping config, return policy, vacation mode, and WhatsApp integration.",
    href: String(ROUTES.STORE.GUIDE_SETTINGS),
  },
  {
    Icon: Shield,
    title: "Capabilities",
    description: "Admin-granted feature flags — auctions, pre-orders, lower commissions, and more.",
    href: String(ROUTES.STORE.GUIDE_CAPABILITIES),
  },
  {
    Icon: Headphones,
    title: "Support",
    description: "Open a support ticket, report an issue, or escalate a dispute with our team.",
    href: String(ROUTES.USER.SUPPORT),
  },
];

// -- Getting started checklist -------------------------------------------------

interface ChecklistStep {
  label: string;
  done: boolean;
  href: string;
}

function buildChecklist(store: StoreDocument | null): ChecklistStep[] {
  return [
    {
      label: "Complete your store profile",
      done: Boolean(store?.storeDescription?.trim()),
      href: String(ROUTES.STORE.STOREFRONT),
    },
    {
      label: "Upload logo & banner",
      done: Boolean(store?.storeLogoURL),
      href: String(ROUTES.STORE.STOREFRONT),
    },
    {
      label: "Create your first listing",
      done: (store?.stats?.totalProducts ?? 0) > 0,
      href: String(ROUTES.STORE.PRODUCTS_NEW),
    },
    {
      label: "Configure shipping",
      done: (store?.shippingConfig?.providers?.length ?? 0) > 0,
      href: String(ROUTES.STORE.SHIPPING_CONFIGS),
    },
    {
      label: "Request verified badge",
      done: Boolean((store as (StoreDocument & { isVerified?: boolean }) | null)?.isVerified),
      href: String(ROUTES.USER.SUPPORT),
    },
  ];
}

// -- Props ---------------------------------------------------------------------

export interface StoreGuideHubViewProps {
  store: StoreDocument | null;
}

// -- Component -----------------------------------------------------------------

export function StoreGuideHubView({ store }: StoreGuideHubViewProps) {
  const storeName = store?.storeName ?? "Your Store";
  const steps = buildChecklist(store);
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <Stack gap="xl" padding="b-2xl">
      {/* Welcome banner */}
      <Section className="overflow-hidden border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="2xl" shadow="sm">
        <Div paddingX="x-md-xl" paddingY="y-xl"
          style={{
            background:
              "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 60%,var(--appkit-color-secondary-400) 100%)",
          }}
        >
          <Row className="mb-3" align="center" gap="3">
            <Row className="flex-shrink-0 w-10 h-10" surface="default" align="center" justify="center" rounded="xl">
              <BookOpen className="w-5 h-5 text-white" />
            </Row>
            <Text color="inverse" className="/80 tracking-widest" size="sm" weight="semibold" transform="uppercase">
              Seller Guide
            </Text>
          </Row>
          <Heading color="inverse" level={1} className="mb-2" mdSize="3xl" size="2xl" weight="bold">
            {storeName}
          </Heading>
          <Text color="inverse" className="/80" size="base">
            Everything you need to know about selling on LetItRip.
          </Text>
        </Div>
      </Section>

      {/* Main content: guide cards + checklist sidebar */}
      <Div layout="grid" gap="8" className="grid-cols-1 lg:grid-cols-3">
        {/* Guide cards — 2/3 width on lg */}
        <Stack className="lg:col-span-2" gap="md">
          <Heading level={2} className="text-[var(--appkit-color-text)]" size="lg" weight="semibold">
            Guides
          </Heading>
          <Div layout="grid" gap="4" className="grid-cols-1 sm:grid-cols-2">
            {GUIDE_CARDS.map(({ Icon, title, description, href }) => (
              <a
                key={title}
                href={href}
                className="group flex flex-col gap-3 rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-5 hover:border-[var(--appkit-color-primary)] hover:shadow-md transition-all"
              >
                <Row align="center" gap="3">
                  <Row
                    className="flex-shrink-0 w-9 h-9" align="center" justify="center" rounded="lg"
                    style={{
                      background:
                        "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)",
                    }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </Row>
                  <Text className="text-[var(--appkit-color-text)] group-hover:text-[var(--appkit-color-primary)] transition-colors" weight="semibold">
                    {title}
                  </Text>
                </Row>
                <Text className="text-[var(--appkit-color-text-muted)] leading-relaxed" size="sm">
                  {description}
                </Text>
                <Text className="text-[var(--appkit-color-primary)] mt-auto" size="xs" weight="medium">
                  Read guide →
                </Text>
              </a>
            ))}
          </Div>
        </Stack>

        {/* Getting started checklist — 1/3 width on lg */}
        <Stack gap="md">
          <Heading level={2} className="text-[var(--appkit-color-text)]" size="lg" weight="semibold">
            Getting started
          </Heading>
          <Div className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="xl">
            {/* Progress bar */}
            // audit-variant-ok: progress-bar wrapper Div — asymmetric pt-5 + paddingY=b-md + px-5 + border-b composition
            <Div className="px-5 pt-5 border-b border-[var(--appkit-color-border)]" padding="b-md">
              <Row className="mb-2" align="center" justify="between">
                <Text className="text-[var(--appkit-color-text)]" size="sm" weight="medium">
                  {completedCount} of {steps.length} complete
                </Text>
                <Text className="text-[var(--appkit-color-text-muted)]" size="xs">
                  {Math.round((completedCount / steps.length) * 100)}%
                </Text>
              </Row>
              <Div className="h-1.5 bg-[var(--appkit-color-border)]" rounded="full">
                <Div
                  className="h-full transition-all" rounded="full"
                  style={{
                    width: `${Math.round((completedCount / steps.length) * 100)}%`,
                    background:
                      "linear-gradient(90deg,var(--appkit-color-primary-700),var(--appkit-color-cobalt))",
                  }}
                />
              </Div>
            </Div>
            {/* Steps */}
            <Div className="divide-y divide-[var(--appkit-color-border)]">
              {steps.map(({ label, done, href }) => (
                <a
                  key={label}
                  href={done ? "#" : href}
                  aria-disabled={done}
                  className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
 done
 ? "cursor-default"
 : "hover:bg-[var(--appkit-color-border)]/30"
 }`}
                >
                  {done ? (
                    <CheckCircle2 className={CLS_CHECK_ICON} />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0 text-[var(--appkit-color-text-muted)]" />
                  )}
                  <Text
                    className={`leading-snug ${
 done
 ? "line-through text-[var(--appkit-color-text-muted)]"
 : "text-[var(--appkit-color-text)]"
 }`}
                  >
                    {label}
                  </Text>
                </a>
              ))}
            </Div>
          </Div>
          {completedCount === steps.length && (
            <Div className={CLS_SUCCESS_BOX}>
              <Text className={CLS_SUCCESS_BODY}>
                🎉 You&apos;re all set! Your store is fully configured.
              </Text>
            </Div>
          )}
        </Stack>
      </Div>
    </Stack>
  );
}
