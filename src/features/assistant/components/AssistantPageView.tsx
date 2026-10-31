"use client";

import { useState } from "react";
import { Container, Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { useFormShellState } from "../../../ui/forms/FormShell";
import { useAuth } from "../../../react/contexts/SessionContext";
import { apiClient } from "../../../http/ApiClient";
import { useApiMutation } from "../../../client/api/useApiMutation";
import { ASSISTANT_ENDPOINTS } from "../../../constants/api-endpoints";
import { askAssistantSchema } from "../schemas/ask";

/**
 * The customer assistant's dedicated full-chat page — the "expand" target
 * from `<AssistantWidget>`'s desktop panel, and mobile's direct entry point.
 *
 * Not the `/messages/[id]` thread view: the shared buyer<->seller inbox is
 * deliberately not this feature's storage (owner's instruction, 2026-10-31).
 * This renders its own, standalone conversation.
 *
 * @tag domain:assistant
 * @tag layer:client
 * @tag access:public
 * @tag sideEffects:network
 */

interface AssistantReply {
  text: string;
}

interface Exchange {
  question: string;
  answer: string;
}

export function AssistantPageView() {
  const { user, loading } = useAuth();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const shell = useFormShellState(askAssistantSchema);

  const ask = useApiMutation({
    errorMessage: "Could not reach the assistant. Please try again.",
    setFieldError: shell.setFieldError,
    mutationFn: async (message: string) => {
      return apiClient.post<AssistantReply>(ASSISTANT_ENDPOINTS.ASK, { message });
    },
    onSuccess: (data, message) => {
      setQuestion("");
      setExchanges((prev) => [...prev, { question: message, answer: data?.text ?? "" }]);
    },
  });

  if (loading) return null;

  if (!user) {
    return (
      <Container padding="page">
        <Stack gap="sm">
          <Heading level={1} size="xl">
            Ask the assistant
          </Heading>
          <Text color="muted">Sign in to ask about an order, a product, or our policies.</Text>
        </Stack>
      </Container>
    );
  }

  function handleAsk() {
    const trimmed = question.trim();
    if (trimmed.length > 0) ask.mutate(trimmed);
  }

  return (
    <Container padding="page">
      <Stack gap="md">
        <Heading level={1} size="xl">
          Ask the assistant
        </Heading>
        <Text color="muted">
          Questions about shipping, returns, or what we stock — answered from our FAQs,
          live catalogue, and your own order history.
        </Text>

        {exchanges.length > 0 && (
          <Stack gap="md">
            {exchanges.map((exchange, i) => (
              <Stack key={i} gap="xs" surface="card" padding="card" rounded="lg" border="default">
                <Text weight="semibold">{exchange.question}</Text>
                <Text color="muted">{exchange.answer}</Text>
              </Stack>
            ))}
          </Stack>
        )}

        <Form onSubmit={(e) => e.preventDefault()} shellCtx={shell.shellCtx}>
          <Stack gap="sm">
            <FieldInput
              name="question"
              label="Your question"
              placeholder="e.g. Where is my order?"
              value={question}
              onChange={setQuestion}
              maxLength={2000}
            />
            <Button
              type="submit"
              isLoading={ask.isPending}
              disabled={question.trim().length === 0}
              onClick={handleAsk}
            >
              Ask
            </Button>
          </Stack>
        </Form>
      </Stack>
    </Container>
  );
}
