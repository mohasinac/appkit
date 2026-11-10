"use client"
import { useAuth } from "../../../react/contexts/SessionContext";
import { useConversations } from "../hooks/useMessages";
import { Anchor } from "../../../ui/components/Anchor";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { EmptyState } from "../../../ui/components/EmptyState";
import { useSignInHref } from "../../../react/hooks/useReturnTo";
import type { ConversationDocument } from "../schemas/firestore";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

function formatRelative(at: Date | string): string {
  const d = typeof at === "string" ? new Date(at) : at;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Label for the OTHER side of a conversation, derived from THEIR role —
 * never "my own role inverted". A binary `participantRoles[selfId] ===
 * "seller" ? "Buyer" : "Seller"` silently mislabels the third shape: a buyer
 * in a buyer<->assistant thread (A2) has `participantRoles[selfId] ===
 * "buyer"`, which is `!== "seller"`, so the old ternary fell through to
 * "Seller" — wrong on every assistant conversation in the inbox.
 */
function otherParticipantLabel(conversation: ConversationDocument, selfId: string): string {
  const otherId = conversation.participantIds.find((id) => id !== selfId);
  const role = otherId ? conversation.participantRoles[otherId] : undefined;
  switch (role) {
    case "seller":
      return "Seller";
    case "buyer":
      return "Buyer";
    case "assistant":
      return "Assistant";
    default:
      return "Seller";
  }
}

function ConversationRow({ conversation, selfId }: { conversation: ConversationDocument; selfId: string }) {
  const unread = conversation.unread[selfId] ?? 0;
  return (
    <Anchor
      href={`/messages/${conversation.id}`}
      underline="none"
      className="block"
    >
      <Row
        surface={unread > 0 ? "muted" : "default"}
        padding="md"
        gap="md"
        className="border-b border-[var(--appkit-color-border-subtle)]"
      >
        <Stack gap="xs" className="flex-1 min-w-0">
          <Row gap="sm" justify="between">
            <Text weight={unread > 0 ? "semibold" : "normal"} className="truncate">
              {otherParticipantLabel(conversation, selfId)}
            </Text>
            {conversation.lastMessageAt && (
              <Span size="xs" color="muted">
                {formatRelative(conversation.lastMessageAt)}
              </Span>
            )}
          </Row>
          {conversation.lastMessage && (
            <Text size="sm" color="muted" className="truncate">
              {conversation.lastMessage.hasAttachments && !conversation.lastMessage.body
                ? "Sent an attachment"
                : conversation.lastMessage.body}
            </Text>
          )}
        </Stack>
        {unread > 0 && (
          <Span
            size="xs"
            weight="semibold"
            color="inverse"
            rounded="full"
            className="flex-shrink-0 bg-primary"
            padding="x-sm"
          >
            {unread}
          </Span>
        )}
      </Row>
    </Anchor>
  );
}

export interface ConversationsInboxViewProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function ConversationsInboxView({ pageRegionCards = [] }: ConversationsInboxViewProps = {}) {
  const { user, loading } = useAuth();
  const { data, isPending, isError } = useConversations(20, Boolean(user));
  /*
   * 🛑 Section-resolved AND carrying `?next=`. The raw `ROUTES.AUTH.LOGIN` is
   * the SHOP's `/auth/login`, a 404 on every other host, and a bare link signs
   * the visitor in somewhere other than the surface that asked them to.
   */
  const signInHref = useSignInHref();

  if (loading) return null;
  if (!user) {
    return (
      <EmptyState
        title="Sign in to view your messages"
        description="Conversations with buyers and sellers are only visible once you're signed in."
        actionLabel="Sign in"
        actionHref={signInHref}
      />
    );
  }

  return (
    <Div className="max-w-2xl mx-auto">
      <Div padding="md" className="border-b border-[var(--appkit-color-border-subtle)]">
        <Heading level={1} size="lg">
          Messages
        </Heading>
      </Div>

      <AdminComposableRegion pageId="messages" initialCards={pageRegionCards} />

      {isPending && (
        <Div padding="lg">
          <Text color="muted">Loading conversations…</Text>
        </Div>
      )}

      {isError && (
        <Div padding="lg">
          <Text color="danger">Could not load your messages. Try reloading the page.</Text>
        </Div>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title="No conversations yet"
          description="Messages with buyers and sellers show up here."
        />
      )}

      {data && data.items.length > 0 && (
        <Stack gap="none">
          {data.items.map((c) => (
            <ConversationRow key={c.id} conversation={c} selfId={user.uid} />
          ))}
        </Stack>
      )}
    </Div>
  );
}
