/**
 * Multi-Franchise Collectibles — Seed Data Bundle
 *
 * Covers: Pokémon TCG · Hot Wheels · Beyblade Burst · Transformers
 *
 * Collections covered:
 *   - categories       (pokemonCategoriesSeedData)
 *   - users            (pokemonUsersSeedData)
 *   - products         (allProductsSeedData — all 4 franchises combined)
 *   - stores           (pokemonStoresSeedData)
 *   - reviews          (reviewsSeedData)
 *   - carouselSlides   (pokemonCarouselSlidesSeedData)
 *   - homepageSections (pokemonHomepageSectionsSeedData)
 *   - carts            (cartsSeedData)
 *   - bids             (bidsSeedData)
 *   - wishlists        (wishlistsSeedData)
 *   - blogPosts        (blogPostsSeedData)
 *   - events           (eventsSeedData)
 *   - eventEntries     (eventEntriesSeedData)
 *   - addresses        (addressesSeedData)
 *   - storeAddresses   (storeAddressesSeedData)
 *   - coupons          (pokemonCouponsSeedData)
 */

import { pokemonProductsSeedData } from "./pokemon-products-seed-data";
import { hotWheelsProductsSeedData } from "./hot-wheels-seed-data";
import { beybladeProductsSeedData } from "./beyblade-seed-data";
import { transformersProductsSeedData } from "./transformers-seed-data";
import { animeFiguresSeedData } from "./anime-figures-seed-data";
import { retroGamingSeedData } from "./retro-gaming-seed-data";
import { cosplayAccessoriesSeedData } from "./cosplay-accessories-seed-data";

/** All products across all 7 franchises — use this as the `products` seed collection. */
export const allProductsSeedData = [
  ...pokemonProductsSeedData,
  ...hotWheelsProductsSeedData,
  ...beybladeProductsSeedData,
  ...transformersProductsSeedData,
  ...animeFiguresSeedData,
  ...retroGamingSeedData,
  ...cosplayAccessoriesSeedData,
];

export { pokemonCategoriesSeedData } from "./pokemon-categories-seed-data";
export { pokemonUsersSeedData } from "./pokemon-users-seed-data";
export { pokemonProductsSeedData } from "./pokemon-products-seed-data";
export { hotWheelsProductsSeedData } from "./hot-wheels-seed-data";
export { beybladeProductsSeedData } from "./beyblade-seed-data";
export { transformersProductsSeedData } from "./transformers-seed-data";
export { pokemonStoresSeedData } from "./pokemon-stores-seed-data";
export { reviewsSeedData } from "./reviews-seed-data";
export { pokemonCarouselSlidesSeedData } from "./pokemon-carousel-slides-seed-data";
export { pokemonHomepageSectionsSeedData } from "./pokemon-homepage-sections-seed-data";
export { cartsSeedData } from "./cart-seed-data";
export { bidsSeedData } from "./bids-seed-data";
export { wishlistsSeedData } from "./wishlists-seed-data";
export { blogPostsSeedData } from "./blog-posts-seed-data";
export { eventsSeedData, eventEntriesSeedData } from "./events-seed-data";
export { addressesSeedData } from "./addresses-seed-data";
export { storeAddressesSeedData } from "./store-addresses-seed-data";
export { pokemonCouponsSeedData } from "./pokemon-coupons-seed-data";
export { animeFiguresSeedData } from "./anime-figures-seed-data";
export { retroGamingSeedData } from "./retro-gaming-seed-data";
export { cosplayAccessoriesSeedData } from "./cosplay-accessories-seed-data";
