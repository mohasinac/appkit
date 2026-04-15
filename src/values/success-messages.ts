/**
 * Success, Info & Confirmation Messages Constants
 *
 * MIGRATION NOTE: Moved from letitrip.in/src/constants/success-messages.ts in Phase 2
 * This is now a shared appkit value module for reuse across all consumer projects.
 *
 * Original note:
 * Split from messages.ts to avoid Turbopack chunk-generation failure
 * (EcmascriptModuleContent::new_merged error in Next.js 16 Turbopack when
 * a large pure-data file is merged across Browser/SSR/Edge runtimes).
 */

export const SUCCESS_MESSAGES = {
  CLIPBOARD: {
    LINK_COPIED: "Link copied to clipboard!",
  },
  // Authentication Success
  AUTH: {
    LOGIN_SUCCESS: "Welcome back!",
    LOGOUT_SUCCESS: "You have been logged out successfully",
    REGISTER_SUCCESS: "Account created successfully",
    GOOGLE_LOGIN_SUCCESS: "Signed in with Google successfully",
    OAUTH_SESSION_CREATED: "Authentication successful",
  },

  // User/Profile Success
  USER: {
    PROFILE_UPDATED: "Profile updated successfully",
    PASSWORD_CHANGED: "Password changed successfully",
    SETTINGS_SAVED: "Settings saved successfully",
    USER_UPDATED: "User updated successfully",
    PHONE_VERIFIED: "Phone number verified successfully",
    ACCOUNT_DELETED: "User account deleted successfully",
    STORE_UPDATED: "Store settings saved successfully",
    SELLER_APPLICATION_SUBMITTED:
      "Your seller application has been submitted! An admin will review it shortly.",
  },

  // Upload Success
  UPLOAD: {
    AVATAR_UPLOADED: "Avatar uploaded successfully",
    AVATAR_REMOVED: "Avatar removed successfully",
    FILE_UPLOADED: "File uploaded successfully",
  },

  // Email Success
  EMAIL: {
    VERIFICATION_SENT: "Verification email sent successfully",
    VERIFIED: "Email verified successfully",
    VERIFIED_SUCCESS: "Your email address has been successfully verified.",
    RESET_SENT: "Password reset link sent to your email",
  },

  // Phone Success
  PHONE: {
    VALIDATED: "Phone number validated successfully",
    VERIFIED: "Phone verified successfully",
    VERIFIED_SUCCESS: "Your phone number has been successfully verified.",
  },

  // Password Reset Success
  PASSWORD: {
    RESET_SUCCESS: "Password reset successfully",
    RESET_EMAIL_SENT: "Password reset link sent to your email",
    UPDATED: "Password updated successfully",
  },

  // Account Success
  ACCOUNT: {
    DELETED: "Account deleted successfully",
  },

  // Admin Success
  ADMIN: {
    SETTINGS_SAVED: "Settings saved successfully",
    USER_ROLE_UPDATED: "User role updated successfully",
    USER_BANNED: "User banned successfully",
    USER_UNBANNED: "User unbanned successfully",
    USER_DELETED: "User deleted successfully",
    SESSION_REVOKED: "Session revoked successfully",
    SESSIONS_REVOKED: "User sessions revoked successfully",
    STORE_APPROVED: "Store approved successfully",
    STORE_REJECTED: "Store application rejected",
  },

  // Review Success
  REVIEW: {
    APPROVED: "Review approved successfully",
    REJECTED: "Review rejected successfully",
    DELETED: "Review deleted successfully",
    BULK_APPROVED: "All pending reviews approved successfully",
    SUBMITTED: "Review submitted successfully",
    SUBMITTED_PENDING_MODERATION:
      "Review submitted successfully. It will be visible after moderation.",
    VOTE_RECORDED: "Vote recorded successfully",
  },

  // FAQ Success
  FAQ: {
    SAVED: "FAQ saved successfully",
    DELETED: "FAQ deleted successfully",
    UPDATED: "FAQ updated successfully",
    CREATED: "FAQ created successfully",
    VOTE_SUBMITTED: "Vote submitted successfully",
    VOTE_HELPFUL: "Thank you for your feedback!",
    VOTE_NOT_HELPFUL:
      "Thank you for your feedback. We'll work to improve this answer.",
  },

  // Category Success
  CATEGORY: {
    SAVED: "Category saved successfully",
    DELETED: "Category deleted successfully",
    UPDATED: "Category updated successfully",
    CREATED: "Category created successfully",
  },

  // Carousel Success
  CAROUSEL: {
    SAVED: "Slide saved successfully",
    DELETED: "Slide deleted successfully",
    UPDATED: "Slide updated successfully",
    CREATED: "Slide created successfully",
    REORDERED: "Carousel slides reordered successfully",
  },

  // Homepage Section Success
  SECTION: {
    SAVED: "Section saved successfully",
    DELETED: "Section deleted successfully",
    UPDATED: "Section updated successfully",
    CREATED: "Section created successfully",
    REORDERED: "Homepage sections reordered successfully",
  },

  // Order Success
  ORDER: {
    CREATED: "Order placed successfully",
    UPDATED: "Order updated successfully",
    CANCELLED: "Order cancelled successfully",
    REFUNDED: "Refund initiated successfully",
  },

  // Payout Success
  PAYOUT: {
    CREATED: "Payout request submitted successfully",
    UPDATED: "Payout updated successfully",
    COMPLETED: "Payout processed successfully",
    BULK_REQUESTED: "Payout requested for {count} orders",
    WEEKLY_PROCESSED: "Weekly payouts processed successfully",
  },

  // Shipping Success
  SHIPPING: {
    UPDATED: "Shipping configuration saved successfully",
    SHIPROCKET_CONNECTED: "Shiprocket account connected successfully",
    PICKUP_OTP_SENT: "OTP sent to your registered phone number",
    PICKUP_VERIFIED: "Pickup address verified successfully",
    ORDER_SHIPPED: "Order marked as shipped",
    SHIPROCKET_ORDER_CREATED: "Shipment created in Shiprocket",
    PICKUP_SCHEDULED: "Pickup scheduled with Shiprocket",
  },

  // Payout settings Success
  PAYOUT_SETTINGS: {
    UPDATED: "Payout details saved successfully",
  },

  // Product Success
  PRODUCT: {
    CREATED: "Product created successfully",
    UPDATED: "Product updated successfully",
    DELETED: "Product deleted successfully",
  },

  // Address Success
  ADDRESS: {
    CREATED: "Address saved successfully",
    UPDATED: "Address updated successfully",
    DELETED: "Address deleted successfully",
    DEFAULT_SET: "Default address set successfully",
  },

  // Cart Success
  CART: {
    ITEM_ADDED: "Item added to cart",
    ITEM_UPDATED: "Cart updated",
    ITEM_REMOVED: "Item removed from cart",
    CLEARED: "Cart cleared",
  },

  // Checkout Success
  CHECKOUT: {
    ORDER_PLACED: "Order placed successfully!",
    PAYMENT_RECEIVED: "Payment received. Your order is confirmed.",
  },

  // Coupon Success
  COUPON: {
    CREATED: "Coupon created successfully",
    UPDATED: "Coupon updated successfully",
    DELETED: "Coupon deleted successfully",
    DEACTIVATED: "Coupon deactivated",
    REACTIVATED: "Coupon reactivated",
    APPLIED: "Coupon applied successfully",
    VALIDATED: "Coupon is valid",
  },

  SESSION: {
    ACTIVITY_UPDATED: "Activity updated",
    FETCHED: "Sessions fetched successfully",
  },

  // Media Success
  MEDIA: {
    VIDEO_TRIMMED: "Video trimmed successfully",
    IMAGE_CROPPED: "Image cropped successfully",
  },

  // Phone Success (additional)
  PHONE_VALIDATED: "Phone number validated successfully",

  // Logs Success
  LOGS: {
    WRITTEN: "Log written successfully",
  },

  // Newsletter Success
  NEWSLETTER: {
    SUBSCRIBED: "Thank you for subscribing! Check your email for confirmation.",
    UNSUBSCRIBED: "Subscriber unsubscribed successfully",
    RESUBSCRIBED: "Subscriber resubscribed successfully",
    UPDATED: "Subscriber updated successfully",
    DELETED: "Subscriber deleted successfully",
  },

  // Wishlist Success
  WISHLIST: {
    ADDED: "Item added to wishlist",
    REMOVED: "Item removed from wishlist",
    CLEARED: "Wishlist cleared",
  },

  BID: {
    PLACED: "Bid placed successfully",
  },

  CONTACT: {
    SENT: "Your message has been sent! We'll get back to you shortly.",
  },

  BLOG: {
    CREATED: "Blog post created successfully",
    UPDATED: "Blog post updated successfully",
    DELETED: "Blog post deleted successfully",
    PUBLISHED: "Blog post published successfully",
  },

  NOTIFICATION: {
    SENT: "Notification sent successfully",
    READ: "Notification marked as read",
    ALL_READ: "All notifications marked as read",
    DELETED: "Notification deleted",
    ALL_CLEARED: "All notifications cleared",
  },

  // Event success messages
  EVENT: {
    CREATED: "Event created successfully",
    UPDATED: "Event updated successfully",
    DELETED: "Event deleted successfully",
    ENTRY_SUBMITTED: "Your entry has been submitted",
    VOTE_SUBMITTED: "Your vote has been recorded",
    ENTRY_APPROVED: "Entry approved",
    ENTRY_FLAGGED: "Entry flagged",
    STATUS_CHANGED: "Event status updated",
  },

  // Chat success messages
  CHAT: {
    MESSAGE_SENT: "Message sent",
    ROOM_CREATED: "Chat opened",
    ROOM_DELETED: "Chat deleted",
  },

  // AI Copilot
  COPILOT: {
    RESPONSE_OK: "Response generated",
    FEEDBACK_SAVED: "Feedback saved",
  },
} as const;

export const INFO_MESSAGES = {
  EMAIL: {
    CHECK_INBOX: "Please check your email inbox for the verification link",
    CHECK_SPAM: "If you don't see the email, please check your spam folder",
  },

  PASSWORD: {
    REQUIREMENTS:
      "Password must be at least 8 characters and contain uppercase, lowercase, and numbers",
  },

  GENERAL: {
    LOADING: "Loading...",
    SAVING: "Saving...",
    PROCESSING: "Processing...",
  },
} as const;

export const CONFIRMATION_MESSAGES = {
  LOGOUT: "Are you sure you want to logout?",
  DELETE_ACCOUNT:
    "Are you sure you want to delete your account? This action cannot be undone.",
  DISCARD_CHANGES: "Are you sure you want to discard your changes?",
} as const;
