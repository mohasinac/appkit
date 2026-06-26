import React from "react";
import { Div, Heading, Row, Span } from "../../../ui";

const CLS_DOT_ON = "bg-success-surface";

export interface ChatWindowLabels {
  title?: string;
  connected?: string;
  disconnected?: string;
}

export interface ChatWindowProps {
  labels?: ChatWindowLabels;
  isConnected?: boolean;
  isLoading?: boolean;
  error?: React.ReactNode;
  renderLoadingIndicator?: () => React.ReactNode;
  renderMessages: () => React.ReactNode;
  renderInput: () => React.ReactNode;
  className?: string;
}

export function ChatWindow({
  labels = {},
  isConnected = true,
  isLoading = false,
  error,
  renderLoadingIndicator,
  renderMessages,
  renderInput,
  className = "",
}: ChatWindowProps) {
  return (
    <Div className={className}>
      <Row
        justify="between"
        className="border-b border-neutral-200 dark:border-neutral-700 mb-3" padding="b-sm"
      >
        <Row gap="xs">
          {labels.title && <Heading level={4}>{labels.title}</Heading>}
          <Span
            className={`w-2 h-2 ${isConnected ? CLS_DOT_ON : "bg-[var(--appkit-color-text-faint)]"}`} rounded="full"
            aria-label={isConnected ? labels.connected : labels.disconnected}
          />
        </Row>
        {isLoading && (renderLoadingIndicator?.() ?? null)}
      </Row>

      {error ?? null}

      {renderMessages()}
      {renderInput()}
    </Div>
  );
}
