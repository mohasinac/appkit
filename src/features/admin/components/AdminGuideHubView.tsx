import React from "react";
import {
  Users,
  Package,
  Store,
  ShoppingBag,
  FileText,
  Settings,
  Shield,
  BarChart2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Div, Heading, Text, Section, Alert } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

// ─── Guide cards ──────────────────────────────────────────────────────────────

interface AdminGuideCard {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  permission: string;
}

const GUIDE_CARDS: AdminGuideCard[] = [
  {
    Icon: Users,
    title: "Users & Accounts",
    description: "Roles, search, user editor, sessions management, employee accounts, and PII handling.",
    href: String(ROUTES.ADMIN.GUIDE_USERS),
    permission: "admin:users:read",
  },
  {
    Icon: Package,
    title: "Catalog",
    description: "Products, listing types, categories (3-tier taxonomy), brands, and reviews.",
    href: String(ROUTES.ADMIN.GUIDE_CATALOG),
    permission: "admin:products:read",
  },
  {
    Icon: Store,
    title: "Stores & Sellers",
    description: "Store lifecycle, identity architecture, capabilities, addresses, and suspension.",
    href: String(ROUTES.ADMIN.GUIDE_STORES),
    permission: "admin:stores:read",
  },
  {
    Icon: ShoppingBag,
    title: "Orders & Finance",
    description: "Order statuses, ID format, dispute intervention, payouts, returns, and commission math.",
    href: String(ROUTES.ADMIN.GUIDE_ORDERS),
    permission: "admin:orders:read",
  },
  {
    Icon: FileText,
    title: "Content & Marketing",
    description: "Blog posts, events, FAQs, carousel slides, homepage sections, ads, and newsletter.",
    href: String(ROUTES.ADMIN.GUIDE_CONTENT),
    permission: "admin:blog:read",
  },
  {
    Icon: Settings,
    title: "Site Configuration",
    description: "Site settings groups, feature flags, integrations, auction config, and legal pages.",
    href: String(ROUTES.ADMIN.GUIDE_SITE),
    permission: "admin:site:read",
  },
  {
    Icon: Users,
    title: "Team & Permissions",
    description: "Permission groups, employee invite flow, role vs permission difference, and RBAC model.",
    href: String(ROUTES.ADMIN.GUIDE_TEAM),
    permission: "admin:team:read",
  },
  {
    Icon: BarChart2,
    title: "Analytics",
    description: "Revenue dashboard, order funnel, product performance, and store-level metrics.",
    href: String(ROUTES.ADMIN.GUIDE_ANALYTICS),
    permission: "admin:analytics:view",
  },
  {
    Icon: Shield,
    title: "Trust & Safety",
    description: "Bans (soft/hard), scam registry, support tickets, moderation queue, and reports.",
    href: String(ROUTES.ADMIN.GUIDE_TRUST),
    permission: "admin:moderation:read",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface AdminGuideHubViewProps {
  permissions?: string[];
  isFullAdmin?: boolean;
}

export function AdminGuideHubView({ permissions = [], isFullAdmin = false }: AdminGuideHubViewProps) {
  const hasPermission = (perm: string) => isFullAdmin || permissions.includes(perm);
  const visibleCards = GUIDE_CARDS.filter((c) => hasPermission(c.permission));
  const hasAny = visibleCards.length > 0;

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
              Admin &amp; Employee Guide
            </Text>
          </Div>
          <Heading level={1} className="text-2xl md:text-3xl font-bold text-white mb-2">
            LetItRip Internal Guide
          </Heading>
          <Text className="text-white/80 text-base">
            Everything you need to operate and manage LetItRip — India&apos;s largest collectibles marketplace.
          </Text>
        </Div>
      </Section>

      {/* Info note */}
      <Alert variant="info" compact>
        These guides describe expected platform behaviour. Real access to each section is enforced independently by the permission system — this page is reference only.
      </Alert>

      {/* No permissions fallback */}
      {!hasAny && (
        <Alert variant="info" title="Limited access">
          Your permission set doesn&apos;t include read access to any admin sections yet. Contact your admin to request the permissions you need.
        </Alert>
      )}

      {/* Guide cards */}
      {hasAny && (
        <Section>
          <Heading level={2} className="text-lg font-semibold text-[var(--appkit-color-text)] mb-4">
            Guides
          </Heading>
          <Div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map(({ Icon, title, description, href }) => (
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
        </Section>
      )}

      {/* Trust & Safety callout */}
      <Section className="rounded-2xl border border-amber-200 bg-warning-surface dark:border-amber-800 p-6">
        <Div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <Div>
            <Text className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Remember: with great access comes responsibility
            </Text>
            <Text className="text-sm text-amber-700 dark:text-amber-400">
              Admin actions are logged. Never access user PII (email, phone) without a legitimate support reason. Never grant capabilities or permissions without documented approval. When in doubt, escalate to a senior admin.
            </Text>
          </Div>
        </Div>
      </Section>
    </Div>
  );
}
