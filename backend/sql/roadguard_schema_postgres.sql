-- RoadGuard database schema (PostgreSQL)
-- Generated from current backend routes and frontend data model.

BEGIN;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========
-- USERS
-- ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'citizen'
    CHECK (role IN ('citizen', 'admin')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==========
-- REPORTS
-- ==========
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  issue_type VARCHAR(40) NOT NULL
    CHECK (issue_type IN (
      'Pothole',
      'Broken Street Light',
      'Cracked Road',
      'Faded Road Markings',
      'Broken Traffic Light',
      'Damaged Pavement/Sidewalk',
      'Blocked Storm Drain',
      'Water Leak on Road',
      'Sinkhole',
      'Loose Gravel',
      'Fallen Road Sign',
      'Damaged Guardrail',
      'Uneven Road Surface',
      'Flooded Road',
      'Illegal Dumping',
      'Overgrown Bushes',
      'Missing Manhole Cover',
      'Broken Speed Hump',
      'Oil Spill',
      'Exposed Electrical Cables',
      'Other'
    )),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_issue_type ON reports(issue_type);
CREATE INDEX IF NOT EXISTS idx_reports_reported_at ON reports(reported_at DESC);

-- ======================
-- REPORT STATUS HISTORY
-- ======================
CREATE TABLE IF NOT EXISTS report_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')),
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_name VARCHAR(120),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_status_history_report_id
  ON report_status_history(report_id);
CREATE INDEX IF NOT EXISTS idx_report_status_history_changed_at
  ON report_status_history(changed_at DESC);

-- ==========
-- COMMENTS
-- ==========
CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(120) NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report_id
  ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_created_at
  ON report_comments(created_at DESC);

-- ==========
-- OPTIONAL SEED ADMIN (change password hash before production)
-- ==========
-- Example bcrypt hash placeholder below must be replaced with a real hash.
-- INSERT INTO users (name, email, role, password_hash)
-- VALUES ('Council Staff', 'staff@roadguard.gov.za', 'admin', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH')
-- ON CONFLICT (email) DO NOTHING;

COMMIT;
