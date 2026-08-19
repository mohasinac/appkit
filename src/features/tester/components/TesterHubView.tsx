"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Details, Div, FieldInput, Heading, Stack, Summary, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { useApiMutation } from "../../../client";
import { useSession } from "../../../react";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { isAdminUser } from "../../auth/role-predicates";
import { TesterChecklistStepRow } from "./TesterChecklistStepRow";
import type { TesterAnswer } from "../schemas/firestore";
import type { JsonValue } from "../../../schemas/types";

interface RawChecklistItem {
  id: string;
  groupKey: string;
  groupLabel: string;
  pageKey: string;
  pageLabel: string;
  phase: number;
  label: string;
  description?: string;
  href?: string;
  order: number;
  answer: TesterAnswer | null;
  comment?: string;
  screenshotUrl?: string;
}

interface TesterChecklistResponse {
  items?: RawChecklistItem[];
}

function matchesQuery(item: RawChecklistItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.label} ${item.description ?? ""} ${item.groupLabel} ${item.pageLabel} ${item.href ?? ""}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

interface TesterChecklistPageSectionProps {
  page: { pageLabel: string; items: RawChecklistItem[] };
  testerDisplayName: string;
  onAnswer: (checklistItemId: string, answer: TesterAnswer) => void;
  onSaveNote: (checklistItemId: string, comment: string, screenshotUrl: string) => Promise<void>;
}

function TesterChecklistPageSection({ page, testerDisplayName, onAnswer, onSaveNote }: TesterChecklistPageSectionProps) {
  const answeredCount = page.items.filter((i) => i.answer).length;
  return (
    <Details tone="card" defaultOpen={false}>
      <Summary>
        {page.pageLabel} ({answeredCount}/{page.items.length} answered)
      </Summary>
      <Div padding="t-sm">
        <Stack gap="sm">
          {page.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <TesterChecklistStepRow
                key={item.id}
                testerDisplayName={testerDisplayName}
                item={{
                  checklistItemId: item.id,
                  label: item.label,
                  description: item.description,
                  href: item.href,
                  answer: item.answer,
                  comment: item.comment,
                  screenshotUrl: item.screenshotUrl,
                }}
                onAnswer={onAnswer}
                onSaveNote={onSaveNote}
              />
            ))}
        </Stack>
      </Div>
    </Details>
  );
}

export interface TesterHubViewProps {
  sandboxExpiresAt?: string | null;
}

export function TesterHubView({ sandboxExpiresAt }: TesterHubViewProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const query = useQuery({
    queryKey: ["user", "tester-checklist"],
    queryFn: async () => {
      const res = await apiClient.get<TesterChecklistResponse>(ACCOUNT_ENDPOINTS.TESTER_CHECKLIST);
      return (res as any)?.data ?? res;
    },
  });

  const upsertMutation = useApiMutation({
    mutationFn: async (vars: { checklistItemId: string; patch: Record<string, JsonValue> }) =>
      apiClient.put(ACCOUNT_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(vars.checklistItemId), vars.patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "tester-checklist"] });
    },
  });

  if (!user?.isTester && !isAdminUser(user)) {
    return (
      <Alert variant="warning" title="Testers only">
        This page is only available to accounts flagged as testers (and admins). Contact an admin if you believe this is a mistake.
      </Alert>
    );
  }

  // Items arrive pre-sorted by catalog `order` (listActive() orders by it).
  const items: RawChecklistItem[] = query.data?.items ?? [];
  const filtered = items.filter((item) => matchesQuery(item, search));

  const phases = new Map<
    number,
    Map<string, { groupLabel: string; pages: Map<string, { pageLabel: string; items: RawChecklistItem[] }> }>
  >();
  for (const item of filtered) {
    if (!phases.has(item.phase)) phases.set(item.phase, new Map());
    const groups = phases.get(item.phase)!;
    if (!groups.has(item.groupKey)) groups.set(item.groupKey, { groupLabel: item.groupLabel, pages: new Map() });
    const group = groups.get(item.groupKey)!;
    if (!group.pages.has(item.pageKey)) group.pages.set(item.pageKey, { pageLabel: item.pageLabel, items: [] });
    group.pages.get(item.pageKey)!.items.push(item);
  }
  const sortedPhaseNumbers = Array.from(phases.keys()).sort((a, b) => a - b);

  const handleAnswer = (checklistItemId: string, answer: TesterAnswer) => {
    upsertMutation.mutate({ checklistItemId, patch: { answer } });
  };

  const handleSaveNote = async (checklistItemId: string, comment: string, screenshotUrl: string) => {
    await upsertMutation.mutateAsync({ checklistItemId, patch: { comment, screenshotUrl } });
  };

  return (
    <Stack gap="lg">
      <Heading level={1}>Tester Hub</Heading>
      <Text color="muted">
        Work through the checklist below and answer Yes/No for each test case. Add a comment and screenshot
        wherever something looks off — colors, styles, readability, bugs. Your answers save automatically.
      </Text>

      {sandboxExpiresAt && (
        <Alert variant="info" title="Shared test sandbox">
          The shared test store/products/categories expire on {new Date(sandboxExpiresAt).toLocaleDateString()}.
        </Alert>
      )}

      <FieldInput
        name="checklist-search"
        label="Search test cases"
        value={search}
        onChange={setSearch}
        placeholder="Search by title or route, e.g. checkout, /store/payouts..."
      />

      {query.isLoading && <Text color="muted">Loading checklist…</Text>}

      {sortedPhaseNumbers.map((phaseNumber) => {
        const groups = phases.get(phaseNumber)!;
        const phaseItemCount = Array.from(groups.values())
          .flatMap((g) => Array.from(g.pages.values()))
          .reduce((sum, page) => sum + page.items.length, 0);
        const phaseAnswered = Array.from(groups.values())
          .flatMap((g) => Array.from(g.pages.values()))
          .reduce((sum, page) => sum + page.items.filter((i) => i.answer).length, 0);
        return (
          <Details key={phaseNumber} tone="card" defaultOpen={false}>
            <Summary size="lg" weight="bold">
              Phase {phaseNumber} ({phaseAnswered}/{phaseItemCount} answered)
            </Summary>
            <Div padding="t-sm">
              <Stack gap="md">
                {Array.from(groups.entries()).map(([groupKey, group]) => (
                  <Stack key={groupKey} gap="sm">
                    <Heading level={4}>{group.groupLabel}</Heading>
                    {Array.from(group.pages.entries()).map(([pageKey, page]) => (
                      <TesterChecklistPageSection
                        key={pageKey}
                        page={page}
                        testerDisplayName={user?.displayName ?? user?.email ?? "tester"}
                        onAnswer={handleAnswer}
                        onSaveNote={handleSaveNote}
                      />
                    ))}
                  </Stack>
                ))}
              </Stack>
            </Div>
          </Details>
        );
      })}
    </Stack>
  );
}
