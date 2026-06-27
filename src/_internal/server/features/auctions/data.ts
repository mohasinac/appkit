import { makeGetListingForDetail, getProductFeaturesForStore } from "../shared/listing-data-factory";

export const getAuctionForDetail = makeGetListingForDetail("auction");
export const getProductFeaturesForAuction = getProductFeaturesForStore;
