"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OPTIONAL_CONSENT_CATEGORIES,
  UNDECIDED,
  type ConsentCategory,
  type ConsentState,
  hasConsentFor,
  readConsent,
  subscribeToConsent,
  writeConsent,
} from "./consent-store";

export interface UseCookieConsentOptions {
  /**
   * Configured registrable domain for the consent cookie, e.g. `example.com`.
   * Omit for a host-only cookie. A plain string so a server layout can supply
   * it without anything non-serializable crossing the boundary.
   */
  cookieDomain?: string;
}

export interface UseCookieConsentResult extends ConsentState {
  /**
   * `false` during the first client render, whatever the cookie says.
   *
   * 🛑 This is the whole reason the hook starts at `UNDECIDED` instead of
   * reading the cookie synchronously. The server render cannot see
   * `document.cookie`, so a synchronous read would make the first client
   * render disagree with the server's HTML — a hydration mismatch. Consumers
   * gate on `ready` and render nothing until it flips, which means the server
   * and the first client render agree (both produce nothing) and no mismatch
   * is possible.
   *
   * ⚠ The cost is that a banner for a NEW visitor arrives one frame late.
   * That is the correct side of the trade: the alternative is a banner that
   * flashes on every page load for everyone who has already answered, which
   * is a visible defect rather than an invisible one. (The dismissible
   * announcement bar in this library has the same shape and documents the
   * same flash, which it can only suppress with a pre-paint class because its
   * state lives in `localStorage` — unreadable to the server either way.)
   */
  ready: boolean;
  /** Grant every optional category. */
  acceptAll: () => void;
  /** Grant none — strictly necessary cookies only. */
  rejectAll: () => void;
  /** Record an explicit subset. */
  save: (granted: readonly ConsentCategory[]) => void;
  /** Is this category permitted right now? `essential` is always `true`. */
  allows: (category: ConsentCategory) => boolean;
}

/**
 * Read and update the visitor's cookie choice.
 *
 * Safe to call from any client component — including ones that only READ, such
 * as a tracker deciding whether it may fire. Readers get re-rendered when the
 * choice changes, so switching analytics on takes effect immediately instead
 * of on the next navigation.
 */
export function useCookieConsent(
  options: UseCookieConsentOptions = {},
): UseCookieConsentResult {
  const { cookieDomain } = options;
  const [state, setState] = useState<ConsentState>(UNDECIDED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readConsent());
    setReady(true);
    return subscribeToConsent(setState);
  }, []);

  const save = useCallback(
    (granted: readonly ConsentCategory[]) => {
      /*
       * `writeConsent` notifies, and this component is itself a subscriber, so
       * the returned state is not applied directly — letting the notification
       * be the single path means every reader, including this one, learns
       * about the change the same way. One mechanism, not two.
       */
      writeConsent(granted, cookieDomain ? { cookieDomain } : {});
    },
    [cookieDomain],
  );

  const acceptAll = useCallback(() => {
    save(OPTIONAL_CONSENT_CATEGORIES);
  }, [save]);

  const rejectAll = useCallback(() => {
    save([]);
  }, [save]);

  const allows = useCallback(
    (category: ConsentCategory) => hasConsentFor(category, state),
    [state],
  );

  return {
    decided: state.decided,
    granted: state.granted,
    ready,
    acceptAll,
    rejectAll,
    save,
    allows,
  };
}
