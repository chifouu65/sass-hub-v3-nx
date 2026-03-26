import { createClient, RedisClientType } from 'redis';
import { RefreshTokenRecord, TokenStore } from './token-store';

const REDIS_PREFIX = 'oauth:refresh:';

export class RedisTokenStore implements TokenStore {
  private client: RedisClientType;
  private connectPromise: Promise<unknown> | null = null;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  private async ensureConnected() {
    if (this.client.isOpen) return;
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().catch((err) => {
        this.connectPromise = null;
        throw err;
      });
    }
    await this.connectPromise;
  }

  private key(id: string) {
    return `${REDIS_PREFIX}${id}`;
  }

  private serialize(record: RefreshTokenRecord): string {
    return JSON.stringify({
      ...record,
      createdAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
    });
  }

  private deserialize(raw: string): RefreshTokenRecord {
    const parsed = JSON.parse(raw) as RefreshTokenRecord & {
      createdAt: string;
      expiresAt: string;
      revokedAt?: string | null;
    };
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt),
      revokedAt: parsed.revokedAt ? new Date(parsed.revokedAt) : null,
    };
  }

  async save(record: RefreshTokenRecord): Promise<void> {
    await this.ensureConnected();
    await this.client.set(this.key(record.id), this.serialize(record));
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    await this.ensureConnected();
    const raw = await this.client.get(this.key(id));
    return raw ? this.deserialize(raw) : null;
  }

  async findValidByUser(userId: string): Promise<RefreshTokenRecord[]> {
    await this.ensureConnected();
    const keys = await this.client.keys(`${REDIS_PREFIX}*`);
    if (!keys.length) return [];
    const values = await this.client.mGet(keys);
    return values
      .filter((raw): raw is string => Boolean(raw))
      .map((raw) => this.deserialize(raw))
      .filter((r) => r.userId === userId && !r.revokedAt);
  }

  async rotate(current: RefreshTokenRecord, next: RefreshTokenRecord): Promise<void> {
    await this.save({ ...current, revokedAt: new Date(), reuseDetected: next.reuseDetected });
    await this.save(next);
  }

  async revoke(id: string, opts?: { reuse?: boolean }): Promise<void> {
    const rec = await this.findById(id);
    if (!rec) return;
    await this.save({ ...rec, revokedAt: new Date(), reuseDetected: opts?.reuse });
  }
}
