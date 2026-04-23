/**
 * Wishlist Seed Data
 * User wishlist items stored under users/{uid}/wishlist/{productId}
 */

export interface WishlistSeedDocument {
  userId: string;
  productId: string;
  addedAt: Date;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const wishlistsSeedData: WishlistSeedDocument[] = [
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-charizard-base1-4-holo-rare-fire-blaine-1",
    addedAt: daysAgo(7),
  },
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-mewtwo-base1-10-holo-rare-psychic-surge-1",
    addedAt: daysAgo(5),
  },
  {
    userId: "user-misty-water-gym-misty",
    productId: "product-zapdos-base1-16-holo-rare-electric-surge-1",
    addedAt: daysAgo(4),
  },
  {
    userId: "user-lt-surge-electric-surge",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    addedAt: daysAgo(3),
  },
  {
    userId: "user-blaine-fire-gym-blaine",
    productId: "product-venusaur-base1-15-holo-rare-grass-blaine-1",
    addedAt: daysAgo(2),
  },
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    addedAt: daysAgo(1),
  },
];
