import React from "react";
import { Div, Heading, Span, Stack } from "../../../ui";

export interface MessagesViewLabels {
  title?: string;
  selectRoom?: string;
  backToList?: string;
}

export interface MessagesViewProps {
  labels?: MessagesViewLabels;
  chatId?: string | null;
  renderChatList?: () => React.ReactNode;
  renderChatWindow?: () => React.ReactNode;
  renderMobileBack?: () => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  className?: string;
}

export function MessagesView({
  labels = {},
  chatId,
  renderChatList,
  renderChatWindow,
  renderMobileBack,
  renderEmptyState,
  className = "",
}: MessagesViewProps) {
  return (
    <Div layout="grid" gap="4" 
      className={`grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] 2xl:grid-cols-[360px_1fr] h-full min-h-[600px] ${className}`}
    >
      {/* Room list — hidden on mobile when a chat is open */}
      <Div className={chatId ? "hidden md:block" : "block"}>
        {labels.title && (
          <Heading level={3} className="mb-3" weight="semibold">
            {labels.title}
          </Heading>
        )}
        {renderChatList?.()}
      </Div>

      {/* Chat window */}
      {chatId ? (
        <Stack gap="xs">
          {renderMobileBack?.()}
          {renderChatWindow?.()}
        </Stack>
      ) : (
        <Div className="hidden md:flex items-center justify-center text-zinc-400 dark:text-zinc-400 border border-dashed border-neutral-200 dark:border-neutral-700" rounded="xl">
          {renderEmptyState?.() ?? (
            <Span>{labels.selectRoom ?? "Select a conversation"}</Span>
          )}
        </Div>
      )}
    </Div>
  );
}
