import { makeGetListingForDetail, getProductFeaturesForStore } from "../shared/listing-data-factory";

export const getCollectorDropForDetail = makeGetListingForDetail("collector-drop");
export const getProductFeaturesForCollectorDrop = getProductFeaturesForStore;
