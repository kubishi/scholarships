DROP TABLE IF EXISTS scholarships;

CREATE TABLE scholarships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  deadline TEXT,
  amount TEXT,
  description TEXT,
  apply_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
