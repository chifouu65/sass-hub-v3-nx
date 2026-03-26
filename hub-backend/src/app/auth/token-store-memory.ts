import { RefreshTokenRecord, TokenStore } from './token-store';

export class InMemoryTokenStore implements TokenStore {
  private store = new Map<string, RefreshTokenRecord>();

  async save(record: RefreshTokenRecord): Promise<void> {
    this.store.set(record.id, record);
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    return this.store.get(id) ?? null;
  }

  async findValidByUser(userId: string): Promise<RefreshTokenRecord[]> {
    return [...this.store.values()].filter((r) => r.userId === userId && !r.revokedAt);
  }

  async rotate(current: RefreshTokenRecord, next: RefreshTokenRecord): Promise<void> {
    this.store.set(current.id, { ...current, revokedAt: new Date(), reuseDetected: next.reuseDetected });
    this.store.set(next.id, next);
  }

  async revoke(id: string, opts?: { reuse?: boolean }): Promise<void> {
    const curr = this.store.get(id);
    if (!curr) return;
    this.store.set(id, { ...curr, revokedAt: new Date(), reuseDetected: opts?.reuse });
  }
}
