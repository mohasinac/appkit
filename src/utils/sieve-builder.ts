export const SIEVE_OP = {
  EQ: "==",
  NEQ: "!=",
  GT: ">",
  LT: "<",
  GTE: ">=",
  LTE: "<=",
  CONTAINS: "@=",
  STARTS: "_=",
  ENDS: "_-=",
  NOT_CONTAINS: "!@=",
  NOT_STARTS: "!_=",
  NOT_ENDS: "!_-=",
  // The five case-insensitive operators (@=* _=* _-=* ==* !=*) were
  // DELETED. Firestore has no case-insensitive comparison, so the adapter
  // threw on every one — and with `throwExceptions: false` that throw
  // returned a PARTIALLY-BUILT query rather than an error, so the clause,
  // and every clause after it, was silently dropped. They read as working
  // search operators and did the opposite. `searchTxt` + `array-contains`
  // is the replacement.
} as const;

export type SieveOp = (typeof SIEVE_OP)[keyof typeof SIEVE_OP];

/** Operators for which the pipe `|` is valid for OR-matching within a single clause */
export const SIEVE_PIPE_OPS = new Set<SieveOp>([
  SIEVE_OP.CONTAINS,
  SIEVE_OP.STARTS,
  SIEVE_OP.ENDS,
]);

/** Single Sieve clause: sieveFilter("status", "==", "published") → "status==published" */
export function sieveFilter(
  field: string,
  op: SieveOp,
  value: string | number | boolean,
): string {
  return `${field}${op}${value}`;
}

/**
 * Multi-value equality filter as multiple AND clauses.
 *   sieveMultiEq("condition", ["new","used"]) → "condition==new,condition==used"
 *
 * For pipe-valid ops (CONTAINS / STARTS / ENDS and CI variants), pass the
 * pipe-joined value directly to sieveFilter() instead of this helper.
 */
export function sieveMultiEq(
  field: string,
  values: (string | number | boolean)[],
): string {
  return values.map((v) => sieveFilter(field, SIEVE_OP.EQ, v)).join(",");
}

/**
 * Expand a URL param that may contain "|"-separated values into the correct Sieve clause(s).
 *   - For equality ops: "new|used" → "condition==new,condition==used"
 *   - For pipe-valid ops: "foo|bar" → "title@=*foo|bar" (single clause, valid)
 */
export function expandSieveParam(
  field: string,
  value: string | null,
  op: SieveOp = SIEVE_OP.EQ,
): string {
  if (!value) return "";
  const values = value.split("|").filter(Boolean);
  if (values.length === 0) return "";
  if (SIEVE_PIPE_OPS.has(op)) {
    return sieveFilter(field, op, value);
  }
  if (values.length === 1) {
    return sieveFilter(field, op, values[0]);
  }
  return sieveMultiEq(field, values);
}

/** Join Sieve clauses with comma (AND) — drops falsy values */
export function sieveAnd(
  ...clauses: (string | null | undefined | false)[]
): string {
  return clauses.filter(Boolean).join(",");
}

export { sortBy } from "../constants/sort";
