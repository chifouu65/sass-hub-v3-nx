import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RefreshTokenRecord } from '../auth/token-store';

// ── Types PostgREST ───────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  provider: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DbPasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface DbRefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  rotated_from_id: string | null;
  revoked_at: string | null;
  reuse_detected: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly baseUrl: string;
  private readonly key: string;

  constructor() {
    this.baseUrl =
      (process.env.SUPABASE_URL ?? 'https://ovofzfaqarofafckxykg.supabase.co') + '/rest/v1';
    // Utilise SUPABASE_SERVICE_KEY en prod (bypass RLS), SUPABASE_ANON_KEY en dev (RLS désactivé)
    this.key =
      process.env.SUPABASE_SERVICE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b2Z6ZmFxYXJvZmFmY2t4eWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjI2ODcsImV4cCI6MjA5MDA5ODY4N30.aG1_wkz7Hy4tqNWwv5ap9dGOyw6ccoq8pNpOrAfc-8E';
  }

  async onModuleInit() {
    // Ping de santé pour vérifier la connexion
    try {
      await this.get<DbUser[]>('users?select=id&limit=1');
      this.logger.log('Supabase connecté ✓');
    } catch (e) {
      this.logger.error('Supabase connexion échouée', e);
    }
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      ...extra,
    };
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      headers: this.headers({ Accept: 'application/json' }),
    });
    if (!res.ok) throw new Error(`Supabase GET /${path} → ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown, prefer = ''): Promise<T> {
    const headers = this.headers({ Prefer: prefer || 'return=representation' });
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase POST /${path} → ${res.status}: ${await res.text()}`);
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ([] as unknown as T);
  }

  private async patch(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase PATCH /${path} → ${res.status}: ${await res.text()}`);
  }

  private async del(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${path}`, {
      method: 'DELETE',
      headers: this.headers({ Prefer: 'return=minimal' }),
    });
    if (!res.ok) throw new Error(`Supabase DELETE /${path} → ${res.status}: ${await res.text()}`);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async findUserByEmail(email: string): Promise<DbUser | null> {
    const rows = await this.get<DbUser[]>(`users?email=eq.${encodeURIComponent(email)}&select=*`);
    return rows[0] ?? null;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const rows = await this.get<DbUser[]>(`users?id=eq.${id}&select=*`);
    return rows[0] ?? null;
  }

  async createUser(email: string, passwordHash: string, role = 'customer'): Promise<DbUser> {
    const rows = await this.post<DbUser[]>(
      'users',
      { email, password_hash: passwordHash, provider: 'email', role },
      'return=representation',
    );
    const user = Array.isArray(rows) ? rows[0] : (rows as unknown as DbUser);
    if (!user) throw new Error('User creation failed');
    return user;
  }

  async createGoogleUser(email: string): Promise<DbUser> {
    const rows = await this.post<DbUser[]>(
      'users',
      { email, provider: 'google' },
      'return=representation',
    );
    const user = Array.isArray(rows) ? rows[0] : (rows as unknown as DbUser);
    if (!user) throw new Error('Google user creation failed');
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.patch(`users?id=eq.${userId}`, {
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Password reset tokens ─────────────────────────────────────────────────

  async savePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.post(
      'password_reset_tokens',
      { user_id: userId, token_hash: tokenHash, expires_at: expiresAt.toISOString() },
      'return=minimal',
    );
  }

  async findPasswordResetTokenByHash(tokenHash: string): Promise<DbPasswordResetToken | null> {
    const rows = await this.get<DbPasswordResetToken[]>(
      `password_reset_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&select=*`,
    );
    return rows[0] ?? null;
  }

  async markResetTokenUsed(id: string): Promise<void> {
    await this.patch(`password_reset_tokens?id=eq.${id}`, {
      used_at: new Date().toISOString(),
    });
  }

  // ── Refresh tokens ────────────────────────────────────────────────────────

  private toDb(r: RefreshTokenRecord): DbRefreshToken {
    return {
      id: r.id,
      user_id: r.userId,
      token_hash: r.tokenHash,
      expires_at: r.expiresAt.toISOString(),
      created_at: r.createdAt.toISOString(),
      rotated_from_id: r.rotatedFromId ?? null,
      revoked_at: r.revokedAt ? r.revokedAt.toISOString() : null,
      reuse_detected: r.reuseDetected ?? false,
    };
  }

  private fromDb(r: DbRefreshToken): RefreshTokenRecord {
    return {
      id: r.id,
      userId: r.user_id,
      tokenHash: r.token_hash,
      expiresAt: new Date(r.expires_at),
      createdAt: new Date(r.created_at),
      rotatedFromId: r.rotated_from_id ?? null,
      revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
      reuseDetected: r.reuse_detected,
    };
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    await this.post('refresh_tokens', this.toDb(record), 'resolution=merge-duplicates');
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenRecord | null> {
    const rows = await this.get<DbRefreshToken[]>(`refresh_tokens?id=eq.${id}&select=*`);
    return rows[0] ? this.fromDb(rows[0]) : null;
  }

  async findValidRefreshTokensByUser(userId: string): Promise<RefreshTokenRecord[]> {
    const rows = await this.get<DbRefreshToken[]>(
      `refresh_tokens?user_id=eq.${userId}&revoked_at=is.null&select=*`,
    );
    return rows.map(r => this.fromDb(r));
  }

  async revokeRefreshToken(id: string, reuseDetected = false): Promise<void> {
    await this.patch(`refresh_tokens?id=eq.${id}`, {
      revoked_at: new Date().toISOString(),
      reuse_detected: reuseDetected,
    });
  }

  async rotateRefreshTokens(
    current: RefreshTokenRecord,
    next: RefreshTokenRecord,
  ): Promise<void> {
    // Deux opérations séquentielles — acceptable en dev ; utiliser une fonction RPC en prod
    await this.revokeRefreshToken(current.id, next.reuseDetected ?? false);
    await this.saveRefreshToken(next);
  }

  // ── User app subscriptions ────────────────────────────────────────────────

  async getSubscribedAppIds(userId: string): Promise<string[]> {
    const rows = await this.get<{ app_id: string }[]>(
      `user_app_subscriptions?user_id=eq.${userId}&select=app_id`,
    );
    return rows.map(r => r.app_id);
  }

  async addAppSubscription(userId: string, appId: string): Promise<void> {
    await this.post(
      'user_app_subscriptions',
      { user_id: userId, app_id: appId },
      'resolution=merge-duplicates',
    );
  }

  async removeAppSubscription(userId: string, appId: string): Promise<void> {
    await this.del(
      `user_app_subscriptions?user_id=eq.${userId}&app_id=eq.${appId}`,
    );
  }

  // ── Stripe customers ──────────────────────────────────────────────────────

  async getStripeCustomerId(userId: string): Promise<string | null> {
    const rows = await this.get<{ stripe_customer_id: string }[]>(
      `stripe_customers?user_id=eq.${userId}&select=stripe_customer_id`,
    );
    return rows[0]?.stripe_customer_id ?? null;
  }

  async saveStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
    await this.post(
      'stripe_customers',
      { user_id: userId, stripe_customer_id: stripeCustomerId },
      'resolution=merge-duplicates',
    );
  }

  /**
   * Appelé lors de customer.subscription.deleted Stripe webhook.
   * Marque l'abonnement Stripe comme révoqué en effaçant le customer_id mappé
   * afin que les appels suivants à getOrCreateCustomer recréent un client propre.
   */
  async revokeSubscriptionByStripeCustomer(stripeCustomerId: string): Promise<void> {
    await this.del(`stripe_customers?stripe_customer_id=eq.${encodeURIComponent(stripeCustomerId)}`);
  }
}
