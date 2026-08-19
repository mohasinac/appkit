import { testerChecklistItemRepository } from "../repository/tester-checklist-item.repository";
import type { BugHunterLeaderboardEntry } from "../schemas/firestore";

/** Ranks testers by confirmed-bug count. Mirrors getEventLeaderboard()'s shape. */
export async function getBugHunterLeaderboard(limit = 50): Promise<BugHunterLeaderboardEntry[]> {
  return testerChecklistItemRepository.getBugHunterLeaderboard(limit);
}
