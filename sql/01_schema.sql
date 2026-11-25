-- NLM Dashboard schema. Run once against db `n8n`.
-- docker compose exec -T postgres psql -U n8n -d n8n < sql/01_schema.sql

-- Extra ticket columns the dashboard needs
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sub_category  TEXT;       -- ticket TYPE (End User Computer, Network, Broadcast, Outage...)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_time   TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date      TIMESTAMP;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS modified_time TIMESTAMP;  -- for "no update in 2+ weeks"
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignee_id   TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets (category);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_closed   ON tickets (closed_time);

-- Zoho time entries, feeds the "time worked this week" tile.
-- Filled by a separate sync (not built yet); the tile shows 0 until then.
CREATE TABLE IF NOT EXISTS ticket_time_entries (
  entry_id   TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL,
  agent      TEXT,
  hours      NUMERIC(8,2) NOT NULL,
  entry_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_time_entry_date ON ticket_time_entries (entry_date);

-- Dashboard logins. category = Zoho "Category" (market/station); sub_category = ticket type.
CREATE TABLE IF NOT EXISTS dashboard_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL CHECK (username = lower(username)),
  password_hash TEXT NOT NULL,                 -- bcrypt, created by web/scripts/create-user.mjs
  label         TEXT NOT NULL,                 -- shown in header, e.g. 'Fresno'
  categories    TEXT[] NOT NULL DEFAULT '{}',  -- markets this login may see
  is_master     BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_login_attempts (
  id       BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  success  BOOLEAN NOT NULL,
  at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON dashboard_login_attempts (username, at);

-- Disable a login:  UPDATE dashboard_users SET active=false WHERE username='fresno';
-- (takes effect on the next request; sessions are re-checked against this table)
