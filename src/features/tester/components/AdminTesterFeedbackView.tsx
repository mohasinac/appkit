"use client";

import React from "react";
import { Button } from "../../../ui/components/Button";
import { Heading } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/components/Tabs";
import { useToast } from "../../../ui/components/toast-context";
import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { AdminTesterFeedbackReportView } from "./AdminTesterFeedbackReportView";
import { AdminTesterFeedbackIssuesView } from "./AdminTesterFeedbackIssuesView";
import { AdminTesterFeedbackListView } from "./AdminTesterFeedbackListView";

export function AdminTesterFeedbackView() {
  const { showToast } = useToast();

  const handleExportReport = async () => {
    try {
      const blob = await apiClient.blob(ADMIN_ENDPOINTS.TESTER_FEEDBACK_EXPORT);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tester-feedback-report-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      void normalizeError(_err);
      showToast("Report export failed.", "error");
    }
  };

  return (
    <Stack gap="lg">
      <Row justify="between" align="center" wrap>
        <Heading level={1}>Tester Feedback</Heading>
        <Button variant="ghost" action={ACTIONS.ADMIN["export-tester-feedback"]} onClick={handleExportReport} />
      </Row>
      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="issues">Main Issues</TabsTrigger>
          <TabsTrigger value="submissions">All Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="report">
          <AdminTesterFeedbackReportView />
        </TabsContent>
        <TabsContent value="issues">
          <AdminTesterFeedbackIssuesView />
        </TabsContent>
        <TabsContent value="submissions">
          <AdminTesterFeedbackListView />
        </TabsContent>
      </Tabs>
    </Stack>
  );
}
