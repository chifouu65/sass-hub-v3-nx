import { RefreshTokenRecord, TokenStore } from './token-store';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * TokenStore backed by Supabase PostgreSQL.
 * Remplace InMemoryTokenStore et RedisTokenStore.
 */
export class SupabaseTokenStore implements TokenStore {
  constructor(private readonly supabase: SupabaseService) {}

  async save(record: RefreshTokenRecord): Promise<void> {
    await this.supabase.saveRefreshToken(record);
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    return this.supabase.findRefreshTokenById(id);
  }

  async findValidByUser(userId: string): Promise<RefreshTokenRecord[]> {
    return this.supabase.findValidRefreshTokensByUser(userId);
  }

  async rotate(current: RefreshTokenRecord, next: RefreshTokenRecord): Promise<void> {
    await this.supabase.rotateRefreshTokens(current, next);
  }

  async revoke(id: string, opts?: { reuse?: boolean }): Promise<void> {
    await this.supabase.revokeRefreshToken(id, opts?.reuse ?? false);
  }
}
