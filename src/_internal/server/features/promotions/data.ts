import { cache } from "react";
import { couponsRepository } from "../../../../repositories";

export const getCouponByCode = cache(
  async (code: string) => {
    return (await couponsRepository.getCouponByCode(code).catch(() => undefined)) ?? null;
  },
);
