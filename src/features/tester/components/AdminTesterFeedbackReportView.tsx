"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Stack, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { TesterFeedbackChart } from "./TesterFeedbackChart";
import type { GroupCoverageDatum } from "./TesterFeedbackChart";

interface CoverageItem {
  checklistItemId: string;
  groupKey: string;
  pageKey: string;
  yesCount: number;
  noCount: number;
  totalAnswered: number;
}

interface CoverageReportResponse {
  itemCoverage?: CoverageItem[];
  totals?: { totalAnswered: number; totalYes: number; totalNo: number };
}

export function AdminTesterFeedbackReportView() {
  const query = useQuery({
    queryKey: ["admin", "tester-feedback", "report"],
    queryFn: async () => {
      const res = await apiClient.get<CoverageReportResponse>(ADMIN_ENDPOINTS.TESTER_FEEDBACK_REPORT);
      return (res as any)?.data ?? res;
    },
  });

  if (query.isLoading) return <Text color="muted">Loading report…</Text>;

  const itemCoverage = query.data?.itemCoverage ?? [];
  const totals = query.data?.totals ?? { totalAnswered: 0, totalYes: 0, totalNo: 0 };

  const byGroup = new Map<string, GroupCoverageDatum>();
  for (const item of itemCoverage) {
    if (!byGroup.has(item.groupKey)) {
      byGroup.set(item.groupKey, { groupLabel: item.groupKey, yes: 0, no: 0 });
    }
    const entry = byGroup.get(item.groupKey)!;
    entry.yes += item.yesCount;
    entry.no += item.noCount;
  }

  return (
    <Stack gap="lg">
      <TesterFeedbackChart
        data={Array.from(byGroup.values())}
        totalCases={itemCoverage.length}
        totalAnswered={totals.totalAnswered}
        totalYes={totals.totalYes}
        totalNo={totals.totalNo}
      />
    </Stack>
  );
}
