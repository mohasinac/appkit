/**
 * grievance — server surface.
 *
 * Two actions. Narrow on purpose (Root Cause #18): the intake and the
 * write-once first-response stamp. Everything else about a grievance is an
 * ordinary support ticket and uses the support repository directly.
 */

export {
  fileGrievanceAction,
  recordGrievanceFirstResponseAction,
  type FileGrievanceInput,
} from "./actions";
