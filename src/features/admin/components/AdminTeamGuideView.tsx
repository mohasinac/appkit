import React from "react";
import { Users, Shield } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
export function AdminTeamGuideView() {
  const PERMISSION_GROUPS = [
    { name: "content_manager", desc: "Blog, FAQs, Events, Carousel, Sections, Ads, Newsletter read + write." },
    { name: "catalog_manager", desc: "Products, Categories, Brands, Reviews read + write." },
    { name: "store_manager", desc: "Stores, Store Addresses, Capabilities read + write." },
    { name: "order_manager", desc: "Orders, Returns, Payouts read + write + dispute tools." },
    { name: "trust_safety", desc: "Scam Registry, Support Tickets, Moderation, Reports, Bans." },
    { name: "analytics_viewer", desc: "Analytics, Revenue dashboard — read only." },
    { name: "site_admin", desc: "Site Settings, Feature Flags, Navigation, Roles — write." },
    { name: "superadmin", desc: "All of the above + Team management + User role changes." },
  ];

  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10 [background:linear-gradient(135deg,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_100%)]" align="center" justify="center" rounded="xl">
            <Users className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Team &amp; Permissions</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">How roles, permissions, and employee accounts work on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Shield, title: "Role vs Permission: Key Difference",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                <Span weight="bold">Role</Span> (<Code size="xs" padding="xs" rounded="default" surface="subtle">user.role</Code>) is a coarse-grained classification: <Code size="xs" padding="xs" rounded="default" surface="subtle">user</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">seller</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">moderator</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">employee</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">admin</Code>.
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                <Span weight="bold">Permissions</Span> (<Code size="xs" padding="xs" rounded="default" surface="subtle">user.permissions[]</Code>) are fine-grained capabilities: e.g. <Code size="xs" padding="xs" rounded="default" surface="subtle">admin:orders:read</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">admin:products:write</Code>.
              </Text>
              <Alert variant="info">
                <Code size="xs">role: "admin"</Code> bypasses all RBAC permission checks — it&apos;s a superuser flag. <Code size="xs">role: "employee"</Code> is governed entirely by <Code size="xs">user.permissions[]</Code>.
              </Alert>
            </>
          ),
        },
        {
          Icon: Users, title: "Permission Groups",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Permission groups are predefined bundles. Assign a group to an employee to give them a coherent set of access rights:</Text>
              <Stack gap="sm">
                {PERMISSION_GROUPS.map(({ name, desc }) => (
                  <Row textSize="sm" gap="3" key={name}>
                    <Text className="flex-shrink-0 font-mono text-[var(--appkit-color-primary)] w-40" size="xs" weight="semibold">{name}</Text>
                    <Text className="text-[var(--appkit-color-text-muted)]">{desc}</Text>
                  </Row>
                ))}
              </Stack>
            </>
          ),
        },
        {
          Icon: Users, title: "Employee Invite Flow",
          content: (
            <Ul className="text-[var(--appkit-color-text-muted)]" spacing="comfortable" size="sm">
              <Li>Go to <Span weight="bold">Admin → Team → Invite Employee</Span>. Enter the person&apos;s email and select their permission group.</Li>
              <Li>They receive an invitation email with a sign-up link. On first login, their Firestore profile is created with <Code size="xs" padding="xs" rounded="default" surface="subtle">role: "employee"</Code> and the selected permissions array.</Li>
              <Li>To update permissions later: edit the employee in the Team section. Changes take effect on their next login (session tokens carry the old permissions until refreshed).</Li>
              <Li>To offboard: use <Span weight="bold">Revoke Access</Span> in Team — sets <Code size="xs" padding="xs" rounded="default" surface="subtle">isDisabled: true</Code> on their Auth account and clears all permissions.</Li>
            </Ul>
          ),
        },
        {
          Icon: Shield, title: "The 85+ Permission System",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Permissions follow the pattern <Code size="xs" padding="xs" rounded="default" surface="subtle">admin:&#123;resource&#125;:&#123;action&#125;</Code>. Actions: <Code size="xs" padding="xs" rounded="default" surface="subtle">read</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">write</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">delete</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">view</Code>.</Text>
              <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                The full permission list is defined in <Code size="xs" padding="xs" rounded="default" surface="subtle">appkit/src/features/auth/schemas/firestore.ts</Code>. Custom roles (specific permission combinations) can be created at <Span weight="bold">Admin → Custom Roles</Span> — use these when a predefined group is too broad or too narrow for a hire.
              </Text>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} overflow="hidden" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="2xl">
          <Row className="border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="inlineLg" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div paddingY="y-md-lg" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
