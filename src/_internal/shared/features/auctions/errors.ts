import { NotFoundError, ValidationError, ConflictError, ExpiredError } from "../../errors/index";
import { formatMoney } from "../../../../utils/number.formatter";

export class AuctionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Auction", id);
    this.name = "AuctionNotFoundError";
  }
}

export class AuctionEndedError extends ExpiredError {
  constructor(id: string) {
    super(`Auction ${id}`);
    this.name = "AuctionEndedError";
  }
}

export class BidTooLowError extends ValidationError {
  constructor(minBid: number) {
    super(`Bid must be at least ${formatMoney(minBid)}`, "amount");
    this.name = "BidTooLowError";
  }
}

export class BidOnOwnAuctionError extends ConflictError {
  constructor() {
    super("Sellers cannot bid on their own auctions");
    this.name = "BidOnOwnAuctionError";
  }
}

export class AuctionReserveNotMetError extends ConflictError {
  constructor() {
    super("Reserve price has not been met");
    this.name = "AuctionReserveNotMetError";
  }
}
