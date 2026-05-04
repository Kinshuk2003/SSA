CREATE TABLE IF NOT EXISTS satellites (
  norad_cat_id     INTEGER       PRIMARY KEY,
  object_name      VARCHAR       NOT NULL,
  object_id        VARCHAR       NOT NULL,
  object_type      VARCHAR       NOT NULL
    CONSTRAINT chk_satellites_object_type
    CHECK (object_type IN ('PAY', 'R/B', 'DEB', 'UNK')),
  ops_status       VARCHAR
    CONSTRAINT chk_satellites_ops_status
    CHECK (ops_status IS NULL OR ops_status IN ('+', '-', 'P', 'N', 'B', 'S', 'X', 'D')),
  owner            VARCHAR,
  launch_site      VARCHAR,
  launch_date      DATE,
  decay_date       DATE,
  period           NUMERIC(10,4),
  inclination      NUMERIC(8,4),
  apogee           INTEGER,
  perigee          INTEGER,
  rcs              VARCHAR,
  data_status_code VARCHAR,
  orbit_center     VARCHAR,
  orbit_type       VARCHAR
    CONSTRAINT chk_satellites_orbit_type
    CHECK (orbit_type IS NULL OR orbit_type IN ('ORB', 'IMP', 'LAN', 'DOC')),
  content_hash     TEXT          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_sat_object_name_trgm
  ON satellites USING GIN (object_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sat_orbit_type  ON satellites (orbit_type);
CREATE INDEX IF NOT EXISTS idx_sat_object_type ON satellites (object_type);
CREATE INDEX IF NOT EXISTS idx_sat_ops_status  ON satellites (ops_status);
CREATE INDEX IF NOT EXISTS idx_sat_owner       ON satellites (owner);

CREATE INDEX IF NOT EXISTS idx_sat_launch_date ON satellites (launch_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_sat_period_norad
  ON satellites (period ASC NULLS LAST, norad_cat_id ASC);

CREATE INDEX IF NOT EXISTS idx_sat_inclination_norad
  ON satellites (inclination ASC NULLS LAST, norad_cat_id ASC);

CREATE INDEX IF NOT EXISTS idx_sat_apogee_norad
  ON satellites (apogee ASC NULLS LAST, norad_cat_id ASC);

CREATE INDEX IF NOT EXISTS idx_sat_perigee_norad
  ON satellites (perigee ASC NULLS LAST, norad_cat_id ASC);

CREATE INDEX IF NOT EXISTS idx_sat_object_name_norad
  ON satellites (object_name ASC, norad_cat_id ASC);

CREATE INDEX IF NOT EXISTS idx_sat_operational
  ON satellites (norad_cat_id)
  WHERE ops_status = '+';
