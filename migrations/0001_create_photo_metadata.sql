CREATE TABLE IF NOT EXISTS photo_metadata (
  id TEXT PRIMARY KEY,
  image TEXT NOT NULL,
  date TEXT NOT NULL,
  people INTEGER,
  jinies INTEGER,
  updated_at TEXT NOT NULL
);
