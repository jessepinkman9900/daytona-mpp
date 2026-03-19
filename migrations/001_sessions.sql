-- Session tracking for sandbox billing
CREATE TABLE IF NOT EXISTS sessions (
  id                   TEXT PRIMARY KEY,   -- crypto.randomUUID
  sandbox_id           TEXT UNIQUE,        -- Daytona sandbox ID
  cpu                  REAL NOT NULL,
  mem_gib              REAL NOT NULL,
  disk_gib             REAL NOT NULL,
  max_runtime_secs     INTEGER NOT NULL,
  preauth_amount       TEXT NOT NULL,      -- pre-charged amount (includes surcharge)
  actual_amount        TEXT,               -- filled on sandbox.stopped
  started_at           INTEGER NOT NULL,   -- epoch ms
  kill_at              INTEGER NOT NULL,   -- epoch ms: started_at + max_runtime_secs * 1000
  stopped_at           INTEGER,            -- epoch ms
  stop_reason          TEXT                -- 'budget' | 'client'
);

CREATE INDEX IF NOT EXISTS idx_sessions_sandbox_id ON sessions(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_sessions_running    ON sessions(stopped_at) WHERE stopped_at IS NULL;
