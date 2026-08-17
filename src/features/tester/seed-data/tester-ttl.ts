/** Shared 7-day TTL stamp for tester sandbox seed fixtures — recomputed fresh every seed run,
 *  so re-seeding naturally refreshes the expiry (matches TESTER_SANDBOX_TTL_DAYS). */
export const TESTER_SANDBOX_TTL_DAYS = 7;

export function testDataExpiresAt(): Date {
  return new Date(Date.now() + TESTER_SANDBOX_TTL_DAYS * 24 * 60 * 60 * 1000);
}
