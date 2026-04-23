// Public API for @mohasinac/feat-filters

export { FilterFacetSection } from "./FilterFacetSection";
export type {
  FilterFacetSectionProps,
  FacetOption,
} from "./FilterFacetSection";

export { RangeFilter } from "./RangeFilter";
export type { RangeFilterProps } from "./RangeFilter";

export { SwitchFilter } from "./SwitchFilter";
export type { SwitchFilterProps } from "./SwitchFilter";

export { FilterPanel } from "./FilterPanel";
export type {
  FilterPanelProps,
  FilterConfig,
  UrlTable,
  FacetSingleConfig,
  FacetMultiConfig,
  SwitchConfig,
  RangeNumberConfig,
  RangeDateConfig,
} from "./FilterPanel";

export { getFilterLabel, getFilterValue, cn } from "./filterUtils";
export type { FilterOption } from "./filterUtils";

export { usePendingFilters } from "./usePendingFilters";
export type {
  UsePendingFiltersOptions,
  UsePendingFiltersResult,
} from "./usePendingFilters";

export {
  parseRouteFilterSegments,
  serializeRouteFilterSegments,
  buildFilterUrl,
  extractFilterStateFromParams,
  mergeFilterUpdate,
} from "./routeFilterState";
export type { RouteFilterState } from "./routeFilterState";
