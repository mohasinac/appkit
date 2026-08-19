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
  phase: number;
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

  const byPhase = new Map<number, GroupCoverageDatum>();
  for (const item of itemCoverage) {
    const phase = item.phase ?? 0;
    if (!byPhase.has(phase)) {
      byPhase.set(phase, { groupLabel: `Phase ${phase}`, yes: 0, no: 0 });
    }
    const entry = byPhase.get(phase)!;
    entry.yes += item.yesCount;
    entry.no += item.noCount;
  }
  const sortedPhaseData = Array.from(byPhase.entries())
    .sort(([a], [b]) => a - b)
    .map(([, datum]) => datum);

  return (
    <Stack gap="lg">
      <TesterFeedbackChart
        data={sortedPhaseData}
        totalCases={itemCoverage.length}
        totalAnswered={totals.totalAnswered}
        totalYes={totals.totalYes}
        totalNo={totals.totalNo}
      />
    </Stack>
  );
}
