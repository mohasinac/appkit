import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { userRepository } from "../../../../features/auth/repository/user.repository";
import { sellerProfileRepository } from "../../../../features/seller/repository/seller-profile.repository";
import { isSellerUser } from "../../../../features/auth/role-predicates";

/**
 * Resolves the UPI VPA to show a buyer paying manually for an order — the
 * seller's own `payoutDetails.upiId` for a seller-owned store (falling back
 * to the site default if the seller hasn't configured one), or the site UPI
 * directly for an admin-owned store. Called once at order-creation time and
 * stored as `order.displayedUpiId` — resolving server-side here (rather than
 * client-side at render time) makes the value immutable and un-spoofable,
 * which is what the buyer-reported-UPI cross-check at proof-submission time
 * depends on.
 */
export async function resolveDisplayedUpiId(
  storeId: string | undefined,
  siteContactUpiVpa: string | undefined,
): Promise<string | undefined> {
  const siteDefault = siteContactUpiVpa || undefined;
  if (!storeId) return siteDefault;

  const store = await storeRepository.findById(storeId);
  if (!store?.ownerId) return siteDefault;

  const owner = await userRepository.findById(store.ownerId);
  if (!owner || !isSellerUser(owner)) return siteDefault;

  // payoutDetails is seller-only data — sellerProfiles, not users. Decrypted
  // via revealProfile — a prior direct `owner.payoutDetails.upiId` read here
  // (pre-dating the sellerProfiles split) returned ciphertext, since
  // UserRepository.mapDoc is ciphertext-by-default; reading unrevealed would
  // have stored an unreadable `order.displayedUpiId`.
  const ownerProfile = await sellerProfileRepository.findById(store.ownerId);
  const payoutDetails = ownerProfile ? sellerProfileRepository.revealProfile(ownerProfile).payoutDetails : undefined;
  if (payoutDetails?.method === "upi" && payoutDetails.upiId) {
    return payoutDetails.upiId;
  }
  return siteDefault;
}
