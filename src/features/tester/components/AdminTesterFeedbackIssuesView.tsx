"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Details, Div, Row, Stack, Summary, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { useApiMutation } from "../../../client";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

interface IssueDoc {
  id: string;
  checklistItemId: string;
  testerDisplayName: string;
  groupKey: string;
  groupLabel: string;
  pageKey: string;
  pageLabel: string;
  label: string;
  phase: number;
  comment?: string;
  screenshotUrl?: string;
  bugConfirmed?: boolean;
  bugHunterId?: string;
  bugHunterName?: string;
  supersededByItemId?: string;
}

interface CoverageReportResponse {
  issues?: IssueDoc[];
}

const REPORT_QUERY_KEY = ["admin", "tester-feedback", "report"];

export function AdminTesterFeedbackIssuesView() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: REPORT_QUERY_KEY,
    queryFn: async () => {
      const res = await apiClient.get<CoverageReportResponse>(ADMIN_ENDPOINTS.TESTER_FEEDBACK_REPORT);
      return (res as any)?.data ?? res;
    },
  });

  const confirmBugMutation = useApiMutation({
    mutationFn: async (responseId: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.TESTER_FEEDBACK_CONFIRM_BUG(responseId), {});
    },
    successMessage: "Bug confirmed and credited.",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEY });
    },
  });

  const reopenMutation = useApiMutation({
    mutationFn: async (checklistItemId: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.TESTER_CHECKLIST_ITEM_REOPEN(checklistItemId), {});
    },
    successMessage: "Case reopened for retest.",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEY });
    },
  });

  const issues: IssueDoc[] = query.data?.issues ?? [];

  if (query.isLoading) return <Text color="muted">Loading issues…</Text>;
  if (issues.length === 0) return <Text color="muted">No "No" answers recorded yet.</Text>;

  const byPhase = new Map<number, IssueDoc[]>();
  for (const issue of issues) {
    const phase = issue.phase ?? 0;
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    byPhase.get(phase)!.push(issue);
  }
  const sortedPhases = Array.from(byPhase.keys()).sort((a, b) => a - b);

  return (
    <Stack gap="md">
      {sortedPhases.map((phase) => {
        const phaseIssues = byPhase.get(phase)!;
        return (
          <Details key={phase} tone="card" defaultOpen={sortedPhases.length === 1}>
            <Summary size="lg" weight="bold">
              Phase {phase} ({phaseIssues.length} issue{phaseIssues.length === 1 ? "" : "s"})
            </Summary>
            <Div padding="t-sm">
              <Stack gap="sm">
                {phaseIssues.map((issue) => (
                  <Card key={issue.id} padding="md" variant="default">
                    <Stack gap="xs">
                      <Text weight="semibold">{issue.label}</Text>
                      <Text size="sm" color="muted">
                        {issue.groupLabel} › {issue.pageLabel}
                      </Text>
                      <Text size="sm" color="muted">Reported by {issue.testerDisplayName}</Text>
                      {issue.comment && <Text size="sm">{issue.comment}</Text>}
                      {issue.screenshotUrl && (
                        <MediaImage src={issue.screenshotUrl} alt="Tester screenshot" size="card" />
                      )}
                      {issue.bugConfirmed ? (
                        <Row gap="sm" align="center" wrap>
                          <Text size="sm" weight="semibold" color="success">
                            🐛 Confirmed — credited to {issue.bugHunterName ?? "unknown tester"}
                          </Text>
                          {!issue.supersededByItemId && (
                            <Button
                              size="sm"
                              action={ACTIONS.ADMIN["reopen-checklist-item"]}
                              isLoading={reopenMutation.isPending}
                              onClick={() => reopenMutation.mutate(issue.checklistItemId)}
                            />
                          )}
                        </Row>
                      ) : (
                        <Div>
                          <Button
                            size="sm"
                            action={ACTIONS.ADMIN["confirm-bug"]}
                            isLoading={confirmBugMutation.isPending}
                            onClick={() => confirmBugMutation.mutate(issue.id)}
                          />
                        </Div>
                      )}
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Div>
          </Details>
        );
      })}
    </Stack>
  );
}
