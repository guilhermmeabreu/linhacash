CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
