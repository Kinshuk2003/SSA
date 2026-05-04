CREATE TABLE IF NOT EXISTS sync_jobs (
  id               SERIAL        PRIMARY KEY,
  scheduled_at     TIMESTAMPTZ   NOT NULL UNIQUE,
  started_at       TIMESTAMPTZ   NOT NULL,
  completed_at     TIMESTAMPTZ,
  status           VARCHAR       NOT NULL
    CONSTRAINT chk_sync_jobs_status
    CHECK (status IN ('running', 'completed', 'failed')),
  records_upserted INTEGER,
  records_skipped  INTEGER,
  records_failed   INTEGER,
  error_message    TEXT
);


CREATE INDEX IF NOT EXISTS idx_sync_jobs_status
  ON sync_jobs (status);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_scheduled
  ON sync_jobs (scheduled_at DESC);
