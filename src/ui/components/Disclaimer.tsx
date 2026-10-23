import React from "react";
/*
 * Defining modules, not `../index` — Root Cause #18.
 *
 * The barrel re-exports THIS component, so importing three primitives back
 * through it closed a two-module cycle (`audit-import-cycles` component 1).
 * The deep paths below have one direction only.
 */
import { Div } from "./Div";
import { Stack } from "./Layout";
import { Text } from "./Typography";
import {
  DISCLAIMERS,
  type DisclaimerId,
} from "../../_internal/shared/content/disclaimers";
import {
  resolvePublishedCopy,
  resolvePublishedValues,
  type PublishedValues,
} from "../../_internal/shared/content/published-values";

/**
 * The one way to render a disclaimer (Phase 12).
 *
 * ## 🛑 `id` only — there is no `text` prop, deliberately
 *
 * A `text` escape hatch would make this a styled box, and then the legally
 * material disclaimers would be written at their call sites again, drift, and
 * end up weakest exactly where they matter most. That is the failure this
 * registry exists to close. If a surface needs a disclaimer that does not
 * exist, the fix is a new registry entry — which is also what gets it
 * reviewed.
 *
 * ## Tokens resolve here
 *
 * The protection entry quotes `{{saleProtectionMaxValue}}` and the claim
 * windows, so the published limits come from the constants that ENFORCE them
 * (Phase 9's mechanism). A change to `SALE_PROTECTION_MAX_VALUE` updates the
 * terms rather than contradicting them.
 *
 * Code-derived values are the default; a caller with settings in hand passes
 * better ones for the money figures.
 *
 * ## Safe in a Server Component
 *
 * No hooks, no state, and the registry is a plain object — so this renders on
 * either side of the boundary. Do not add state here without checking every
 * RSC call site (Root Cause #76).
 */

const CODE_DERIVED_VALUES = resolvePublishedValues();

export interface DisclaimerProps {
  id: DisclaimerId;
  /** Override the money figures with the admin's current configuration. */
  publishedValues?: PublishedValues;
  /**
   * Render without the surrounding box — for a disclaimer that sits inside a
   * card that already has chrome.
   *
   * 🛑 Does NOT make it smaller or quieter. A `warning`-tone entry keeps its
   * tone inline, because the entries marked `warning` are the ones where
   * ignoring the text has a consequence the reader cannot undo.
   */
  inline?: boolean;
  className?: string;
}

/**
 * Renders `**bold**` and nothing else.
 *
 * 🛑 A deliberately tiny subset, not a markdown renderer. The emphasis is
 * load-bearing in exactly the places it is used — "**not insurance**" in the
 * protection entry, "**under review**" versus "**verified**" in the scam
 * registry — and those are the phrases a reader skims past without it.
 *
 * 🛑 And it returns ELEMENTS, never HTML. The bodies are our own constants so
 * injection is not the risk; the risk is that a `dangerouslySetInnerHTML`
 * here would invite someone to pass admin-editable text through it later,
 * which is how a disclaimer box becomes a stored-XSS surface.
 */
function renderEmphasis(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <Text as="span" key={i} weight="semibold">
        {part.slice(2, -2)}
      </Text>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function Disclaimer({
  id,
  publishedValues = CODE_DERIVED_VALUES,
  inline = false,
  className = "",
}: DisclaimerProps) {
  const entry = DISCLAIMERS[id];
  /*
   * A `Record<DisclaimerId, …>` means this cannot happen through the type, but
   * an `as DisclaimerId` cast at a call site could — and rendering nothing is
   * the wrong failure here. A missing disclaimer is invisible, which is the
   * whole problem; so it renders nothing only when the registry genuinely has
   * no entry, and the audit is what catches that case before it ships.
   */
  if (!entry) return null;

  const body = resolvePublishedCopy(entry.body, publishedValues);

  const content = (
    <Stack gap="xs">
      {entry.heading && (
        <Text size="xs" weight="semibold" transform="uppercase" color="muted">
          {entry.heading}
        </Text>
      )}
      <Text size="xs" color="muted" className="leading-relaxed">
        {renderEmphasis(body)}
      </Text>
    </Stack>
  );

  if (inline) return <Div className={className}>{content}</Div>;

  /*
   * 🛑 `surface` + the matching ink, never a status background with literal
   * white text. `-surface` is a near-white tint in light themes and a dark
   * tint in dark ones, so a fixed `text-white` is invisible in exactly one
   * theme — Root Cause #67, which shipped 26 invisible surfaces that way.
   * `Text color="muted"` above pairs correctly with both.
   */
  return (
    <Div
      surface={entry.tone === "warning" ? "warning-surface" : "muted"}
      rounded="lg"
      padding="sm"
      className={className}
    >
      {content}
    </Div>
  );
}
