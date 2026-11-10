"use client";

/**
 * A sign-in / register link that carries the page it was clicked from.
 *
 * ## Why this component exists at all
 *
 * `useReturnTo` solves it for any component that is already `"use client"`,
 * which is most of them. A handful of sign-in links are rendered by SERVER
 * components (`UnauthorizedView`, `TrackOrderView`, `ScamProfileView`), and a
 * server component cannot read `window.location`.
 *
 * 🛑 The tempting fix is a prop — `buildHref?: () => string`, or passing the
 * current URL down from a page. appkit shipped the first one and it took two
 * content hosts down for a week (RSC error #441; see the note in
 * `next/routing/section-routes.ts`). The second works but spreads the question
 * "what URL am I on?" into every page that happens to contain a sign-in link.
 *
 * Rendering a tiny CLIENT component instead moves the question to the one place
 * that can answer it. A server component may render this freely: it is an
 * element in the tree, not a function crossing the boundary.
 *
 * ## 🛑 A plain `<a>`, never a locale-aware `Link`
 *
 * The resolved href is usually ANOTHER ORIGIN (the identity host). next-intl's
 * `Link` exists to prefix THIS app's internal paths with a locale; handing it a
 * foreign origin asks it to rewrite something it does not own. The App Router
 * cannot client-navigate across origins either, so there is nothing to gain.
 */

import React from "react";

import { useSignInHref } from "../../react/hooks/useReturnTo";
import { RETURN_TO_PARAM } from "../../next/routing/return-to";

export interface SignInLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /**
   * The sign-in destination. A raw shop-shaped path (`ROUTES.AUTH.LOGIN`) is
   * fine — it is put through `resolveSectionHref` here, which is idempotent and
   * passes an already-absolute URL through untouched. That is deliberate: the
   * caller cannot get it wrong in the direction that produces a 404.
   *
   * `""` renders NOTHING — the empty-slot convention this codebase uses for
   * "no identity provider is configured on this deployment". A caller that
   * wants prose in that case should check for `""` itself rather than relying
   * on this; the null render is a floor, not the message.
   */
  href: string;
  /** Override the query parameter name. Defaults to `next`. */
  returnToParam?: string;
  children: React.ReactNode;
}

export function SignInLink({
  href,
  returnToParam = RETURN_TO_PARAM,
  children,
  ...rest
}: SignInLinkProps) {
  const resolved = useSignInHref(href, returnToParam);
  if (!resolved) return null;
  return (
    <a href={resolved} {...rest}>
      {children}
    </a>
  );
}
