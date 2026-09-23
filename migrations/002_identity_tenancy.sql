ALTER TABLE users ADD COLUMN password_hash text;
ALTER TABLE campaigns ADD COLUMN deleted_from_status text CHECK (deleted_from_status IN ('draft', 'archived'));
CREATE UNIQUE INDEX one_personal_workspace_per_user ON workspaces(owner_id) WHERE kind = 'personal';
CREATE UNIQUE INDEX one_active_owner_per_workspace ON memberships(workspace_id) WHERE role = 'owner' AND status = 'active';

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE account_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at timestamptz NOT NULL,
  UNIQUE (user_id, purpose)
);
CREATE TABLE auth_throttles (
  key_hash text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
