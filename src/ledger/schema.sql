PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
PRAGMA foreign_keys = ON;
PRAGMA recursive_triggers = ON;
PRAGMA busy_timeout = 1000;

CREATE TABLE events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  schema_version INTEGER NOT NULL,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_timestamp TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  payload_hash TEXT NOT NULL,
  previous_event_hash TEXT,
  event_hash TEXT NOT NULL UNIQUE,
  capture_status TEXT NOT NULL
    CHECK(capture_status IN ('complete','partial','not_applicable'))
);

CREATE TABLE blobs (
  hash TEXT PRIMARY KEY,
  byte_length INTEGER NOT NULL CHECK(byte_length >= 0),
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE event_blobs (
  event_id TEXT NOT NULL REFERENCES events(event_id),
  blob_hash TEXT NOT NULL REFERENCES blobs(hash),
  stream_name TEXT NOT NULL,
  PRIMARY KEY(event_id, blob_hash, stream_name)
);

CREATE INDEX events_session_seq ON events(session_id, seq);
CREATE INDEX events_kind_time ON events(kind, source_timestamp);

CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;
CREATE TRIGGER event_blobs_no_update BEFORE UPDATE ON event_blobs BEGIN
  SELECT RAISE(ABORT, 'event sources are immutable');
END;
CREATE TRIGGER event_blobs_no_delete BEFORE DELETE ON event_blobs BEGIN
  SELECT RAISE(ABORT, 'event sources are immutable');
END;
