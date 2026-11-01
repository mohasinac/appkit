"use client";

import { useHiddenHubCards } from "../hooks/useHiddenHubCards";
import { IconButton } from "../../../ui/components/IconButton";
import { Icon } from "../../../ui/components/Icon";
import { Div } from "../../../ui/components/Div";
import { Row } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";

/**
 * Wraps one hub card with per-user hide/unhide (Phase 4A). Same SSR/CSR
 * tradeoff `useSectionState` already accepts elsewhere in this codebase: the
 * server has no localStorage, so a card the user hid on this device renders
 * once and then disappears on hydration rather than staying hidden through
 * the first paint. The durable (profile) copy is what a NEW device reads
 * from, with no flash at all once it has landed.
 */
export function HiddenHubCardGate({
  scope,
  cardKey,
  children,
}: {
  /** `"{portal}:hub"` — must match the scope the page's own hook instance uses. */
  scope: string;
  cardKey: string;
  children: React.ReactNode;
}) {
  const { isHidden, hide } = useHiddenHubCards(scope);

  if (isHidden(cardKey)) return null;

  return (
    <Div className="group/hub-card relative">
      {children}
      <IconButton
        size="sm"
        aria-label="Hide this card"
        className="absolute top-2 right-2 opacity-0 group-hover/hub-card:opacity-100 focus-visible:opacity-100 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          hide(cardKey);
        }}
      >
        <Icon name="hide" size="sm" />
      </IconButton>
    </Div>
  );
}

/**
 * "N cards hidden — show all" for the cards THIS page actually renders —
 * `allCardKeys` scopes the restore to what's on screen, so a stray hidden
 * key from a since-removed card does not report a phantom count forever.
 */
export function HiddenHubCardsRestoreBar({
  scope,
  allCardKeys,
}: {
  scope: string;
  allCardKeys: string[];
}) {
  const { hiddenKeys, unhide } = useHiddenHubCards(scope);
  const hiddenHere = hiddenKeys.filter((k) => allCardKeys.includes(k));
  if (hiddenHere.length === 0) return null;

  return (
    <Row gap="xs" align="center">
      <Text size="sm" color="muted">
        {hiddenHere.length} card{hiddenHere.length === 1 ? "" : "s"} hidden.
      </Text>
      <TextLink
        href="#"
        onClick={(e) => {
          e.preventDefault();
          for (const key of hiddenHere) unhide(key);
        }}
      >
        Show all
      </TextLink>
    </Row>
  );
}

export { useHiddenHubCards };
