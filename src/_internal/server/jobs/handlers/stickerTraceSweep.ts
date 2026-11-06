import type { ScheduleHandler } from "../runtime/types";
import { runStickerTraceSweep } from "../core/stickerTraceSweep";

export const stickerTraceSweepHandler: ScheduleHandler = runStickerTraceSweep;
