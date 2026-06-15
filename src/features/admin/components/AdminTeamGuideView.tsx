import React from "react";
import { Users, Shield } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";

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
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 flex items-center justify-center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Users className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl text-[var(--appkit-color-text)] mb-2" weight="bold">Team &amp; Permissions</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">How roles, permissions, and employee accounts work on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Shield, title: "Role vs Permission: Key Difference",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                <Span weight="bold">Role</Span> (<code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">user.role</code>) is a coarse-grained classification: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">user</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">seller</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">moderator</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">employee</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">admin</code>.
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                <Span weight="bold">Permissions</Span> (<code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">user.permissions[]</code>) are fine-grained capabilities: e.g. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">admin:orders:read</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">admin:products:write</code>.
              </Text>
              <Alert variant="info">
                <code className="text-xs">role: "admin"</code> bypasses all RBAC permission checks — it&apos;s a superuser flag. <code className="text-xs">role: "employee"</code> is governed entirely by <code className="text-xs">user.permissions[]</code>.
              </Alert>
            </>
          ),
        },
        {
          Icon: Users, title: "Permission Groups",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Permission groups are predefined bundles. Assign a group to an employee to give them a coherent set of access rights:</Text>
              <Div className="space-y-2">
                {PERMISSION_GROUPS.map(({ name, desc }) => (
                  <Div key={name} className="flex gap-3 text-sm">
                    <Text className="flex-shrink-0 font-mono text-[var(--appkit-color-primary)] w-40" size="xs" weight="semibold">{name}</Text>
                    <Text className="text-[var(--appkit-color-text-muted)]">{desc}</Text>
                  </Div>
                ))}
              </Div>
            </>
          ),
        },
        {
          Icon: Users, title: "Employee Invite Flow",
          content: (
            <ul className="space-y-2 text-sm text-[var(--appkit-color-text-muted)]">
              <li>Go to <Span weight="bold">Admin → Team → Invite Employee</Span>. Enter the person&apos;s email and select their permission group.</li>
              <li>They receive an invitation email with a sign-up link. On first login, their Firestore profile is created with <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">role: "employee"</code> and the selected permissions array.</li>
              <li>To update permissions later: edit the employee in the Team section. Changes take effect on their next login (session tokens carry the old permissions until refreshed).</li>
              <li>To offboard: use <Span weight="bold">Revoke Access</Span> in Team — sets <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isDisabled: true</code> on their Auth account and clears all permissions.</li>
            </ul>
          ),
        },
        {
          Icon: Shield, title: "The 85+ Permission System",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Permissions follow the pattern <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">admin:&#123;resource&#125;:&#123;action&#125;</code>. Actions: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">read</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">write</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">delete</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">view</code>.</Text>
              <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                The full permission list is defined in <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">appkit/src/features/auth/schemas/firestore.ts</code>. Custom roles (specific permission combinations) can be created at <Span weight="bold">Admin → Custom Roles</Span> — use these when a predefined group is too broad or too narrow for a hire.
              </Text>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
