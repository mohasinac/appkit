"use server";

import { wrapAction, type ActionResult } from "@mohasinac/appkit/server";
import { conversationsRepository } from "../../../../features/messages/repository/conversations.repository";
import { requireRoleUser } from "../../../../providers/auth-firebase/helpers";
import { storeRepository, productRepository } from "../../../../repositories";
import type { ConversationDocument } from "../../../../features/messages/schemas/firestore";

export interface StartLiveConversationInput {
  productId: string;
}

export async function startLiveConversationAction(
  input: StartLiveConversationInput,
): Promise<ActionResult<ConversationDocument>> {
  return wrapAction(async () => {
    const user = await requireRoleUser(["user", "buyer", "seller", "admin"]);
    
      const product = await productRepository.findByIdOrSlug(input.productId);
      if (!product || product.listingType !== "live") {
        throw new Error("Product not found or not a live-item listing");
      }
    
      const store = await storeRepository.findById(product.storeId);
      if (!store) {
        throw new Error("Store not found");
      }
    
      return conversationsRepository.findOrCreateByContext({
        buyerId: user.uid,
        buyerDisplayName: user.name ?? user.email ?? user.uid,
        storeId: product.storeId,
        storeName: store.storeName,
        sellerDisplayName: store.storeName,
        productId: product.id,
        productTitle: product.title,
      });
  });
}
