"use client";

// ─── Semantic HTML wrappers ───────────────────────────────────────────────────
export type {
  SectionProps,
  ArticleProps,
  MainProps,
  AsideProps,
  NavProps,
  BlockHeaderProps,
  BlockFooterProps,
  HeaderProps,
  FooterProps,
  UlProps,
  OlProps,
  LiProps,
} from "./components/Semantic";
export {
  Section,
  Article,
  Main,
  Aside,
  Nav,
  BlockHeader,
  BlockFooter,
  Header,
  Footer,
  Ul,
  Ol,
  Li,
} from "./components/Semantic";

export type { DivProps } from "./components/Div";
export { Div } from "./components/Div";

// ─── Typography primitives ────────────────────────────────────────────────────
export { Heading, Text, Label, Caption, Span } from "./components/Typography";

// ─── Loading / Feedback ───────────────────────────────────────────────────────
export type { SpinnerProps } from "./components/Spinner";
export { Spinner } from "./components/Spinner";

export type { SkeletonProps } from "./components/Skeleton";
export { Skeleton } from "./components/Skeleton";

// ─── Interactive ──────────────────────────────────────────────────────────────
export type { ButtonProps } from "./components/Button";
export { Button } from "./components/Button";

export type { IconButtonProps } from "./components/IconButton";
export { IconButton } from "./components/IconButton";

export type { TextLinkProps } from "./components/TextLink";
export { TextLink } from "./components/TextLink";

export type { TooltipProps } from "./components/Tooltip";
export { Tooltip } from "./components/Tooltip";

export type { AccordionProps } from "./components/Accordion";
export { Accordion } from "./components/Accordion";

export type { FormProps } from "./components/Form";
export { Form } from "./components/Form";

export type { BadgeProps, BadgeVariant } from "./components/Badge";
export { Badge } from "./components/Badge";

// ─── Feedback ─────────────────────────────────────────────────────────────────
export type { AlertProps } from "./components/Alert";
export { Alert } from "./components/Alert";

// ─── Layout helpers ───────────────────────────────────────────────────────────
export type { DividerProps } from "./components/Divider";
export { Divider } from "./components/Divider";

// ─── Progress ─────────────────────────────────────────────────────────────────
export type {
  ProgressProps,
  IndeterminateProgressProps,
} from "./components/Progress";
export { Progress, IndeterminateProgress } from "./components/Progress";

// ─── S1-1: New Primitives ─────────────────────────────────────────────────────

export type { PaginationProps } from "./components/Pagination";
export { Pagination } from "./components/Pagination";

export type {
  StatusBadgeProps,
  StatusBadgeStatus,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
  TicketStatus,
  GenericStatus,
} from "./components/StatusBadge";
export { StatusBadge } from "./components/StatusBadge";

export type { ModalProps } from "./components/Modal";
export { Modal } from "./components/Modal";

export type { DrawerProps } from "./components/Drawer";
export { Drawer } from "./components/Drawer";

export type { SelectProps, SelectOption } from "./components/Select";
export { Select } from "./components/Select";

export type { InputProps } from "./components/Input";
export { Input } from "./components/Input";

export type { TextareaProps } from "./components/Textarea";
export { Textarea } from "./components/Textarea";

export type { SliderProps } from "./components/Slider";
export { Slider } from "./components/Slider";

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
export { FormGrid, FormField } from "./components/FormGrid";

export type { DescriptionFieldProps } from "./components/DescriptionField";
export { DescriptionField } from "./components/DescriptionField";

export type {
  ActiveFilter,
  ActiveFilterChipsProps,
} from "./components/ActiveFilterChips";
export { ActiveFilterChips } from "./components/ActiveFilterChips";

export type { SortOption, SortDropdownProps } from "./components/SortDropdown";
export { SortDropdown } from "./components/SortDropdown";

export type {
  TablePaginationProps,
  TablePaginationLabels,
} from "./components/TablePagination";
export { TablePagination } from "./components/TablePagination";

// ─── S1-2: DataTable ──────────────────────────────────────────────────────────
export type { DataTableProps, DataTableColumn } from "./DataTable";
export { DataTable } from "./DataTable";

// ─── Table / Pagination / Sticky config (re-exported from @mohasinac/contracts) ──
export type {
  TableConfig,
  TableViewMode,
  PaginationConfig,
  StickyConfig,
} from "@mohasinac/contracts";
export {
  DEFAULT_TABLE_CONFIG,
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_STICKY_CONFIG,
  mergeTableConfig,
} from "@mohasinac/contracts";

// ─── Layout Primitives ────────────────────────────────────────────────────────
export type {
  GapKey,
  ContainerSize,
  GridCols,
  ContainerProps,
  StackProps,
  RowProps,
  GridProps,
} from "./components/Layout";
export { Container, Stack, Row, Grid, GRID_MAP } from "./components/Layout";

// ─── UI Helpers ───────────────────────────────────────────────────────────────
export { easings } from "./animation.helper";
export { hexToRgb, rgbToHex, getContrastColor } from "./color.helper";
export { classNames, mergeTailwindClasses } from "./style.helper";

// ─── SideModal ────────────────────────────────────────────────────────────────
export type { SideModalProps } from "./components/SideModal";
export { SideModal } from "./components/SideModal";

// ─── RichText ─────────────────────────────────────────────────────────────────
export type { RichTextProps } from "./rich-text/RichText";
export { RichText } from "./rich-text/RichText";

// ─── ListingLayout + BulkActionBar ────────────────────────────────────────────
export type {
  ListingLayoutProps,
  ListingLayoutLabels,
} from "./components/ListingLayout";
export { ListingLayout } from "./components/ListingLayout";

export type {
  BulkActionBarProps,
  BulkActionBarLabels,
  BulkActionItem,
} from "./components/BulkActionBar";
export { BulkActionBar } from "./components/BulkActionBar";
