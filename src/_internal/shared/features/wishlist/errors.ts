import { CapacityError } from "../../errors/index";

export class WishlistCapError extends CapacityError {
  constructor(current: number, max: number) {
    super(`Wishlist is full (${current}/${max})`);
    this.name = "WishlistCapError";
  }
}
