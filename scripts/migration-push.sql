-- Tabla para guardar suscripciones de push por browser
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        SERIAL PRIMARY KEY,
  endpoint  TEXT UNIQUE NOT NULL,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon select" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "anon delete" ON push_subscriptions FOR DELETE USING (true);
