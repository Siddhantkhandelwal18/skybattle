// SKYBATTLE — Database Migration Script
// Creates all tables defined in 07_Database_Design.md
// Run: node migrate.js

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://skybattle:localpass@localhost:5432/skybattle_dev'
});

const migrations = [
  // Enable UUID extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // USERS table
  `CREATE TABLE IF NOT EXISTS users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name    VARCHAR(32) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    avatar_url      TEXT,
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    ban_reason      TEXT,
    ban_expires_at  TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP,
    region          VARCHAR(32) NOT NULL DEFAULT 'ap-south-1',
    fcm_token       TEXT,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    is_guest        BOOLEAN NOT NULL DEFAULT FALSE
  )`,

  // PLAYER_STATS table
  `CREATE TABLE IF NOT EXISTS player_stats (
    user_id                  UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    elo_rating               INTEGER NOT NULL DEFAULT 1000,
    rank_tier                VARCHAR(20) NOT NULL DEFAULT 'Recruit',
    total_matches            INTEGER NOT NULL DEFAULT 0,
    total_wins               INTEGER NOT NULL DEFAULT 0,
    total_kills              INTEGER NOT NULL DEFAULT 0,
    total_deaths             INTEGER NOT NULL DEFAULT 0,
    total_playtime_seconds   BIGINT NOT NULL DEFAULT 0,
    highest_kills_in_match   INTEGER NOT NULL DEFAULT 0,
    current_win_streak       INTEGER NOT NULL DEFAULT 0,
    coins                    INTEGER NOT NULL DEFAULT 0,
    xp                       INTEGER NOT NULL DEFAULT 0,
    level                    INTEGER NOT NULL DEFAULT 1,
    season_id                INTEGER
  )`,

  // MATCHES table
  `CREATE TABLE IF NOT EXISTS matches (
    match_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_mode         VARCHAR(20) NOT NULL,
    map_id            VARCHAR(50) NOT NULL,
    server_region     VARCHAR(32) NOT NULL DEFAULT 'ap-south-1',
    started_at        TIMESTAMP NOT NULL,
    ended_at          TIMESTAMP,
    duration_seconds  INTEGER,
    winner_user_id    UUID REFERENCES users(user_id),
    winner_team       VARCHAR(10),
    player_count      INTEGER NOT NULL,
    match_data_url    TEXT
  )`,

  // MATCH_PLAYERS table
  `CREATE TABLE IF NOT EXISTS match_players (
    id                BIGSERIAL PRIMARY KEY,
    match_id          UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(user_id),
    team              VARCHAR(10),
    kills             INTEGER NOT NULL DEFAULT 0,
    deaths            INTEGER NOT NULL DEFAULT 0,
    assists           INTEGER NOT NULL DEFAULT 0,
    damage_dealt      INTEGER NOT NULL DEFAULT 0,
    damage_received   INTEGER NOT NULL DEFAULT 0,
    accuracy_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
    playtime_seconds  INTEGER NOT NULL DEFAULT 0,
    xp_earned         INTEGER NOT NULL DEFAULT 0,
    coins_earned      INTEGER NOT NULL DEFAULT 0,
    elo_change        INTEGER NOT NULL DEFAULT 0,
    finished          BOOLEAN NOT NULL DEFAULT TRUE
  )`,

  // MATCH_EVENTS table
  `CREATE TABLE IF NOT EXISTS match_events (
    id                BIGSERIAL PRIMARY KEY,
    match_id          UUID NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    event_type        VARCHAR(30) NOT NULL,
    actor_user_id     UUID REFERENCES users(user_id),
    target_user_id    UUID REFERENCES users(user_id),
    weapon_id         INTEGER,
    position_x        NUMERIC,
    position_y        NUMERIC,
    occurred_at_tick  INTEGER,
    occurred_at       TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // ITEMS_CATALOG table
  `CREATE TABLE IF NOT EXISTS items_catalog (
    item_id              SERIAL PRIMARY KEY,
    item_type            VARCHAR(20) NOT NULL,
    item_name            VARCHAR(100) NOT NULL,
    description          TEXT,
    rarity               VARCHAR(20) NOT NULL DEFAULT 'COMMON',
    coin_price           INTEGER NOT NULL DEFAULT 0,
    is_battle_pass_item  BOOLEAN NOT NULL DEFAULT FALSE,
    image_url            TEXT,
    weapon_type          VARCHAR(20)
  )`,

  // INVENTORY table
  `CREATE TABLE IF NOT EXISTS inventory (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_type            VARCHAR(20) NOT NULL,
    item_id              INTEGER NOT NULL REFERENCES items_catalog(item_id),
    acquired_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    acquisition_method   VARCHAR(20) NOT NULL DEFAULT 'PURCHASED',
    is_equipped          BOOLEAN NOT NULL DEFAULT FALSE
  )`,

  // TRANSACTIONS table
  `CREATE TABLE IF NOT EXISTS transactions (
    transaction_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_type  VARCHAR(30) NOT NULL,
    coins_delta       INTEGER NOT NULL,
    coins_before      INTEGER NOT NULL,
    coins_after       INTEGER NOT NULL,
    item_id           INTEGER REFERENCES items_catalog(item_id),
    description       TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // BATTLE_PASS table
  `CREATE TABLE IF NOT EXISTS battle_pass (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    season_id            INTEGER NOT NULL,
    is_premium           BOOLEAN NOT NULL DEFAULT FALSE,
    current_tier         INTEGER NOT NULL DEFAULT 0,
    xp_in_current_tier   INTEGER NOT NULL DEFAULT 0,
    purchased_at         TIMESTAMP
  )`,

  // REPORTS table
  `CREATE TABLE IF NOT EXISTS reports (
    id                  BIGSERIAL PRIMARY KEY,
    reporter_user_id    UUID NOT NULL REFERENCES users(user_id),
    reported_user_id    UUID NOT NULL REFERENCES users(user_id),
    match_id            UUID REFERENCES matches(match_id),
    category            VARCHAR(30) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // MODERATION_ACTIONS table
  `CREATE TABLE IF NOT EXISTS moderation_actions (
    id              BIGSERIAL PRIMARY KEY,
    admin_id        UUID,
    action_type     VARCHAR(30) NOT NULL,
    target_user_id  UUID NOT NULL REFERENCES users(user_id),
    reason          TEXT,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // REFRESH_TOKENS table
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // INDEXES for performance
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
  `CREATE INDEX IF NOT EXISTS idx_player_stats_elo ON player_stats(elo_rating DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_match_players_user ON match_players(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id)`,
  `CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC)`,
];

async function migrate() {
  await client.connect();
  console.log('✅ Connected to PostgreSQL');
  
  for (const sql of migrations) {
    try {
      await client.query(sql);
      const tableName = sql.match(/CREATE (?:TABLE|INDEX|EXTENSION) IF NOT EXISTS (\S+)/)?.[1] || 'statement';
      console.log(`  ✓ ${tableName}`);
    } catch (err) {
      console.error('Migration failed:', sql.substring(0, 60));
      throw err;
    }
  }
  
  console.log('\n✅ All migrations complete!');
  await client.end();
}

migrate().catch(err => {
  console.error('❌ Migration error:', err.message);
  process.exit(1);
});
