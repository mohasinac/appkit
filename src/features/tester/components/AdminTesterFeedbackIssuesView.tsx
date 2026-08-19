"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Details, Div, Stack, Summary, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface IssueDoc {
  id: string;
  testerDisplayName: string;
  groupKey: string;
  groupLabel: string;
  pageKey: string;
  pageLabel: string;
  label: string;
  phase: number;
  comment?: string;
  screenshotUrl?: string;
}

interface CoverageReportResponse {
  issues?: IssueDoc[];
}

export function AdminTesterFeedbackIssuesView() {
  const query = useQuery({
    queryKey: ["admin", "tester-feedback", "report"],
    queryFn: async () => {
      const res = await apiClient.get<CoverageReportResponse>(ADMIN_ENDPOINTS.TESTER_FEEDBACK_REPORT);
      return (res as any)?.data ?? res;
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
