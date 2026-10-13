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
export function MessageSellerButton({ storeId, isOwnStore, className }: MessageSellerButtonProps) {
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
              router.push(String(ROUTES.USER.MESSAGE_THREAD(conversation.id)));
            },
          },
        );
      }}
    />
  );
}
