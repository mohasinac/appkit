import { runSearchIndexBuild } from "../core/searchIndexBuild";
import type { ScheduleHandler } from "../runtime/types";

export const searchIndexBuildHandler: ScheduleHandler = runSearchIndexBuild;
