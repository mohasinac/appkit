import { NotFoundError, ValidationError, ConflictError, ExpiredError } from "../../errors/index";
import { formatMoney } from "../../../../utils/number.formatter";

export class CollectorDropNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Collector Drop", id);
    this.name = "CollectorDropNotFoundError";
  }
}

export class CollectorDropEndedError extends ExpiredError {
  constructor(id: string) {
    super(`Collector Drop ${id}`);
    this.name = "CollectorDropEndedError";
  }
}

export class BidTooLowError extends ValidationError {
  constructor(minBid: number) {
    super(`Bid must be at least ${formatMoney(minBid)}`, "amount");
    this.name = "BidTooLowError";
  }
}

export class BidOnOwnCollectorDropError extends ConflictError {
  constructor() {
    super("Sellers cannot bid on their own collector drops");
    this.name = "BidOnOwnCollectorDropError";
  }
}

export class CollectorDropReserveNotMetError extends ConflictError {
  constructor() {
    super("Reserve price has not been met");
    this.name = "CollectorDropReserveNotMetError";
  }
}
