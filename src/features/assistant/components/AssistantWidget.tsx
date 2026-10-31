"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageCircle, Maximize2, X } from "lucide-react";
import { Div } from "../../../ui/components/Div";
import { IconButton } from "../../../ui/components/IconButton";
import { Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { useFormShellState } from "../../../ui/forms/FormShell";
import { useAuth } from "../../../react/contexts/SessionContext";
import { useHandMode } from "../../../_internal/client/hand-mode/HandModeProvider";
import { apiClient } from "../../../http/ApiClient";
import { useApiMutation } from "../../../client/api/useApiMutation";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import type { PublicSiteSettings } from "../../../_internal/shared/features/site-settings/types";
import { ASSISTANT_ENDPOINTS } from "../../../constants/api-endpoints";
import { askAssistantSchema } from "../schemas/ask";

/**
 * The floating "chat with us" bubble — the site-wide entry point to the
 * customer assistant. Desktop gets a small pop-up panel over the current
 * page; mobile skips straight to the full page. Both read from the same
 * button, split only by which happens on click.
 *
 * ## 🛑 Why this replaced a page-section launcher
 *
 * The first version (`AssistantLauncher`) was mounted once, on `/messages`
 * only, as a card above the buyer<->seller inbox. Owner's direction
 * (2026-10-31): the assistant needed to look like the "chat with us" button
 * on any commercial site — present everywhere, not a section on one page.
 * This component is mounted ONCE, in the shared layout shell, not per-page.
 *
 * ## Desktop vs mobile is decided at CLICK time, not render time
 *
 * Checking `window.matchMedia` during render would disagree with the SSR
 * markup and trip a hydration mismatch. Checking it only inside the
 * click handler costs nothing and is never wrong, because by the time a
 * click fires the real viewport is all that matters.
 *
 * ## Respects the three-tier bottom edge
 *
 * Same `calc()` shape as `<BackToTop>`: this floats a gutter above
 * `--bottom-nav-height` + `--bottom-chrome-height` + the on-screen keyboard,
 * rather than against any individual bar, so it never needs to change when a
 * new bottom bar is added elsewhere on the page.
 *
 * @tag domain:assistant
 * @tag layer:client
 * @tag access:public
 * @tag sideEffects:network
 */

/** Tailwind's own `md:` breakpoint — matched here only inside a click
 * handler (see the module docstring), never during render. */
const DESKTOP_BREAKPOINT_PX = 768;

function isDesktopViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT_PX;
}

interface AssistantReply {
  text: string;
}

interface Exchange {
  question: string;
  answer: string;
}

export interface AssistantWidgetProps {
  /** Where "expand" (desktop panel) and a mobile tap both navigate to. */
  fullPageHref?: string;
}

export function AssistantWidget({ fullPageHref = "/assistant" }: AssistantWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { hand } = useHandMode();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<readonly Exchange[]>([]);
  const shell = useFormShellState(askAssistantSchema);
  const { data: siteSettings } = useSiteSettings<PublicSiteSettings>();

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

  /*
   * 🛑 THREE states, not two — the same gate `AssistantLauncher` used.
   * `SessionProvider` mounts `initialUser={null}`, so `loading` starts true
   * on every hard load even for a signed-in buyer; a two-state gate would
   * flash the bubble away from them on every page load. Hiding rather than
   * disabling, because `/api/assistant/ask` is auth-required — a guest
   * would see a dead control that answers 401.
   *
   * 🛑 `assistant?.enabled === false` is the ONLY disabling value — absence
   * (not yet fetched, or an unseeded settings document) must render the
   * widget rather than hide it, matching the kill-switch's server-side
   * polarity (`assertAssistantEnabled` in actions.ts). Hiding on absence
   * would blank the widget for every visitor until the first settings fetch
   * resolves.
   *
   * 🛑 Suppressed on the full-chat page itself. Without this, "expand" left
   * the panel's `open` state `true` with no route-based reset — the panel
   * then rendered ON TOP of the full page it had just navigated to,
   * duplicating the same form. A floating entry point to a page the visitor
   * is already on is redundant regardless of how `open` got there.
   */
  if (loading || !user || siteSettings?.assistant?.enabled === false || pathname === fullPageHref) {
    return null;
  }

  function handleExpand() {
    // See the suppression note above — without this, navigating away and
    // back (or to any other page) would reopen a panel nobody asked for.
    setOpen(false);
    router.push(fullPageHref);
  }

  function handleLaunch() {
    if (isDesktopViewport()) {
      setOpen((o) => !o);
      return;
    }
    router.push(fullPageHref);
  }

  function handleAsk() {
    const trimmed = question.trim();
    if (trimmed.length > 0) ask.mutate(trimmed);
  }

  const edge = hand === "left" ? "left-4" : "right-4";

  return (
    <>
      <Div
        className={`fixed bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px)+var(--appkit-space-4))] ${edge} z-[var(--appkit-z-popover)]`}
      >
        <IconButton
          type="button"
          variant="primary"
          size="touch"
          rounded="full"
          aria-label={open ? "Close the assistant" : "Ask the assistant"}
          onClick={handleLaunch}
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
          className={`fixed bottom-[calc(var(--keyboard-inset-height,0px)+var(--bottom-nav-height,4rem)+var(--bottom-chrome-height,0px)+5rem)] ${edge} z-[var(--appkit-z-popover)] w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto`}
        >
          <Stack gap="sm">
            <Div layout="flex" align="center" justify="between">
              <Heading level={3} size="base">
                Ask the assistant
              </Heading>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Expand to full page"
                onClick={handleExpand}
                icon={<Maximize2 aria-hidden="true" />}
              />
            </Div>

            {exchanges.length === 0 ? (
              <Text size="sm" color="muted">
                Questions about shipping, returns, or what we stock — answered from our
                FAQs, live catalogue, and your own order history.
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
                  placeholder="e.g. Where is my order?"
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
