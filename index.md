# Appkit Code Index

One-line map of each file with a concrete description of what the file contains and its exported API symbols.

| Name | Path | What Is Inside | Exported Functions/Hooks/Symbols |
|---|---|---|---|
| .gitignore | .gitignore | Contains project configuration or metadata. | - |
| AboutView.tsx | src\features\about\components\AboutView.tsx | Contains project configuration or metadata. | fn AboutView, interface AboutHowItem, interface AboutValueItem, interface AboutMilestone +1 |
| Accordion.tsx | src\ui\components\Accordion.tsx | Contains project configuration or metadata. | fn Accordion, interface AccordionProps |
| account.repository.ts | src\features\account\repository\account.repository.ts | Contains project configuration or metadata. | class AccountRepository |
| ActiveFilterChips.tsx | src\ui\components\ActiveFilterChips.tsx | Contains project configuration or metadata. | fn ActiveFilterChips, interface ActiveFilter, interface ActiveFilterChipsProps |
| address.factory.ts | src\seed\factories\address.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/address.factory.ts | fn makeAddress, fn makeFullAddress, const ADDRESS_FIXTURES, interface SeedAddressDocument |
| AddressBook.tsx | src\features\account\components\AddressBook.tsx | Contains project configuration or metadata. | fn AddressCard, fn AddressBook |
| admin.ts | src\providers\db-firebase\admin.ts | Contains project configuration or metadata. Note: // Vercel (and other platforms) can store the private key in several formats: | fn getAdminApp, fn getAdminAuth, fn getAdminDb, fn getAdminStorage +2 |
| AdminAnalyticsCharts.tsx | src\features\admin\components\analytics\AdminAnalyticsCharts.tsx | Contains project configuration or metadata. | fn AdminRevenueChart, fn AdminOrdersChart, interface AdminRevenueChartProps, interface AdminOrdersChartProps |
| AdminAnalyticsView.tsx | src\features\admin\components\AdminAnalyticsView.tsx | Contains project configuration or metadata. | fn AdminAnalyticsView, interface AdminAnalyticsViewLabels, interface AdminAnalyticsViewProps |
| AdminBidsView.tsx | src\features\admin\components\AdminBidsView.tsx | Contains project configuration or metadata. | fn AdminBidsView, interface AdminBidsViewProps |
| AdminBlogView.tsx | src\features\admin\components\AdminBlogView.tsx | Contains project configuration or metadata. | fn AdminBlogView, interface AdminBlogViewProps |
| AdminCarouselView.tsx | src\features\admin\components\AdminCarouselView.tsx | Contains project configuration or metadata. | fn AdminCarouselView, interface AdminCarouselViewProps |
| AdminCategoriesView.tsx | src\features\admin\components\AdminCategoriesView.tsx | Contains project configuration or metadata. | fn AdminCategoriesView, interface AdminCategoriesViewProps |
| AdminCopilotView.tsx | src\features\copilot\components\AdminCopilotView.tsx | Contains project configuration or metadata. | fn AdminCopilotView, interface AdminCopilotViewProps |
| AdminCouponsView.tsx | src\features\admin\components\AdminCouponsView.tsx | Contains project configuration or metadata. | fn AdminCouponsView, interface AdminCouponsViewProps |
| AdminDashboardView.tsx | src\features\admin\components\AdminDashboardView.tsx | Contains project configuration or metadata. | fn AdminDashboardView, interface AdminDashboardViewProps |
| AdminEventEntriesView.tsx | src\features\events\components\AdminEventEntriesView.tsx | Contains project configuration or metadata. | fn AdminEventEntriesView, interface AdminEventEntriesViewProps |
| AdminEventsView.tsx | src\features\events\components\AdminEventsView.tsx | Contains project configuration or metadata. | fn AdminEventsView, interface AdminEventsViewProps |
| AdminFaqsView.tsx | src\features\admin\components\AdminFaqsView.tsx | Contains project configuration or metadata. | fn AdminFaqsView, interface AdminFaqsViewProps |
| AdminFeatureFlagsView.tsx | src\features\admin\components\AdminFeatureFlagsView.tsx | Contains project configuration or metadata. | fn AdminFeatureFlagsView, interface AdminFeatureFlagsViewProps |
| AdminMediaView.tsx | src\features\admin\components\AdminMediaView.tsx | Contains project configuration or metadata. | fn AdminMediaView, interface AdminMediaViewProps |
| AdminNavigationView.tsx | src\features\admin\components\AdminNavigationView.tsx | Contains project configuration or metadata. | fn AdminNavigationView, interface AdminNavigationViewProps |
| AdminOrdersView.tsx | src\features\admin\components\AdminOrdersView.tsx | Contains project configuration or metadata. | fn AdminOrdersView, interface AdminOrdersViewProps |
| AdminPayoutsView.tsx | src\features\admin\components\AdminPayoutsView.tsx | Contains project configuration or metadata. | fn AdminPayoutsView, interface AdminPayoutsViewProps |
| AdminProductsView.tsx | src\features\admin\components\AdminProductsView.tsx | Contains project configuration or metadata. | fn AdminProductsView, interface AdminProductsViewProps |
| AdminReviewsView.tsx | src\features\admin\components\AdminReviewsView.tsx | Contains project configuration or metadata. Note: When a detail view is provided, short-circuit to it | fn AdminReviewsView, interface AdminReviewsViewProps |
| AdminSectionsView.tsx | src\features\admin\components\AdminSectionsView.tsx | Contains project configuration or metadata. | fn AdminSectionsView, interface AdminSectionsViewProps |
| AdminSessionsManager.tsx | src\features\admin\components\AdminSessionsManager.tsx | Contains project configuration or metadata. | fn AdminSessionsManager, interface AdminSessionsManagerProps |
| AdminSidebar.tsx | src\features\admin\components\AdminSidebar.tsx | Contains project configuration or metadata. | fn AdminSidebar, interface AdminSidebarProps |
| AdminSiteView.tsx | src\features\admin\components\AdminSiteView.tsx | Contains project configuration or metadata. | fn AdminSiteView, interface AdminSiteViewProps |
| AdminStatCard.tsx | src\features\admin\components\analytics\AdminStatCard.tsx | Contains project configuration or metadata. | fn AdminStatCard, interface AdminStatCardProps |
| AdminStoresView.tsx | src\features\admin\components\AdminStoresView.tsx | Contains project configuration or metadata. | fn AdminStoresView, interface AdminStoresViewProps |
| AdminTopBar.tsx | src\features\admin\components\AdminTopBar.tsx | Contains project configuration or metadata. | fn AdminTopBar, interface AdminTopBarProps |
| AdminTopProductsTable.tsx | src\features\admin\components\analytics\AdminTopProductsTable.tsx | Contains project configuration or metadata. | fn AdminTopProductsTable, interface AdminTopProductsTableLabels, interface AdminTopProductsTableProps |
| AdminUsersView.tsx | src\features\admin\components\AdminUsersView.tsx | Contains project configuration or metadata. | fn AdminUsersView, interface AdminUsersViewProps |
| AdvertisementBanner.tsx | src\features\homepage\components\AdvertisementBanner.tsx | Contains project configuration or metadata. Note: Split layout: when a backgroundImage is provided | fn AdvertisementBanner, interface AdvertisementBannerProps |
| Alert.tsx | src\ui\components\Alert.tsx | Contains project configuration or metadata. Note: Inlined from THEME_CONSTANTS.colors.alert | fn Alert, interface AlertProps |
| AlgoliaDashboardView.tsx | src\features\admin\components\AlgoliaDashboardView.tsx | Contains project configuration or metadata. | fn AlgoliaDashboardView, interface AlgoliaDashboardViewProps |
| animation.helper.ts | src\ui\animation.helper.ts | Contains project configuration or metadata. | const easings |
| animation.helper.ts | src\utils\animation.helper.ts | Contains project configuration or metadata. | const easings |
| ApiClient.ts | src\http\ApiClient.ts | Contains project configuration or metadata. Note: Remove Content-Type so browser can set it with multipart boundary | const apiClient, class ApiClientError, class ApiClient, interface RequestConfig +2 |
| api-error.ts | src\errors\api-error.ts | Contains project configuration or metadata. | class ApiError |
| apiHandler.ts | src\next\api\apiHandler.ts | Contains project configuration or metadata. | fn createApiHandlerFactory, interface ApiRateLimitResult, interface ApiHandlerOptions, interface ApiHandlerFactoryDeps |
| array.helper.ts | src\utils\array.helper.ts | Contains project configuration or metadata. | fn groupBy, fn unique, fn uniqueBy, fn sortBy +2 |
| AuctionCard.tsx | src\features\auctions\components\AuctionCard.tsx | Contains project configuration or metadata. | fn AuctionCountdown, fn AuctionCard |
| AuctionDetailView.tsx | src\features\products\components\AuctionDetailView.tsx | Contains project configuration or metadata. | fn AuctionDetailView, interface AuctionDetailViewProps |
| auction-expiry.job.ts | src\features\cron\jobs\auction-expiry.job.ts | Contains project configuration or metadata. | fn createAuctionExpiryJob, const auctionExpiry |
| auctions.repository.ts | src\features\auctions\repository\auctions.repository.ts | Contains project configuration or metadata. | class AuctionsRepository |
| AuctionsView.tsx | src\features\products\components\AuctionsView.tsx | Contains project configuration or metadata. | fn AuctionsView, interface AuctionsViewProps |
| audit-violations.ts | scripts\audit-violations.ts | Contains project configuration or metadata. Note: Paths to exclude from results (partial path match) | - |
| auth.ts | src\contracts\auth.ts | Contains project configuration or metadata. | interface AuthPayload, interface AuthUser, interface CreateUserInput, interface IAuthProvider +1 |
| authentication-error.ts | src\errors\authentication-error.ts | Contains project configuration or metadata. | class AuthenticationError |
| authorization.ts | src\security\authorization.ts | Contains project configuration or metadata. | fn requireAuth, fn requireRole, fn requireOwnership, fn requireEmailVerified +4 |
| authorization-error.ts | src\errors\authorization-error.ts | Contains project configuration or metadata. | class AuthorizationError |
| AuthStatusPanel.tsx | src\features\auth\components\AuthStatusPanel.tsx | Contains project configuration or metadata. | fn AuthStatusPanel |
| AutoBreadcrumbs.tsx | src\features\layout\AutoBreadcrumbs.tsx | Contains project configuration or metadata. Note: Common locale codes filtered out of path segments | fn AutoBreadcrumbs, interface AutoBreadcrumbsProps |
| BackToTop.tsx | src\features\layout\BackToTop.tsx | Contains project configuration or metadata. | fn BackToTop, fn SkipToMain, interface BackToTopProps |
| Badge.tsx | src\ui\components\Badge.tsx | Contains project configuration or metadata. Note: Inlined from THEME_CONSTANTS.badge full ring-border variants | fn Badge, interface BadgeProps, type BadgeVariant |
| base.ts | src\providers\db-firebase\base.ts | Contains project configuration or metadata. Note: SieveQuery.sort supports a leading "-" prefix for descending order | class ProductRepository, class FirebaseRepository |
| base-error.ts | src\errors\base-error.ts | Contains project configuration or metadata. | class AppError |
| BecomeSellerView.tsx | src\features\account\components\BecomeSellerView.tsx | Contains project configuration or metadata. | fn BecomeSellerView, interface BecomeSellerViewLabels, interface BecomeSellerViewProps |
| BecomeSellerView.tsx | src\features\user\components\BecomeSellerView.tsx | Contains project configuration or metadata. | fn BecomeSellerView, interface BecomeSellerViewProps |
| before-after.repository.ts | src\features\before-after\repository\before-after.repository.ts | Contains project configuration or metadata. | class BeforeAfterRepository |
| BeforeAfterCard.tsx | src\features\homepage\components\BeforeAfterCard.tsx | Contains project configuration or metadata. | fn BeforeAfterCard, interface BeforeAfterCardProps |
| BeforeAfterGallery.tsx | src\features\before-after\components\BeforeAfterGallery.tsx | Contains project configuration or metadata. | fn BeforeAfterGallery |
| BeforeAfterSlider.tsx | src\features\before-after\components\BeforeAfterSlider.tsx | Contains project configuration or metadata. | fn BeforeAfterSlider |
| bid.factory.ts | src\seed\factories\bid.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/bid.factory.ts | fn makeBid, fn makeWinningBid, const BID_FIXTURES, interface SeedBidDocument |
| BidHistory.tsx | src\features\products\components\BidHistory.tsx | Contains project configuration or metadata. | fn BidHistory, interface BidHistoryEntry, interface BidHistoryProps |
| blog.repository.ts | src\features\blog\repository\blog.repository.ts | Contains project configuration or metadata. | class BlogRepository |
| BlogFeaturedCard.tsx | src\features\blog\components\BlogFeaturedCard.tsx | Contains project configuration or metadata. | fn BlogFeaturedCard, interface BlogFeaturedCardProps |
| BlogListView.tsx | src\features\blog\components\BlogListView.tsx | Contains project configuration or metadata. | fn BlogCard, fn BlogCategoryTabs, fn BlogListView |
| blog-post.factory.ts | src\seed\factories\blog-post.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/blog-post.factory.ts | fn makeBlogPost, interface SeedBlogPostDocument |
| BlogPostView.tsx | src\features\blog\components\BlogPostView.tsx | Contains project configuration or metadata. | fn BlogPostView, interface BlogPostViewProps |
| BottomNavItem.tsx | src\features\layout\BottomNavItem.tsx | Contains project configuration or metadata. Note: Use a plain anchor so this component stays framework-agnostic. | fn BottomNavItem, interface BottomNavItemProps |
| BottomNavLayout.tsx | src\features\layout\BottomNavLayout.tsx | Contains project configuration or metadata. | fn BottomNavLayout, interface BottomNavLayoutProps |
| BottomSheet.tsx | src\features\layout\BottomSheet.tsx | Contains project configuration or metadata. | fn BottomSheet, interface BottomSheetProps |
| Breadcrumb.tsx | src\ui\components\Breadcrumb.tsx | Contains project configuration or metadata. | fn Breadcrumb, interface BreadcrumbItem, interface BreadcrumbProps |
| Breadcrumbs.tsx | src\features\layout\Breadcrumbs.tsx | Contains project configuration or metadata. | fn Breadcrumbs, fn BreadcrumbItem, interface BreadcrumbsProps, interface BreadcrumbItemProps |
| BreadcrumbTrail.tsx | src\features\categories\components\BreadcrumbTrail.tsx | Contains project configuration or metadata. Note: Ancestors (sorted by tier ascending so root leaf order) | fn BreadcrumbTrail, interface BreadcrumbTrailProps |
| browser.ts | src\providers\search-algolia\browser.ts | Contains project configuration or metadata. | fn isAlgoliaBrowserConfigured, fn searchNavPages, re-export ALGOLIA_PAGES_INDEX_NAME |
| build-seller-analytics.log | build-seller-analytics.log | Contains project configuration or metadata. | - |
| BulkActionBar.tsx | src\ui\components\BulkActionBar.tsx | Contains project configuration or metadata. Note: Inline click-outside handler | fn BulkActionBar, interface BulkActionItem, interface BulkActionBarLabels, interface BulkActionBarProps |
| Button.tsx | src\ui\components\Button.tsx | Contains project configuration or metadata. Note: Inlined from THEME_CONSTANTS | fn Button, interface ButtonProps |
| BuyBar.tsx | src\features\products\components\BuyBar.tsx | Contains project configuration or metadata. | fn BuyBar, interface BuyBarProps |
| CacheManager.ts | src\core\CacheManager.ts | Contains project configuration or metadata. | const cacheManager, class CacheManager, interface CacheOptions, interface CacheEntry |
| cache-metrics.ts | src\monitoring\cache-metrics.ts | Contains project configuration or metadata. | fn getCacheMetrics, fn recordCacheHit, fn recordCacheMiss, fn resetCacheMetrics +3 |
| cache-middleware.ts | src\next\cache-middleware.ts | Contains project configuration or metadata. | fn withCache, fn invalidateCache, const GET, interface CacheConfig |
| CameraCapture.tsx | src\features\media\upload\CameraCapture.tsx | Contains project configuration or metadata. | interface CameraCaptureProps |
| Can.tsx | src\security\rbac\Can.tsx | Contains project configuration or metadata. Note: appkit/src/security/rbac/Can.tsx | fn Can |
| carousel.factory.ts | src\seed\factories\carousel.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/carousel.factory.ts | fn makeCarouselSlide, interface SeedCarouselSlideDocument |
| cart.factory.ts | src\seed\factories\cart.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/cart.factory.ts | fn makeCartItem, fn makeCart, fn makeFullCart, const CART_FIXTURES +2 |
| cart.repository.ts | src\features\cart\repository\cart.repository.ts | Contains project configuration or metadata. | class CartRepository |
| CartDrawer.tsx | src\features\cart\components\CartDrawer.tsx | Contains project configuration or metadata. | fn CartItemRow, fn CartDrawer |
| CartSummary.tsx | src\features\cart\components\CartSummary.tsx | Contains project configuration or metadata. | fn CartSummary, interface CartSummaryProps |
| CartView.tsx | src\features\cart\components\CartView.tsx | Contains project configuration or metadata. | fn CartView, interface CartViewProps |
| categories.repository.ts | src\features\categories\repository\categories.repository.ts | Contains project configuration or metadata. | class CategoriesRepository |
| categories.ts | src\seed\defaults\categories.ts | Contains project configuration or metadata. Note: appkit/src/seed/defaults/categories.ts | const DEFAULT_CATEGORIES |
| CategoriesListView.tsx | src\features\categories\components\CategoriesListView.tsx | Contains project configuration or metadata. | fn CategoriesListView, interface CategoriesListViewProps |
| category.factory.ts | src\seed\factories\category.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/category.factory.ts | fn makeCategory, interface SeedCategoryDocument |
| CategoryGrid.tsx | src\features\categories\components\CategoryGrid.tsx | Contains project configuration or metadata. | fn CategoryCard, fn CategoryGrid, interface CategoryCardProps, interface CategoryGridProps |
| CategoryProductsView.tsx | src\features\categories\components\CategoryProductsView.tsx | Contains project configuration or metadata. | fn CategoryProductsView, interface CategoryProductsViewProps |
| CategoryTree.tsx | src\features\categories\components\CategoryTree.tsx | Contains project configuration or metadata. Note: Group children by parent | fn CategoryTree, interface CategoryTreeProps |
| chain.ts | src\next\middleware\chain.ts | Contains project configuration or metadata. Note: appkit/src/next/middleware/chain.ts | fn runChain, fn buildBaseContext, fn createApiMiddleware, const GET +1 |
| CharacterHotspot.tsx | src\features\homepage\components\CharacterHotspot.tsx | Contains project configuration or metadata. | fn CharacterHotspot, interface CharacterHotspotProps |
| CharacterHotspotForm.tsx | src\features\homepage\components\CharacterHotspotForm.tsx | Contains project configuration or metadata. | fn CharacterHotspotForm, interface CharacterHotspotFormProps |
| ChatList.tsx | src\features\account\components\ChatList.tsx | Contains project configuration or metadata. | fn ChatList, interface ChatListLabels, interface ChatListProps |
| ChatWindow.tsx | src\features\account\components\ChatWindow.tsx | Contains project configuration or metadata. | fn ChatWindow, interface ChatWindowLabels, interface ChatWindowProps |
| Checkbox.tsx | src\features\forms\Checkbox.tsx | Contains project configuration or metadata. | fn Checkbox, interface CheckboxProps |
| CheckoutAddressStep.tsx | src\features\cart\components\CheckoutAddressStep.tsx | Contains project configuration or metadata. | fn CheckoutAddressStep, interface CheckoutAddressStepLabels, interface CheckoutAddressStepProps |
| CheckoutOtpModal.tsx | src\features\cart\components\CheckoutOtpModal.tsx | Contains project configuration or metadata. | fn CheckoutOtpModal, interface CheckoutOtpModalProps |
| CheckoutStepper.tsx | src\features\checkout\components\CheckoutStepper.tsx | Contains project configuration or metadata. | fn CheckoutStepper |
| CheckoutSuccessView.tsx | src\features\cart\components\CheckoutSuccessView.tsx | Contains project configuration or metadata. | fn CheckoutSuccessView, interface CheckoutSuccessViewProps |
| CheckoutView.tsx | src\features\cart\components\CheckoutView.tsx | Contains project configuration or metadata. | fn CheckoutView, interface CheckoutViewProps |
| CoinsDisplay.tsx | src\features\loyalty\components\CoinsDisplay.tsx | Contains project configuration or metadata. | fn CoinsBadge, fn CoinsDisplay |
| CollectionCard.tsx | src\features\collections\components\CollectionCard.tsx | Contains project configuration or metadata. | fn CollectionCard, fn CollectionGrid |
| collections.repository.ts | src\features\collections\repository\collections.repository.ts | Contains project configuration or metadata. | class CollectionsRepository |
| color.helper.ts | src\ui\color.helper.ts | Contains project configuration or metadata. | fn hexToRgb, fn rgbToHex, fn getContrastColor |
| color.helper.ts | src\utils\color.helper.ts | Contains project configuration or metadata. | fn hexToRgb, fn rgbToHex, fn getContrastColor |
| ConcernCard.tsx | src\features\categories\components\ConcernCard.tsx | Contains project configuration or metadata. | fn ConcernCard |
| ConcernGrid.tsx | src\features\categories\components\ConcernGrid.tsx | Contains project configuration or metadata. | fn ConcernGrid |
| config.ts | src\contracts\config.ts | Contains project configuration or metadata. | interface SiteConfig, interface NavItem |
| ConsultationForm.tsx | src\features\consultation\components\ConsultationForm.tsx | Contains project configuration or metadata. | fn ConsultationForm |
| consultations.repository.ts | src\features\consultation\repository\consultations.repository.ts | Contains project configuration or metadata. | class ConsultationsRepository |
| ContactCTA.tsx | src\features\faq\components\ContactCTA.tsx | Contains project configuration or metadata. | fn ContactCTA |
| ContactForm.tsx | src\features\contact\components\ContactForm.tsx | Contains project configuration or metadata. Note: eslint-disable-next-line react-hooks/exhaustive-deps | fn ContactForm, interface ContactFormProps |
| ContactInfoSidebar.tsx | src\features\contact\components\ContactInfoSidebar.tsx | Contains project configuration or metadata. | fn ContactInfoSidebar, interface ContactInfoItem, interface ContactInfoSidebarProps |
| cookie.converter.ts | src\utils\cookie.converter.ts | Contains project configuration or metadata. | fn parseCookies, fn getCookie, fn hasCookie, fn deleteCookie |
| corporate.repository.ts | src\features\corporate\repository\corporate.repository.ts | Contains project configuration or metadata. | class CorporateRepository |
| CorporateInquiryForm.tsx | src\features\corporate\components\CorporateInquiryForm.tsx | Contains project configuration or metadata. | fn CorporateInquiryForm |
| CountdownDisplay.tsx | src\ui\components\CountdownDisplay.tsx | Contains project configuration or metadata. | fn CountdownDisplay, interface CountdownRemaining, interface CountdownDisplayProps |
| coupon.factory.ts | src\seed\factories\coupon.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/coupon.factory.ts | fn makeCoupon, fn makeFullCoupon, const COUPON_FIXTURES, interface SeedCouponDocument +1 |
| CouponCard.tsx | src\features\promotions\components\CouponCard.tsx | Contains project configuration or metadata. | fn CouponCard |
| csp.ts | src\security\csp.ts | Contains project configuration or metadata. | fn generateNonce, fn buildCSP |
| CustomerReviewsSection.tsx | src\features\homepage\components\CustomerReviewsSection.tsx | Contains project configuration or metadata. | fn CustomerReviewsSection, interface CustomerReviewsSectionProps |
| DashboardStats.tsx | src\features\admin\components\DashboardStats.tsx | Contains project configuration or metadata. | fn DashboardStatsGrid |
| database-error.ts | src\errors\database-error.ts | Contains project configuration or metadata. | class DatabaseError |
| DataTable.tsx | src\features\admin\components\DataTable.tsx | Contains project configuration or metadata. | fn DataTable |
| DataTable.tsx | src\ui\DataTable.tsx | Contains project configuration or metadata. Note: Custom empty state | fn DataTable, interface DataTableProps, type DataTableColumn |
| date.formatter.ts | src\utils\date.formatter.ts | Contains project configuration or metadata. | fn resolveDate, fn formatDate, fn formatDateTime, fn formatTime +11 |
| default-roles.ts | src\security\rbac\default-roles.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/default-roles.ts | const DEFAULT_ROLES |
| DemoSeedView.tsx | src\features\admin\components\DemoSeedView.tsx | Contains project configuration or metadata. | fn DemoSeedView, interface DemoSeedViewProps |
| deploy-firebase-functions.ps1 | scripts\deploy-firebase-functions.ps1 | Contains project configuration or metadata. | - |
| deploy-firestore-indices.ps1 | scripts\deploy-firestore-indices.ps1 | Contains project configuration or metadata. | - |
| DescriptionField.tsx | src\ui\components\DescriptionField.tsx | Contains project configuration or metadata. Note: appkit/src/ui/components/DescriptionField.tsx | fn DescriptionField, interface DescriptionFieldProps |
| Div.tsx | src\ui\components\Div.tsx | Contains project configuration or metadata. | const Div, interface DivProps |
| Divider.tsx | src\ui\components\Divider.tsx | Contains project configuration or metadata. Note: Inlined from THEME_CONSTANTS.themed | fn Divider, interface DividerProps |
| Drawer.tsx | src\ui\components\Drawer.tsx | Contains project configuration or metadata. Note: Body scroll lock | fn Drawer, interface DrawerProps |
| email.ts | src\contracts\email.ts | Contains project configuration or metadata. | interface EmailAttachment, interface EmailOptions, interface EmailResult, interface IEmailProvider |
| email.validator.ts | src\validation\email.validator.ts | Contains project configuration or metadata. | fn isValidEmail, fn isValidEmailDomain, fn normalizeEmail, fn isDisposableEmail |
| en.json | src\features\account\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\admin\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\auctions\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\auth\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\before-after\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\blog\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\cart\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\categories\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\checkout\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\collections\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\consultation\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\corporate\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\events\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\faq\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\homepage\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\loyalty\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\media\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\orders\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\payments\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\pre-orders\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\products\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\promotions\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\reviews\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\search\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\seller\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\stores\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\whatsapp-bot\messages\en.json | Contains project configuration or metadata. | - |
| en.json | src\features\wishlist\messages\en.json | Contains project configuration or metadata. | - |
| error-codes.ts | src\errors\error-codes.ts | Contains project configuration or metadata. Note: Authentication | const ERROR_CODES, const ERROR_MESSAGES, type ErrorCode |
| error-handler.ts | src\errors\error-handler.ts | Contains project configuration or metadata. Note: Zod / schema validation errors | fn handleApiError, fn logError, fn isAppError |
| errorHandler.ts | src\next\api\errorHandler.ts | Contains project configuration or metadata. Note: Known AppError subclass structured response | fn createApiErrorHandler, const handleApiError, interface IApiErrorLogger, interface ApiErrorHandlerOptions |
| error-tracking.ts | src\monitoring\error-tracking.ts | Contains project configuration or metadata. Note: eslint-disable-next-line no-var | fn setErrorTracker, fn trackError, fn trackApiError, fn trackAuthError +6 |
| EventBus.ts | src\core\EventBus.ts | Contains project configuration or metadata. | const eventBus, class EventBus, interface EventSubscription |
| EventCard.tsx | src\features\events\components\EventCard.tsx | Contains project configuration or metadata. | fn EventCard |
| EventDetailView.tsx | src\features\events\components\EventDetailView.tsx | Contains project configuration or metadata. | fn EventDetailView, interface EventDetailViewProps |
| EventFormDrawer.tsx | src\features\events\components\EventFormDrawer.tsx | Contains project configuration or metadata. | fn EventFormDrawer, interface EventFormDrawerProps |
| EventLeaderboard.tsx | src\features\events\components\EventLeaderboard.tsx | Contains project configuration or metadata. | fn EventLeaderboard, interface EventLeaderboardProps |
| event-manager.ts | src\utils\event-manager.ts | Contains project configuration or metadata. Note: eslint-disable-next-line @typescript-eslint/no-explicit-any | fn throttle, fn debounce, fn addGlobalScrollHandler, fn addGlobalResizeHandler +11 |
| EventParticipateView.tsx | src\features\events\components\EventParticipateView.tsx | Contains project configuration or metadata. | fn EventParticipateView, interface EventParticipateViewProps |
| events.repository.ts | src\features\events\repository\events.repository.ts | Contains project configuration or metadata. | class EventsRepository, class EventEntriesRepository |
| EventsListView.tsx | src\features\events\components\EventsListView.tsx | Contains project configuration or metadata. | fn EventsListView |
| EventStatusBadge.tsx | src\features\events\components\EventStatusBadge.tsx | Contains project configuration or metadata. | fn EventStatusBadge |
| extend.ts | src\contracts\extend.ts | Contains project configuration or metadata. | const productExt, const productAdminColumns, interface WithTransformOpts, interface GenericListResponse +4 |
| faq.factory.ts | src\seed\factories\faq.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/faq.factory.ts | fn makeFaq, interface SeedFaqDocument |
| FAQAccordion.tsx | src\features\faq\components\FAQAccordion.tsx | Contains project configuration or metadata. | fn FAQAccordion, fn FAQCategoryTabs, interface FAQAccordionProps |
| FAQCategorySidebar.tsx | src\features\faq\components\FAQCategorySidebar.tsx | Contains project configuration or metadata. | fn FAQCategorySidebar, interface FAQCategoryItem |
| FAQHelpfulButtons.tsx | src\features\faq\components\FAQHelpfulButtons.tsx | Contains project configuration or metadata. | fn FAQHelpfulButtons |
| FAQPageContent.tsx | src\features\faq\components\FAQPageContent.tsx | Contains project configuration or metadata. | fn FAQPageContent |
| faqs.repository.ts | src\features\faq\repository\faqs.repository.ts | Contains project configuration or metadata. | class FAQsRepository |
| faqs.ts | src\seed\defaults\faqs.ts | Contains project configuration or metadata. Note: appkit/src/seed/defaults/faqs.ts | const DEFAULT_FAQS |
| FAQSection.tsx | src\features\homepage\components\FAQSection.tsx | Contains project configuration or metadata. | fn FAQSection, interface FAQTab, interface FAQItem, interface FAQSectionProps |
| FAQSortDropdown.tsx | src\features\faq\components\FAQSortDropdown.tsx | Contains project configuration or metadata. | fn FAQSortDropdown, type FAQSortOption |
| feature.ts | src\contracts\feature.ts | Contains project configuration or metadata. | interface RouteStub, interface ApiRouteStub, interface FeatureManifest, type FeaturesConfig |
| FeaturedResultsSection.tsx | src\features\homepage\components\FeaturedResultsSection.tsx | Contains project configuration or metadata. | fn FeaturedResultsSection, interface FeaturedResultItem, interface FeaturedResultsSectionProps |
| filter.helper.ts | src\utils\filter.helper.ts | Contains project configuration or metadata. | fn buildSieveFilters |
| FilterFacetSection.tsx | src\features\filters\FilterFacetSection.tsx | Contains project configuration or metadata. | fn FilterFacetSection, interface FacetOption, interface FilterFacetSectionProps |
| FilterPanel.tsx | src\features\filters\FilterPanel.tsx | Contains project configuration or metadata. | fn FilterPanel, interface UrlTable, interface FacetSingleConfig, interface FacetMultiConfig +5 |
| filterUtils.ts | src\features\filters\filterUtils.ts | Contains project configuration or metadata. | fn getFilterLabel, fn getFilterValue, fn cn, type FilterOption |
| firebase-adapters.ts | src\features\cron\firebase-adapters.ts | Contains project configuration or metadata. Note: We only describe what we USE, not the full Firebase API surface. | fn wrapScheduled, fn wrapPubSub, const auctionsExpiry, const auctionExpiryPubSub |
| FooterLayout.tsx | src\features\layout\FooterLayout.tsx | Contains project configuration or metadata. | fn FooterLayout, interface FooterLinkGroup, interface FooterSocialLink, interface TrustBarItem +1 |
| ForgotPasswordView.tsx | src\features\auth\components\ForgotPasswordView.tsx | Contains project configuration or metadata. | fn ForgotPasswordView, interface ForgotPasswordViewProps |
| Form.tsx | src\features\forms\Form.tsx | Contains project configuration or metadata. | fn Form, fn FormGroup, fn FormFieldSpan, fn FormActions +3 |
| Form.tsx | src\ui\components\Form.tsx | Contains project configuration or metadata. | fn Form, interface FormProps |
| FormGrid.tsx | src\ui\components\FormGrid.tsx | Contains project configuration or metadata. Note: appkit/src/ui/components/FormGrid.tsx | fn FormGrid, fn FormField, interface FormGridProps, interface FormFieldProps |
| Guards.tsx | src\features\auth\components\Guards.tsx | Contains project configuration or metadata. | fn RoleGate, fn ProtectedRoute |
| helpers.ts | src\providers\auth-firebase\helpers.ts | Contains project configuration or metadata. | fn verifyIdToken, fn verifySessionCookie, fn createMiddlewareAuthChain, fn requireAuth +2 |
| helpers.ts | src\providers\db-firebase\helpers.ts | Contains project configuration or metadata. Note: Firestore Timestamp has .toDate() but is not a plain Date | fn removeUndefined, fn prepareForFirestore, fn deserializeTimestamps |
| HeroBanner.tsx | src\features\homepage\components\HeroBanner.tsx | Contains project configuration or metadata. | fn HeroBanner, interface HeroBannerProps |
| HeroCarousel.tsx | src\features\homepage\components\HeroCarousel.tsx | Contains project configuration or metadata. | fn HeroCarousel, interface HeroCarouselProps |
| HeroSection.tsx | src\features\homepage\components\HeroSection.tsx | Contains project configuration or metadata. | fn HeroSection |
| homepage.repository.ts | src\features\homepage\repository\homepage.repository.ts | Contains project configuration or metadata. | class HomepageSectionsRepository |
| homepage-section.factory.ts | src\seed\factories\homepage-section.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/homepage-section.factory.ts | fn makeHomepageSection, interface SeedHomepageSectionDocument, type HomepageSectionType |
| homepage-sections.ts | src\seed\defaults\homepage-sections.ts | Contains project configuration or metadata. Note: appkit/src/seed/defaults/homepage-sections.ts | const DEFAULT_HOMEPAGE_SECTIONS |
| HomepageSkeleton.tsx | src\features\homepage\components\HomepageSkeleton.tsx | Contains project configuration or metadata. Note: Hardcoded clamp values (extended THEME_CONSTANTS keys not in @mohasinac/tokens) | fn HomepageSkeleton |
| HomepageView.tsx | src\features\homepage\components\HomepageView.tsx | Contains project configuration or metadata. | fn HomepageView, interface HomepageViewProps |
| hook.ts | src\security\rbac\hook.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/hook.ts | fn createRbacHook, const useRBAC, interface RbacHookReturn |
| HorizontalScroller.tsx | src\ui\components\HorizontalScroller.tsx | Contains project configuration or metadata. | fn HorizontalScroller, interface PerViewConfig, interface HorizontalScrollerProps |
| HowItWorksInfoView.tsx | src\features\homepage\components\HowItWorksInfoView.tsx | Contains project configuration or metadata. | fn HowItWorksInfoView, interface HowItWorksInfoStep, interface HowItWorksInfoDetail, interface HowItWorksInfoViewProps |
| HowItWorksSection.tsx | src\features\homepage\components\HowItWorksSection.tsx | Contains project configuration or metadata. | fn HowItWorksSection, interface HowItWorksStep, interface HowItWorksSectionProps |
| IAuthVerifier.ts | src\next\IAuthVerifier.ts | Contains project configuration or metadata. | const firebaseAuthVerifier, interface AuthVerifiedUser, interface IAuthVerifier |
| IconButton.tsx | src\ui\components\IconButton.tsx | Contains project configuration or metadata. | fn IconButton, interface IconButtonProps |
| id-generators.ts | src\utils\id-generators.ts | Contains project configuration or metadata. | fn generateCategoryId, fn generateUserId, fn generateProductId, fn generateAuctionId +23 |
| ImageCropModal.tsx | src\features\media\modals\ImageCropModal.tsx | Contains project configuration or metadata. | fn ImageCropModal, interface ImageCropData, interface ImageCropModalProps |
| ImageLightbox.tsx | src\ui\components\ImageLightbox.tsx | Contains project configuration or metadata. Note: Sync external activeIndex | fn ImageLightbox, interface LightboxImage, interface ImageLightboxProps |
| ImageUpload.tsx | src\features\media\upload\ImageUpload.tsx | Contains project configuration or metadata. | fn ImageUpload, interface ImageUploadProps |
| index.md | index.md | Contains project configuration or metadata. | - |
| index.ts | src\cli\index.ts | Contains project configuration or metadata. Note: --------------------------------------------------------------------------- | fn withFeatures, fn mergeFeatureMessages, const FEATURE_SUBPATH_MAP, interface NextConfig |
| index.ts | src\contracts\index.ts | Contains project configuration or metadata. Note: @mohasinac/contracts | re-export registerProviders, re-export getProviders, re-export _resetProviders, re-export DEFAULT_PAGINATION_CONFIG +3 |
| index.ts | src\core\index.ts | Contains project configuration or metadata. | re-export Logger, re-export logger, re-export Queue, re-export StorageManager +5 |
| index.ts | src\errors\index.ts | Contains project configuration or metadata. Note: error-handler uses `next/server` only import in server/API-route contexts | re-export AppError, re-export ERROR_CODES, re-export ERROR_MESSAGES, re-export ApiError +8 |
| index.ts | src\features\about\components\index.ts | Contains project configuration or metadata. | re-export AboutView |
| index.ts | src\features\about\index.ts | Contains project configuration or metadata. | re-export AboutView |
| index.ts | src\features\account\columns\index.ts | Contains project configuration or metadata. | fn buildAccountColumns, const accountAdminColumns |
| index.ts | src\features\account\components\index.ts | Contains project configuration or metadata. | re-export AddressCard, re-export AddressBook, re-export UserAccountHubView, re-export ProfileView +11 |
| index.ts | src\features\account\index.ts | Contains project configuration or metadata. | re-export AccountRepository, re-export manifest |
| index.ts | src\features\account\schemas\index.ts | Contains project configuration or metadata. | const userAddressSchema, const notificationPreferencesSchema, const userProfileSchema, const updateProfileSchema |
| index.ts | src\features\account\types\index.ts | Contains project configuration or metadata. | interface OrderItem, interface UserOrder, interface UserNotification, interface UserOffer +9 |
| index.ts | src\features\admin\components\analytics\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\admin\components\index.ts | Contains project configuration or metadata. | re-export DataTable, re-export DashboardStatsGrid, re-export AdminUsersView, re-export AdminProductsView +27 |
| index.ts | src\features\admin\index.ts | Contains project configuration or metadata. Note: API route handlers re-exported for 2-line consumer stubs | re-export manifest, re-export ADMIN_PAGE_PERMISSIONS, re-export GET |
| index.ts | src\features\admin\types\index.ts | Contains project configuration or metadata. Note: Re-export the base column type from contracts | interface AdminTableColumn, interface DashboardStats, interface AdminListParams, interface AdminListResponse +4 |
| index.ts | src\features\auctions\columns\index.ts | Contains project configuration or metadata. | fn buildAuctionColumns, fn buildBidColumns, const auctionAdminColumns, const bidAdminColumns |
| index.ts | src\features\auctions\components\index.ts | Contains project configuration or metadata. | re-export AuctionCard, re-export AuctionCountdown |
| index.ts | src\features\auctions\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers (2-line stub re-export) | re-export AuctionsRepository, re-export manifest, re-export GET |
| index.ts | src\features\auctions\schemas\index.ts | Contains project configuration or metadata. | const auctionStatusSchema, const auctionItemSchema, const bidRecordSchema, const auctionListParamsSchema |
| index.ts | src\features\auctions\types\index.ts | Contains project configuration or metadata. | interface AuctionItem, interface BidRecord, interface AuctionListResponse, interface BidListResponse +2 |
| index.ts | src\features\auth\components\index.ts | Contains project configuration or metadata. | re-export RoleGate, re-export ProtectedRoute, re-export SocialAuthButtons, re-export AuthStatusPanel +5 |
| index.ts | src\features\auth\index.ts | Contains project configuration or metadata. | re-export authMeGET, re-export manifest |
| index.ts | src\features\auth\schemas\index.ts | Contains project configuration or metadata. | const loginSchema, const registerSchema, const forgotPasswordSchema, const resetPasswordSchema +2 |
| index.ts | src\features\auth\types\index.ts | Contains project configuration or metadata. | interface AuthUser, interface LoginInput, interface RegisterInput, interface ForgotPasswordInput +3 |
| index.ts | src\features\before-after\columns\index.ts | Contains project configuration or metadata. | fn buildBeforeAfterColumns, const beforeAfterAdminColumns |
| index.ts | src\features\before-after\components\index.ts | Contains project configuration or metadata. | re-export BeforeAfterSlider, re-export BeforeAfterGallery |
| index.ts | src\features\before-after\index.ts | Contains project configuration or metadata. | re-export BeforeAfterRepository, re-export manifest |
| index.ts | src\features\before-after\schemas\index.ts | Contains project configuration or metadata. | const beforeAfterItemSchema |
| index.ts | src\features\before-after\types\index.ts | Contains project configuration or metadata. | interface BeforeAfterItem, interface BeforeAfterListResponse |
| index.ts | src\features\blog\columns\index.ts | Contains project configuration or metadata. | fn buildBlogColumns, const blogAdminColumns |
| index.ts | src\features\blog\components\index.ts | Contains project configuration or metadata. | re-export BlogCard, re-export BlogCategoryTabs, re-export BlogListView, re-export BlogFeaturedCard +1 |
| index.ts | src\features\blog\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export BlogRepository, re-export manifest, re-export GET |
| index.ts | src\features\blog\schemas\index.ts | Contains project configuration or metadata. | const blogPostCategorySchema, const blogPostStatusSchema, const blogPostSchema, const blogListParamsSchema |
| index.ts | src\features\blog\types\index.ts | Contains project configuration or metadata. | interface BlogPost, interface BlogListMeta, interface BlogListResponse, interface BlogListParams +2 |
| index.ts | src\features\cart\columns\index.ts | Contains project configuration or metadata. | fn buildCartColumns, const cartAdminColumns |
| index.ts | src\features\cart\components\index.ts | Contains project configuration or metadata. | re-export CartItemRow, re-export CartDrawer, re-export CartView, re-export CartSummary +4 |
| index.ts | src\features\cart\index.ts | Contains project configuration or metadata. | re-export CartRepository, re-export manifest |
| index.ts | src\features\cart\schemas\index.ts | Contains project configuration or metadata. | const cartItemMetaSchema, const cartItemSchema, const cartSummarySchema |
| index.ts | src\features\cart\types\index.ts | Contains project configuration or metadata. | interface CartItemMeta, interface CartItem, interface CartData |
| index.ts | src\features\categories\columns\index.ts | Contains project configuration or metadata. | fn buildCategoryColumns, const categoryAdminColumns |
| index.ts | src\features\categories\components\index.ts | Contains project configuration or metadata. | re-export CategoryCard, re-export CategoryGrid, re-export CategoryTree, re-export BreadcrumbTrail +4 |
| index.ts | src\features\categories\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export CategoriesRepository, re-export manifest, re-export GET, re-export POST +3 |
| index.ts | src\features\categories\schemas\index.ts | Contains project configuration or metadata. | const categoryTypeSchema, const categorySeoSchema, const categoryDisplaySchema, const categoryMetricsSchema +2 |
| index.ts | src\features\categories\types\index.ts | Contains project configuration or metadata. Note: Concerns, collections, and brands are all categories with a type discriminator. | interface CategorySeo, interface CategoryDisplay, interface CategoryMetrics, interface CategoryAncestor +5 |
| index.ts | src\features\checkout\components\index.ts | Contains project configuration or metadata. | re-export CheckoutStepper |
| index.ts | src\features\checkout\index.ts | Contains project configuration or metadata. | re-export manifest |
| index.ts | src\features\checkout\types\index.ts | Contains project configuration or metadata. | interface UserAddress, interface ShippingOption, interface CheckoutState, interface CheckoutSummary +3 |
| index.ts | src\features\cms\index.ts | Contains project configuration or metadata. Note: @mohasinac/appkit/features/cms | - |
| index.ts | src\features\collections\columns\index.ts | Contains project configuration or metadata. | fn buildCollectionColumns, const collectionAdminColumns |
| index.ts | src\features\collections\components\index.ts | Contains project configuration or metadata. | re-export CollectionCard, re-export CollectionGrid |
| index.ts | src\features\collections\index.ts | Contains project configuration or metadata. | re-export CollectionsRepository, re-export manifest |
| index.ts | src\features\collections\schemas\index.ts | Contains project configuration or metadata. | const collectionItemSchema, const collectionListItemSchema |
| index.ts | src\features\collections\types\index.ts | Contains project configuration or metadata. | interface CollectionItem, interface CollectionListItem |
| index.ts | src\features\consultation\columns\index.ts | Contains project configuration or metadata. | fn buildConsultationColumns, const consultationAdminColumns |
| index.ts | src\features\consultation\components\index.ts | Contains project configuration or metadata. | re-export ConsultationForm |
| index.ts | src\features\consultation\index.ts | Contains project configuration or metadata. | re-export ConsultationsRepository, re-export manifest |
| index.ts | src\features\consultation\schemas\index.ts | Contains project configuration or metadata. | const consultationStatusSchema, const consultationModeSchema, const consultationBookingSchema, const bookConsultationSchema |
| index.ts | src\features\consultation\types\index.ts | Contains project configuration or metadata. | interface ConsultationBooking, interface BookConsultationInput, interface ConsultationListResponse, type ConsultationStatus +1 |
| index.ts | src\features\contact\components\index.ts | Contains project configuration or metadata. | re-export ContactForm, re-export ContactInfoSidebar |
| index.ts | src\features\contact\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\copilot\components\index.ts | Contains project configuration or metadata. | re-export AdminCopilotView |
| index.ts | src\features\copilot\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\corporate\columns\index.ts | Contains project configuration or metadata. | fn buildCorporateColumns, const corporateAdminColumns |
| index.ts | src\features\corporate\components\index.ts | Contains project configuration or metadata. | re-export CorporateInquiryForm |
| index.ts | src\features\corporate\index.ts | Contains project configuration or metadata. | re-export CorporateRepository, re-export manifest |
| index.ts | src\features\corporate\schemas\index.ts | Contains project configuration or metadata. | const corporateInquiryStatusSchema, const corporateInquirySchema, const submitCorporateInquirySchema |
| index.ts | src\features\corporate\types\index.ts | Contains project configuration or metadata. | interface CorporateInquiry, interface SubmitCorporateInquiryInput, interface CorporateInquiryListResponse, type CorporateInquiryStatus |
| index.ts | src\features\cron\index.ts | Contains project configuration or metadata. | re-export createCronJob, re-export getCronRegistry, re-export getCronRegistrySummary, re-export findCronJob +6 |
| index.ts | src\features\events\columns\index.ts | Contains project configuration or metadata. | fn buildEventColumns, const eventAdminColumns |
| index.ts | src\features\events\components\index.ts | Contains project configuration or metadata. | re-export EventStatusBadge, re-export EventCard, re-export EventsListView, re-export EventDetailView +5 |
| index.ts | src\features\events\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export EventsRepository, re-export EventEntriesRepository, re-export manifest, re-export GET |
| index.ts | src\features\events\schemas\index.ts | Contains project configuration or metadata. | const eventTypeSchema, const eventStatusSchema, const saleConfigSchema, const offerConfigSchema +3 |
| index.ts | src\features\events\types\index.ts | Contains project configuration or metadata. | interface SurveyFormField, interface SaleConfig, interface OfferConfig, interface PollConfig +15 |
| index.ts | src\features\faq\columns\index.ts | Contains project configuration or metadata. | fn buildFaqColumns, const faqAdminColumns |
| index.ts | src\features\faq\components\index.ts | Contains project configuration or metadata. | re-export FAQAccordion, re-export FAQCategoryTabs, re-export FAQCategorySidebar, re-export FAQSortDropdown +4 |
| index.ts | src\features\faq\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export FAQsRepository, re-export manifest, re-export GET |
| index.ts | src\features\faq\schemas\index.ts | Contains project configuration or metadata. | const faqCategorySchema, const faqAnswerFormatSchema, const faqAnswerSchema, const faqStatsSchema +2 |
| index.ts | src\features\faq\types\index.ts | Contains project configuration or metadata. | interface FAQAnswer, interface FAQStats, interface FAQ, interface FAQListResponse +3 |
| index.ts | src\features\filters\index.ts | Contains project configuration or metadata. Note: Public API for @mohasinac/feat-filters | re-export FilterFacetSection, re-export RangeFilter, re-export SwitchFilter, re-export FilterPanel +3 |
| index.ts | src\features\forms\index.ts | Contains project configuration or metadata. Note: @mohasinac/feat-forms | re-export Input, re-export Textarea, re-export Select, re-export Checkbox +12 |
| index.ts | src\features\homepage\components\index.ts | Contains project configuration or metadata. | re-export HeroSection, re-export CharacterHotspot, re-export CharacterHotspotForm, re-export HeroBanner +23 |
| index.ts | src\features\homepage\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\homepage\types\index.ts | Contains project configuration or metadata. | interface HomepageSectionContent, interface HomepageSection, interface HomepageData, interface HotspotPin +10 |
| index.ts | src\features\layout\index.ts | Contains project configuration or metadata. Note: @mohasinac/feat-layout | re-export NavbarLayout, re-export FooterLayout, re-export SidebarLayout, re-export BottomNavLayout +10 |
| index.ts | src\features\loyalty\columns\index.ts | Contains project configuration or metadata. | fn buildLoyaltyColumns, const loyaltyAdminColumns |
| index.ts | src\features\loyalty\components\index.ts | Contains project configuration or metadata. | re-export CoinsBadge, re-export CoinsDisplay |
| index.ts | src\features\loyalty\index.ts | Contains project configuration or metadata. | re-export LoyaltyRepository, re-export manifest |
| index.ts | src\features\loyalty\schemas\index.ts | Contains project configuration or metadata. | const coinReasonSchema, const coinHistoryEntrySchema, const loyaltyBalanceSchema, const loyaltyConfigSchema |
| index.ts | src\features\loyalty\types\index.ts | Contains project configuration or metadata. | interface LoyaltyConfig, interface CoinHistoryEntry, interface LoyaltyBalance, interface EarnCoinsInput +7 |
| index.ts | src\features\media\index.ts | Contains project configuration or metadata. Note: Public API for @mohasinac/feat-media | re-export MediaImage, re-export MediaVideo, re-export MediaAvatar, re-export MediaLightbox +10 |
| index.ts | src\features\orders\columns\index.ts | Contains project configuration or metadata. | fn buildOrderColumns, const orderAdminColumns |
| index.ts | src\features\orders\components\index.ts | Contains project configuration or metadata. | re-export OrderCard, re-export OrdersList |
| index.ts | src\features\orders\index.ts | Contains project configuration or metadata. | re-export OrdersRepository, re-export manifest |
| index.ts | src\features\orders\schemas\index.ts | Contains project configuration or metadata. Note: address shape is intentionally open to allow extending apps | const orderStatusSchema, const orderItemSchema, const orderTimelineSchema, const orderSchema +1 |
| index.ts | src\features\orders\types\index.ts | Contains project configuration or metadata. | interface UserAddress, interface OrderItem, interface OrderTimeline, interface Order +5 |
| index.ts | src\features\payments\columns\index.ts | Contains project configuration or metadata. | fn buildPaymentColumns, const paymentAdminColumns |
| index.ts | src\features\payments\components\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\payments\index.ts | Contains project configuration or metadata. | re-export PaymentsRepository, re-export manifest |
| index.ts | src\features\payments\schemas\index.ts | Contains project configuration or metadata. | const paymentGatewaySchema, const paymentStatusSchema, const paymentRecordSchema, const paymentGatewayConfigSchema |
| index.ts | src\features\payments\types\index.ts | Contains project configuration or metadata. | interface PaymentGatewayConfig, interface PaymentSettings, interface PaymentRecord, type PaymentGateway +1 |
| index.ts | src\features\pre-orders\columns\index.ts | Contains project configuration or metadata. | fn buildPreorderColumns, const preorderAdminColumns |
| index.ts | src\features\pre-orders\components\index.ts | Contains project configuration or metadata. | re-export PreorderBadge, re-export PreorderCard |
| index.ts | src\features\pre-orders\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export PreordersRepository, re-export manifest, re-export GET, re-export POST |
| index.ts | src\features\pre-orders\schemas\index.ts | Contains project configuration or metadata. | const preorderItemSchema |
| index.ts | src\features\pre-orders\types\index.ts | Contains project configuration or metadata. | fn getPreorderStatus, interface PreorderItem, type PreorderStatus, type PreOrderStatus +1 |
| index.ts | src\features\products\columns\index.ts | Contains project configuration or metadata. | fn buildProductColumns, const productAdminColumns |
| index.ts | src\features\products\components\index.ts | Contains project configuration or metadata. | re-export ProductCard, re-export ProductGrid, re-export ProductFeatureBadges, re-export BuyBar +12 |
| index.ts | src\features\products\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers (2-line stub re-export) | re-export ProductsRepository, re-export manifest, re-export GET, re-export POST +2 |
| index.ts | src\features\products\schemas\index.ts | Contains project configuration or metadata. Note: Detail fields | const productImageSchema, const productSeoSchema, const productItemSchema, const productListParamsSchema |
| index.ts | src\features\products\types\index.ts | Contains project configuration or metadata. Note: Auction detail fields | interface ProductImage, interface ProductSeo, interface ProductItem, interface ProductListResponse +4 |
| index.ts | src\features\promotions\columns\index.ts | Contains project configuration or metadata. | fn buildCouponColumns, const couponAdminColumns |
| index.ts | src\features\promotions\components\index.ts | Contains project configuration or metadata. | re-export CouponCard, re-export PromotionsView, re-export PromotionsViewProductSection |
| index.ts | src\features\promotions\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers (2-line stub re-export) | re-export PromotionsRepository, re-export manifest, re-export GET |
| index.ts | src\features\promotions\schemas\index.ts | Contains project configuration or metadata. | const couponTypeSchema, const couponScopeSchema, const couponItemSchema, const promotionsListParamsSchema |
| index.ts | src\features\promotions\types\index.ts | Contains project configuration or metadata. | interface CouponItem, interface ApplyCouponResult, interface PromotionsListResponse, interface PromotionsListParams +2 |
| index.ts | src\features\reviews\columns\index.ts | Contains project configuration or metadata. | fn buildReviewColumns, const reviewAdminColumns |
| index.ts | src\features\reviews\components\index.ts | Contains project configuration or metadata. | re-export ReviewCard, re-export ReviewsList, re-export ReviewSummary, re-export ViewReviewModal +1 |
| index.ts | src\features\reviews\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export ReviewsRepository, re-export manifest, re-export GET, re-export POST +3 |
| index.ts | src\features\reviews\schemas\index.ts | Contains project configuration or metadata. | const reviewStatusSchema, const reviewImageSchema, const reviewVideoSchema, const reviewSchema +1 |
| index.ts | src\features\reviews\types\index.ts | Contains project configuration or metadata. | interface ReviewImage, interface ReviewVideo, interface Review, interface ReviewListResponse +3 |
| index.ts | src\features\search\columns\index.ts | Contains project configuration or metadata. | fn buildSearchResultColumns, const searchResultAdminColumns |
| index.ts | src\features\search\components\index.ts | Contains project configuration or metadata. | re-export SearchFiltersRow, re-export SearchResultsSection, re-export SearchView |
| index.ts | src\features\search\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export SearchRepository, re-export manifest, re-export GET |
| index.ts | src\features\search\schemas\index.ts | Contains project configuration or metadata. | const searchProductItemSchema, const searchQuerySchema |
| index.ts | src\features\search\types\index.ts | Contains project configuration or metadata. Note: Domain types for @mohasinac/feat-search | interface SearchProductItem, interface SearchResponse, interface SearchQuery, interface SearchCategoryOption |
| index.ts | src\features\seller\columns\index.ts | Contains project configuration or metadata. | fn buildSellerColumns, fn buildPayoutColumns, const sellerAdminColumns, const payoutAdminColumns |
| index.ts | src\features\seller\components\analytics\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\seller\components\index.ts | Contains project configuration or metadata. | re-export SellerStatCard, re-export SellerSidebar, re-export SellerDashboardView, re-export SellerProductsView +18 |
| index.ts | src\features\seller\index.ts | Contains project configuration or metadata. Note: API route handlers re-exported for 2-line consumer stubs | re-export SellerRepository, re-export PayoutsRepository, re-export manifest, re-export SELLER_PAGE_PERMISSIONS +1 |
| index.ts | src\features\seller\schemas\index.ts | Contains project configuration or metadata. | const storeStatusSchema, const payoutStatusSchema, const payoutPaymentMethodSchema, const socialLinksSchema +4 |
| index.ts | src\features\seller\types\index.ts | Contains project configuration or metadata. | interface SellerStore, interface PayoutBankAccount, interface PayoutRecord, interface SellerPayoutSettings +13 |
| index.ts | src\features\stores\columns\index.ts | Contains project configuration or metadata. | fn buildStoreColumns, const storeAdminColumns |
| index.ts | src\features\stores\components\index.ts | Contains project configuration or metadata. | re-export StoreHeader, re-export StoresListView, re-export StoreNavTabs, re-export StoreAboutView +3 |
| index.ts | src\features\stores\index.ts | Contains project configuration or metadata. Note: Next.js App Router route handlers | re-export StoresRepository, re-export manifest, re-export GET |
| index.ts | src\features\stores\schemas\index.ts | Contains project configuration or metadata. | const storeListItemSchema, const storeListParamsSchema |
| index.ts | src\features\stores\types\index.ts | Contains project configuration or metadata. Note: Store list item (public-facing, safe to send to client) | interface StoreListItem, interface StoreDetail, interface StoreProductItem, interface StoreAuctionItem +6 |
| index.ts | src\features\user\components\index.ts | Contains project configuration or metadata. | re-export ProfileView, re-export UserAccountHub, re-export UserOrdersView, re-export OrderDetailView +7 |
| index.ts | src\features\user\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\features\whatsapp-bot\components\index.ts | Contains project configuration or metadata. | re-export WhatsAppChatButton |
| index.ts | src\features\whatsapp-bot\index.ts | Contains project configuration or metadata. | re-export manifest |
| index.ts | src\features\whatsapp-bot\types\index.ts | Contains project configuration or metadata. | interface CheckoutMessageInput, interface StatusNotificationInput, interface WebhookVerifyInput, interface IncomingWebhookPayload +3 |
| index.ts | src\features\wishlist\columns\index.ts | Contains project configuration or metadata. | fn buildWishlistColumns, const wishlistAdminColumns |
| index.ts | src\features\wishlist\components\index.ts | Contains project configuration or metadata. | re-export WishlistCard, re-export WishlistPage, re-export WishlistToggleButton, re-export WishlistView |
| index.ts | src\features\wishlist\index.ts | Contains project configuration or metadata. | re-export WishlistRepository, re-export manifest |
| index.ts | src\features\wishlist\schemas\index.ts | Contains project configuration or metadata. | const wishlistItemSchema |
| index.ts | src\features\wishlist\types\index.ts | Contains project configuration or metadata. | interface WishlistItem, interface WishlistResponse |
| index.ts | src\http\index.ts | Contains project configuration or metadata. | re-export ApiClient, re-export ApiClientError, re-export apiClient |
| index.ts | src\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\instrumentation\index.ts | Contains project configuration or metadata. Note: Skip on Edge providers use Node.js APIs (firebase-admin, etc.) | fn createInstrumentation, interface InstrumentationConfig, interface InstrumentationHook, re-export register |
| index.ts | src\monitoring\index.ts | Contains project configuration or metadata. | re-export ErrorSeverity, re-export ErrorCategory, re-export setErrorTracker, re-export trackError +12 |
| index.ts | src\next\index.ts | Contains project configuration or metadata. Note: Auth verifier interface (inject your Firebase / Auth.js implementation) | re-export createApiErrorHandler, re-export createRouteHandler, re-export createApiHandlerFactory, re-export getSearchParams +12 |
| index.ts | src\next\middleware\index.ts | Contains project configuration or metadata. Note: appkit/src/next/middleware/index.ts | re-export piiScrubberMiddleware, re-export createPiiRedactorMiddleware, re-export createApiMiddleware, re-export runChain +1 |
| index.ts | src\providers\auth-firebase\index.ts | Contains project configuration or metadata. Note: IAuthProvider implementation | re-export firebaseAuthProvider, re-export firebaseSessionProvider, re-export createSessionCookieFromToken, re-export verifyIdToken +4 |
| index.ts | src\providers\db-firebase\index.ts | Contains project configuration or metadata. Note: Admin SDK singletons | const firebaseDbProvider, class ProductRepository, re-export getAdminApp, re-export getAdminAuth +10 |
| index.ts | src\providers\email-resend\index.ts | Contains project configuration or metadata. | re-export createResendProvider |
| index.ts | src\providers\payment-razorpay\index.ts | Contains project configuration or metadata. | fn rupeesToPaise, fn paiseToRupees, fn verifyPaymentSignature, class RazorpayProvider +2 |
| index.ts | src\providers\search-algolia\index.ts | Contains project configuration or metadata. | fn isAlgoliaConfigured, fn getAlgoliaAdminClient, fn productToAlgoliaRecord, fn indexProducts +24 |
| index.ts | src\providers\shipping-shiprocket\index.ts | Contains project configuration or metadata. | fn shiprocketAuthenticate, fn shiprocketGetPickupLocations, fn shiprocketAddPickupLocation, fn shiprocketVerifyPickupOTP +27 |
| index.ts | src\providers\storage-firebase\index.ts | Contains project configuration or metadata. | re-export firebaseStorageProvider |
| index.ts | src\react\index.ts | Contains project configuration or metadata. Note: Viewport / media breakpoints | re-export useMediaQuery, re-export useBreakpoint, re-export useClickOutside, re-export useKeyPress +16 |
| index.ts | src\security\index.ts | Contains project configuration or metadata. | re-export generateNonce, re-export buildCSP, re-export rateLimit, re-export applyRateLimit +28 |
| index.ts | src\security\rbac\index.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/index.ts | re-export DEFAULT_ROLES, re-export resolvePermissions, re-export hasPermission, re-export hasAllPermissions +6 |
| index.ts | src\seed\index.ts | Contains project configuration or metadata. Note: appkit/src/seed/index.ts | re-export runSeed, re-export makeUser, re-export makeFullUser, re-export USER_FIXTURES +40 |
| index.ts | src\seo\index.ts | Contains project configuration or metadata. | - |
| index.ts | src\style\tailwind\index.ts | Contains project configuration or metadata. | fn cn, fn token, const tailwindAdapter |
| index.ts | src\style\vanilla\index.ts | Contains project configuration or metadata. | fn cn, fn token, const vanillaAdapter |
| index.ts | src\tokens\index.ts | Contains project configuration or metadata. Note: // Responsive-first design system constants for Tailwind CSS. | fn token, const COLORS, const RADIUS, const SHADOWS +6 |
| index.ts | src\ui\index.ts | Contains project configuration or metadata. Note: Tab strip with ResizeObserver-driven overflow scroll | re-export Section, re-export Article, re-export Main, re-export Aside +75 |
| index.ts | src\ui\rich-text\index.ts | Contains project configuration or metadata. | re-export RichText |
| index.ts | src\utils\index.ts | Contains project configuration or metadata. | re-export GlobalEventManager, re-export globalEventManager, re-export throttle, re-export debounce +11 |
| index.ts | src\validation\index.ts | Contains project configuration or metadata. | re-export paginationQuerySchema, re-export objectIdSchema, re-export urlSchema, re-export mediaUrlSchema +7 |
| infra.ts | src\contracts\infra.ts | Contains project configuration or metadata. | interface ICacheProvider, interface QueueJob, interface IQueueProvider, interface IEventBus +1 |
| Input.tsx | src\features\forms\Input.tsx | Contains project configuration or metadata. | const Input, interface InputProps |
| Input.tsx | src\ui\components\Input.tsx | Contains project configuration or metadata. | fn Input, type InputProps |
| input.validator.ts | src\validation\input.validator.ts | Contains project configuration or metadata. | fn isRequired, fn minLength, fn maxLength, fn exactLength +4 |
| ItemRow.tsx | src\ui\components\ItemRow.tsx | Contains project configuration or metadata. | fn ItemRow, interface ItemRowProps |
| json-ld.ts | src\seo\json-ld.ts | Contains project configuration or metadata. | fn productJsonLd, fn reviewJsonLd, fn aggregateRatingJsonLd, fn breadcrumbJsonLd +10 |
| Layout.tsx | src\ui\components\Layout.tsx | Contains project configuration or metadata. Note: Alignment helpers shared across Stack and Row | fn Container, fn Stack, fn Row, fn Grid +9 |
| ListingLayout.tsx | src\features\layout\ListingLayout.tsx | Contains project configuration or metadata. | fn ListingLayout, interface ListingLayoutLabels, interface ListingLayoutProps |
| ListingLayout.tsx | src\ui\components\ListingLayout.tsx | Contains project configuration or metadata. Note: Sticky offset: dashboard containers scroll internally (top-0); | fn ListingLayout, interface ListingLayoutLabels, interface ListingLayoutProps |
| LocaleSwitcher.tsx | src\features\layout\LocaleSwitcher.tsx | Contains project configuration or metadata. | fn LocaleSwitcher, interface LocaleSwitcherOption, interface LocaleSwitcherProps |
| Logger.ts | src\core\Logger.ts | Contains project configuration or metadata. Note: `enableFileLogging: true` is a backward-compat alias for logFileUrl. | const logger, class Logger, interface LogEntry, interface LoggerOptions +1 |
| LoginForm.tsx | src\features\auth\components\LoginForm.tsx | Contains project configuration or metadata. | fn LoginForm, interface LoginFormValues, interface LoginFormProps |
| loyalty.repository.ts | src\features\loyalty\repository\loyalty.repository.ts | Contains project configuration or metadata. | class LoyaltyRepository |
| loyalty-math.ts | src\features\loyalty\types\loyalty-math.ts | Contains project configuration or metadata. | fn calculateCoinsEarned, fn calculateMaxRedeemable, fn coinsToRupees, fn applyCoinsToOrder |
| MakeOfferForm.tsx | src\features\products\components\MakeOfferForm.tsx | Contains project configuration or metadata. | fn MakeOfferForm, interface MakeOfferFormProps |
| manifest.ts | src\features\account\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\admin\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\auctions\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\auth\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\before-after\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\blog\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\cart\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\categories\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\checkout\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\collections\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\consultation\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\corporate\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\events\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\faq\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\homepage\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\loyalty\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\orders\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\payments\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\pre-orders\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\products\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\promotions\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\reviews\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\search\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\seller\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\stores\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\whatsapp-bot\manifest.ts | Contains project configuration or metadata. | const manifest |
| manifest.ts | src\features\wishlist\manifest.ts | Contains project configuration or metadata. | const manifest |
| MediaAvatar.tsx | src\features\media\MediaAvatar.tsx | Contains project configuration or metadata. | fn MediaAvatar, interface MediaAvatarProps |
| MediaImage.tsx | src\features\media\MediaImage.tsx | Contains project configuration or metadata. | fn MediaImage, interface MediaImageProps, type MediaImageSize |
| MediaLightbox.tsx | src\features\media\MediaLightbox.tsx | Contains project configuration or metadata. Note: Sync index when caller changes the initialIndex (clicking a different thumbnail) | fn MediaLightbox, interface LightboxItem, interface LightboxLabels, interface MediaLightboxProps |
| MediaSlider.tsx | src\features\media\components\MediaSlider.tsx | Contains project configuration or metadata. | fn MediaSlider, interface MediaSliderProps |
| MediaUploadField.tsx | src\features\media\upload\MediaUploadField.tsx | Contains project configuration or metadata. | fn MediaUploadField, interface MediaUploadFieldProps |
| MediaVideo.tsx | src\features\media\MediaVideo.tsx | Contains project configuration or metadata. Note: Apply trimStart on load | fn MediaVideo, interface MediaVideoProps |
| MessagesView.tsx | src\features\account\components\MessagesView.tsx | Contains project configuration or metadata. | fn MessagesView, interface MessagesViewLabels, interface MessagesViewProps |
| MessagesView.tsx | src\features\user\components\MessagesView.tsx | Contains project configuration or metadata. | fn MessagesView, interface MessagesViewProps |
| middleware.ts | src\security\rbac\middleware.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/middleware.ts | fn createRbacMiddleware, const middleware |
| Modal.tsx | src\ui\components\Modal.tsx | Contains project configuration or metadata. Note: Lock body scroll while open | fn Modal, interface ModalProps |
| nav.ts | src\providers\search-algolia\nav.ts | Contains project configuration or metadata. | const ALGOLIA_PAGES_INDEX_NAME, interface AlgoliaNavRecord |
| NavbarLayout.tsx | src\features\layout\NavbarLayout.tsx | Contains project configuration or metadata. | fn NavbarLayout, interface NavbarLayoutItem, interface NavbarLayoutProps |
| NewsletterBanner.tsx | src\features\homepage\components\NewsletterBanner.tsx | Contains project configuration or metadata. | fn NewsletterBanner, interface NewsletterBannerProps |
| NewsletterSection.tsx | src\features\homepage\components\NewsletterSection.tsx | Contains project configuration or metadata. | fn NewsletterSection, interface NewsletterSectionProps |
| not-found-error.ts | src\errors\not-found-error.ts | Contains project configuration or metadata. | class NotFoundError |
| notification.factory.ts | src\seed\factories\notification.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/notification.factory.ts | fn makeNotification, fn makeFullNotification, const NOTIFICATION_FIXTURES, interface SeedNotificationDocument +1 |
| number.formatter.ts | src\utils\number.formatter.ts | Contains project configuration or metadata. | fn formatCurrency, fn formatNumber, fn formatPercentage, fn formatFileSize +4 |
| object.helper.ts | src\utils\object.helper.ts | Contains project configuration or metadata. | fn deepMerge, fn pick, fn omit, fn isEmptyObject +3 |
| order.factory.ts | src\seed\factories\order.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/order.factory.ts | fn makeOrder, interface SeedBaseOrderItem, interface SeedBaseOrderDocument |
| OrderDetailView.tsx | src\features\account\components\OrderDetailView.tsx | Contains project configuration or metadata. | fn OrderDetailView, interface OrderDetailViewLabels, interface OrderDetailViewProps |
| OrderDetailView.tsx | src\features\user\components\OrderDetailView.tsx | Contains project configuration or metadata. | fn OrderDetailView, interface OrderDetailViewProps |
| orders.repository.ts | src\features\orders\repository\orders.repository.ts | Contains project configuration or metadata. | class OrdersRepository |
| OrdersList.tsx | src\features\orders\components\OrdersList.tsx | Contains project configuration or metadata. | fn OrderCard, fn OrdersList |
| package.json | package.json | Declares package metadata, scripts, dependency graph, and publish settings. | - |
| package-lock.json | package-lock.json | Contains project configuration or metadata. | - |
| pagination.helper.ts | src\utils\pagination.helper.ts | Contains project configuration or metadata. | fn calculatePagination, interface PaginationOptions, interface PaginationResult |
| Pagination.tsx | src\ui\components\Pagination.tsx | Contains project configuration or metadata. | fn Pagination, interface PaginationProps |
| password.validator.ts | src\validation\password.validator.ts | Contains project configuration or metadata. | fn meetsPasswordRequirements, fn calculatePasswordStrength, fn isCommonPassword, interface PasswordStrength +1 |
| payment.ts | src\contracts\payment.ts | Contains project configuration or metadata. | interface PaymentOrder, interface PaymentCapture, interface Refund, interface IPaymentProvider |
| payments.repository.ts | src\features\payments\repository\payments.repository.ts | Contains project configuration or metadata. | class PaymentsRepository |
| payout.factory.ts | src\seed\factories\payout.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/payout.factory.ts | fn makePayout, fn makeFullPayout, const PAYOUT_FIXTURES, interface SeedPayoutDocument +1 |
| permission-map.ts | src\features\admin\permission-map.ts | Contains project configuration or metadata. Note: appkit/src/features/admin/permission-map.ts | const ADMIN_PAGE_PERMISSIONS |
| permission-map.ts | src\features\seller\permission-map.ts | Contains project configuration or metadata. Note: appkit/src/features/seller/permission-map.ts | const SELLER_PAGE_PERMISSIONS |
| phone.validator.ts | src\validation\phone.validator.ts | Contains project configuration or metadata. | fn isValidPhone, fn normalizePhone, fn formatPhone, fn extractCountryCode +2 |
| pii-encrypt.ts | src\security\pii-encrypt.ts | Contains project configuration or metadata. | fn encryptValue, fn decryptValue, fn hmacBlindIndex, fn encryptPiiFields +3 |
| pii-redact.ts | src\security\pii-redact.ts | Contains project configuration or metadata. | fn redactPii |
| pii-redactor.ts | src\next\middleware\pii-redactor.ts | Contains project configuration or metadata. Note: appkit/src/next/middleware/pii-redactor.ts | fn createPiiRedactorMiddleware, const GET, interface PiiRedactionRule |
| pii-scrubber.ts | src\next\middleware\pii-scrubber.ts | Contains project configuration or metadata. Note: appkit/src/next/middleware/pii-scrubber.ts | const piiScrubberMiddleware |
| PlaceBidForm.tsx | src\features\products\components\PlaceBidForm.tsx | Contains project configuration or metadata. | fn PlaceBidForm, interface PlaceBidFormProps |
| PreOrderBadge.tsx | src\features\pre-orders\components\PreOrderBadge.tsx | Contains project configuration or metadata. | fn PreOrderBadge, fn PreOrderTag |
| PreorderCard.tsx | src\features\pre-orders\components\PreorderCard.tsx | Contains project configuration or metadata. | fn PreorderBadge, fn PreorderCard |
| PreOrderDetailView.tsx | src\features\products\components\PreOrderDetailView.tsx | Contains project configuration or metadata. | fn PreOrderDetailView, interface PreOrderDetailViewProps |
| preorder-reminder.job.ts | src\features\cron\jobs\preorder-reminder.job.ts | Contains project configuration or metadata. | fn createPreOrderReminderJob |
| preorders.repository.ts | src\features\pre-orders\repository\preorders.repository.ts | Contains project configuration or metadata. | class PreordersRepository |
| pre-orders.repository.ts | src\features\pre-orders\repository\pre-orders.repository.ts | Contains project configuration or metadata. | class PreOrdersRepository |
| PreOrdersView.tsx | src\features\products\components\PreOrdersView.tsx | Contains project configuration or metadata. | fn PreOrdersView, interface PreOrdersViewProps |
| preserve-client-directives.mjs | scripts\preserve-client-directives.mjs | Contains project configuration or metadata. | - |
| PriceDisplay.tsx | src\ui\components\PriceDisplay.tsx | Contains project configuration or metadata. | fn PriceDisplay, interface PriceDisplayProps |
| product.factory.ts | src\seed\factories\product.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/product.factory.ts | fn makeProduct, fn makeFullProduct, const PRODUCT_FIXTURES, interface SeedBaseProductDocument |
| ProductDetailView.tsx | src\features\products\components\ProductDetailView.tsx | Contains project configuration or metadata. | fn ProductDetailView, interface ProductDetailViewProps |
| ProductFeatureBadges.tsx | src\features\products\components\ProductFeatureBadges.tsx | Contains project configuration or metadata. | fn ProductFeatureBadges |
| ProductGrid.tsx | src\features\products\components\ProductGrid.tsx | Contains project configuration or metadata. Note: Slot resolution: explicit props win over `slots` object | fn ProductCard, fn ProductGrid, interface ProductCardContext |
| ProductInfo.tsx | src\features\products\components\ProductInfo.tsx | Contains project configuration or metadata. | fn ProductInfo, interface ProductInfoProps |
| products.repository.ts | src\features\products\repository\products.repository.ts | Contains project configuration or metadata. | class ProductsRepository |
| ProductsView.tsx | src\features\products\components\ProductsView.tsx | Contains project configuration or metadata. | fn ProductsView, interface ProductsViewProps |
| ProductTabs.tsx | src\features\products\components\ProductTabs.tsx | Contains project configuration or metadata. | fn ProductTabs, interface ProductTab, interface ProductTabsProps |
| ProfileView.tsx | src\features\account\components\ProfileView.tsx | Contains project configuration or metadata. | fn ProfileView, interface ProfileViewLabels, interface ProfileViewProps |
| ProfileView.tsx | src\features\user\components\ProfileView.tsx | Contains project configuration or metadata. | fn ProfileView, interface ProfileViewProps |
| Progress.tsx | src\ui\components\Progress.tsx | Contains project configuration or metadata. Note: Inlined from THEME_CONSTANTS | fn Progress, fn IndeterminateProgress, interface ProgressProps, interface IndeterminateProgressProps |
| PromoGrid.tsx | src\features\homepage\components\PromoGrid.tsx | Contains project configuration or metadata. | fn PromoGrid, interface PromoGridProps |
| promotions.repository.ts | src\features\promotions\repository\promotions.repository.ts | Contains project configuration or metadata. | class PromotionsRepository |
| PromotionsView.tsx | src\features\promotions\components\PromotionsView.tsx | Contains project configuration or metadata. | fn PromotionsViewProductSection, fn PromotionsView, interface PromotionProductItem, interface PromotionsViewProductSectionProps +1 |
| provider.ts | src\providers\auth-firebase\provider.ts | Contains project configuration or metadata. Note: Re-fetch to get updated claims | const firebaseAuthProvider |
| provider.ts | src\providers\email-resend\provider.ts | Contains project configuration or metadata. | fn createResendProvider, interface ResendProviderOptions |
| provider.ts | src\providers\storage-firebase\provider.ts | Contains project configuration or metadata. | const firebaseStorageProvider |
| Queue.ts | src\core\Queue.ts | Contains project configuration or metadata. | class Queue, interface QueueOptions, interface Task |
| QuickActionsPanel.tsx | src\features\admin\components\QuickActionsPanel.tsx | Contains project configuration or metadata. | fn QuickActionsPanel, interface QuickActionItem, interface QuickActionsPanelProps |
| Radio.tsx | src\features\forms\Radio.tsx | Contains project configuration or metadata. Note: Toggle variant pill style | fn RadioGroup, interface RadioOption, interface RadioGroupProps |
| RangeFilter.tsx | src\features\filters\RangeFilter.tsx | Contains project configuration or metadata. | fn RangeFilter, interface RangeFilterProps |
| rate-limit.ts | src\security\rate-limit.ts | Contains project configuration or metadata. | fn rateLimit, fn rateLimitByIdentifier, fn clearRateLimitStore, const applyRateLimit +3 |
| RatingDisplay.tsx | src\ui\components\RatingDisplay.tsx | Contains project configuration or metadata. | fn RatingDisplay, interface RatingDisplayProps |
| README.md | README.md | Documents setup, usage, architecture notes, and repository workflows. Note: providers.config.ts | - |
| realtime.ts | src\providers\db-firebase\realtime.ts | Contains project configuration or metadata. Note: Basic server-side sort (RTDB has no native multi-field sort) | - |
| RegisterForm.tsx | src\features\auth\components\RegisterForm.tsx | Contains project configuration or metadata. | fn RegisterForm, interface RegisterFormValues, interface RegisterFormProps |
| registry.ts | src\contracts\registry.ts | Contains project configuration or metadata. | fn registerProviders, fn getProviders, fn _resetProviders, interface ProviderRegistry |
| registry.ts | src\features\cron\registry.ts | Contains project configuration or metadata. | fn createCronJob, fn getCronRegistry, fn getCronRegistrySummary, fn findCronJob +3 |
| RelatedFAQs.tsx | src\features\faq\components\RelatedFAQs.tsx | Contains project configuration or metadata. | fn RelatedFAQs |
| RelatedProducts.tsx | src\features\products\components\RelatedProducts.tsx | Contains project configuration or metadata. | fn RelatedProducts, interface RelatedProductsProps |
| repository.ts | src\contracts\repository.ts | Contains project configuration or metadata. Note: Segregated per ISP: features that only read never depend on IWriteRepository. | interface SieveQuery, interface PagedResult, interface IReadRepository, interface IWriteRepository +4 |
| request-helpers.ts | src\next\request-helpers.ts | Contains project configuration or metadata. | fn getSearchParams, fn getOptionalSessionCookie, fn getRequiredSessionCookie, fn getBooleanParam +2 |
| ResetPasswordView.tsx | src\features\auth\components\ResetPasswordView.tsx | Contains project configuration or metadata. | fn ResetPasswordView, interface ResetPasswordViewProps |
| resolver.ts | src\security\rbac\resolver.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/resolver.ts | fn resolvePermissions, fn hasPermission, fn hasAllPermissions, fn hasAnyPermission |
| review.factory.ts | src\seed\factories\review.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/review.factory.ts | fn makeReview, interface SeedReviewDocument |
| ReviewModal.tsx | src\features\reviews\components\ReviewModal.tsx | Contains project configuration or metadata. | fn ViewReviewModal, interface ViewReviewModalProps |
| reviews.repository.ts | src\features\reviews\repository\reviews.repository.ts | Contains project configuration or metadata. | class ReviewsRepository |
| ReviewsList.tsx | src\features\reviews\components\ReviewsList.tsx | Contains project configuration or metadata. | fn ReviewCard, fn ReviewsList, interface ReviewCardProps, interface ReviewsListProps |
| ReviewsListView.tsx | src\features\reviews\components\ReviewsListView.tsx | Contains project configuration or metadata. | fn ReviewsListView, interface ReviewsListViewProps |
| ReviewSummary.tsx | src\features\reviews\components\ReviewSummary.tsx | Contains project configuration or metadata. | fn ReviewSummary, interface ReviewSummaryProps |
| RichText.tsx | src\ui\rich-text\RichText.tsx | Contains project configuration or metadata. Note: Allowed HTML tags (safe subset no script/iframe/object) | fn RichText, interface RichTextProps |
| route.ts | src\features\account\api\[userId]\addresses\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\account\api\[userId]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\admin\api\bids\route.ts | Contains project configuration or metadata. | const GET, re-export adminBidsGET |
| route.ts | src\features\admin\api\coupons\route.ts | Contains project configuration or metadata. | const GET, re-export adminCouponsGET |
| route.ts | src\features\admin\api\products\route.ts | Contains project configuration or metadata. Note: Accept both "sorts" (local convention) and "sort" (package convention) | const GET, re-export adminProductsGET |
| route.ts | src\features\admin\api\reviews\route.ts | Contains project configuration or metadata. | const GET, re-export adminReviewsGET |
| route.ts | src\features\auctions\api\route.ts | Contains project configuration or metadata. Note: Query params: | fn GET, re-export GET |
| route.ts | src\features\auth\api\route.ts | Contains project configuration or metadata. | const authMeGET, re-export authMeGET |
| route.ts | src\features\before-after\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\before-after\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export beforeAfterListGET, re-export beforeAfterListPOST |
| route.ts | src\features\blog\api\[slug]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\blog\api\route.ts | Contains project configuration or metadata. | fn GET, re-export GET |
| route.ts | src\features\cart\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\cart\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export cartListGET, re-export cartListPOST |
| route.ts | src\features\categories\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\categories\api\route.ts | Contains project configuration or metadata. Note: Roots: tier === 0 or no parentIds | fn GET, const POST, re-export GET, re-export POST |
| route.ts | src\features\collections\api\[slug]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\collections\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export collectionsListGET, re-export collectionsListPOST |
| route.ts | src\features\consultation\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\consultation\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export consultationsListGET, re-export consultationsListPOST |
| route.ts | src\features\corporate\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\corporate\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export corporateInquiriesGET, re-export corporateInquiriesPOST |
| route.ts | src\features\events\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\events\api\route.ts | Contains project configuration or metadata. Note: Strip internal fields (createdBy) before returning | fn GET, re-export GET |
| route.ts | src\features\faq\api\route.ts | Contains project configuration or metadata. | fn GET, re-export GET |
| route.ts | src\features\homepage\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\homepage\api\carousel\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\homepage\api\carousel\route.ts | Contains project configuration or metadata. Note: Admin auth guard for includeInactive | fn GET, const carouselPOST, re-export carouselGET, re-export carouselPOST +1 |
| route.ts | src\features\homepage\api\route.ts | Contains project configuration or metadata. Note: Admin auth guard for includeDisabled | fn GET, const POST, re-export GET, re-export POST |
| route.ts | src\features\homepage\api\sections\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\homepage\api\sections\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export sectionsListGET, re-export sectionsListPOST |
| route.ts | src\features\loyalty\api\admin\loyalty\grant\route.ts | Contains project configuration or metadata. | fn POST, re-export adminLoyaltyGrantPOST |
| route.ts | src\features\loyalty\api\balance\route.ts | Contains project configuration or metadata. | fn GET, re-export loyaltyBalanceGET |
| route.ts | src\features\loyalty\api\earn\route.ts | Contains project configuration or metadata. | fn POST, re-export loyaltyEarnPOST |
| route.ts | src\features\loyalty\api\history\route.ts | Contains project configuration or metadata. | fn GET, re-export loyaltyHistoryGET |
| route.ts | src\features\loyalty\api\redeem\route.ts | Contains project configuration or metadata. | fn POST, re-export loyaltyRedeemPOST |
| route.ts | src\features\pre-orders\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\pre-orders\api\[slug]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\pre-orders\api\admin\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\pre-orders\api\admin\route.ts | Contains project configuration or metadata. | fn GET, re-export adminPreOrdersGET |
| route.ts | src\features\pre-orders\api\route.ts | Contains project configuration or metadata. | fn GET, fn POST, re-export preordersListGET |
| route.ts | src\features\products\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\products\api\route.ts | Contains project configuration or metadata. Note: Minimal schemas for secured mutations consumer apps can extend as needed. | fn GET, const POST, re-export GET, re-export POST |
| route.ts | src\features\promotions\api\route.ts | Contains project configuration or metadata. Note: Query params: | fn GET, re-export GET |
| route.ts | src\features\reviews\api\[id]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\reviews\api\route.ts | Contains project configuration or metadata. Note: Returns flat Review[] for homepage testimonial sections. | fn GET, const POST, re-export GET, re-export POST |
| route.ts | src\features\search\api\route.ts | Contains project configuration or metadata. | fn GET, re-export GET |
| route.ts | src\features\seller\api\coupons\route.ts | Contains project configuration or metadata. | const GET, re-export sellerCouponsGET |
| route.ts | src\features\seller\api\offers\route.ts | Contains project configuration or metadata. Note: Optional status filter passed by client | const GET, re-export sellerOffersGET |
| route.ts | src\features\seller\api\products\route.ts | Contains project configuration or metadata. Note: Server-side security: force sellerId filter so sellers can't see others' products | const GET, re-export sellerProductsGET |
| route.ts | src\features\seller\api\store\route.ts | Contains project configuration or metadata. | const GET, re-export sellerStoreGET |
| route.ts | src\features\stores\api\[storeSlug]\auctions\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\stores\api\[storeSlug]\products\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\stores\api\[storeSlug]\reviews\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\stores\api\[storeSlug]\route.ts | Contains project configuration or metadata. | - |
| route.ts | src\features\stores\api\route.ts | Contains project configuration or metadata. Note: Map to public-safe shape (strip sensitive fields) | fn GET, re-export GET |
| route.ts | src\features\whatsapp-bot\api\send-status\route.ts | Contains project configuration or metadata. Note: Update message status in database | fn POST, re-export whatsappSendStatusPOST |
| route.ts | src\features\whatsapp-bot\api\webhook\route.ts | Contains project configuration or metadata. Note: Store webhook payload for processing | fn POST, re-export whatsappWebhookPOST |
| routeHandler.ts | src\next\api\routeHandler.ts | Contains project configuration or metadata. Note: Structured errors thrown with .status | fn createRouteHandler, const POST, interface RouteUser |
| runner.ts | src\seed\runner.ts | Contains project configuration or metadata. Note: appkit/src/seed/runner.ts | fn runSeed |
| schemas.ts | src\validation\schemas.ts | Contains project configuration or metadata. Note: ============================================ | const paginationQuerySchema, const objectIdSchema, const urlSchema, const mediaUrlSchema +5 |
| search.repository.ts | src\features\search\repository\search.repository.ts | Contains project configuration or metadata. | class SearchRepository |
| search.ts | src\contracts\search.ts | Contains project configuration or metadata. | interface SearchOptions, interface SearchHit, interface SearchResult, interface SuggestOptions +1 |
| SearchFiltersRow.tsx | src\features\search\components\SearchFiltersRow.tsx | Contains project configuration or metadata. | fn SearchFiltersRow |
| SearchResultsSection.tsx | src\features\search\components\SearchResultsSection.tsx | Contains project configuration or metadata. | fn SearchResultsSection, interface SearchResultsSectionProps |
| SearchView.tsx | src\features\search\components\SearchView.tsx | Contains project configuration or metadata. | fn SearchView, interface SearchViewProps |
| SectionCarousel.tsx | src\features\homepage\components\SectionCarousel.tsx | Contains project configuration or metadata. | fn SectionCarousel, interface SectionCarouselProps |
| SecurityHighlightsSection.tsx | src\features\homepage\components\SecurityHighlightsSection.tsx | Contains project configuration or metadata. | fn SecurityHighlightsSection, interface SecurityHighlightItem, interface SecurityHighlightsSectionProps |
| Select.tsx | src\features\forms\Select.tsx | Contains project configuration or metadata. | fn Select, interface SelectOption, interface SelectProps |
| Select.tsx | src\ui\components\Select.tsx | Contains project configuration or metadata. Note: Close on outside click | fn Select, interface SelectOption, interface SelectProps |
| seller.repository.ts | src\features\seller\repository\seller.repository.ts | Contains project configuration or metadata. | class SellerRepository, class PayoutsRepository |
| SellerAddressesView.tsx | src\features\seller\components\SellerAddressesView.tsx | Contains project configuration or metadata. | fn SellerAddressesView, interface SellerAddressesViewProps |
| SellerAnalyticsStats.tsx | src\features\seller\components\analytics\SellerAnalyticsStats.tsx | Contains project configuration or metadata. | fn SellerAnalyticsStats, interface SellerAnalyticsStatsLabels, interface SellerAnalyticsStatsProps |
| SellerAnalyticsView.tsx | src\features\seller\components\SellerAnalyticsView.tsx | Contains project configuration or metadata. | fn SellerAnalyticsView, interface SellerAnalyticsViewProps |
| SellerAuctionsView.tsx | src\features\seller\components\SellerAuctionsView.tsx | Contains project configuration or metadata. | fn SellerAuctionsView, interface SellerAuctionsViewProps |
| SellerCouponsView.tsx | src\features\seller\components\SellerCouponsView.tsx | Contains project configuration or metadata. | fn SellerCouponsView, interface SellerCouponsViewProps |
| SellerCreateProductView.tsx | src\features\seller\components\SellerCreateProductView.tsx | Contains project configuration or metadata. | fn SellerCreateProductView, interface SellerCreateProductViewProps |
| SellerDashboardView.tsx | src\features\seller\components\SellerDashboardView.tsx | Contains project configuration or metadata. | fn SellerDashboardView, interface SellerDashboardViewProps |
| SellerEditProductView.tsx | src\features\seller\components\SellerEditProductView.tsx | Contains project configuration or metadata. | fn SellerEditProductView, interface SellerEditProductViewProps |
| SellerGuideView.tsx | src\features\seller\components\SellerGuideView.tsx | Contains project configuration or metadata. | fn SellerGuideView, interface SellerGuideViewProps |
| SellerOffersView.tsx | src\features\seller\components\SellerOffersView.tsx | Contains project configuration or metadata. | fn SellerOffersView, interface SellerOffersViewProps |
| SellerOrdersView.tsx | src\features\seller\components\SellerOrdersView.tsx | Contains project configuration or metadata. | fn SellerOrdersView, interface SellerOrdersViewProps |
| SellerPayoutHistoryTable.tsx | src\features\seller\components\SellerPayoutHistoryTable.tsx | Contains project configuration or metadata. | fn SellerPayoutHistoryTable, interface SellerPayoutHistoryTableLabels, interface SellerPayoutHistoryTableProps |
| SellerPayoutSettingsView.tsx | src\features\seller\components\SellerPayoutSettingsView.tsx | Contains project configuration or metadata. | fn SellerPayoutSettingsView, interface SellerPayoutSettingsViewProps |
| SellerPayoutStats.tsx | src\features\seller\components\SellerPayoutStats.tsx | Contains project configuration or metadata. | fn SellerPayoutStats, interface SellerPayoutStatsProps |
| SellerPayoutsView.tsx | src\features\seller\components\SellerPayoutsView.tsx | Contains project configuration or metadata. | fn SellerPayoutsView, interface SellerPayoutsViewProps |
| SellerProductsView.tsx | src\features\seller\components\SellerProductsView.tsx | Contains project configuration or metadata. | fn SellerProductsView, interface SellerProductsViewProps |
| SellerRevenueChart.tsx | src\features\seller\components\analytics\SellerRevenueChart.tsx | Contains project configuration or metadata. | fn SellerRevenueChart, interface SellerRevenueChartLabels, interface SellerRevenueChartProps |
| SellerShippingView.tsx | src\features\seller\components\SellerShippingView.tsx | Contains project configuration or metadata. | fn SellerShippingView, interface SellerShippingViewProps |
| SellerSidebar.tsx | src\features\seller\components\SellerSidebar.tsx | Contains project configuration or metadata. | fn SellerSidebar, interface SellerNavItem |
| SellersListView.tsx | src\features\seller\components\SellersListView.tsx | Contains project configuration or metadata. | fn SellersListView, interface SellersListViewProps |
| SellerStatCard.tsx | src\features\seller\components\SellerStatCard.tsx | Contains project configuration or metadata. | fn SellerStatCard |
| SellerStorefrontView.tsx | src\features\seller\components\SellerStorefrontView.tsx | Contains project configuration or metadata. | fn SellerStorefrontView, interface SellerStorefrontViewProps |
| SellerStoreSetupView.tsx | src\features\seller\components\SellerStoreSetupView.tsx | Contains project configuration or metadata. | fn SellerStoreSetupView, interface SellerStoreSetupViewProps |
| SellerStoreView.tsx | src\features\seller\components\SellerStoreView.tsx | Contains project configuration or metadata. | fn SellerStoreView, interface SellerStoreViewProps |
| SellerTopProducts.tsx | src\features\seller\components\analytics\SellerTopProducts.tsx | Contains project configuration or metadata. | fn SellerTopProducts, interface SellerTopProductsLabels, interface SellerTopProductsProps |
| Semantic.tsx | src\ui\components\Semantic.tsx | Contains project configuration or metadata. | fn Article, fn Main, fn Nav, fn BlockHeader +20 |
| server.ts | src\features\auth\server.ts | Contains project configuration or metadata. | const GET, re-export authMeGET |
| server.ts | src\features\blog\server.ts | Contains project configuration or metadata. | re-export GET |
| server.ts | src\features\categories\server.ts | Contains project configuration or metadata. | re-export GET, re-export POST, re-export categoryItemGET, re-export categoryItemPATCH +1 |
| server.ts | src\features\events\server.ts | Contains project configuration or metadata. | re-export GET |
| server.ts | src\features\homepage\server.ts | Contains project configuration or metadata. | re-export HomepageSectionsRepository, re-export manifest, re-export GET, re-export POST +8 |
| server.ts | src\features\pre-orders\server.ts | Contains project configuration or metadata. | re-export GET, re-export POST |
| server.ts | src\features\products\server.ts | Contains project configuration or metadata. | re-export GET, re-export POST, re-export PATCH, re-export DELETE |
| server.ts | src\features\reviews\server.ts | Contains project configuration or metadata. | re-export GET, re-export POST, re-export reviewItemGET, re-export reviewItemPATCH +1 |
| server.ts | src\features\search\server.ts | Contains project configuration or metadata. | re-export SearchRepository, re-export manifest, re-export GET |
| server.ts | src\features\stores\server.ts | Contains project configuration or metadata. | re-export GET |
| server.ts | src\security\rbac\server.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/server.ts | fn createRequirePermission, fn createRequirePermissionSync, const requirePermission |
| session.factory.ts | src\seed\factories\session.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/session.factory.ts | fn makeSession, fn makeRevokedSession, const SESSION_FIXTURES, interface SeedSessionDocument |
| session.ts | src\providers\auth-firebase\session.ts | Contains project configuration or metadata. Note: Custom tokens cannot be used to mint a session cookie directly | fn createSessionCookieFromToken, const firebaseSessionProvider |
| shipping.ts | src\contracts\shipping.ts | Contains project configuration or metadata. | interface ShippingAddress, interface CreateShipmentInput, interface Shipment, interface TrackingEvent +3 |
| SidebarLayout.tsx | src\features\layout\SidebarLayout.tsx | Contains project configuration or metadata. | const SidebarLayout, interface SidebarLayoutProps |
| SideModal.tsx | src\ui\components\SideModal.tsx | Contains project configuration or metadata. Note: Escape key handler | fn SideModal, interface SideModalProps |
| sieve.ts | src\providers\db-firebase\sieve.ts | Contains project configuration or metadata. Note: Count (no docs fetched) | interface SieveModel, interface SieveOptions, interface SieveResult, type SieveFieldConfig +1 |
| SiteFeaturesSection.tsx | src\features\homepage\components\SiteFeaturesSection.tsx | Contains project configuration or metadata. | fn SiteFeaturesSection, interface SiteFeatureItem, interface SiteFeaturesSectionProps |
| Skeleton.tsx | src\ui\components\Skeleton.tsx | Contains project configuration or metadata. Note: bgTertiary inlined from THEME_CONSTANTS.themed.bgTertiary | fn Skeleton, interface SkeletonProps |
| Slider.tsx | src\features\forms\Slider.tsx | Contains project configuration or metadata. | fn Slider, interface SliderProps |
| Slider.tsx | src\ui\components\Slider.tsx | Contains project configuration or metadata. | fn Slider, interface SliderProps |
| SocialAuthButtons.tsx | src\features\auth\components\SocialAuthButtons.tsx | Contains project configuration or metadata. | fn SocialAuthButtons |
| SortDropdown.tsx | src\ui\components\SortDropdown.tsx | Contains project configuration or metadata. | fn SortDropdown, interface SortOption, interface SortDropdownProps |
| sorting.helper.ts | src\utils\sorting.helper.ts | Contains project configuration or metadata. | fn sort, type SortOrder |
| Spinner.tsx | src\ui\components\Spinner.tsx | Contains project configuration or metadata. | fn Spinner, interface SpinnerProps |
| StarRating.tsx | src\ui\components\StarRating.tsx | Contains project configuration or metadata. | fn StarRating, interface StarRatingProps |
| StatsCounterSection.tsx | src\features\homepage\components\StatsCounterSection.tsx | Contains project configuration or metadata. | fn StatsCounterSection, interface StatItem, interface StatsCounterSectionProps |
| StatsGrid.tsx | src\ui\components\StatsGrid.tsx | Contains project configuration or metadata. | fn StatsGrid, interface StatItem, interface StatsGridProps |
| StatusBadge.tsx | src\ui\components\StatusBadge.tsx | Contains project configuration or metadata. Note: Review (pending/approved/rejected already covered) | fn StatusBadge, interface StatusBadgeProps, type OrderStatus, type PaymentStatus +4 |
| StepperNav.tsx | src\ui\components\StepperNav.tsx | Contains project configuration or metadata. | fn StepperNav, interface StepperNavStep, interface StepperNavProps |
| storage.ts | src\contracts\storage.ts | Contains project configuration or metadata. | interface UploadOptions, interface StorageFile, interface IStorageProvider |
| StorageManager.ts | src\core\StorageManager.ts | Contains project configuration or metadata. | const storageManager, class StorageManager, interface StorageOptions, type StorageType |
| store.factory.ts | src\seed\factories\store.factory.ts | Contains project configuration or metadata. Note: appkit/src/seed/factories/store.factory.ts | fn makeStore, fn makeFullStore, const STORE_FIXTURES, interface SeedBaseStoreDocument |
| StoreAboutView.tsx | src\features\stores\components\StoreAboutView.tsx | Contains project configuration or metadata. | fn StoreAboutView, interface StoreAboutViewProps |
| StoreAuctionsView.tsx | src\features\stores\components\StoreAuctionsView.tsx | Contains project configuration or metadata. | fn StoreAuctionsView, interface StoreAuctionsViewProps |
| StoreHeader.tsx | src\features\stores\components\StoreHeader.tsx | Contains project configuration or metadata. | fn StoreHeader |
| StoreNavTabs.tsx | src\features\stores\components\StoreNavTabs.tsx | Contains project configuration or metadata. | fn StoreNavTabs, interface StoreTab, interface StoreNavTabsProps |
| StoreProductsView.tsx | src\features\stores\components\StoreProductsView.tsx | Contains project configuration or metadata. | fn StoreProductsView, interface StoreProductsViewProps |
| StoreReviewsView.tsx | src\features\stores\components\StoreReviewsView.tsx | Contains project configuration or metadata. | fn StoreReviewsView, interface StoreReviewsViewProps |
| stores.repository.ts | src\features\stores\repository\stores.repository.ts | Contains project configuration or metadata. | class StoresRepository |
| StoresListView.tsx | src\features\stores\components\StoresListView.tsx | Contains project configuration or metadata. | fn StoresListView |
| string.formatter.ts | src\utils\string.formatter.ts | Contains project configuration or metadata. | fn capitalize, fn capitalizeWords, fn truncate, fn truncateWords +7 |
| style.helper.ts | src\ui\style.helper.ts | Contains project configuration or metadata. | fn classNames, fn mergeTailwindClasses |
| style.ts | src\contracts\style.ts | Contains project configuration or metadata. | interface IStyleAdapter |
| SummaryCard.tsx | src\ui\components\SummaryCard.tsx | Contains project configuration or metadata. | fn SummaryCard, interface SummaryLine, interface SummaryCardProps |
| SwitchFilter.tsx | src\features\filters\SwitchFilter.tsx | Contains project configuration or metadata. | fn SwitchFilter, interface SwitchFilterProps |
| sync-env-to-vercel.ps1 | scripts\sync-env-to-vercel.ps1 | Contains project configuration or metadata. | - |
| table.ts | src\contracts\table.ts | Contains project configuration or metadata. | fn mergeTableConfig, const myTableConfig, const myPaginationConfig, const DEFAULT_PAGINATION_CONFIG +6 |
| TablePagination.tsx | src\ui\components\TablePagination.tsx | Contains project configuration or metadata. | fn TablePagination, interface TablePaginationLabels, interface TablePaginationProps |
| TabStrip.tsx | src\ui\components\TabStrip.tsx | Contains project configuration or metadata. Note: appkit/src/ui/components/TabStrip.tsx | fn TabStrip, interface TabStripTab, interface TabStripProps |
| TagInput.tsx | src\ui\components\TagInput.tsx | Contains project configuration or metadata. | fn TagInput, interface TagInputProps |
| TestimonialsCarousel.tsx | src\features\homepage\components\TestimonialsCarousel.tsx | Contains project configuration or metadata. | fn TestimonialsCarousel, interface TestimonialsCarouselProps |
| test-utils.ts | src\seed\test-utils.ts | Contains project configuration or metadata. Note: appkit/src/seed/test-utils.ts | fn assertPiiRoundTrip, fn seedForTest, interface TestSeedHandles |
| Textarea.tsx | src\features\forms\Textarea.tsx | Contains project configuration or metadata. | const Textarea, interface TextareaProps |
| Textarea.tsx | src\ui\components\Textarea.tsx | Contains project configuration or metadata. | fn Textarea, type TextareaProps |
| TextLink.tsx | src\ui\components\TextLink.tsx | Contains project configuration or metadata. | fn TextLink, interface TextLinkProps |
| TitleBarLayout.tsx | src\features\layout\TitleBarLayout.tsx | Contains project configuration or metadata. | fn TitleBarLayout, interface TitleBarUser, interface TitleBarLayoutProps |
| Toggle.tsx | src\features\forms\Toggle.tsx | Contains project configuration or metadata. | fn Toggle, interface ToggleProps |
| tokens.css | src\tokens\tokens.css | Contains project configuration or metadata. | - |
| Tooltip.tsx | src\ui\components\Tooltip.tsx | Contains project configuration or metadata. Note: Close mobile sheet on Escape | fn Tooltip, interface TooltipProps |
| TrustBadges.tsx | src\features\homepage\components\TrustBadges.tsx | Contains project configuration or metadata. | fn TrustBadges, interface TrustBadgesProps |
| TrustFeaturesSection.tsx | src\features\homepage\components\TrustFeaturesSection.tsx | Contains project configuration or metadata. | fn TrustFeaturesSection, interface TrustFeatureItem, interface TrustFeaturesSectionProps |
| TrustIndicatorsSection.tsx | src\features\homepage\components\TrustIndicatorsSection.tsx | Contains project configuration or metadata. | fn TrustIndicatorsSection, interface TrustIndicatorItem, interface TrustIndicatorsSectionProps |
| tsconfig.json | tsconfig.json | Defines TypeScript compiler behavior, module resolution, and project type settings. | - |
| tsup.config.ts | tsup.config.ts | Defines bundling targets, output format, and build pipeline options for tsup. Note: Alias map - resolves old @mohasinac/* package names to internal paths. | - |
| type.converter.ts | src\utils\type.converter.ts | Contains project configuration or metadata. | fn stringToBoolean, fn booleanToString, fn arrayToObject, fn objectToArray +4 |
| types.ts | src\features\cron\types.ts | Contains project configuration or metadata. | interface JobContext, interface JobResult, interface CronJobDefinition, interface CronRegistrySummary +4 |
| types.ts | src\next\middleware\types.ts | Contains project configuration or metadata. Note: appkit/src/next/middleware/types.ts | interface BaseRequestContext, interface AuthRequestContext, type Middleware |
| types.ts | src\security\rbac\types.ts | Contains project configuration or metadata. Note: appkit/src/security/rbac/types.ts | interface RoleDefinition, interface RbacConfig, interface ResolvedUser, type Permission |
| types.ts | src\seed\types.ts | Contains project configuration or metadata. Note: appkit/src/seed/types.ts | interface SeedCollection, interface SeedConfig, interface SeedResult |
| Typography.tsx | src\ui\components\Typography.tsx | Contains project configuration or metadata. | fn Heading, fn Text, fn Label, fn Caption +1 |
| url.validator.ts | src\validation\url.validator.ts | Contains project configuration or metadata. | fn isValidUrl, fn isValidUrlWithProtocol, fn isExternalUrl, fn sanitizeUrl |
| useAccount.ts | src\features\account\hooks\useAccount.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useProfile |
| useAdmin.ts | src\features\admin\hooks\useAdmin.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useDashboardStats |
| useAuctions.ts | src\features\auctions\hooks\useAuctions.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useAuctions, fn useAuction, fn useAuctionBids |
| useAuth.ts | src\features\auth\hooks\useAuth.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCurrentUser |
| useBeforeAfter.ts | src\features\before-after\hooks\useBeforeAfter.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBeforeAfter |
| useBlog.ts | src\features\blog\hooks\useBlog.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBlogPosts, fn useBlogPost |
| useBlogArticles.ts | src\features\homepage\hooks\useBlogArticles.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBlogArticles, interface BlogListResult |
| useBookConsultation.ts | src\features\consultation\hooks\useBookConsultation.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBookConsultation |
| useBreakpoint.ts | src\react\hooks\useBreakpoint.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBreakpoint |
| useBulkAction.ts | src\react\hooks\useBulkAction.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: --------------------------------------------------------------------------- | fn useBulkAction, interface BulkActionItemFailure, interface BulkActionSummary, interface BulkActionResult +3 |
| useBulkSelection.ts | src\react\hooks\useBulkSelection.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useBulkSelection, interface UseBulkSelectionOptions, interface UseBulkSelectionReturn |
| useCamera.ts | src\react\hooks\useCamera.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCamera, interface UseCameraOptions, interface UseCameraReturn |
| useCart.ts | src\features\cart\hooks\useCart.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCart |
| useCartQuery.ts | src\features\cart\hooks\useCartQuery.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCartQuery |
| useCategories.ts | src\features\categories\hooks\useCategories.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCategoriesList, fn useCategoryDetail |
| useCheckout.ts | src\features\checkout\hooks\useCheckout.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCheckout |
| useCheckoutReadQueries.ts | src\features\cart\hooks\useCheckoutReadQueries.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCheckoutReadQueries |
| useClickOutside.ts | src\react\hooks\useClickOutside.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Store callback in a ref to avoid re-subscribing listeners on every render | fn useClickOutside, interface UseClickOutsideOptions |
| useCollections.ts | src\features\collections\hooks\useCollections.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCollections, fn useCollection |
| useContainerGrid.ts | src\react\hooks\useContainerGrid.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: appkit/src/react/hooks/useContainerGrid.ts | fn useContainerGrid, interface UseContainerGridOptions, interface UseContainerGridResult |
| useCopilotChat.ts | src\features\copilot\hooks\useCopilotChat.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useCopilotChat, interface CopilotMessage, interface CopilotChatResponse |
| useCountdown.ts | src\react\hooks\useCountdown.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Firestore Timestamp JSON shape: { _seconds, _nanoseconds } | fn useCountdown, interface CountdownRemaining |
| useEvent.ts | src\features\events\hooks\useEvent.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useEvent, fn useEventEntries, fn useEventLeaderboard |
| useEvents.ts | src\features\events\hooks\useEvents.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useEvents |
| useFaqList.ts | src\features\faq\hooks\useFaqList.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useFaqList |
| useFAQs.ts | src\features\faq\hooks\useFAQs.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useFAQs, fn useFAQ |
| useFeaturedAuctions.ts | src\features\homepage\hooks\useFeaturedAuctions.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useFeaturedAuctions |
| useFeaturedPreOrders.ts | src\features\homepage\hooks\useFeaturedPreOrders.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useFeaturedPreOrders |
| useFeaturedProducts.ts | src\features\homepage\hooks\useFeaturedProducts.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useFeaturedProducts |
| useGesture.ts | src\react\hooks\useGesture.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Store callbacks in refs to avoid event listener churn | fn useGesture, interface UseGestureOptions, type GestureType |
| useHeroCarousel.ts | src\features\homepage\hooks\useHeroCarousel.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useHeroCarousel |
| useHomepage.ts | src\features\homepage\hooks\useHomepage.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useHomepage |
| useKeyPress.ts | src\react\hooks\useKeyPress.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Memoize keys array to avoid re-creation when `key` is a string | fn useKeyPress, interface KeyModifiers, interface UseKeyPressOptions |
| useLongPress.ts | src\react\hooks\useLongPress.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Keep callback ref stable avoids re-attaching on every render | fn useLongPress |
| useLoyaltyBalance.ts | src\features\loyalty\hooks\useLoyaltyBalance.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useLoyaltyBalance |
| useMedia.ts | src\features\media\hooks\useMedia.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useMediaUpload, fn useMediaCrop, fn useMediaTrim, interface MediaUploadResult +2 |
| useMediaQuery.ts | src\react\hooks\useMediaQuery.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Lazy initializer: use real value on first client render, suppressing the flash. | fn useMediaQuery |
| useModalStack.ts | src\react\useModalStack.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useModalStack, interface ModalEntry |
| useOrder.ts | src\features\cart\hooks\useOrder.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useOrder |
| useOrders.ts | src\features\orders\hooks\useOrders.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useOrders, fn useOrder |
| usePayments.ts | src\features\payments\hooks\usePayments.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePaymentSettings |
| usePendingFilters.ts | src\react\hooks\usePendingFilters.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePendingFilters, interface UsePendingFiltersOptions, interface UsePendingFiltersReturn |
| usePendingTable.ts | src\react\hooks\usePendingTable.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePendingTable, interface PendingTable, interface UsePendingTableReturn |
| usePreOrders.ts | src\features\pre-orders\hooks\usePreOrders.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePreorders, fn usePreorder |
| useProductDetail.ts | src\features\products\hooks\useProductDetail.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useProductDetail |
| useProducts.ts | src\features\products\hooks\useProducts.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useProducts, fn useProduct |
| usePromotions.ts | src\features\promotions\hooks\usePromotions.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePromotions, fn useCoupon |
| usePullToRefresh.ts | src\react\hooks\usePullToRefresh.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn usePullToRefresh, interface UsePullToRefreshOptions, interface UsePullToRefreshReturn |
| user.factory.ts | src\seed\factories\user.factory.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: appkit/src/seed/factories/user.factory.ts | fn makeUser, fn makeFullUser, const USER_FIXTURES, interface SeedBaseUserDocument |
| UserAccountHub.tsx | src\features\user\components\UserAccountHub.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserAccountHub, interface UserAccountHubProps |
| UserAccountHubView.tsx | src\features\account\components\UserAccountHubView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserAccountHubView, interface UserAccountHubViewLabels, interface UserAccountHubViewProps |
| UserAddressesView.tsx | src\features\account\components\UserAddressesView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserAddressesView, interface UserAddressesViewLabels, interface UserAddressesViewProps |
| UserAddressesView.tsx | src\features\user\components\UserAddressesView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserAddressesView, interface UserAddressesViewProps |
| useReviews.ts | src\features\reviews\hooks\useReviews.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useReviews, fn useProductReviews |
| UserNotificationsView.tsx | src\features\account\components\UserNotificationsView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserNotificationsView, interface UserNotificationsViewLabels, interface UserNotificationsViewProps |
| UserNotificationsView.tsx | src\features\user\components\UserNotificationsView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserNotificationsView, interface UserNotificationsViewProps |
| UserOffersView.tsx | src\features\account\components\UserOffersView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserOffersView, interface UserOffersViewLabels, interface UserOffersViewProps |
| UserOffersView.tsx | src\features\user\components\UserOffersView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserOffersView, interface UserOffersViewProps |
| UserOrdersView.tsx | src\features\account\components\UserOrdersView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserOrdersView, interface UserOrdersViewLabels, interface UserOrdersViewProps |
| UserOrdersView.tsx | src\features\user\components\UserOrdersView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserOrdersView, interface UserOrdersViewProps |
| UserOrderTrackView.tsx | src\features\account\components\UserOrderTrackView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserOrderTrackView, interface UserOrderTrackViewLabels, interface UserOrderTrackViewProps |
| UserSettingsView.tsx | src\features\account\components\UserSettingsView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserSettingsView, interface UserSettingsViewLabels, interface UserSettingsViewProps |
| UserSettingsView.tsx | src\features\user\components\UserSettingsView.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserSettingsView, interface UserSettingsViewProps |
| UserSidebar.tsx | src\features\user\components\UserSidebar.tsx | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn UserSidebar, interface UserSidebarProps |
| useSearch.ts | src\features\search\hooks\useSearch.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useSearch |
| useSellerPayouts.ts | src\features\seller\hooks\useSellerPayouts.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useSellerPayouts, fn useSellerPayoutSettings |
| useSellerStore.ts | src\features\seller\hooks\useSellerStore.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useSellerStore, fn useSellerDashboard, fn useSellerAnalytics |
| useStores.ts | src\features\stores\hooks\useStores.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useStores, fn useStoreBySlug, fn useStoreProducts, fn useStoreAuctions +1 |
| useSubmitCorporateInquiry.ts | src\features\corporate\hooks\useSubmitCorporateInquiry.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useSubmitCorporateInquiry |
| useSwipe.ts | src\react\hooks\useSwipe.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useSwipe, interface UseSwipeOptions, type SwipeDirection |
| useTopBrands.ts | src\features\homepage\hooks\useTopBrands.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useTopBrands |
| useTopCategories.ts | src\features\homepage\hooks\useTopCategories.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useTopCategories |
| useUnsavedChanges.ts | src\react\hooks\useUnsavedChanges.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Sync snapshot when initialValues first arrives (data load) | fn useUnsavedChanges, const UNSAVED_CHANGES_EVENT, interface UseUnsavedChangesOptions, interface UseUnsavedChangesReturn |
| useUrlTable.ts | src\react\hooks\useUrlTable.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: Always call native hooks unconditionally (React rules). | fn useUrlTable, interface UseUrlTableOptions |
| useUserWishlist.ts | src\features\wishlist\hooks\useUserWishlist.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useUserWishlist, interface UserWishlistItem, interface UserWishlistResponse |
| useVisibleItems.ts | src\react\hooks\useVisibleItems.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. Note: appkit/src/react/hooks/useVisibleItems.ts | fn useVisibleItems, interface UseVisibleItemsOptions, interface UseVisibleItemsResult |
| useWishlist.ts | src\features\wishlist\hooks\useWishlist.ts | Contains reusable React hook logic for state, side effects, and feature-specific data flow. | fn useWishlist |
| utils.ts | src\features\forms\utils.ts | Contains project configuration or metadata. | fn cn, const INPUT_BASE, const INPUT_ERROR, const INPUT_SUCCESS +5 |
| validation-error.ts | src\errors\validation-error.ts | Contains project configuration or metadata. | class ValidationError |
| VerifyEmailView.tsx | src\features\auth\components\VerifyEmailView.tsx | Contains project configuration or metadata. | fn VerifyEmailView, interface VerifyEmailViewProps |
| VideoThumbnailSelector.tsx | src\features\media\modals\VideoThumbnailSelector.tsx | Contains project configuration or metadata. | fn VideoThumbnailSelector, interface VideoThumbnailSelectorProps |
| VideoTrimModal.tsx | src\features\media\modals\VideoTrimModal.tsx | Contains project configuration or metadata. | fn VideoTrimModal, interface VideoTrimModalProps |
| ViewToggle.tsx | src\ui\components\ViewToggle.tsx | Contains project configuration or metadata. | fn ViewToggle, interface ViewToggleLabels, interface ViewToggleProps, type ViewMode |
| watch-all.mjs | scripts\watch-all.mjs | Contains project configuration or metadata. | - |
| WelcomeSection.tsx | src\features\homepage\components\WelcomeSection.tsx | Contains project configuration or metadata. | fn WelcomeSection, interface WelcomeSectionChip, interface WelcomeSectionProps |
| whatsapp.ts | src\features\whatsapp-bot\helpers\whatsapp.ts | Contains project configuration or metadata. Note: JSON format (Wati.io or generic) | fn buildCheckoutMessageURL, fn buildStatusNotificationURL, fn verifyWebhookSignature, fn isAdminNumber +3 |
| WhatsAppChatButton.tsx | src\features\whatsapp-bot\components\WhatsAppChatButton.tsx | Contains project configuration or metadata. | fn WhatsAppChatButton |
| WhatsAppCommunitySection.tsx | src\features\homepage\components\WhatsAppCommunitySection.tsx | Contains project configuration or metadata. | fn WhatsAppCommunitySection, interface WhatsAppCommunitySectionProps |
| wishlist.repository.ts | src\features\wishlist\repository\wishlist.repository.ts | Contains project configuration or metadata. | class WishlistRepository |
| WishlistPage.tsx | src\features\wishlist\components\WishlistPage.tsx | Contains project configuration or metadata. | fn WishlistCard, fn WishlistPage |
| WishlistToggleButton.tsx | src\features\wishlist\components\WishlistToggleButton.tsx | Contains project configuration or metadata. | fn WishlistToggleButton |
| WishlistView.tsx | src\features\wishlist\components\WishlistView.tsx | Contains project configuration or metadata. Note: Client-side filter + sort for products tab | fn WishlistView, interface WishlistViewProps, type WishlistTab |
| zod-error-map.ts | src\validation\zod-error-map.ts | Contains project configuration or metadata. Note: eslint-disable-next-line no-var | fn zodErrorMap, fn setupZodErrorMap |
