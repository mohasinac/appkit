"use client"
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../react/contexts/SessionContext";
import {
  useConversationThread,
  useSendMessage,
  useMarkConversationRead,
  useBlockConversation,
} from "../hooks/useMessages";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Button } from "../../../ui/components/Button";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { EmptyState } from "../../../ui/components/EmptyState";
import { MediaImage } from "../../media/MediaImage";
import type { MessageDocument } from "../schemas/firestore";

function newClientMessageId(): string {
  // crypto.randomUUID is available in every browser this app targets; a
  // retry reuses the SAME id generated at compose time, not a fresh one per
  // attempt, so the server resolves a retry as the same message.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function MessageBubble({ message, isSelf }: { message: MessageDocument; isSelf: boolean }) {
  if (message.deletedAt) {
    return (
      <Row justify={isSelf ? "end" : "start"}>
        <Text size="sm" color="muted" className="italic">
          Message deleted
        </Text>
      </Row>
    );
  }
  return (
    <Row justify={isSelf ? "end" : "start"}>
      <Stack
        gap="xs"
        surface={isSelf ? "interactive" : "muted"}
        padding="sm"
        rounded="lg"
        className="max-w-[75%]"
      >
        {message.productRef && (
          <Row gap="sm" surface="card" padding="xs" rounded="md">
            {message.productRef.image && (
              <Div className="relative h-10 w-10 flex-shrink-0" rounded="default" overflow="hidden">
                <MediaImage src={message.productRef.image} alt={message.productRef.title} size="thumbnail" />
              </Div>
            )}
            <Text size="xs" weight="semibold" className="truncate">
              {message.productRef.title}
            </Text>
          </Row>
        )}
        <Text size="sm" className="whitespace-pre-wrap break-words">
          {message.body}
        </Text>
      </Stack>
    </Row>
  );
}

export function ConversationThreadView({ conversationId }: { conversationId: string }) {
  const { user, loading } = useAuth();
  const { data, isPending, isError, channelError } = useConversationThread(
    user ? conversationId : null,
  );
  const { mutate: send, isPending: isSending, pending, retry } = useSendMessage(conversationId);
  const markRead = useMarkConversationRead();
  const block = useBlockConversation();
  const [draft, setDraft] = useState("");
  const markedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!markedRef.current && conversationId && user) {
      markedRef.current = true;
      markRead.mutate({ conversationId });
    }
    // Reset the guard when the thread changes.
    return () => {
      markedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.items.length, pending.length]);

  if (loading) return null;
  if (!user) {
    return (
      <EmptyState
        title="Sign in to view this conversation"
        actionLabel="Sign in"
        actionHref="/auth/login"
      />
    );
  }

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const clientMessageId = newClientMessageId();
    send({ body: trimmed, clientMessageId });
    setDraft("");
  };

  // Newest-first from the API, so reverse for display (oldest at top).
  const items = data ? [...data.items].reverse() : [];

  return (
    <Div layout="flex-col" className="max-w-2xl mx-auto h-full">
      <Row
        padding="md"
        justify="between"
        className="border-b border-[var(--appkit-color-border-subtle)]"
      >
        <Heading level={1} size="lg">
          Conversation
        </Heading>
        <Button
          variant="ghost"
          size="sm"
          isLoading={block.isPending}
          onClick={() => {
            if (confirm("Block this person from messaging you in this conversation?")) {
              block.mutate({ conversationId });
            }
          }}
        >
          Block
        </Button>
      </Row>

      {channelError && (
        <Div padding="sm" surface="warning-surface">
          <Text size="xs" color="warning">
            {channelError} New messages may not appear until you reload.
          </Text>
        </Div>
      )}

      <Div className="flex-1" overflow="y-auto" padding="md">
        {isPending && <Text color="muted">Loading messages…</Text>}
        {isError && <Text color="danger">Could not load this conversation.</Text>}

        <Stack gap="sm">
          {items.map((m) => (
            <MessageBubble key={m.id} message={m} isSelf={m.authorId === user.uid} />
          ))}
          {pending.map((p) => (
            <Row key={p.clientMessageId} justify="end">
              <Stack
                gap="xs"
                surface="interactive"
                padding="sm"
                rounded="lg"
                className="max-w-[75%] opacity-70"
              >
                <Text size="sm" className="whitespace-pre-wrap break-words">
                  {p.body}
                </Text>
                {p.status === "failed" && (
                  <Button variant="ghost" size="sm" onClick={() => retry(p)}>
                    Failed — tap to retry
                  </Button>
                )}
                {p.status === "pending" && (
                  <Span size="xs" color="muted">
                    Sending…
                  </Span>
                )}
              </Stack>
            </Row>
          ))}
        </Stack>
        <Div ref={bottomRef} />
      </Div>

      <Row
        padding="md"
        gap="sm"
        className="border-t border-[var(--appkit-color-border-subtle)]"
      >
        <Div className="flex-1">
          <FieldTextarea
            name="message-composer"
            aria-label="Message"
            value={draft}
            onChange={setDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={2000}
            rows={2}
            placeholder="Write a message…"
          />
        </Div>
        <Button isLoading={isSending} disabled={!draft.trim()} onClick={handleSend}>
          Send
        </Button>
      </Row>
    </Div>
  );
}
