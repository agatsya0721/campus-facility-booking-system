CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active_updated
  ON announcements(is_active, updated_at DESC);

INSERT INTO announcements (title, message, is_active)
VALUES (
  'Campus Events',
  'Welcome to CampusBook. Check here for admin-posted college events and important booking updates.',
  TRUE
)
ON CONFLICT DO NOTHING;
