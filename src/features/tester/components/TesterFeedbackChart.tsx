"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Card, Heading, Row, Stack, Text } from "../../../ui";

// recharts exports generic components (<DataPointType>) that don't satisfy
// next/dynamic's ComponentType<P> constraint — cast each to ComponentType<any>.
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer as React.ComponentType<any>),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart as React.ComponentType<any>),
  { ssr: false },
);
const Bar = dynamic(
  () => import("recharts").then((m) => m.Bar as React.ComponentType<any>),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((m) => m.XAxis as React.ComponentType<any>),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((m) => m.YAxis as React.ComponentType<any>),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid as React.ComponentType<any>),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip as React.ComponentType<any>),
  { ssr: false },
);
const Legend = dynamic(
  () => import("recharts").then((m) => m.Legend as React.ComponentType<any>),
  { ssr: false },
);

export interface GroupCoverageDatum {
  groupLabel: string;
  yes: number;
  no: number;
}

export interface TesterFeedbackChartProps {
  data: GroupCoverageDatum[];
  totalCases: number;
  totalAnswered: number;
  totalYes: number;
  totalNo: number;
}

export function TesterFeedbackChart({
  data,
  totalCases,
  totalAnswered,
  totalYes,
  totalNo,
}: TesterFeedbackChartProps) {
  const passRate = totalAnswered > 0 ? Math.round((totalYes / totalAnswered) * 100) : 0;

  return (
    <Stack gap="md">
      <Row gap="md" wrap>
        <Card padding="md" variant="default">
          <Text size="xs" color="muted">Total test cases</Text>
          <Heading level={3}>{totalCases}</Heading>
        </Card>
        <Card padding="md" variant="default">
          <Text size="xs" color="muted">Answers recorded</Text>
          <Heading level={3}>{totalAnswered}</Heading>
        </Card>
        <Card padding="md" variant="default">
          <Text size="xs" color="muted">Pass rate</Text>
          <Heading level={3}>{passRate}%</Heading>
        </Card>
        <Card padding="md" variant="default">
          <Text size="xs" color="muted">Issues (No)</Text>
          <Heading level={3} color="error">{totalNo}</Heading>
        </Card>
      </Row>

      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="groupLabel" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="yes" name="Yes" fill="var(--appkit-color-success)" />
          <Bar dataKey="no" name="No" fill="var(--appkit-color-error)" />
        </BarChart>
      </ResponsiveContainer>
    </Stack>
  );
}
