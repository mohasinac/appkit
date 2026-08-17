"use client";

import React from "react";
import { Heading, Stack, Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui";
import { AdminTesterFeedbackReportView } from "./AdminTesterFeedbackReportView";
import { AdminTesterFeedbackIssuesView } from "./AdminTesterFeedbackIssuesView";
import { AdminTesterFeedbackListView } from "./AdminTesterFeedbackListView";

export function AdminTesterFeedbackView() {
  return (
    <Stack gap="lg">
      <Heading level={1}>Tester Feedback</Heading>
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
