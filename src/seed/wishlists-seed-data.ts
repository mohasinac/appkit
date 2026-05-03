/**
 * Wishlist Seed Data — Pokemon TCG Themed
 * User wishlist items stored under users/{uid}/wishlist/{productId}
 *
 * All userId and productId references align with:
 *   - pokemon-users-seed-data.ts
 *   - pokemon-products-seed-data.ts
 */

export interface WishlistSeedDocument {
  userId: string;
  productId: string;
  addedAt: Date;
}

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const wishlistsSeedData: WishlistSeedDocument[] = [
  // Ash wants Charizard and Blastoise — the classic rivalry cards
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-charizard-base1-4-holo-rare-fire-blaine-1",
    addedAt: daysAgo(7),
  },
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    addedAt: daysAgo(5),
  },
  {
    userId: "user-ash-ketchum-pallet-ash",
    productId: "product-mewtwo-base1-10-holo-rare-psychic-surge-1",
    addedAt: daysAgo(3),
  },

  // Gary wants the rarest — the 1st edition auction Charizard and Mewtwo PSA 9
  {
    userId: "user-gary-oak-pallet-gary",
    productId: "auction-charizard-1st-ed-base1-4-fire-blaine-auction-1",
    addedAt: daysAgo(6),
  },
  {
    userId: "user-gary-oak-pallet-gary",
    productId: "auction-mewtwo-base1-10-psychic-surge-auction-1",
    addedAt: daysAgo(4),
  },

  // Brock wants solid Rock-type adjacent picks and sealed product
  {
    userId: "user-brock-pewter-brock",
    productId: "product-base-set-booster-pack-sealed-blaine-1",
    addedAt: daysAgo(8),
  },
  {
    userId: "user-brock-pewter-brock",
    productId: "product-venusaur-base1-15-holo-rare-grass-blaine-1",
    addedAt: daysAgo(4),
  },

  // Misty has Electric cards on her wishlist — covets the rival type
  {
    userId: "user-misty-water-gym-misty",
    productId: "product-zapdos-base1-16-holo-rare-electric-surge-1",
    addedAt: daysAgo(4),
  },
  {
    userId: "user-misty-water-gym-misty",
    productId: "product-zap-theme-deck-sealed-surge-1",
    addedAt: daysAgo(2),
  },

  // Surge has Water cards on his wishlist — covets Misty's inventory
  {
    userId: "user-lt-surge-electric-surge",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    addedAt: daysAgo(3),
  },
  {
    userId: "user-lt-surge-electric-surge",
    productId: "product-gyarados-base1-6-holo-rare-water-misty-1",
    addedAt: daysAgo(1),
  },

  // Blaine wants Grass and Colorless to round out his collection
  {
    userId: "user-blaine-fire-gym-blaine",
    productId: "product-venusaur-base1-15-holo-rare-grass-blaine-1",
    addedAt: daysAgo(2),
  },
  {
    userId: "user-blaine-fire-gym-blaine",
    productId: "product-chansey-base1-3-holo-rare-colorless-misty-1",
    addedAt: daysAgo(1),
  },

  // Professor Oak wants everything for research — the binder and trainer cards
  {
    userId: "user-prof-oak-pallet-oak",
    productId: "product-pokemon-9-pocket-binder-misty-1",
    addedAt: daysAgo(10),
  },
  {
    userId: "user-prof-oak-pallet-oak",
    productId: "product-professor-oak-base1-88-uncommon-trainer-surge-1",
    addedAt: daysAgo(6),
  },

  // Sabrina loves Psychic — and the Haunter is a natural fit
  {
    userId: "user-sabrina-saffron-sabrina",
    productId: "product-haunter-base1-24-non-holo-rare-psychic-surge-1",
    addedAt: daysAgo(5),
  },
  {
    userId: "user-sabrina-saffron-sabrina",
    productId: "product-mewtwo-base1-10-holo-rare-psychic-surge-1",
    addedAt: daysAgo(3),
  },

  // Erika loves Grass — Beedrill and Clefairy are her targets
  {
    userId: "user-erika-celadon-erika",
    productId: "product-beedrill-base1-17-non-holo-rare-grass-blaine-1",
    addedAt: daysAgo(3),
  },
  {
    userId: "user-erika-celadon-erika",
    productId: "product-clefairy-base1-35-uncommon-colorless-misty-1",
    addedAt: daysAgo(1),
  },
];
