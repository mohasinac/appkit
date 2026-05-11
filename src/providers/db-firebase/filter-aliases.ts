/**
 * Virtual filter aliases — a clause like `listingType==auction` is expanded
 * into one or more real Sieve clauses (`isAuction==true,isPreOrder==false`)
 * before the model reaches the underlying Sieve processor.
 *
 * Pure (no firebase-admin or runtime deps) so this module is safe to import
 * from client code. The Firebase-aware Sieve adapter in `./sieve.ts` re-exports
 * these for backwards-compat with consumers that already imported from there.
 *
 * The expander receives the raw operator + value the caller used (e.g. `==`,
 * `!=`) and the value string. Return a comma-separated Sieve clause string,
 * or empty string to drop the clause silently.
 */
export type SieveFilterAlias = (value: string, operator: string) => string;
export type SieveFilterAliases = Record<string, SieveFilterAlias>;

/**
 * Expand virtual filter clauses into real Sieve clauses.
 * Pure function — exported for direct use in route helpers + unit testing.
 */
export function expandFilterAliases(
  filters: string | undefined,
  aliases: SieveFilterAliases | undefined,
): string | undefined {
  if (!filters || !aliases) return filters;
  const aliasKeys = Object.keys(aliases);
  if (aliasKeys.length === 0) return filters;
  return filters
    .split(",")
    .map((clause) => clause.trim())
    .filter(Boolean)
    .map((clause) => {
      // Match field, operator (==, !=, <=, >=, <, >, @=*, @=, _=), value.
      const m = clause.match(/^([A-Za-z_][\w.]*)\s*(==|!=|<=|>=|<|>|@=\*?|_=)\s*(.*)$/);
      if (!m) return clause;
      const [, field, op, value] = m;
      const alias = aliases[field];
      if (!alias) return clause;
      const expanded = alias(value, op);
      return expanded || "";
    })
    .filter(Boolean)
    .join(",");
}
