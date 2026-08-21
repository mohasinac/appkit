"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Details, Div, FieldInput, Heading, Stack, Summary, Text, TextLink } from "../../../ui";
import { apiClient } from "../../../http";
import { useApiMutation } from "../../../client";
import { useSession } from "../../../react";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
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
    // The API route resolves isTester/canTestAdmin fresh from Firestore on
    // every request, so retrying a 403 (a role that genuinely lacks access)
    // wastes calls for no benefit — but a real access grant should still be
    // visible on the very next request, not cached as a permanent failure.
    retry: false,
  });

  const upsertMutation = useApiMutation({
    mutationFn: async (vars: { checklistItemId: string; patch: Record<string, JsonValue> }) =>
      apiClient.put(ACCOUNT_ENDPOINTS.TESTER_CHECKLIST_ITEM_BY_ID(vars.checklistItemId), vars.patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "tester-checklist"] });
    },
  });

  // Gate on the live API response, not the client-cached session snapshot.
  // SessionContext only refreshes role/isTester/canTestAdmin periodically
  // (every 5 minutes) or on a hard reload/re-login — never on ordinary
  // client-side navigation — so a flag an admin just granted would
  // otherwise still read as "Testers only" here for up to 5 minutes even
  // though the same request already succeeds server-side. The tester-
  // checklist API resolves these fields fresh from Firestore on every call,
  // so trusting its actual response is both more accurate and immediate.
  const isForbidden =
    query.isError && (query.error as { status?: number } | undefined)?.status === 403;
  if (isForbidden) {
    return (
      <Alert variant="warning" title="Testers only">
        This page is only available to accounts flagged as testers (and admins). Contact an admin if you believe this is a mistake.
      </Alert>
    );
  }
  if (query.isLoading) {
    return <Text color="muted">Loading checklist…</Text>;
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

      <TextLink href={String(ROUTES.PUBLIC.BUG_HUNTERS)} variant="underline" weight="medium">
        View Bug Hunters Leaderboard →
      </TextLink>

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
