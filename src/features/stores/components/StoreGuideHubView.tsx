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
import { Div, Heading, Text, Section } from "../../../ui";
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
    <Div className="space-y-8 pb-10">
      {/* Welcome banner */}
      <Section className="rounded-2xl overflow-hidden border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-sm">
        <Div
          className="px-6 py-8 md:px-10"
          style={{
            background:
              "linear-gradient(135deg,var(--appkit-color-primary-700,#4f46e5) 0%,var(--appkit-color-cobalt,#2563eb) 60%,var(--appkit-color-secondary-400,#7c3aed) 100%)",
          }}
        >
          <Div className="flex items-center gap-3 mb-3">
            <Div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </Div>
            <Text className="text-sm font-semibold text-white/80 uppercase tracking-widest">
              Seller Guide
            </Text>
          </Div>
          <Heading level={1} className="text-2xl md:text-3xl font-bold text-white mb-2">
            {storeName}
          </Heading>
          <Text className="text-white/80 text-base">
            Everything you need to know about selling on LetItRip.
          </Text>
        </Div>
      </Section>

      {/* Main content: guide cards + checklist sidebar */}
      <Div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Guide cards — 2/3 width on lg */}
        <Div className="lg:col-span-2 space-y-4">
          <Heading level={2} className="text-lg font-semibold text-[var(--appkit-color-text)]">
            Guides
          </Heading>
          <Div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {GUIDE_CARDS.map(({ Icon, title, description, href }) => (
              <a
                key={title}
                href={href}
                className="group flex flex-col gap-3 rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] p-5 hover:border-[var(--appkit-color-primary)] hover:shadow-md transition-all"
              >
                <Div className="flex items-center gap-3">
                  <Div
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg,var(--appkit-color-primary-700,#4f46e5) 0%,var(--appkit-color-cobalt,#2563eb) 100%)",
                    }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </Div>
                  <Text className="font-semibold text-[var(--appkit-color-text)] group-hover:text-[var(--appkit-color-primary)] transition-colors">
                    {title}
                  </Text>
                </Div>
                <Text className="text-sm text-[var(--appkit-color-text-muted)] leading-relaxed">
                  {description}
                </Text>
                <Text className="text-xs font-medium text-[var(--appkit-color-primary)] mt-auto">
                  Read guide →
                </Text>
              </a>
            ))}
          </Div>
        </Div>

        {/* Getting started checklist — 1/3 width on lg */}
        <Div className="space-y-4">
          <Heading level={2} className="text-lg font-semibold text-[var(--appkit-color-text)]">
            Getting started
          </Heading>
          <Div className="rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
            {/* Progress bar */}
            <Div className="px-5 pt-5 pb-4 border-b border-[var(--appkit-color-border)]">
              <Div className="flex items-center justify-between mb-2">
                <Text className="text-sm font-medium text-[var(--appkit-color-text)]">
                  {completedCount} of {steps.length} complete
                </Text>
                <Text className="text-xs text-[var(--appkit-color-text-muted)]">
                  {Math.round((completedCount / steps.length) * 100)}%
                </Text>
              </Div>
              <Div className="h-1.5 rounded-full bg-[var(--appkit-color-border)]">
                <Div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((completedCount / steps.length) * 100)}%`,
                    background:
                      "linear-gradient(90deg,var(--appkit-color-primary-700,#4f46e5),var(--appkit-color-cobalt,#2563eb))",
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
        </Div>
      </Div>
    </Div>
  );
}
