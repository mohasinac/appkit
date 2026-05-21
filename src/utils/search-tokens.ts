const MAX_TOKENS = 50;
const MIN_TOKEN_LENGTH = 2;

export function buildSearchTokens(...sources: (string | string[] | undefined | null)[]): string[] {
  const rawText = sources
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Array.from(
    new Set(
      rawText
        .split(/[^a-z0-9]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length >= MIN_TOKEN_LENGTH),
    ),
  ).slice(0, MAX_TOKENS);
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= MIN_TOKEN_LENGTH)
    .slice(0, 10);
}
