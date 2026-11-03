"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Div } from "../../../ui/components/Div";
import { IconButton } from "../../../ui/components/IconButton";
import { Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { useFormShellState } from "../../../ui/forms/FormShell";
import { useSession } from "../../../react/contexts/SessionContext";
import { useHandMode } from "../../../_internal/client/hand-mode/HandModeProvider";
import { isAdminUser } from "../../auth/role-predicates";
import { apiClient } from "../../../http/ApiClient";
import { useApiMutation } from "../../../client/api/useApiMutation";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { askAssistantSchema } from "../schemas/ask";

/**
 * The admin-only floating "ask the assistant" launcher — Phase 2E-ii
 * (overhaul brief), the UI mount this phase's own plan section named as
 * the one piece remaining after `answerAdminAssistantQuestion` +
 * `POST /api/admin/assistant/ask` were built and live-round-trip-verified
 * via direct API calls earlier this session.
 *
 * Deliberately a SMALLER component than the buyer-facing `AssistantWidget`
 * it's modeled on, not a copy-paste: no "expand to full page" (there is no
 * dedicated admin assistant page, and building one would be new,
 * unscoped surface area — a panel is the whole feature here), no
 * `siteSettings.assistant.enabled` gate (that kill switch is for the
 * CUSTOMER-facing chat widget; an admin's own internal tool should not
 * vanish because a seller disabled customer-facing chat).
 *
 * Gated on `isAdminUser`, not generic auth — mount this only inside
 * `admin/layout.tsx`, where every session has already passed the admin
 * RBAC gate the route itself also re-checks server-side.
 */

interface AssistantReply {
  text: string;
}

interface Exchange {
  question: string;
  answer: string;
}

export function AdminAssistantWidget() {
  const { user, loading } = useSession();
  const { hand } = useHandMode();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const shell = useFormShellState(askAssistantSchema);

  const ask = useApiMutation({
    errorMessage: "Could not reach the assistant. Please try again.",
    setFieldError: shell.setFieldError,
    mutationFn: async (message: string) => {
      return apiClient.post<AssistantReply>(ADMIN_ENDPOINTS.ASSISTANT_ASK, { message });
    },
    onSuccess: (data, message) => {
      setQuestion("");
      setExchanges((prev) => [...prev, { question: message, answer: data?.text ?? "" }]);
    },
  });

  // Same three-state reasoning as the buyer widget: `loading` starts true on
  // every hard load (SessionProvider mounts initialUser={null}), so a
  // two-state gate would flash the launcher away from a signed-in admin on
  // every page load.
  if (loading || !isAdminUser(user)) {
    return null;
  }

  function handleAsk() {
    const trimmed = question.trim();
    if (trimmed.length > 0) ask.mutate(trimmed);
  }

  /*
   * 🛑 CORRECTED, found live: the opposite-edge approach collided with
   * Next.js's own dev-mode indicator overlay, which defaults to bottom-left
   * — this widget rendered underneath it, technically present in the DOM
   * (confirmed via `boundingBox()`) but visually fully obscured, with
   * `document.elementFromPoint` resolving to `NEXTJS-PORTAL` instead. That
   * overlay is dev-only (absent in production), but it made local testing
   * of this exact widget impossible, which is reason enough to avoid it.
   *
   * 🛑 Also found live: the buyer widget's own three-tier
   * `calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem)+...)`
   * expression, copied verbatim with only the final addend changed, computed
   * to a wildly wrong value here (635px instead of the expected ~128px) —
   * every individual CSS variable read back correct via
   * `getComputedStyle`, so the arithmetic itself was resolving incorrectly
   * somewhere in the build pipeline for reasons not fully root-caused.
   * Deliberately NOT worth chasing further: this is a desktop-primary admin
   * tool, not a public page where the mobile bottom-nav/on-screen-keyboard
   * three-tier system (CLAUDE.md's own "Bottom edge is three tiers" rule)
   * actually matters — plain Tailwind scale utilities, no arbitrary calc(),
   * sidestep the whole class of risk and are simpler to reason about for a
   * surface this narrow.
   *
   * Same EDGE as the buyer-facing `AssistantWidget` (hand === "left" ?
   * "left-4" : "right-4"), stacked a fixed `bottom-28` (7rem) above its own
   * `bottom-14` (3.5rem) base — two widgets deep on one edge, never the
   * dev-indicator corner.
   */
  const edge = hand === "left" ? "left-4" : "right-4";

  return (
    <>
      {/* audit-bottom-offset-ok: desktop-primary admin tool, stacked a fixed offset above the buyer widget's own FAB — not bottom-nav-relative, see the comment above */}
      <Div className={`fixed bottom-[7rem] ${edge} z-[var(--appkit-z-popover)]`}>
        <IconButton
          type="button"
          variant="primary"
          size="touch"
          rounded="full"
          aria-label={open ? "Close the assistant" : "Ask the assistant"}
          onClick={() => setOpen((o) => !o)}
          icon={open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
        />
      </Div>

      {open && (
        <Div
          surface="elevated"
          padding="card"
          rounded="lg"
          border="default"
          shadow="lg"
          className={`fixed bottom-[11.25rem] ${edge} z-[var(--appkit-z-popover)] w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto`}
        >
          <Stack gap="sm">
            <Heading level={3} size="base">
              Ask the assistant
            </Heading>

            {exchanges.length === 0 ? (
              <Text size="sm" color="muted">
                Where to find a setting, whether a feature is on right now, how to reach a
                screen — answered from the real admin nav and live site settings.
              </Text>
            ) : (
              <Stack gap="sm">
                {exchanges.map((exchange, i) => (
                  <Stack key={i} gap="xs">
                    <Text size="sm" weight="semibold">
                      {exchange.question}
                    </Text>
                    <Text size="sm" color="muted">
                      {exchange.answer}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            )}

            <Form onSubmit={(e) => e.preventDefault()} shellCtx={shell.shellCtx}>
              <Stack gap="sm">
                <FieldInput
                  name="question"
                  label="Your question"
                  placeholder="e.g. Where do I turn off random lots?"
                  value={question}
                  onChange={setQuestion}
                  maxLength={2000}
                />
                <FormErrorSummary />
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
        </Div>
      )}
    </>
  );
}

