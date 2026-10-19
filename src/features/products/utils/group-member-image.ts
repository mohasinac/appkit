/**
 * The thumbnail for one product-group member, from whichever shape the caller
 * supplied.
 *
 * ── 🛑 WHY `image` IS TRIED FIRST ──────────────────────────────────────────
 *
 * `toPublicGroupMember` is an ALLOW-LIST projection: it emits the singular
 * `image` (`images[0].url ?? mainImage`) and no `images[]` array at all. So a
 * component reading only `images[0]` resolves `undefined` for every member
 * served by the public endpoint and renders a placeholder tile.
 *
 * That was live on every product-group page — all seven BX-53 members showed
 * a grey box while their images sat in Storage serving HTTP 200. Nothing
 * errors, because an empty `src` is a legal `MediaImage`.
 *
 * The `images[0]` fallback stays for callers that pass a raw document rather
 * than the projection.
 *
 * ── 🛑 WHY ITS OWN MODULE, AND NOT EITHER COMPONENT ────────────────────────
 *
 * `ShowGroupSection` renders `GroupMemberPicker`, so the import edge between
 * them already runs one way. Putting the shared helper in either file and
 * importing it from the other closes a CYCLE — which is exactly what
 * `audit-import-cycles` caught when the first version of this fix exported it
 * from `ShowGroupSection`.
 *
 * A helper used by two components belongs beside neither (Root Cause #18:
 * import from the module that DEFINES the symbol). One definition, two
 * importers, no edge between them — and one rule reachable by copy-paste is
 * one that gets copied wrong (Root Cause #75), which is how the two spellings
 * diverged in the first place.
 */
export interface GroupMemberImageSource {
  /** The public projection's single thumbnail. */
  image?: string;
  /** A raw document's gallery. Only read when `image` is absent. */
  images?: string[];
}

export function resolveGroupMemberImage(m: GroupMemberImageSource): string {
  return m.image ?? m.images?.[0] ?? "";
}
