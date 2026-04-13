import type { IRepository } from "../../../contracts";
import type { LoyaltyBalance, CoinHistoryEntry } from "../types";

export class LoyaltyRepository {
  constructor(private readonly repo: IRepository<LoyaltyBalance>) {}

  async getBalance(uid: string): Promise<LoyaltyBalance | null> {
    return this.repo.findById(uid);
  }

  async addCoins(
    uid: string,
    delta: number,
    entry: Omit<CoinHistoryEntry, "timestamp">,
  ): Promise<void> {
    const user = await this.repo.findById(uid);
    if (!user) return;

    const current = user.hcCoins ?? 0;
    const history = user.coinHistory ?? [];
    await this.repo.update(uid, {
      hcCoins: current + delta,
      coinHistory: [
        ...history,
        { ...entry, delta, timestamp: new Date().toISOString() },
      ],
    });
  }
}
