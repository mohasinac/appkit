"use client";

import React, { useState } from "react";
import { Button, Card, Div, Heading, Row, Stack, Text } from "../../../ui";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { Icon } from "../../../ui/components/Icon";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

/**
 * Admin → Finance → Invoicing: the GSTR-1 draft export (Phase 7d).
 *
 * ## 🛑 Why this page exists at all
 *
 * The export is an API route, and an API route with no surface is a dead end —
 * reachable only by someone who already knows the URL, which is Root Cause
 * #56's shape (16 of 70 listing views had no way to open a row). The person
 * who needs this is an accountant at quarter end, and they will not type a
 * query string.
 *
 * ## 🛑 It downloads; it does not file
 *
 * Nothing here talks to the GST portal — there is no webhook facility in
 * existence and no GSP contract. The copy says "draft" everywhere it can,
 * because a page that implied a return had been FILED when it had not is the
 * most consequential thing this feature could get wrong.
 */

/** Indian FY quarters, which is the unit a GSTR-1 is filed in. */
const QUARTERS = [
  { label: "Q1 — Apr to Jun", fromMonth: "04-01", toMonth: "06-30" },
  { label: "Q2 — Jul to Sep", fromMonth: "07-01", toMonth: "09-30" },
  { label: "Q3 — Oct to Dec", fromMonth: "10-01", toMonth: "12-31" },
  /*
   * 🛑 Q4 SPANS A CALENDAR YEAR BOUNDARY. Jan–Mar of FY 26-27 is calendar
   * 2027, not 2026 — the same off-by-one the `financialYearLabel` helper
   * exists to contain, surfacing here because a quarter picker has to know it
   * too. `yearOffset` is what carries it; dropping it would export the wrong
   * three months with no visible error.
   */
  { label: "Q4 — Jan to Mar", fromMonth: "01-01", toMonth: "03-31", yearOffset: 1 },
] as const;

function defaultFyStartYear(): number {
  const now = new Date();
  // Zero-based month: April is 3. Jan–Mar belongs to the FY that started last
  // calendar year.
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function AdminInvoicingView() {
  const [fyStart, setFyStart] = useState(String(defaultFyStartYear()));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const applyQuarter = (q: (typeof QUARTERS)[number]) => {
    const start = Number(fyStart);
    if (!Number.isFinite(start)) return;
    const offset = "yearOffset" in q ? q.yearOffset : 0;
    setFrom(`${start + offset}-${q.fromMonth}`);
    setTo(`${start + offset}-${q.toMonth}`);
  };

  const href =
    from && to
      ? `${ADMIN_ENDPOINTS.INVOICING_GSTR1}?from=${from}&to=${to}`
      : undefined;

  return (
    <Stack gap="lg">
      <Div>
        <Heading level={1}>Invoicing</Heading>
        <Text color="muted" size="sm">
          Export the invoice and credit-note register for a period, as a draft
          for your accountant.
        </Text>
      </Div>

      <Card padding="card">
        <Stack gap="md">
          <Heading level={2}>GSTR-1 draft</Heading>
          {/*
            🛑 Stated before the button, not after. This file is the INPUT to a
            filing and nothing here submits anything — a user who assumes
            otherwise would miss a return believing it had been filed.
          */}
          <Text color="muted" size="sm">
            This downloads a CSV. It is <strong>not</strong> a return and
            nothing here files anything — LetItRip has no connection to the GST
            portal. Check the figures against your own records before using it.
          </Text>

          <Row gap="sm" wrap>
            <Div className="w-40">
              <FieldInput
                name="fyStart"
                label="FY starting"
                value={fyStart}
                onChange={setFyStart}
                helperText="e.g. 2026 for FY 26-27"
              />
            </Div>
          </Row>

          <Stack gap="xs">
            <Text size="sm" weight="semibold">
              Quarter
            </Text>
            <Row gap="sm" wrap>
              {QUARTERS.map((q) => (
                <Button
                  key={q.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyQuarter(q)}
                >
                  {q.label}
                </Button>
              ))}
            </Row>
          </Stack>

          <Row gap="sm" wrap>
            <Div className="w-48">
              <FieldInput name="from" label="From" value={from} onChange={setFrom} />
            </Div>
            <Div className="w-48">
              <FieldInput name="to" label="To" value={to} onChange={setTo} />
            </Div>
          </Row>

          {/*
            An anchor rather than a fetch: the response is a file download with
            a `Content-Disposition`, and letting the browser handle it avoids
            holding a whole quarter's CSV in memory to re-emit as a blob.

            🛑 Disabled until a window is chosen — the route 400s on a missing
            date, and a button that produces an error is worse than one that
            waits.
          */}
          <Row gap="sm" align="center">
            <Button
              type="button"
              variant="primary"
              disabled={!href}
              onClick={() => {
                if (href) window.location.href = href;
              }}
            >
              <Icon name="download" size="sm" />
              Download draft CSV
            </Button>
            {!href && (
              <Text color="muted" size="xs">
                Pick a quarter, or enter both dates as YYYY-MM-DD.
              </Text>
            )}
          </Row>

          {/*
            The one thing an accountant must know about this file before they
            open it, stated here as well as inside the CSV: a paid order with
            no invoice number is listed as a warning rather than silently
            omitted, because an order absent from a return is the error this
            whole feature exists to prevent.
          */}
          <Text color="muted" size="xs">
            Credit notes appear as negative rows, so the TOTAL row is net of
            refunds. Any paid order in the window that carries no invoice number
            is listed at the bottom of the file as a warning — those are not
            included in the totals and need looking at.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
