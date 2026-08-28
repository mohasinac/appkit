import { cache } from "react";
import { cartRepository } from "../../../../repositories";

export const getCartForUser = cache(
  async (userId: string) => {
    // No catch: this cart IS the page. Degrading a Firestore failure to null
    // renders an EMPTY CART to someone whose cart is full — money path.
    return (await cartRepository.findByUserId(userId)) ?? null;
  },
);
