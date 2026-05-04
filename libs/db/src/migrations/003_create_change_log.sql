CREATE TABLE IF NOT EXISTS satellite_change_log (
  id             SERIAL      PRIMARY KEY,
  norad_cat_id   INTEGER     NOT NULL
    REFERENCES satellites(norad_cat_id) ON DELETE CASCADE,
  sync_job_id    INTEGER     NOT NULL
    REFERENCES sync_jobs(id) ON DELETE CASCADE,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_fields JSONB       NOT NULL,
  old_values     JSONB       NOT NULL,
  new_values     JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chlog_norad
  ON satellite_change_log (norad_cat_id);

CREATE INDEX IF NOT EXISTS idx_chlog_changed_at
  ON satellite_change_log (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_chlog_fields
  ON satellite_change_log USING GIN (changed_fields);

CREATE INDEX IF NOT EXISTS idx_chlog_sync_job
  ON satellite_change_log (sync_job_id);
