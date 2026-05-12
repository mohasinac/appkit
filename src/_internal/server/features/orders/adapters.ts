import type { Order } from "../../../../features/orders/types";
import type { OrderDocument } from "../../../../features/orders/schemas/firestore";

export function orderDocumentToOrder(doc: OrderDocument): Order {
  const items: Order["items"] = doc.items?.length
    ? doc.items.map((item) => ({
        productId: item.productId,
        title: item.productTitle,
        price: item.unitPrice,
        quantity: item.quantity,
        currency: doc.currency,
        storeId: doc.storeId,
      }))
    : [
        {
          productId: doc.productId,
          title: doc.productTitle,
          image: doc.imageUrls?.[0],
          price: doc.unitPrice,
          quantity: doc.quantity,
          currency: doc.currency,
          storeId: doc.storeId,
        },
      ];

  const address: Order["address"] = {
    id: doc.id,
    line1: doc.shippingAddress ?? "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  };

  const shippingCost = doc.shippingFee ?? 0;
  const discount = doc.couponDiscount ?? 0;
  const subtotal = doc.totalPrice - shippingCost + discount;

  return {
    id: doc.id,
    userId: doc.userId,
    items,
    address,
    orderStatus: doc.status,
    paymentStatus: doc.paymentStatus,
    subtotal,
    shippingCost: shippingCost || undefined,
    discount: discount || undefined,
    total: doc.totalPrice,
    currency: doc.currency,
    couponCode: doc.couponCode,
    trackingNumber: doc.trackingNumber,
    shippingCarrier: doc.shippingCarrier,
    notes: doc.notes,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}
