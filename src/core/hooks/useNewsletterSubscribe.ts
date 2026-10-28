"use client";
/**
 * useNewsletterSubscribe — the one newsletter submit path.
 *
 * ## Why this exists (A5b)
 *
 * Two consumer newsletter boxes — homepage and footer — had independently
 * hand-written the same submit flow: `useFormShellState(newsletterSubscribeSchema)`,
 * `clearErrors()`, `validate()`, `useApiMutation` posting `{ email, source }`,
 * and an `isPending` label swap. Roughly 25 lines each, identical in substance.
 *
 * 🛑 The argument for merging is not the line count — it is that **both files
 * carried comments describing the SAME TWO BUGS, each fixed separately**:
 *
 *  1. *"the Button carried `type="submit"` AND an `onClick`, while
 *     `<Form onSubmit={e => e.preventDefault()}>` swallowed the native
 *     submit — so pressing Enter in the email field fired `submit`, not
 *     `click`, and nothing at all happened. Only the mouse worked."*
 *  2. *"`<Form schema={…}>` was passed here before but nothing ever ran it —
 *     the only guard was `!email.trim()`, so `not-an-email` round-tripped to
 *     the server and came back as a toast instead of an inline field error."*
 *
 * That is the Duplication Framework's bug-fix multiplier having already fired
 * twice, which the framework treats as decisive regardless of the Rule of
 * Three. Keyboard submission silently not working is also exactly the class of
 * defect nobody reports — it looks like the user simply did not click.
 *
 * ## 🛑 A HOOK, not a shared component
 *
 * The two boxes differ in seven ways and every one is presentational: layout
 * (inline row vs stacked), the label, the button variant, the pending label
 * ("Subscribing..." vs "…"), the toast wording, and — the real one — what
 * success looks like. The footer REPLACES itself with a thank-you; the
 * homepage keeps the field mounted and adds a `role="status"` line beneath.
 *
 * A single component would need ~7 conditional props, which the framework
 * lists as a reason to KEEP duplication rather than remove it. So the
 * mechanism is shared and the JSX stays at each call site, where the
 * differences actually live.
 *
 * @tag domain:newsletter
 * @tag layer:client
 * @tag access:client
 * @tag sideEffects:network
 */
import { useCallback, useState } from "react";
import { useApiMutation } from "../../client/api/useApiMutation";
import { apiClient } from "../../http/ApiClient";
import { normalizeError } from "../../errors/normalize";
import { newsletterSubscribeSchema } from "../../features/admin/schemas/small-forms";
import { useFormShellState } from "../../ui/forms/FormShell";
import { useToast } from "../../ui/components/Toast";
import type { SupportedNewsletterSource } from "../newsletter-actions";

export interface UseNewsletterSubscribeOptions {
  /**
   * The subscribe endpoint. Supplied by the consumer, which owns its route
   * map — appkit must not name a consumer's URL.
   */
  endpoint: string;
  /**
   * Which box this is.
   *
   * 🛑 Typed against `SupportedNewsletterSource` rather than `string`, so a
   * typo is a compile error instead of a row in `newsletterSubscribers` whose
   * `source` matches no report.
   */
  source: SupportedNewsletterSource;
  /** Toast shown on success. */
  successToast: string;
  /** Toast shown when the request fails. */
  errorMessage?: string;
  /** Runs after a successful subscribe — clear local UI, flip to a thank-you. */
  onSuccess?: () => void;
}

export function useNewsletterSubscribe({
  endpoint,
  source,
  successToast,
  errorMessage = "Could not subscribe. Please try again.",
  onSuccess,
}: UseNewsletterSubscribeOptions) {
  const [email, setEmail] = useState("");
  const { showToast } = useToast();

  /*
   * State is hoisted here and handed back as `shellCtx` for `<Form shellCtx=…>`
   * rather than left to `<Form>`'s own internal instance.
   *
   * That is load-bearing, not tidiness: it is what lets `submit` live outside
   * the render prop, which is what makes bug 1 above fixable. The caller must
   * pass `shellCtx` to its `<Form>` or the inline field errors land in a
   * different context than the one this hook writes to.
   */
  const form = useFormShellState(newsletterSubscribeSchema);

  const mutation = useApiMutation({
    errorMessage,
    mutationFn: (payload: { email: string }) =>
      apiClient.post(endpoint, { ...payload, source }),
    onSuccess: () => {
      showToast(successToast, "success");
      setEmail("");
      onSuccess?.();
    },
  });

  const submit = useCallback(async () => {
    if (mutation.isPending) return;
    form.clearErrors();
    /*
     * `validate` runs the schema AND pipes any issues to the inline field
     * errors itself, so there is no bare `safeParse` result to forget to use
     * (`audit-unvalidated-safeparse`). This is bug 2's fix.
     */
    const parsed = form.validate<{ email: string }>({ email: email.trim() });
    if (!parsed) return;
    try {
      await mutation.mutateAsync(parsed);
    } catch (err) {
      void normalizeError(err);
      // Inline on the field as well — the mutation already toasted, and a
      // toast that has faded leaves the user staring at a form with no
      // indication of what went wrong.
      form.setFieldError("email", errorMessage);
    }
  }, [email, errorMessage, form, mutation]);

  return {
    email,
    setEmail,
    submit,
    isPending: mutation.isPending,
    /** Pass to `<Form shellCtx={…}>` — see the note on `form` above. */
    shellCtx: form.shellCtx,
  };
}
