"use client";

/**
 * AdminActionIndexView — the one control plane for "what can a user do here,
 * and where is it" (D7).
 *
 * ## It absorbs two editors that reached nothing
 *
 * `/admin/navigation` (CRUD over a Firestore collection) and
 * `/admin/settings/navigation` (toggles over `siteSettings.navConfig`, seeded
 * from an 11-item hardcoded array) both existed, and **neither one's data
 * reached any sidebar** — because `filterNavItems` short-circuits on a missing
 * `id` and no nav item had one until W6. Two admin screens editing settings
 * nothing read.
 *
 * This screen lists every entry with its kind, portal, route, deep link and
 * required permission, and the toggle here does reach the sidebar.
 *
 * ## What an admin may change, and what they may not
 *
 * Label, description, keywords, weight and enabled — content. Not `href`, not
 * `kind`, not any permission field: repointing a built-in route is routing,
 * and relaxing a permission is access control. An admin-authored entry brings
 * its own href and is validated at SAVE time, because the audit runs on CI and
 * a runtime-written bad link would 404 until the next run.
 */

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { Alert, Badge, Row, Span, Stack, Text, TextLink, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import type { FormValues } from "../../../schemas/types";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { DataListingView } from "./DataListingView";
import { QuickEditMenu } from "./QuickEditMenu";
import {
  actionIndexOverrideSchema,
  splitKeywords,
  joinKeywords,
  ACTION_INDEX_OVERRIDE_FIELDS,
} from "../schemas/action-index-form";
import type { ActionIndexControl, ActionIndexEntry } from "../../search/action-index/types";

const ENDPOINT = ADMIN_ENDPOINTS.ACTION_INDEX;

interface ActionIndexResponse {
  data?: {
    entries: ActionIndexEntry[];
    control: ActionIndexControl | null;
    sync: { added: number; orphanedOverrides: string[]; customCount: number };
  };
}

interface Row {
  [key: string]: unknown;
  id: string;
  primary: string;
  secondary: string;
  kind: string;
  portal: string;
  href: string;
  permission: string;
  enabled: boolean;
  keywords: string;
  weight: number;
}

export interface AdminActionIndexViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  labels?: { title?: string };
}

export function AdminActionIndexView({ labels = {} }: AdminActionIndexViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: ["admin", "action-index"],
    queryFn: () => apiClient.get<ActionIndexResponse>(ENDPOINT),
    staleTime: 60_000,
  });

  const payload = query.data?.data;
  /*
   * Memoised because the `?? {}` fallback is a fresh object every render,
   * which makes the `rows` memo below rebuild on every render — it reads
   * `overrides` for each entry's effective `enabled`.
   */
  const overrides = React.useMemo(
    () => payload?.control?.entries ?? {},
    [payload?.control?.entries],
  );

  const toggleMutation = useApiMutation({
    errorMessage: "Could not update that entry.",
    mutationFn: async (vars: { entryId: string; enabled: boolean }) =>
      apiClient.patch(ENDPOINT, {
        entryId: vars.entryId,
        override: { ...overrides[vars.entryId], enabled: vars.enabled },
      } as unknown as JsonValue),
    onSuccess: () => {
      showToast("Saved.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "action-index"] });
    },
  });

  /*
   * Spread the EXISTING override first, exactly as the toggle does. The
   * endpoint's `setOverride` replaces the whole override object, so sending
   * only the edited fields would silently clear this entry's `enabled` —
   * re-showing something an admin had deliberately hidden.
   */
  const overrideMutation = useApiMutation({
    errorMessage: "Could not save that entry.",
    mutationFn: async (vars: { entryId: string; values: FormValues }) => {
      const parsed = actionIndexOverrideSchema.parse(vars.values);
      return apiClient.patch(ENDPOINT, {
        entryId: vars.entryId,
        override: {
          ...overrides[vars.entryId],
          label: parsed.label,
          description: parsed.description,
          keywords: splitKeywords(parsed.keywords),
          weight: parsed.weight,
        },
      } as unknown as JsonValue);
    },
    onSuccess: () => {
      showToast("Entry saved.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "action-index"] });
    },
  });

  const clearMutation = useApiMutation({
    errorMessage: "Could not reset that entry.",
    mutationFn: async (entryId: string) =>
      apiClient.patch(ENDPOINT, { entryId, clear: true } as unknown as JsonValue),
    onSuccess: () => {
      showToast("Entry reset to its code default.", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin", "action-index"] });
    },
  });

  /*
   * Ordered by weight, then label — the same ranking `matchesNavQuery` gives
   * the search, so the admin reading this list sees entries in the order a
   * user would meet them.
   */
  const rows: Row[] = React.useMemo(
    () =>
      [...(payload?.entries ?? [])]
        .sort(
          (a, b) =>
            (b.weight ?? 0) - (a.weight ?? 0) || a.label.localeCompare(b.label),
        )
        .map((entry) => ({
        id: entry.id,
        primary: entry.label,
        secondary: entry.description ?? entry.sectionPath ?? "",
        kind: entry.kind,
        portal: entry.portal,
        href: `${entry.href}${entry.deepLink ?? ""}`,
        permission: entry.requiredPermission ?? "—",
        enabled: overrides[entry.id]?.enabled !== false,
        // Seeds the edit drawer. `entry.*` is already override-merged by
        // `mergeActionIndex`, so these are the effective values an admin sees.
        keywords: joinKeywords(entry.keywords),
        weight: entry.weight ?? 0,
      })),
    [payload?.entries, overrides],
  );

  const sync = payload?.sync;

  return (
    <Stack gap="md">
      {/*
        The sync report, shown and never applied. An entry an admin
        deliberately hid must not reappear because a deploy re-ran a seeder,
        so a difference between code and stored state is information rather
        than an instruction.
      */}
      {sync && sync.orphanedOverrides.length > 0 && (
        <Alert variant="warning" title="Overrides with no entry">
          {sync.orphanedOverrides.length} saved override
          {sync.orphanedOverrides.length === 1 ? "" : "s"} point at entries the
          code no longer has ({sync.orphanedOverrides.slice(0, 4).join(", ")}
          {sync.orphanedOverrides.length > 4 ? "…" : ""}). They are ignored — clear
          them when convenient.
        </Alert>
      )}

      <DataListingView<ActionIndexResponse, Row>
        config={{
          portal: "admin",
          title: labels.title ?? "Action index",
          subtitle:
            "Every page, setting and toggle a user can reach — and what the search finds them by.",
          search: {
            placeholder: "Search by label, description or keyword…",
            mode: "partial",
            fields: ["label", "description", "keywords"],
            commit: "debounce",
          },
          emptyLabel: "No entries match.",
          queryKey: ["admin", "action-index", "listing"],
          endpoint: ENDPOINT,
          filterKeys: ["portal", "kind"],
          defaultSort: "",
          /*
           * 🛑 No sort dropdown, on purpose.
           *
           * This endpoint returns ONE document — the whole index, ~380 entries
           * — and does not sort. Offering a dropdown here would be Root Cause
           * #63 exactly: an option whose field the query never applies, so the
           * control reorders nothing and says nothing about it. The rows are
           * ordered by weight then label below, which is the ranking the
           * search itself uses.
           */
          sortOptions: [],
          mapRows: () => rows,
          getTotal: () => rows.length,
          buildFilters: () => undefined,
          columns: [
            { key: "primary", header: "Entry" },
            {
              key: "kind",
              header: "Kind",
              render: (row) => <Badge variant="default">{row.kind}</Badge>,
            },
            { key: "portal", header: "Portal" },
            {
              /*
               * A LINK, not mono text.
               *
               * This row IS a destination — "where is it" is half of what
               * this screen exists to answer, and the answer was printed as
               * inert text beside a toggle. The link is also what makes the
               * row reachable at all: every other column is metadata about
               * the entry, so without it there is no way to go look at the
               * thing being enabled or disabled.
               */
              key: "href",
              header: "Goes to",
              render: (row) => (
                <TextLink href={row.href} size="xs" onClick={(e) => e.stopPropagation()}>
                  <Span size="xs" family="mono">{row.href}</Span>
                </TextLink>
              ),
            },
            {
              key: "permission",
              header: "Needs",
              render: (row) => (
                <Span size="xs" color="muted">
                  {row.permission}
                </Span>
              ),
            },
            {
              key: "enabled",
              header: "Shown",
              render: (row) => (
                <Row align="center" gap="sm">
                  <Toggle
                    checked={row.enabled}
                    size="sm"
                    ariaLabel={`Show ${row.primary} in navigation and search`}
                    onChange={(next) =>
                      toggleMutation.mutate({ entryId: row.id, enabled: next })
                    }
                  />
                </Row>
              ),
            },
          ],
          /*
           * 🛑 This exists because the footer below already PROMISED it:
           * "Labels, descriptions and keywords can be edited here." They
           * could not. `PATCH /api/admin/action-index` has always accepted
           * `label` / `description` / `keywords` / `weight` in an override
           * (see `ActionIndexOverride`), and the only control on this screen
           * was the Shown toggle — so the sentence described a capability the
           * server had and the UI had never grown. Root Cause #51's shape: a
           * label describing something other than what the surface does.
           *
           * `href`, `kind` and every permission field stay out, per the
           * component docstring: repointing a built-in route is routing, and
           * relaxing a permission is access control.
           */
          renderRowActions: (row) => (
            <QuickEditMenu
              actions={[
                {
                  label: "Edit entry",
                  formTitle: `Edit "${row.primary}"`,
                  schema: actionIndexOverrideSchema,
                  fields: ACTION_INDEX_OVERRIDE_FIELDS,
                  defaultValues: {
                    label: row.primary,
                    description: row.secondary,
                    keywords: row.keywords,
                    weight: row.weight,
                  },
                  onSubmit: async (values) => {
                    await overrideMutation.mutateAsync({ entryId: row.id, values });
                  },
                  submitLabel: "Save entry",
                },
                {
                  label: "Reset to code default",
                  separator: true,
                  destructive: true,
                  onClick: () => clearMutation.mutate(row.id),
                },
              ]}
            />
          ),
        }}
      />

      <Text size="xs" color="muted">
        Hiding an entry removes it from the sidebar, the header search and the
        command palette at once. Use the row menu to edit an entry&rsquo;s label,
        description, keywords and search weight, or to reset it to its code
        default; a route and its required permission belong to the code.
      </Text>
    </Stack>
  );
}
