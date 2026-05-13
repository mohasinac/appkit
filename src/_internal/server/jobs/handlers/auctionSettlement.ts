import type { ScheduleHandler } from "../runtime/types";
import { runAuctionSettlement } from "../core/auctionSettlement";

export const auctionSettlementHandler: ScheduleHandler = runAuctionSettlement;
