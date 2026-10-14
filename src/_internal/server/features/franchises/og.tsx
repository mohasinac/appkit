import type { ReactElement } from "react";
import { resolveOgImageUrl } from "../seo/og";
import { renderBrandOgImage } from "../brands/og";

/**
 * OG card for a FRANCHISE page.
 *
 * 🛑 Delegates to `renderBrandOgImage` rather than copying its layout. That
 * renderer already takes a generic `{ name, description, logoUrl }` and a
 * franchise card is the same shape as a brand card — a cover image, a title and
 * a line of copy. Forking it would give the two surfaces independent drift for
 * no visual difference, which is the duplication the Rule of Three exists to
 * prevent (two copies is observation; this is the second).
 *
 * If a franchise card ever needs its own treatment, the split happens at THAT
 * point, with a reason — not pre-emptively.
 *
 * @tag domain:categories
 * @tag layer:server
 * @tag access:server-only
 */
interface FranchiseDocLike {
  name?: string | null;
  description?: string | null;
  /** Same field as brands — `CategoryDocument` has no dedicated logo field. */
  display?: { coverImage?: string | null } | null;
}

export function renderFranchiseOg(
  doc: FranchiseDocLike | null | undefined,
  opts: { siteName: string; baseUrl?: string },
): ReactElement {
  const name = doc?.name ?? "Franchise";
  return renderBrandOgImage(
    {
      name,
      description:
        doc?.description?.slice(0, 120) ??
        `Shop ${name} collectibles on ${opts.siteName}.`,
      logoUrl: resolveOgImageUrl(doc?.display?.coverImage ?? null, opts.baseUrl),
    },
    opts.siteName,
  );
}
