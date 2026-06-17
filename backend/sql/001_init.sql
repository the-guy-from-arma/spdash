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

CREATE TABLE IF NOT EXISTS project_progress (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  launch_target_at TIMESTAMPTZ NOT NULL DEFAULT '2026-12-17T17:00:00Z',
  current_phase TEXT NOT NULL DEFAULT 'Systems Integration',
  build_label TEXT NOT NULL DEFAULT 'TBMS WIP 0.0.1',
  progress_percent INTEGER NOT NULL DEFAULT 22 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  bugs_fixed INTEGER NOT NULL DEFAULT 18 CHECK (bugs_fixed >= 0),
  bugs_remaining INTEGER NOT NULL DEFAULT 42 CHECK (bugs_remaining >= 0),
  ships_imported INTEGER NOT NULL DEFAULT 6 CHECK (ships_imported >= 0),
  ship_systems_online INTEGER NOT NULL DEFAULT 4 CHECK (ship_systems_online >= 0),
  aircraft_profiles INTEGER NOT NULL DEFAULT 3 CHECK (aircraft_profiles >= 0),
  scenarios_ready INTEGER NOT NULL DEFAULT 2 CHECK (scenarios_ready >= 0),
  test_passes INTEGER NOT NULL DEFAULT 11 CHECK (test_passes >= 0),
  blockers INTEGER NOT NULL DEFAULT 5 CHECK (blockers >= 0),
  commander_note TEXT NOT NULL DEFAULT 'Six-month production clock is active. Current work is focused on ship handling, weapons behavior, scenario structure, and clean public release pacing.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO project_progress (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
