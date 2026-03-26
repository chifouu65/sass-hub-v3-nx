export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  rotatedFromId?: string | null;
  revokedAt?: Date | null;
  reuseDetected?: boolean;
}

export interface TokenStore {
  save(record: RefreshTokenRecord): Promise<void>;
  findById(id: string): Promise<RefreshTokenRecord | null>;
  findValidByUser(userId: string): Promise<RefreshTokenRecord[]>;
  rotate(current: RefreshTokenRecord, next: RefreshTokenRecord): Promise<void>;
  revoke(id: string, opts?: { reuse?: boolean }): Promise<void>;
}

