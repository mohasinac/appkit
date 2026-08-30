"use client";

import { Li, useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Div, Row, SideDrawer, Span, Stack, Text, Ul, useToast } from "../../../ui";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { supportTicketCreateSchema } from "../../support/schemas/ticket-create-form";
import { TicketCategoryValues } from "../../support/schemas/firestore";
import { SUPPORT_ENDPOINTS } from "../../../constants/api-endpoints";

const __P = {
  p3: "p-[var(--appkit-space-3)]",
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

interface TicketMessage {
  id?: string;
  authorRole?: string;
  body?: string;
  createdAt?: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  description?: string;
  messages?: TicketMessage[];
  createdAt?: string;
  updatedAt?: string;
  orderId?: string;
}

interface UserSupportResponse {
  tickets?: SupportTicket[];
}

// --- Constants ---------------------------------------------------------------

/**
 * Category labels.
 *
 * Keyed off `TicketCategoryValues` rather than written as a parallel array, so
 * a twelfth category cannot be added to the schema and silently omitted here —
 * Root Cause #61, which the schema itself already guards on its own side.
 *
 * There are ten, so the generator renders this as a `PaginatedSelect`: it was
 * a native `<Select>` with no `name`, which is over the five-option threshold
 * AND unreachable by `applyZodIssues`.
 */
const CATEGORY_LABELS: Record<string, string> = {
  [TicketCategoryValues.ORDER_ISSUE]: "Order issue",
  [TicketCategoryValues.BILLING_PAYMENT]: "Billing / payment",
  [TicketCategoryValues.ACCOUNT]: "Account",
  [TicketCategoryValues.LISTING_DISPUTE]: "Listing dispute",
  /*
   * The hand-written array this replaced had TEN entries and the schema has
   * ELEVEN — `scam_report` was simply missing, so a user could never file one
   * from this drawer even though the route accepts it.
   */
  [TicketCategoryValues.SCAM_REPORT]: "Report a scam",
  [TicketCategoryValues.REFUND_REQUEST]: "Refund request",
  [TicketCategoryValues.AUCTION_DISPUTE]: "Auction dispute",
  // ST-4 — sellers use this to request changes to admin-controlled
  // store fields (status, capabilities, verification badge).
  [TicketCategoryValues.STORE_CHANGE_REQUEST]: "Store change request (sellers)",
  // ST-3 — buyers/sellers request mutation of order line items
  [TicketCategoryValues.ORDER_MODIFICATION_REQUEST]: "Order modification request",
  // ST-5 — appeal a soft or hard ban; bypasses the create_support_tickets
  // soft-ban guard server-side.
  [TicketCategoryValues.UNBAN_REQUEST]: "Appeal a ban (unban request)",
  [TicketCategoryValues.GENERAL]: "General",
};

const CATEGORY_OPTIONS = Object.values(TicketCategoryValues).map((value) => ({
  value,
  label: CATEGORY_LABELS[value] ?? value.replace(/_/g, " "),
}));

const CLS_MSG_USER = "border bg-[var(--appkit-color-surface)]/40 border-[var(--appkit-color-border)]";
const CLS_MSG_STAFF = "bg-info-surface border border-info dark:bg-info-surface dark:border-info";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-info-surface text-info",
  in_progress: "bg-warning-surface text-warning",
  waiting_on_user: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  resolved: "bg-success-surface text-success",
  closed: "bg-[var(--appkit-color-surface)] text-[var(--appkit-color-text-muted)] bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text-muted)]",
};

const ROLE_LABEL: Record<string, string> = {
  user: "You",
  support: "Support",
  admin: "Admin",
};

// --- Component ---------------------------------------------------------------

export type UserSupportViewProps = Record<string, never>;

/** The new-ticket draft — flat, matching `supportTicketCreateSchema`. */
interface TicketValues {
  [key: string]: unknown;
  category: string;
  subject: string;
  description: string;
  orderId: string;
}

const EMPTY_TICKET: TicketValues = {
  category: TicketCategoryValues.GENERAL,
  subject: "",
  description: "",
  orderId: "",
};

export function UserSupportView(_props: UserSupportViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  const [newTicket, setNewTicket] = useState<TicketValues>(EMPTY_TICKET);
  const patchTicket = (partial: Partial<TicketValues>) =>
    setNewTicket((prev) => Object.assign({}, prev, partial));

  // Reply state
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading, error } = useQuery<UserSupportResponse>({
    queryKey: ["user", "support-tickets"],
    queryFn: () => apiClient.get<UserSupportResponse>(SUPPORT_ENDPOINTS.TICKETS),
  });

  const tickets = data?.tickets ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["user", "support-tickets"] });

  const createMutation = useApiMutation({
    errorMessage: "Failed to create ticket.",
    mutationFn: async (values: Record<string, JsonValue>) =>
      apiClient.post(SUPPORT_ENDPOINTS.TICKETS, values),
    onSuccess: () => {
      showToast("Support ticket created.", "success");
      setNewTicketOpen(false);
      setNewTicket(EMPTY_TICKET);
      invalidate();
    },
  });

  /*
   * This drawer validated NOTHING before the schema landed, and its sibling
   * page (`/user/support/new`) hand-rolled a `canSubmit` that required an
   * order id for an `order_issue` ticket — a real rule the route did not
   * enforce either, so the same ticket was acceptable or not depending purely
   * on which surface the user opened. One schema now covers both and the
   * route; the parse below is what reports it, per field.
   */
  const sections = useMemo(
    () =>
      buildSectionsFromSchema<TicketValues>(supportTicketCreateSchema, {
        options: { category: CATEGORY_OPTIONS },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, newTicket, { scope: "user:support-ticket" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    supportTicketCreateSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const submitTicket = () => {
    clearErrors();
    /*
     * `visibleValues` is what keeps an order id typed before switching
     * category out of a ticket that has nothing to do with an order — the
     * `when` on that field hides the control and never clears it.
     */
    const parsed = supportTicketCreateSchema.safeParse(
      visibleValues(supportTicketCreateSchema, newTicket),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    createMutation.mutate(parsed.data as Record<string, JsonValue>);
  };

  const replyMutation = useApiMutation({
    errorMessage: "Failed to send reply.",
    mutationFn: async () => {
      await apiClient.post(
        SUPPORT_ENDPOINTS.TICKET_MESSAGES(selectedTicket!.id),
        { body: replyBody.trim() },
      );
    },
    onSuccess: () => {
      showToast("Reply sent.", "success");
      setReplyBody("");
      invalidate();
    },
  });

  return (
    <>
      <Div className="mx-auto max-w-2xl" paddingY="y-lg" paddingX="x-md">
        <Row className="mb-4" align="center" justify="between">
          <Text size="xl" weight="semibold" color="primary">Support Tickets</Text>
          <Button type="button" variant="primary" size="sm" onClick={() => setNewTicketOpen(true)}>New ticket</Button>
        </Row>
        {renderTicketListArea({ isLoading, error, tickets, setSelectedTicket, setDetailOpen })}
      </Div>
      <SideDrawer
        isOpen={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        title="Open a support ticket"
      >
        <Stack className={`${__P.p4}`} gap="md">
          <FormShellContext.Provider value={shellCtx}>
            <FormErrorSummary />
            <SectionForm<TicketValues>
              sections={sections}
              values={newTicket}
              onChange={patchTicket}
              onSubmit={submitTicket}
              schema={supportTicketCreateSchema}
              openIds={nav.openIds}
              onOpenChange={nav.setOpenIds}
              isLoading={createMutation.isPending}
              submitLabel="Submit ticket"
              onCancel={() => setNewTicketOpen(false)}
              /*
               * A drawer owns its own footer — `useIsInsideOverlay` already
               * suppresses the viewport-fixed bar, which would otherwise
               * render BEHIND the backdrop. Stated rather than relied on.
               */
              bottomBar={false}
            />
          </FormShellContext.Provider>
        </Stack>
      </SideDrawer>
      {renderTicketDetailDrawer({ detailOpen, setDetailOpen, selectedTicket, replyBody, setReplyBody, replyMutation })}
    </>
  );
}

function renderTicketListArea(props: {
  isLoading: boolean; error: unknown; tickets: SupportTicket[];
  setSelectedTicket: (t: SupportTicket) => void; setDetailOpen: (v: boolean) => void;
}) {
  const { isLoading, error, tickets, setSelectedTicket, setDetailOpen } = props;
  return (
    <>
      {isLoading && (
        <Stack gap="3">
          {[1, 2, 3].map((i) => <Div key={i} className="h-16 animate-pulse" surface="subtle" rounded="lg" />)}
        </Stack>
      )}
      {error && (
        <Div textSize="sm" className="border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="xl">
          Failed to load support tickets.
        </Div>
      )}
      {!isLoading && tickets.length === 0 && (
        <Div className="text-left" surface="muted" paddingY="y-2xl" paddingX="x-lg" rounded="xl" border="default">
          <Text size="sm" color="muted">You haven&apos;t opened any support tickets yet.</Text>
        </Div>
      )}
      <Ul spacing="loose">
        {tickets.map((ticket) => (
          <Li key={ticket.id}>
            <Button rounded="xl" variant="ghost" type="button" shadow="sm" border="default" paddingX="md" paddingY="md" className="w-full bg-[var(--appkit-color-surface)] text-left hover:border-[var(--appkit-color-primary-300)] transition-colors" onClick={() => { setSelectedTicket(ticket); setDetailOpen(true); }}>
              <Row align="start" justify="between" gap="sm">
                <Div className="min-w-0 flex-1">
                  <Text className="truncate" color="primary" weight="medium">{ticket.subject}</Text>
                  <Text size="xs" color="muted">{ticket.category.replace(/_/g, " ")}{ticket.orderId ? ` · Order: ${ticket.orderId}` : ""}</Text>
                </Div>
                <Span size="xs" weight="medium" className={`shrink-0 inline-flex ${STATUS_BADGE[ticket.status] ?? STATUS_BADGE.open}`} padding="pill-sm" rounded="full">{ticket.status.replace(/_/g, " ")}</Span>
              </Row>
            </Button>
          </Li>
        ))}
      </Ul>
    </>
  );
}


function renderTicketDetailDrawer(props: { detailOpen: boolean; setDetailOpen: (v: boolean) => void; selectedTicket: SupportTicket | null; replyBody: string; setReplyBody: (v: string) => void; replyMutation: any }) {
  const { detailOpen, setDetailOpen, selectedTicket, replyBody, setReplyBody, replyMutation } = props;
  return (
    <SideDrawer isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedTicket?.subject ?? "Ticket"}>
      {selectedTicket && (
        <Stack className={`${__P.p4}`} gap="md">
          <Row wrap gap="sm">
            <Span size="xs" weight="medium" className={`inline-flex ${STATUS_BADGE[selectedTicket.status] ?? STATUS_BADGE.open}`} rounded="full" padding="pill-sm-tall">{selectedTicket.status.replace(/_/g, " ")}</Span>
            <Span size="xs" rounded="full" padding="pill-sm-tall" surface="subtle" color="muted">{selectedTicket.category.replace(/_/g, " ")}</Span>
            {selectedTicket.orderId && <Span size="xs" rounded="full" padding="pill-sm-tall" surface="subtle" color="muted">Order: {selectedTicket.orderId}</Span>}
          </Row>
          {selectedTicket.description && (
            <Div className={`${__P.p3}`} rounded="lg" surface="muted" border="default">
              <Text className="mb-1 tracking-wide" size="xs" weight="semibold" color="muted" transform="uppercase">Your description</Text>
              <Text className="whitespace-pre-wrap" color="primary" size="sm">{selectedTicket.description}</Text>
            </Div>
          )}
          {(selectedTicket.messages ?? []).length > 0 && (
            <Stack gap="sm">
              <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">Messages</Text>
              <Stack className={`max-h-72 ${__O.yAuto}`} gap="sm">
                {(selectedTicket.messages ?? []).map((msg, i) => (
                  <Div textSize="sm" key={msg.id ?? i} className={`${__P.p3} ${msg.authorRole === "user" ? CLS_MSG_USER : CLS_MSG_STAFF}`} rounded="lg">
                    <Row color="muted" textSize="xs" className="mb-1" align="center" gap="sm">
                      <Span weight="medium" color="muted">{ROLE_LABEL[msg.authorRole ?? "user"] ?? msg.authorRole}</Span>
                      {msg.createdAt && <Span>{new Date(msg.createdAt).toLocaleString()}</Span>}
                    </Row>
                    <Text className="whitespace-pre-wrap" color="primary">{msg.body}</Text>
                  </Div>
                ))}
              </Stack>
            </Stack>
          )}
          {selectedTicket.status !== "closed" && selectedTicket.status !== "resolved" && (
            <Stack gap="sm">
              <FieldTextarea
                name="reply"
                label="Reply"
                value={replyBody}
                onChange={setReplyBody}
                rows={3}
                placeholder="Add a message to your ticket…"
              />
              <Button type="button" variant="primary" size="sm" isLoading={replyMutation.isPending} disabled={!replyBody.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()}>Send reply</Button>
            </Stack>
          )}
        </Stack>
      )}
    </SideDrawer>
  );
}
