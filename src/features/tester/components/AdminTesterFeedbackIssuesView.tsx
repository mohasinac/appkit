"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Stack, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

interface IssueDoc {
  id: string;
  testerDisplayName: string;
  groupKey: string;
  pageKey: string;
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

  return (
    <Stack gap="sm">
      {issues.map((issue) => (
        <Card key={issue.id} padding="md" variant="default">
          <Stack gap="xs">
            <Text weight="semibold">{issue.groupKey} / {issue.pageKey}</Text>
            <Text size="sm" color="muted">Reported by {issue.testerDisplayName}</Text>
            {issue.comment && <Text size="sm">{issue.comment}</Text>}
            {issue.screenshotUrl && (
              <MediaImage src={issue.screenshotUrl} alt="Tester screenshot" size="card" />
            )}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
