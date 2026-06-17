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
  morale_score INTEGER CHECK (morale_score IS NULL OR (morale_score >= 1 AND morale_score <= 5)),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discord_id, checkin_date)
);

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS morale_score INTEGER CHECK (morale_score IS NULL OR (morale_score >= 1 AND morale_score <= 5));

CREATE INDEX IF NOT EXISTS idx_daily_checkins_recent
  ON daily_checkins (checkin_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'update',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_live
  ON community_posts (status, posted_at DESC);

INSERT INTO community_posts (slug, category, title, body, status, posted_at)
VALUES
  ('welcome-aboard', 'command post', 'Welcome aboard TBMS', 'The Community Net is live. Discord sign-in now opens a personal station with questions, check-ins, events, and studio postings.', 'published', now()),
  ('naval-theater-scope', 'development', 'Theater scope is being locked', 'Current focus is ship roles, aircraft tasking, sea-lane purpose, and a clean first public release path.', 'published', now() - interval '1 day'),
  ('closed-test-prep', 'testing', 'Closed test prep', 'Early test windows will prioritize stability, readable naval objectives, and the first pass of player feedback.', 'published', now() - interval '2 days')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS community_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'operation',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'complete', 'cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_events_status
  ON community_events (status, starts_at NULLS LAST);

INSERT INTO community_events (slug, title, event_type, body, status, starts_at, link_url)
VALUES
  ('discord-muster', 'Discord Muster', 'community', 'Drop into the Discord, claim your station, and watch for the first tester role calls.', 'scheduled', now() + interval '7 days', 'https://discord.gg/QsGMQh5hwz'),
  ('systems-briefing', 'Systems Briefing', 'briefing', 'Short public brief covering ship pipeline, aviation goals, HOCAS profile expectations, and test priorities.', 'scheduled', now() + interval '14 days', 'https://discord.gg/QsGMQh5hwz'),
  ('closed-ops-window', 'Closed Ops Window', 'test', 'First closed operations window for invited community members once the vertical slice is ready.', 'scheduled', now() + interval '30 days', 'https://discord.gg/QsGMQh5hwz')
ON CONFLICT (slug) DO NOTHING;
