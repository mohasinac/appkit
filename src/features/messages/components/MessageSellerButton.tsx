"use client"
import { useRouter } from "next/navigation";
import { useAuth } from "../../../react/contexts/SessionContext";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import { useOpenConversationWithSeller } from "../hooks/useMessages";
import { Button } from "../../../ui/components/Button";
import { ROUTES } from "../../../next/routing/route-map";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { PublicSiteSettings } from "../../../_internal/shared/features/site-settings/types";

export interface MessageSellerButtonProps {
  storeId: string;
  /**
   * The listing this button was clicked from, carried into the thread so the
   * buyer's first message renders as a PRODUCT CARD.
   *
   * 🛑 Without it the whole card pipeline is unreachable. `sendMessage` builds
   * a `MessageProductRef` from a `productId`, `MessageBubble` renders it, and
   * `POST /api/messages/[conversationId]` accepts it — but the ONLY caller of
   * this button is the product detail page, which had the id right there and
   * never passed it. So a buyer landed in a bare thread and had to TYPE which
   * item they meant: a block of words where a card belongs. Root Cause #103's
   * shape — a feature complete in every direction except the one that puts
   * data in.
   */
  productId?: string;
  /** Render nothing when the viewer owns this store — comparing storeId
   * client-side is an optional convenience; the server refuses it either way. */
  isOwnStore?: boolean;
  className?: string;
}

/**
 * D11 — the gap tester-case authoring surfaced: the full create/open-
 * conversation backend had no UI entry point anywhere. One real button, put
 * wherever a page already knows a `storeId` — the product detail page's
 * store card is the first and highest-value placement.
 *
 * Absent entirely when chat is off or the viewer is the store's own owner —
 * never rendered-but-disabled, same discipline as the nav icon.
 */
export function MessageSellerButton({ storeId, productId, isOwnStore, className }: MessageSellerButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: settings } = useSiteSettings<PublicSiteSettings>();
  const { mutate, isPending } = useOpenConversationWithSeller();

  if (!user || isOwnStore || settings?.chat?.enabled !== true) return null;

  return (
    <Button
      action={ACTIONS.PRODUCT["message-seller"]}
      size="sm"
      isLoading={isPending}
      className={className}
      onClick={() => {
        mutate(
          { storeId },
          {
            onSuccess: (conversation) => {
              /*
               * `?product=` rather than a new conversation per listing. The
               * schema is explicit that a product attaches to a MESSAGE, never
               * to the thread — "a buyer with three questions about three items
               * wants one thread, not three" — so the id rides in the URL and
               * the composer attaches it to the next message sent.
               */
              const href = String(ROUTES.USER.MESSAGE_THREAD(conversation.id));
              router.push(productId ? `${href}?product=${encodeURIComponent(productId)}` : href);
            },
          },
        );
      }}
    />
  );
}
