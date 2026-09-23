CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('personal', 'organization')),
  owner_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE clients (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL,
  UNIQUE (workspace_id, id)
);

CREATE TABLE campaigns (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  client_id uuid,
  public_id uuid NOT NULL UNIQUE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'paused', 'expired', 'archived', 'deleted', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, client_id) REFERENCES clients(workspace_id, id),
  CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);
CREATE INDEX campaigns_workspace_active ON campaigns(workspace_id, updated_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE campaign_drafts (
  campaign_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  document jsonb NOT NULL DEFAULT '{"schemaVersion":1,"theme":{},"blocks":[]}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, campaign_id) REFERENCES campaigns(workspace_id, id),
  CHECK (jsonb_typeof(document) = 'object')
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_workspace_time ON audit_events(workspace_id, created_at DESC);
