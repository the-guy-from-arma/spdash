CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'friends', 'private')),
  mode TEXT NOT NULL DEFAULT 'pvp'
    CHECK (mode IN ('pvp', 'coop')),
  transport TEXT NOT NULL DEFAULT 'LiteNetLib'
    CHECK (transport IN ('LiteNetLib', 'Steam')),
  public_ip TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  plugin_version TEXT NOT NULL DEFAULT 'unknown',
  game_version TEXT NOT NULL DEFAULT 'unknown',
  scenario_name TEXT,
  scenario_hash TEXT,
  required_mods JSONB NOT NULL DEFAULT '[]'::jsonb,
  region TEXT,
  player_count INTEGER NOT NULL DEFAULT 1 CHECK (player_count >= 0),
  max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players >= 1),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'blocked')),
  owner_note TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servers_public_recent
  ON servers (visibility, status, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_servers_last_seen
  ON servers (last_seen DESC);

CREATE TABLE IF NOT EXISTS community_users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  global_name TEXT,
  avatar_url TEXT,
  raw_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT REFERENCES community_users(discord_id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'answered', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_questions_recent
  ON community_questions (created_at DESC);

CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL REFERENCES community_users(discord_id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT current_date,
  mood TEXT NOT NULL DEFAULT 'on_station',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discord_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_recent
  ON daily_checkins (checkin_date DESC, created_at DESC);
