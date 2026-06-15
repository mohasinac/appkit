"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, Div, Form, FormActions, Label, Select, SideDrawer, Span, Stack, Text, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  PERMISSION_GROUPS,
  type Permission,
  type EmployeeGroup,
} from "../../auth/permissions/constants";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminEmployeeEditorViewProps {
  open: boolean;
  onClose: () => void;
  mode: "invite" | "edit";
  userId?: string;
  displayName?: string;
  currentPermissionGroup?: string;
  currentPermissions?: string[];
}

// --- Helpers -----------------------------------------------------------------

const GROUP_OPTIONS: { label: string; value: string }[] = [
  { label: "Content Moderator", value: "content_moderator" },
  { label: "Review Manager", value: "review_manager" },
  { label: "Blog Poster", value: "blog_poster" },
  { label: "Community Manager", value: "community_manager" },
  { label: "Event Handler", value: "event_handler" },
  { label: "Newsletter Manager", value: "newsletter_manager" },
  { label: "SEO Manager", value: "seo_manager" },
  { label: "Ad Manager", value: "ad_manager" },
  { label: "Site Manager", value: "site_manager" },
  { label: "Catalog Manager", value: "catalog_manager" },
  { label: "Finance Manager", value: "finance_manager" },
  { label: "Data Analyst", value: "data_analyst" },
  { label: "Customer Support", value: "customer_support" },
  { label: "Support Agent", value: "support_agent" },
  { label: "Store Onboarding", value: "store_onboarding" },
  { label: "Trust & Safety", value: "trust_and_safety" },
  { label: "Auction Monitor", value: "auction_monitor" },
  { label: "Scam Moderator", value: "scam_moderator" },
  { label: "Custom", value: "custom" },
];

const PERMISSION_DOMAINS: { label: string; prefix: string }[] = [
  { label: "Dashboard", prefix: "admin:dashboard:" },
  { label: "Users & Bans", prefix: "admin:users:|admin:user-bans:" },
  { label: "Products", prefix: "admin:products:" },
  { label: "Orders & Returns", prefix: "admin:orders:|admin:returns:" },
  { label: "Stores", prefix: "admin:stores:|admin:store-addresses:" },
  { label: "Finance", prefix: "admin:analytics:|admin:payouts:" },
  { label: "Catalog", prefix: "admin:categories:|admin:brands:|admin:coupons:|admin:deals:|admin:featured:" },
  {
    label: "Content",
    prefix: "admin:reviews:|admin:blog:|admin:bids:|admin:media:",
  },
  {
    label: "Site / CMS",
    prefix: "admin:site:|admin:navigation:|admin:sections:|admin:carousel:|admin:ads:|admin:faqs:|admin:newsletter:|admin:contact:",
  },
  { label: "Events", prefix: "admin:events:|admin:event-entries:" },
  { label: "Support & Safety", prefix: "admin:support-tickets:|admin:scammers:" },
  { label: "System", prefix: "admin:sessions:|admin:notifications:|admin:carts:|admin:wishlists:|admin:feature-flags:|admin:copilot:|admin:team:" },
];

function matchesDomain(perm: string, prefix: string): boolean {
  return prefix.split("|").some((p) => perm.startsWith(p));
}

function getPermissionsForDomain(prefix: string): Permission[] {
  const allPerms = Object.values(PERMISSION_GROUPS).flat();
  const seen = new Set<string>();
  const result: Permission[] = [];
  for (const p of allPerms) {
    if (matchesDomain(p, prefix) && !seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }
  return result;
}

function formatPermLabel(perm: string): string {
  const parts = perm.split(":");
  return parts[parts.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PermissionDomainsPanelProps {
  permissions: Set<string>;
  togglePerm: (perm: string) => void;
}

function PermissionDomainsPanel({ permissions, togglePerm }: PermissionDomainsPanelProps) {
  return (
    <Stack gap="sm">
      <Span size="sm" weight="medium" color="muted">
        Permissions
        <Span size="xs" weight="normal" className="ml-2" color="muted">
          ({permissions.size} selected)
        </Span>
      </Span>
      <Div className={`divide-y divide-zinc-100 dark:divide-slate-700 max-h-[42vh] ${__O.yAuto}`} rounded="xl" border="default">
        {PERMISSION_DOMAINS.map((domain) => {
          const domainPerms = getPermissionsForDomain(domain.prefix);
          if (domainPerms.length === 0) return null;
          const checked = domainPerms.filter((p) => permissions.has(p)).length;
          return (
            <details key={domain.prefix} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-3 py-2 font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 select-none hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors">
                <Span size="xs">{domain.label}</Span>
                <Span size="xs" weight="normal" className="normal-case" color="faint">
                  {checked}/{domainPerms.length}
                </Span>
              </summary>
              <Div className="grid grid-cols-2 gap-x-2 gap-y-1.5 px-3 py-2.5 bg-zinc-50/60 dark:bg-slate-800/40">
                {domainPerms.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.has(perm)}
                      onChange={() => togglePerm(perm)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-slate-600 accent-primary"
                    />
                    {formatPermLabel(perm)}
                  </label>
                ))}
              </Div>
            </details>
          );
        })}
      </Div>
    </Stack>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminEmployeeEditorView({
  open,
  onClose,
  mode,
  userId,
  displayName,
  currentPermissionGroup,
  currentPermissions = [],
}: AdminEmployeeEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [email, setEmail] = React.useState("");
  const [group, setGroup] = React.useState<string>(
    currentPermissionGroup ?? "custom",
  );
  const [permissions, setPermissions] = React.useState<Set<string>>(
    new Set(currentPermissions),
  );
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setGroup(currentPermissionGroup ?? "custom");
      setPermissions(new Set(currentPermissions));
    }
  }, [open, currentPermissionGroup, currentPermissions]);

  const applyGroupPreset = (newGroup: string) => {
    setGroup(newGroup);
    if (newGroup !== "custom") {
      const preset =
        PERMISSION_GROUPS[newGroup as Exclude<EmployeeGroup, "custom">] ?? [];
      setPermissions(new Set(preset));
    }
  };

  const togglePerm = (perm: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return next;
    });
  };

  const inviteMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.post(ADMIN_ENDPOINTS.TEAM, {
        email: email.trim(),
        permissionGroup: group,
        permissions: Array.from(permissions),
      });
    },
    onSuccess: () => {
      showToast("Employee invited successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Failed to invite employee", "error");
    },
  });

  const updateMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.put(ADMIN_ENDPOINTS.TEAM_MEMBER(userId!), {
        permissionGroup: group,
        permissions: Array.from(permissions),
      });
    },
    onSuccess: () => {
      showToast("Permissions updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Failed to update permissions", "error");
    },
  });

  const revokeMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.TEAM_MEMBER(userId!));
    },
    onSuccess: () => {
      showToast("Employee access revoked", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      setRevokeOpen(false);
      onClose();
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Failed to revoke access", "error");
    },
  });

  const isBusy =
    inviteMutation.isPending ||
    updateMutation.isPending ||
    revokeMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "invite") inviteMutation.mutate();
    else updateMutation.mutate();
  };

  return (
    <>
      <SideDrawer
        isOpen={open}
        onClose={onClose}
        title={mode === "invite" ? "Invite Employee" : `Edit — ${displayName ?? "Employee"}`}
      >
        <Form onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
          {mode === "invite" && (
            <Stack className="gap-1.5">
              <Label className="text-zinc-700 dark:text-zinc-300" size="sm" weight="medium">
                Email address
              </Label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@example.com"
                className="rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
              />
            </Stack>
          )}

          <Stack className="gap-1.5">
            <Label className="text-zinc-700 dark:text-zinc-300" size="sm" weight="medium">
              Permission group
            </Label>
            <Select
              value={group}
              onChange={(e) => applyGroupPreset(e.target.value)}
              options={GROUP_OPTIONS}
            />
            <Text size="xs" color="muted">
              Selecting a group auto-fills the permissions below. You can still
              customise individual permissions.
            </Text>
          </Stack>

          <PermissionDomainsPanel permissions={permissions} togglePerm={togglePerm} />

          <FormActions>
            <Button type="submit" variant="primary" disabled={isBusy} isLoading={isBusy}>
              {mode === "invite" ? "Send Invite" : "Save"}
            </Button>
            {mode === "edit" && userId && (
              <Button
                type="button"
                variant="danger"
                disabled={isBusy}
                onClick={() => setRevokeOpen(true)}
              >
                Revoke Access
              </Button>
            )}
          </FormActions>
        </Form>
      </SideDrawer>

      {mode === "edit" && (
        <ConfirmDeleteModal
          isOpen={revokeOpen}
          onClose={() => setRevokeOpen(false)}
          onConfirm={() => revokeMutation.mutate()}
          isDeleting={revokeMutation.isPending}
          title="Revoke employee access?"
          message={`${displayName ?? "This employee"} will lose admin panel access immediately. Their user account remains active — only their role is reset to user.`}
          confirmText="Revoke Access"
          variant="danger"
        />
      )}
    </>
  );
}
