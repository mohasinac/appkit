export type {
  ResolvedWidget,
  WidgetBlockReason,
  WidgetConfigProblem,
  WidgetContentTag,
  WidgetDef,
  WidgetInstance,
  WidgetRegionDef,
  WidgetResolveContext,
  WidgetTier,
  WidgetTreeResult,
} from "./types";

export { partitionRequiredRules, resolveWidgetTree } from "./resolve";
export {
  findInstanceByRef,
  findRefCollisions,
  instanceRefs,
  mergeStoredWithDefaults,
  mergedInstances,
} from "./merge";
export type { MergedWidgetInstance, WidgetInstanceOrigin } from "./merge";
export type { ReachabilityRule, RequiredRulePartition } from "./resolve";

export {
  PILOT_REGIONS,
  PILOT_WIDGET_DEFS,
  RELATED_DEFAULT_INSTANCES,
  RELATED_SOURCES,
  asRelatedScrollerConfig,
  resolveScrollerTitle,
} from "./pilot-registry";
export type { RelatedScrollerConfig, RelatedSource } from "./pilot-registry";
