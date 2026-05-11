export const ORDERS_PAGE_SIZE = 20;
export const ORDER_CANCELLABLE_STATUSES = ["pending", "processing"] as const;
export const ORDER_RETURN_WINDOW_DAYS = 7;
export const ORDER_AUTO_CONFIRM_DAYS = 14;
export const ORDER_CANCEL_REASON_MAX_LENGTH = 500;
export const ORDER_NOTE_MAX_LENGTH = 500;
export const ORDER_TRACKING_NUMBER_MAX_LENGTH = 100;
export const ORDER_RETURN_WINDOW_MS = ORDER_RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
