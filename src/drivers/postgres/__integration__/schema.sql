CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  age        INTEGER,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total   NUMERIC(10,2) NOT NULL
);

CREATE TABLE model_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  signup_count  INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE model_accounts (
  id      BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES model_users(id),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes   TEXT NULL
);

CREATE TABLE model_orders (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES model_users(id) ON DELETE CASCADE,
  total   NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE model_profiles (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES model_users(id) ON DELETE CASCADE,
  bio     TEXT NULL
);

CREATE TABLE model_posts (
  id    SERIAL PRIMARY KEY,
  title TEXT NOT NULL
);

CREATE TABLE model_tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE model_post_tags (
  post_id INTEGER NOT NULL REFERENCES model_posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES model_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
