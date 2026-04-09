// @mohasinac/contracts
// Pure TypeScript interfaces and shared types — no concrete code.
// Every other @mohasinac/* package depends on this package.

// Repository
export type {
  WhereOp,
  SieveQuery,
  PagedResult,
  IReadRepository,
  IWriteRepository,
  IRepository,
  IRealtimeRepository,
  IDbProvider,
} from "./repository.js";

// Auth
export type {
  AuthPayload,
  AuthUser,
  CreateUserInput,
  IAuthProvider,
  ISessionProvider,
} from "./auth.js";

// Email
export type {
  EmailAttachment,
  EmailOptions,
  EmailResult,
  IEmailProvider,
} from "./email.js";

// Storage
export type {
  UploadOptions,
  StorageFile,
  IStorageProvider,
} from "./storage.js";

// Payment
export type {
  PaymentOrder,
  PaymentCapture,
  Refund,
  IPaymentProvider,
} from "./payment.js";

// Shipping
export type {
  ShippingAddress,
  CreateShipmentInput,
  Shipment,
  TrackingEvent,
  TrackingInfo,
  ServiceabilityResult,
  IShippingProvider,
} from "./shipping.js";

// Search
export type {
  SearchOptions,
  SearchHit,
  SearchResult,
  SuggestOptions,
  ISearchProvider,
} from "./search.js";

// Infra (Cache, Queue, EventBus)
export type {
  ICacheProvider,
  QueueJob,
  IQueueProvider,
  EventHandler,
  IEventBus,
} from "./infra.js";

// Style
export type { IStyleAdapter } from "./style.js";

// Registry
export type { ProviderRegistry } from "./registry.js";
export {
  registerProviders,
  getProviders,
  _resetProviders,
} from "./registry.js";

// Feature manifest
export type {
  RouteStub,
  ApiRouteStub,
  FeatureManifest,
  FeaturesConfig,
} from "./feature.js";

// Site config
export type { SiteConfig, NavItem } from "./config.js";

// Extensibility utilities
export type {
  WithTransformOpts,
  GenericListResponse,
  TableColumn,
  ColumnExtensionOpts,
  LayoutSlots,
  FeatureExtension,
} from "./extend.js";

// Table / Pagination / Sticky config
export type {
  PaginationConfig,
  StickyConfig,
  TableConfig,
  TableViewMode,
} from "./table.js";
export {
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_STICKY_CONFIG,
  DEFAULT_TABLE_CONFIG,
  mergeTableConfig,
} from "./table.js";
