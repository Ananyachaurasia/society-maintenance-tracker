-- Society Maintenance Tracker — PostgreSQL schema

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('resident', 'admin')) DEFAULT 'resident',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  photo_url VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved')) DEFAULT 'Open',
  priority VARCHAR(10) CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Every status change (including creation) gets a row here.
-- This is the audit trail the evaluation asks for.
CREATE TABLE complaint_history (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  posted_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_resident ON complaints(resident_id);
CREATE INDEX idx_history_complaint ON complaint_history(complaint_id);
