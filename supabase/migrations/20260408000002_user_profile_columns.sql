-- ============================================================
-- Migration : colonnes profil utilisateur (name, avatar_url, phone)
-- Date : 2026-04-08
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;
