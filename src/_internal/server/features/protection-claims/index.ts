/**
 * protection-claims — server surface.
 *
 * Narrow by design (Root Cause #18): the three actions a route calls, plus the
 * CTA predicate a page needs. The repository is imported directly by anything
 * that queries.
 */

export {
  fileProtectionClaimAction,
  adjudicateProtectionClaimAction,
  getMyProtectionClaimsAction,
  canClaimProtection,
  type FileProtectionClaimInput,
} from "./actions";
