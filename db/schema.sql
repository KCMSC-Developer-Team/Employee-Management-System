-- K C Model School & College — Employee Management System
-- Idempotent: safe to run on every deploy. One statement per block, each ending with ";" at end of line.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text,
  id_no         text,
  name          text NOT NULL,
  designation   text NOT NULL DEFAULT 'Employee',
  roles         text[] NOT NULL DEFAULT '{}',
  password_hash text,
  active        boolean NOT NULL DEFAULT true,
  photo         text,
  photo_version integer NOT NULL DEFAULT 0,
  notif_push    boolean NOT NULL DEFAULT true,
  notif_email   boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_notif_one_on CHECK (notif_push OR notif_email)
);

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_no text;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_id_no_idx ON users (id_no) WHERE id_no IS NOT NULL;

CREATE TABLE IF NOT EXISTS profiles (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

UPDATE users u SET id_no = p.data->>'id_no'
  FROM profiles p
 WHERE u.id = p.user_id AND u.id_no IS NULL AND nullif(p.data->>'id_no', '') IS NOT NULL;

CREATE TABLE IF NOT EXISTS profile_edits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  review_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS profile_edits_status_idx ON profile_edits (status, created_at);

CREATE TABLE IF NOT EXISTS objections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

CREATE INDEX IF NOT EXISTS objections_user_idx ON objections (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  url        text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

CREATE TABLE IF NOT EXISTS periods (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section    text NOT NULL CHECK (section IN ('junior','senior')),
  position   integer NOT NULL,
  label      text NOT NULL,
  kind       text NOT NULL DEFAULT 'period' CHECK (kind IN ('form','period','tiffin')),
  start_time text NOT NULL,
  end_time   text NOT NULL
);

CREATE INDEX IF NOT EXISTS periods_section_idx ON periods (section, position);

CREATE TABLE IF NOT EXISTS routine_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section    text NOT NULL CHECK (section IN ('junior','senior')),
  day        integer NOT NULL CHECK (day BETWEEN 0 AND 6),
  mentor_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_id  uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  UNIQUE (section, day, mentor_id, period_id)
);

CREATE INDEX IF NOT EXISTS routine_entries_day_idx ON routine_entries (day, section);

CREATE TABLE IF NOT EXISTS reminder_log (
  mentor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  on_date   date NOT NULL,
  PRIMARY KEY (mentor_id, period_id, on_date)
);
