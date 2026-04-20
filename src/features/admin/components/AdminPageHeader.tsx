import { Heading, Nav, Text, Span, Button, Row } from "@mohasinac/appkit/ui";
import { ChevronRight } from "lucide-react";

/**
 * AdminPageHeader Component
 *
 * Standardized page header for admin pages with optional action button,
 * breadcrumb navigation, and badge/description support.
 *
 * Styling (gradient, typography classes) is injected via the `themeConfig` prop.
 *
 * @example
 * ```tsx
 * <AdminPageHeader
 *   title="User Management"
 *   subtitle="Manage user accounts and permissions"
 *   actionLabel="Add User"
 *   onAction={() => setShowUserDrawer(true)}
 *   themeConfig={{
 *     gradient: "bg-gradient-to-r from-blue-50 to-blue-100",
 *     titleClass: "text-3xl font-bold",
 *     subtitleClass: "text-lg text-gray-600"
 *   }}
 * />
 * ```
 */

interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderThemeConfig {
  gradient?: string;
  titleClass?: string;
  subtitleClass?: string;
  spacingClass?: string;
  TextLink?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

export interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: React.ReactNode;
  breadcrumb?: PageHeaderBreadcrumb[];
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  actionDisabled?: boolean;
  className?: string;
  themeConfig?: PageHeaderThemeConfig;
}

export function AdminPageHeader({
  title,
  subtitle,
  description,
  badge,
  breadcrumb,
  actionLabel,
  onAction,
  actionIcon,
  actionDisabled = false,
  className = "",
  themeConfig = {
    gradient: "bg-blue-50",
    titleClass: "text-3xl font-bold",
    subtitleClass: "text-lg text-gray-700",
    spacingClass: "space-y-1",
  },
}: AdminPageHeaderProps) {
  return (
    <div className={`${themeConfig.gradient} p-6 ${className}`}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400"
        >
          {breadcrumb.map((crumb, index) => (
            <Span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
              {crumb.href && themeConfig.TextLink ? (
                <themeConfig.TextLink
                  href={crumb.href}
                  className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {crumb.label}
                </themeConfig.TextLink>
              ) : (
                <Span className="text-zinc-700 dark:text-zinc-200 font-medium">
                  {crumb.label}
                </Span>
              )}
            </Span>
          ))}
        </Nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className={themeConfig.spacingClass}>
          <Row gap="sm" wrap>
            <Heading level={2} className={themeConfig.titleClass}>
              {title}
            </Heading>
            {badge && <Span className="flex-shrink-0">{badge}</Span>}
          </Row>
          {subtitle && (
            <Text className={themeConfig.subtitleClass}>{subtitle}</Text>
          )}
          {description && (
            <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {description}
            </Text>
          )}
        </div>

        {actionLabel && onAction && (
          <Button
            variant="primary"
            onClick={onAction}
            disabled={actionDisabled}
            className="flex-shrink-0"
          >
            {actionIcon}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
