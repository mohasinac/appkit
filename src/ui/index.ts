import "./components/index.style.css";
import "./forms/FormShell.style.css";

// --- FormShell (SB-UNI-Y-1) --------------------------------------------------
export type {
  FormShellProps,
  FormShellStep,
  FormShellContextValue,
} from "./forms";
export { FormShell, useFormShell } from "./forms";
export type { FieldInputProps } from "./forms";
export { FieldInput } from "./forms";
export type { FieldSelectProps } from "./forms";
export { FieldSelect } from "./forms";
export type { FieldCheckboxProps } from "./forms";
export { FieldCheckbox } from "./forms";

// --- Column utilities ---------------------------------------------------------
export {
  buildColumns,
  createColumnBuilder,
  renderBoolean,
  renderCurrency,
  renderCurrencyCompact,
  renderCount,
  renderNullable,
  renderRating,
} from "./columns";
export type {
  BooleanRenderOpts,
  RatingMode,
  RatingRenderOpts,
} from "./columns";

// --- Semantic HTML wrappers ---------------------------------------------------
export type {
  SectionProps,
  ArticleProps,
  MainProps,
  AsideProps,
  NavProps,
  BlockHeaderProps,
  BlockFooterProps,
  UlProps,
  OlProps,
  LiProps,
  TableProps,
  TheadProps,
  TbodyProps,
  TrProps,
  ThProps,
  TdProps,
  CodeProps,
  PreProps,
  BlockquoteProps,
  FigureProps,
  FigcaptionProps,
  DlProps,
  DtProps,
  DdProps,
} from "./components/Semantic";
export {
  Section,
  Article,
  Main,
  Aside,
  Nav,
  BlockHeader,
  BlockFooter,
  Ul,
  Ol,
  Li,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  Pre,
  Blockquote,
  Figure,
  Figcaption,
  Dl,
  Dt,
  Dd,
} from "./components/Semantic";

export type { DivProps } from "./components/Div";
export { Div } from "./components/Div";

// --- Typography primitives ----------------------------------------------------
export type { ColorVariant } from "./components/Typography";
export { Heading, Text, Label, Caption, Span } from "./components/Typography";

// --- Filter chip group (SB10-C completion, S8 2026-05-13) --------------------
export { FilterChipGroup } from "./components/FilterChipGroup";
export type {
  FilterChipGroupProps,
  FilterChipGroupTab,
} from "./components/FilterChipGroup";

// --- Loading / Feedback -------------------------------------------------------
export type { SpinnerProps } from "./components/Spinner";
export { Spinner } from "./components/Spinner";
export { PageLoader } from "./components/PageLoader";

export type { SiteLogoProps } from "./components/SiteLogo";
export { SiteLogo } from "./components/SiteLogo";

export type { SkeletonProps } from "./components/Skeleton";
export { Skeleton } from "./components/Skeleton";

// --- Interactive --------------------------------------------------------------
export type { ButtonProps } from "./components/Button";
export { Button } from "./components/Button";

export type { IconButtonProps } from "./components/IconButton";
export { IconButton } from "./components/IconButton";

export type { TextLinkProps } from "./components/TextLink";
export { TextLink } from "./components/TextLink";

export type { TooltipProps } from "./components/Tooltip";
export { Tooltip } from "./components/Tooltip";

export type {
  AccordionProps,
  AccordionItemProps,
} from "./components/Accordion";
export { Accordion, AccordionItem } from "./components/Accordion";

export type {
  FormProps,
  GapToken,
  FormGroupProps,
  FormFieldSpanProps,
  FormActionsProps,
} from "./components/Form";
export { Form, FormGroup, FormFieldSpan, FormActions } from "./components/Form";

export type { BadgeProps, BadgeVariant } from "./components/Badge";
export { Badge } from "./components/Badge";

// --- Feedback -----------------------------------------------------------------
export type { AlertProps } from "./components/Alert";
export { Alert } from "./components/Alert";

// --- Layout helpers -----------------------------------------------------------
export type { DividerProps } from "./components/Divider";
export { Divider } from "./components/Divider";

// --- Progress -----------------------------------------------------------------
export type {
  ProgressProps,
  IndeterminateProgressProps,
} from "./components/Progress";
export { Progress, IndeterminateProgress } from "./components/Progress";

// --- S1-1: New Primitives -----------------------------------------------------

export type { PaginationProps } from "./components/Pagination";
export { Pagination } from "./components/Pagination";

export type {
  StatusBadgeProps,
  StatusBadgeStatus,
  BadgeOrderStatus,
  BadgePaymentStatus,
  BadgeReviewStatus,
  BadgeTicketStatus,
  GenericStatus,
} from "./components/StatusBadge";
export { StatusBadge } from "./components/StatusBadge";

export type { ModalProps } from "./components/Modal";
export { Modal, ModalFooter } from "./components/Modal";

export type { QuickCreateModalProps } from "./components/QuickCreateModal";
export { QuickCreateModal } from "./components/QuickCreateModal";

export type { VacationBannerProps } from "./components/VacationBanner";
export { VacationBanner } from "./components/VacationBanner";

export type {
  UnsavedChangesModalProps,
  UnsavedChangesLabels,
} from "./components/UnsavedChangesModal";
export { UnsavedChangesModal } from "./components/UnsavedChangesModal";
export type { LoginRequiredModalProps } from "./components/LoginRequiredModal";
export { LoginRequiredModal } from "./components/LoginRequiredModal";

export type { DrawerProps } from "./components/Drawer";
export { Drawer } from "./components/Drawer";

export type {
  BackgroundRendererProps,
  BackgroundConfig,
} from "./components/BackgroundRenderer";
export { BackgroundRenderer } from "./components/BackgroundRenderer";

export type { ResponsiveViewProps } from "./components/ResponsiveView";
export { ResponsiveView } from "./components/ResponsiveView";

export type { SelectProps, SelectOption } from "./components/Select";
export { Select } from "./components/Select";

export type { InputProps } from "./components/Input";
export { Input } from "./components/Input";

export type { OtpInputProps } from "./components/OtpInput";
export { OtpInput } from "./components/OtpInput";

export type { DateInputProps, DateRangeInputProps } from "./components/DateInput";
export { DateInput, DateRangeInput } from "./components/DateInput";

export type { TextareaProps } from "./components/Textarea";
export { Textarea } from "./components/Textarea";

export type { SliderProps } from "./components/Slider";
export { Slider } from "./components/Slider";

export type { CheckboxProps } from "./components/Checkbox";
export { Checkbox } from "./components/Checkbox";

export type { RadioGroupProps, RadioOption } from "./components/Radio";
export { RadioGroup } from "./components/Radio";

export type { ToggleProps } from "./components/Toggle";
export { Toggle } from "./components/Toggle";

export type {
  ToastVariant,
  ToastPosition,
  ToastProviderProps,
} from "./components/Toast";
export { ToastProvider, useToast } from "./components/Toast";

export type { StarRatingProps } from "./components/StarRating";
export { StarRating } from "./components/StarRating";

export type { BreadcrumbProps, BreadcrumbItem } from "./components/Breadcrumb";
export { Breadcrumb } from "./components/Breadcrumb";

export type {
  ImageLightboxProps,
  LightboxImage,
} from "./components/ImageLightbox";
export { ImageLightbox } from "./components/ImageLightbox";

export type { TagInputProps } from "./components/TagInput";
export { TagInput } from "./components/TagInput";

export type { StepperNavProps, StepperNavStep } from "./components/StepperNav";
export { StepperNav } from "./components/StepperNav";

export type {
  ViewMode,
  ViewToggleProps,
  ViewToggleLabels,
} from "./components/ViewToggle";
export { ViewToggle } from "./components/ViewToggle";

export type { RatingDisplayProps } from "./components/RatingDisplay";
export { RatingDisplay } from "./components/RatingDisplay";

export type { PriceDisplayProps } from "./components/PriceDisplay";
export { PriceDisplay } from "./components/PriceDisplay";

export type { StatsGridProps, StatItem } from "./components/StatsGrid";
export { StatsGrid } from "./components/StatsGrid";

export type { SummaryCardProps, SummaryLine } from "./components/SummaryCard";
export { SummaryCard } from "./components/SummaryCard";

export type { CountdownDisplayProps } from "./components/CountdownDisplay";
export { CountdownDisplay } from "./components/CountdownDisplay";

export type { ItemRowProps } from "./components/ItemRow";
export { ItemRow } from "./components/ItemRow";

export type {
  HorizontalScrollerProps,
  PerViewConfig,
} from "./components/HorizontalScroller";
export { HorizontalScroller } from "./components/HorizontalScroller";


// Tab strip with ResizeObserver-driven overflow scroll
export type { TabStripProps, TabStripTab } from "./components/TabStrip";
export { TabStrip } from "./components/TabStrip";

// Fluid form layout
export type { FormGridProps, FormFieldProps } from "./components/FormGrid";
export { FormGrid, FormField as FormGridField } from "./components/FormGrid";

// Settings primitives (W1-31)
export type { SettingsSectionProps, ToggleRowProps } from "./components/SettingsSection";
export { SettingsSection, ToggleRow } from "./components/SettingsSection";

// Detail-page primitives (W1-14)
export type { DetailPageHeroProps } from "./components/DetailPageHero";
export { DetailPageHero } from "./components/DetailPageHero";
export type { DetailPageGalleryProps, DetailPageGalleryImage } from "./components/DetailPageGallery";
export { DetailPageGallery } from "./components/DetailPageGallery";
export type { DetailPageTabsProps, DetailPageTab } from "./components/DetailPageTabs";
export { DetailPageTabs } from "./components/DetailPageTabs";

export type { FormFieldProps as SmartFormFieldProps } from "./components/FormField";
export { FormField } from "./components/FormField";

export type { DescriptionFieldProps } from "./components/DescriptionField";
export { DescriptionField } from "./components/DescriptionField";

export type { CardProps, CardSectionProps } from "./components/Card";
export { Card, CardHeader, CardBody, CardFooter } from "./components/Card";

export type { EmptyStateProps } from "./components/EmptyState";
export { EmptyState } from "./components/EmptyState";

export type { AvatarProps, AvatarGroupProps } from "./components/Avatar";
export { Avatar, AvatarGroup } from "./components/Avatar";

export type { DropdownProps, DropdownMenuItem } from "./components/Dropdown";
export {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "./components/Dropdown";

export type { MenuProps } from "./components/Menu";
export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from "./components/Menu";

export type {
  PaginatedSelectProps,
  PaginatedSelectOption,
  AsyncPage,
} from "./components/PaginatedSelect";
export { PaginatedSelect } from "./components/PaginatedSelect";

export type { RoleBadgeProps } from "./components/RoleBadge";
export { RoleBadge } from "./components/RoleBadge";

export type { SkipToMainProps } from "./components/SkipToMain";
export { SkipToMain } from "./components/SkipToMain";

export type { NavigationLoaderProps } from "./components/NavigationLoader";
export { NavigationLoader } from "./components/NavigationLoader";

export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from "./components/Tabs";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/Tabs";

export type { FilterDrawerProps } from "./components/FilterDrawer";
export { FilterDrawer } from "./components/FilterDrawer";

export type { RowAction, RowActionMenuProps } from "./components/RowActionMenu";
export { RowActionMenu } from "./components/RowActionMenu";

export type { PasswordStrengthIndicatorProps } from "./components/PasswordStrengthIndicator";
export { PasswordStrengthIndicator } from "./components/PasswordStrengthIndicator";

export type { AvatarDisplayProps } from "./components/AvatarDisplay";
export { AvatarDisplay } from "./components/AvatarDisplay";


export type {
  ActiveFilter,
  ActiveFilterChipsProps,
} from "./components/ActiveFilterChips";
export { ActiveFilterChips } from "./components/ActiveFilterChips";

export type { SortOption, SortDropdownProps } from "./components/SortDropdown";
export { SortDropdown } from "./components/SortDropdown";

export type { ListingFilterDrawerProps } from "./components/ListingFilterDrawer";
export { ListingFilterDrawer } from "./components/ListingFilterDrawer";

export type { ListingToolbarProps, ListingToolbarSortOption, ListingToolbarLabels, ListingToolbarToggle } from "./components/ListingToolbar";
export { ListingToolbar } from "./components/ListingToolbar";

export type {
  TablePaginationProps,
  TablePaginationLabels,
} from "./components/TablePagination";
export { TablePagination } from "./components/TablePagination";

// --- S1-2: DataTable ----------------------------------------------------------
export type { DataTableProps, DataTableColumn } from "./DataTable";
export { DataTable } from "./DataTable";

// --- Table / Pagination / Sticky config (re-exported from @mohasinac/contracts) --
export type {
  TableConfig,
  TableViewMode,
  PaginationConfig,
  StickyConfig,
} from "../contracts";
export {
  DEFAULT_TABLE_CONFIG,
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_STICKY_CONFIG,
  mergeTableConfig,
} from "../contracts";

// --- Surface tokens -----------------------------------------------------------
export type {
  SurfaceKey,
  PaddingKey,
  RoundedKey,
  BorderKey,
  ShadowKey,
  SurfaceProps,
} from "./components/surface-tokens";
export {
  SURFACE_MAP,
  PADDING_MAP,
  ROUNDED_MAP,
  BORDER_MAP,
  SHADOW_MAP,
  buildSurfaceClasses,
} from "./components/surface-tokens";

// --- Layout Primitives --------------------------------------------------------
export type {
  GapKey,
  ContainerSize,
  GridCols,
  ViewPortal,
  ContainerProps,
  StackProps,
  RowProps,
  GridProps,
} from "./components/Layout";
export { Container, Stack, Row, Grid, GRID_MAP } from "./components/Layout";

// --- UI Helpers ---------------------------------------------------------------
export { classNames, mergeTailwindClasses } from "./style.helper";

// --- SideModal ----------------------------------------------------------------
export type { SideModalProps } from "./components/SideModal";
export { SideModal } from "./components/SideModal";

// --- RichText -----------------------------------------------------------------
export type { RichTextProps } from "./rich-text/RichText";
export { RichText } from "./rich-text/RichText";
export type { RichTextRendererProps } from "./rich-text/RichTextRenderer";
export { RichTextRenderer } from "./rich-text/RichTextRenderer";
export type { RichTextEditorProps } from "./components/RichTextEditor";
export { RichTextEditor } from "./components/RichTextEditor";

// --- ListingLayout + BulkActionBar --------------------------------------------
export type {
  ListingLayoutProps,
  ListingLayoutLabels,
} from "./components/ListingLayout";
export { ListingLayout } from "./components/ListingLayout";

export type {
  SlottedListingViewProps,
  SlottedListingViewLabels,
} from "./components/SlottedListingView";
export { SlottedListingView } from "./components/SlottedListingView";

export type {
  DetailViewShellProps,
  DetailViewLayout,
} from "./components/DetailViewShell";
export { DetailViewShell } from "./components/DetailViewShell";

export type {
  StackedViewShellProps,
  StackedViewShellLabels,
} from "./components/StackedViewShell";
export { StackedViewShell } from "./components/StackedViewShell";

export type {
  BulkActionBarProps,
  BulkActionBarLabels,
  BulkActionItem,
} from "./components/BulkActionBar";
export { BulkActionBar } from "./components/BulkActionBar";

export type { ClaimCouponButtonProps } from "./components/ClaimCouponButton";
export { ClaimCouponButton } from "./components/ClaimCouponButton";

export type { FlowStep, FlowDiagramProps } from "./components/FlowDiagram";
export { FlowDiagram } from "./components/FlowDiagram";

export type {
  BaseListingCardRootProps,
  BaseListingCardHeroProps,
  BaseListingCardInfoProps,
  BaseListingCardCheckboxProps,
} from "./components/BaseListingCard";
export { BaseListingCard } from "./components/BaseListingCard";

export type {
  GalleryImage,
  ImageGalleryProps,
} from "./components/ImageGallery";
export { default as ImageGallery } from "./components/ImageGallery";

// --- SideDrawer --------------------------------------------------------------
export type { SideDrawerProps, DrawerMode } from "./components/SideDrawer";
export { SideDrawer } from "./components/SideDrawer";

// --- FormActionBar -----------------------------------------------------------
export type { FormActionBarProps, FormActionBarBreadcrumb } from "./components/FormActionBar";
export { FormActionBar } from "./components/FormActionBar";

// --- ConfirmDeleteModal ------------------------------------------------------
export type { ConfirmDeleteModalProps } from "./components/ConfirmDeleteModal";
export { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

// --- Motion / Animation primitives -------------------------------------------
export type {
  FadeInProps,
  SlideUpProps,
  SlideInProps,
  ScaleInProps,
  CollapseProps,
  PressScaleProps,
  HoverLiftProps,
  AnimatedListProps,
  AnimatedDivProps,
  AnimatedStackProps,
  AnimatedRowProps,
  DraggableProps,
  SwipeableProps,
} from "./components/Motion";
export {
  FadeIn,
  SlideUp,
  SlideIn,
  ScaleIn,
  Collapse,
  PressScale,
  HoverLift,
  AnimatedList,
  AnimatedDiv,
  AnimatedStack,
  AnimatedRow,
  Draggable,
  Swipeable,
  AnimatePresence,
} from "./components/Motion";

// --- Motion tokens -----------------------------------------------------------
export type { MotionPreset } from "../tokens/motion";
export {
  MOTION_PRESETS,
  SPRING_SNAPPY,
  SPRING_GENTLE,
  EASE_OUT,
} from "../tokens/motion";

// --- W-E primitives (Details/Summary/HorizontalRule/Anchor) ------------------
export { Details, Summary } from "./components/Details";
export type { DetailsProps, SummaryProps } from "./components/Details";
export { HorizontalRule } from "./components/HorizontalRule";
export type { HorizontalRuleProps } from "./components/HorizontalRule";
export { Anchor } from "./components/Anchor";
export type { AnchorProps, AnchorTone, AnchorUnderline } from "./components/Anchor";
