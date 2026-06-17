CREATE TABLE IF NOT EXISTS push_log (
  alert_id  TEXT NOT NULL,
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (alert_id, sent_date)
);
ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all" ON push_log USING (true) WITH CHECK (true);
