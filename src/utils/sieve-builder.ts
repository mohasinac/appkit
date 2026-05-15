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
  CONTAINS_CI: "@=*",
  STARTS_CI: "_=*",
  ENDS_CI: "_-=*",
  EQ_CI: "==*",
  NEQ_CI: "!=*",
} as const;

export type SieveOp = (typeof SIEVE_OP)[keyof typeof SIEVE_OP];

/** Operators for which the pipe `|` is valid for OR-matching within a single clause */
export const SIEVE_PIPE_OPS = new Set<SieveOp>([
  SIEVE_OP.CONTAINS,
  SIEVE_OP.STARTS,
  SIEVE_OP.ENDS,
  SIEVE_OP.CONTAINS_CI,
  SIEVE_OP.STARTS_CI,
  SIEVE_OP.ENDS_CI,
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
