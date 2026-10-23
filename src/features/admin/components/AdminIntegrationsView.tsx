"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Div,
  Heading,
  Row,
  Stack,
  Text,
} from "../../../ui";
import { useToast } from "../../../ui/components/Toast";
import { normalizeError } from "../../../errors/normalize";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import {
  INTEGRATIONS,
  INTEGRATION_ORDER,
  allIntegrationsPatch,
  integrationPatch,
  readIntegrationStates,
  type IntegrationId,
  type IntegrationPatch,
} from "../../../_internal/shared/features/admin/integrations";
import type { SiteSettingsDocument } from "../schemas/firestore";

/**
 * Admin → Site → Integrations. The four switches that decide whether we take
 * money online, send customer email, book couriers, and offer buyers a support
 * surface.
 *
 * ## Why this page exists rather than a Site Settings tab
 *
 * A kill switch for payments has to be findable without hunting a tab strip.
 * It is also the one surface where the four switches are visible TOGETHER,
 * which matters because their off-states are not comparable: three of them
 * stop something and one of them selects a working alternative.
 *
 * ## 🛑 The model is the authority; this file renders it
 *
 * Every label, summary, consequence, severity and settings path comes from
 * `INTEGRATIONS`, and the current state comes from `readIntegrationStates` —
 * **the same expression the route guards resolve through**. That is the whole
 * point: `withOnlinePaymentEnabled` used to hand-write the payments half, and
 * the first draft of the model reproduced it WRONG (it read `razorpayEnabled`
 * alone against a guard that is an OR across both gateways), so with PhonePe
 * on and Razorpay off a page would have reported "payments OFF" while all six
 * `/api/payment` routes were open and taking money.
 *
 * So this view must never derive a state, a consequence or a field name of its
 * own. If a row needs a new fact, it goes on the descriptor.
 *
 * ## 🛑 `offConsequence` IS the confirmation body
 *
 * The registry's `disable-integration` ActionDef deliberately ships an empty
 * `body`, because the consequence differs per integration and copying each
 * string into the registry would be a second place for it to drift from. The
 * dialog is composed here, from the descriptor, at render time.
 */

export interface AdminIntegrationsViewProps {
  /**
   * The settings document, server-fetched.
   *
   * 🛑 `Partial` because this page must render against an older document that
   * predates `support.enabled`. `readIntegrationStates` chooses a per-field
   * default for exactly that case — and they are NOT a uniform `?? false`:
   * email and support default ON, because a missing field must not read as
   * "we stopped talking to customers".
   */
  settings: Partial<SiteSettingsDocument> | null;
  /**
   * Persist a settings patch. Supplied by the consumer page so this component
   * carries no endpoint and no fetch — `PUT /api/admin/site`, which already
   * records one `recordAdminAction` per write.
   */
  onSave: (patch: IntegrationPatch) => Promise<void>;
}

/** What the switch currently is, in the admin's vocabulary rather than a boolean. */
function stateLabel(id: IntegrationId, enabled: boolean): string {
  /*
   * 🛑 Shipping is NOT on/off, and this is the one row where saying so matters.
   *
   * "Off" selects `provider: "manual"` — the self-ship flow sellers already
   * use and claim postage back through. Rendering that as "Disabled" beside
   * three switches that genuinely stop things would invite an admin to read it
   * as "shipping is broken", and the descriptor's own note says the switch
   * "selects manual rather than stopping anything".
   */
  if (id === "shipping") return enabled ? "We book couriers" : "Sellers self-ship";
  return enabled ? "On" : "Off";
}

export function AdminIntegrationsView({ settings, onSave }: AdminIntegrationsViewProps) {
  const { showToast } = useToast();
  const [pending, setPending] = useState<IntegrationId | "all" | null>(null);

  /*
   * 🛑 Derived from the prop, NOT copied into state.
   *
   * A `useState(readIntegrationStates(settings))` would go stale the moment
   * the page refetched, and the staleness would be invisible: the row would
   * read "On" while the guard enforcing it read "off". This page's entire job
   * is to agree with the guard, so it re-derives rather than remembers.
   */
  const states = useMemo(() => readIntegrationStates(settings), [settings]);

  const apply = useCallback(
    async (key: IntegrationId | "all", patch: IntegrationPatch, label: string) => {
      setPending(key);
      try {
        await onSave(patch);
        showToast(`${label} saved.`, "success");
      } catch (err) {
        void normalizeError(err);
        /*
         * 🛑 No optimistic flip anywhere in this component, so a failure needs
         * no rollback — the row still shows what the server last told us. On a
         * kill switch the cost of the two mistakes is wildly asymmetric: a
         * row that briefly lags is a nuisance, while a row claiming "payments
         * off" over a live gateway is the failure the model's own header warns
         * about.
         */
        showToast(`Couldn't save ${label.toLowerCase()}. Nothing was changed.`, "error");
      } finally {
        setPending(null);
      }
    },
    [onSave, showToast],
  );

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Heading level={1} size="xl" weight="semibold" color="primary">
          Integrations
        </Heading>
        <Text size="sm" color="muted">
          What the platform talks to, and what happens when it stops. Each switch writes the
          same settings field the code enforcing it reads.
        </Text>
      </Stack>

      {/*
        🛑 The payments warning is carried into the UI rather than left in a
        docstring, because an admin cannot read the docstring.

        `withOnlinePaymentEnabled` guards six routes INCLUDING
        the verify route and the Razorpay webhook, and Razorpay does not retry
        a 404 — so flipping payments off mid-checkout abandons that payment:
        captured, with no order. Ungating those two does not help,
        because `providers.config.ts` only registers the gateway while the flag
        is on, so a completion path would reach `ManualPaymentProvider` and fail
        differently. Until that larger change exists, this is a warning
        somebody must read, not a hazard they discover.
      */}
      <Alert variant="warning" title="Switch payments off only when nobody is checking out">
        Turning online payments off also closes the routes that FINISH a payment, including the
        gateway webhook. A buyer part-way through the gateway can be charged without an order
        being placed, and the gateway will not retry. There is no safe mid-checkout moment.
      </Alert>

      <Stack gap="md">
        {INTEGRATION_ORDER.map((id) => {
          const d = INTEGRATIONS[id];
          const enabled = states[id].enabled;
          const busy = pending === id || pending === "all";
          const action = enabled
            ? ACTIONS.ADMIN["disable-integration"]
            : ACTIONS.ADMIN["enable-integration"];

          return (
            <Div
              key={id}
              surface={d.severe && enabled ? "warning-surface" : "card"}
              padding="md"
              rounded="lg"
              border="default"
            >
              <Stack gap="sm">
                <Row align="start" justify="between" gap="md" className="min-w-0">
                  <Stack gap="xs" className="min-w-0">
                    <Row align="center" gap="sm" className="min-w-0">
                      <Text weight="semibold" color="primary" className="min-w-0">
                        {d.label}
                      </Text>
                      {/*
                        The state badge carries a WORD, never colour alone —
                        the same rule the status dots follow. And the pairing is
                        chip-style (`{status}-surface` + matching ink), never a
                        theme-inverting tint under literal white (Root Cause
                        #67).
                      */}
                      <Badge variant={enabled ? "success" : "inactive"}>
                        {stateLabel(id, enabled)}
                      </Badge>
                      {d.severe && <Badge variant="warning">High impact</Badge>}
                    </Row>
                    <Text size="sm" color="muted">
                      {d.summary}
                    </Text>
                  </Stack>

                  <Button
                    action={action}
                    /*
                     * 🛑 The dialog body is composed HERE from the descriptor.
                     * The ActionDef ships an empty body on purpose — see its
                     * note. A per-integration consequence copied into the
                     * registry would be a second source for one sentence.
                     */
                    confirmationBody={enabled ? d.offConsequence : undefined}
                    isLoading={busy}
                    disabled={busy}
                    onClick={() =>
                      apply(id, integrationPatch(id, !enabled), `${d.label} ${enabled ? "off" : "on"}`)
                    }
                  />
                </Row>

                {/*
                  Shown on every row, not only the severe ones. An admin
                  deciding whether to flip a switch needs the consequence
                  BEFORE the confirmation dialog, and the three non-severe
                  consequences are the ones most likely to be misread — the
                  shipping row in particular, where "off" is a working path.
                */}
                <Text size="xs" color="muted">
                  <Text as="span" size="xs" weight="semibold" color="muted">
                    Off means:{" "}
                  </Text>
                  {d.offConsequence}
                </Text>

                {/*
                  The authoritative field, shown so the switch is AUDITABLE.
                  An admin (or the next engineer) can check the settings
                  document directly and confirm the page is not lying — which
                  is precisely the failure the model's header records having
                  already happened once.
                */}
                <Row align="center" gap="sm" className="min-w-0">
                  <Text size="xs" color="faint" numeric className="min-w-0" truncate={1}>
                    {d.field}
                  </Text>
                  <Text size="xs" color="faint">
                    ·
                  </Text>
                  <Text size="xs" color="faint" className="min-w-0" truncate={1}>
                    {d.routeGuard === "gated" ? "API routes close when off" : "no route gate"}
                  </Text>
                </Row>
              </Stack>
            </Div>
          );
        })}
      </Stack>

      {/*
        Bulk controls last, and deliberately not the page's primary affordance.
        One write and one audit row — `allIntegrationsPatch` merges every
        per-integration patch, so the four switches cannot end up half-applied.
      */}
      <Row align="center" gap="sm" border="top-subtle" padding="t-md">
        <Button
          action={ACTIONS.ADMIN["enable-all-integrations"]}
          isLoading={pending === "all"}
          disabled={pending !== null}
          onClick={() => apply("all", allIntegrationsPatch(true), "All integrations on")}
        />
        <Button
          action={ACTIONS.ADMIN["disable-all-integrations"]}
          isLoading={pending === "all"}
          disabled={pending !== null}
          onClick={() => apply("all", allIntegrationsPatch(false), "All integrations off")}
        />
      </Row>
    </Stack>
  );
}
