import React from "react";
import { Div, Heading, Span } from "../../../ui";

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
    <Div
      className={`grid grid-cols-1 md:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] 2xl:grid-cols-[360px_1fr] gap-4 h-full min-h-[600px] ${className}`}
    >
      {/* Room list — hidden on mobile when a chat is open */}
      <Div className={chatId ? "hidden md:block" : "block"}>
        {labels.title && (
          <Heading level={3} className="mb-3 font-semibold">
            {labels.title}
          </Heading>
        )}
        {renderChatList?.()}
      </Div>

      {/* Chat window */}
      {chatId ? (
        <Div className="flex flex-col gap-3">
          {renderMobileBack?.()}
          {renderChatWindow?.()}
        </Div>
      ) : (
        <Div className="hidden md:flex items-center justify-center text-neutral-400 dark:text-neutral-600 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
          {renderEmptyState?.() ?? (
            <Span>{labels.selectRoom ?? "Select a conversation"}</Span>
          )}
        </Div>
      )}
    </Div>
  );
}
