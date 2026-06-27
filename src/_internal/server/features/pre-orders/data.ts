import { makeGetListingForDetail, getProductFeaturesForStore } from "../shared/listing-data-factory";

export const getPreOrderForDetail = makeGetListingForDetail("pre-order");
export const getProductFeaturesForPreOrder = getProductFeaturesForStore;
