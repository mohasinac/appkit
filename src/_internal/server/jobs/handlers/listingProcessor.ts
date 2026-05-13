import type { CallableHandler } from "../runtime/types";
import {
  runListingProcessor,
  supportedListingCollections,
  type ListingRequestBody,
  type ListingResponseBody,
} from "../core/listingProcessor";

export type { ListingRequestBody, ListingResponseBody };
export { supportedListingCollections };

export const listingProcessorHandler: CallableHandler<ListingRequestBody, ListingResponseBody> =
  runListingProcessor;
