import { cache } from "react";
import { cartRepository } from "../../../../repositories";

export const getCartForUser = cache(
  async (userId: string) => {
    return (await cartRepository.findByUserId(userId).catch(() => undefined)) ?? null;
  },
);
