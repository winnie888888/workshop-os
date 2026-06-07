-- =============================================================================
-- 0005_attachments_profiles_sessions.sql
-- Phase 4A — Production readiness.
--
-- Adds three things:
--   1. app.attachments      — server-side files (photos, voice notes, docs)
--                             linked to work orders, with storage metadata,
--                             an upload lifecycle, and (for voice notes) the
--                             on-device transcript. Tenant-scoped, RLS forced.
--   2. profile fields        — display name / phone / avatar on app.users
--                             (locale already exists). User identity is global,
--                             so these live on the existing global users table.
--   3. app.user_sessions     — server-tracked login sessions for visibility and
--                             revocation. Sessions are cross-tenant (a user logs
--                             in once and may act in several tenants), so this is
--                             a GLOBAL table scoped by user_id, accessed only by
--                             the auth service at admin scope — never by RLS app
--                             queries — and therefore not under tenant RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Attachments
-- ---------------------------------------------------------------------------
CREATE TABLE app.attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  -- Most attachments belong to a work order (mechanic photos/notes); the column
  -- is nullable so the model can later carry customer- or asset-level files.
  work_order_id   uuid REFERENCES app.work_orders(id) ON DELETE CASCADE,
  kind            text NOT NULL CHECK (kind IN ('photo','voice_note','document')),
  -- Object-store coordinates. storage_key is built server-side from trusted
  -- parts (see shared StorageKey.buildObjectKey); never from the client name.
  storage_key     text NOT NULL UNIQUE,
  content_type    text NOT NULL,
  byte_size       bigint NOT NULL CHECK (byte_size > 0),
  checksum_sha256 text,                          -- set on completion if provided
  original_filename text,                        -- sanitised, for display only
  -- Voice notes carry the on-device transcript so the text is searchable and
  -- visible even before any server-side transcription exists.
  transcript      text,
  -- Upload lifecycle: a row is created 'pending' when an upload URL is issued,
  -- flips to 'stored' once the client confirms the PUT succeeded, and may be
  -- 'quarantined' by a future scanner before being served.
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','stored','quarantined','deleted')),
  uploaded_by     uuid REFERENCES app.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  stored_at       timestamptz
);

CREATE INDEX idx_attachments_work_order ON app.attachments(tenant_id, work_order_id);
CREATE INDEX idx_attachments_status ON app.attachments(tenant_id, status);

-- Row-level security: every query is scoped to the current tenant GUC, matching
-- the rest of the schema. Enabled AND forced (so even the table owner obeys it).
ALTER TABLE app.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.attachments FORCE ROW LEVEL SECURITY;
CREATE POLICY attachments_tenant_isolation ON app.attachments
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- 2. User profile fields (global identity; locale already present)
-- ---------------------------------------------------------------------------
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS avatar_key text;   -- storage key

-- ---------------------------------------------------------------------------
-- 3. User sessions (global, scoped by user_id; not under tenant RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE app.user_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  -- A stable per-device identifier supplied by the client (see web deviceId),
  -- so a user can see and revoke "this phone" vs "the desk PC".
  device_id     text,
  user_agent    text,
  ip_hint       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  revoked_at    timestamptz
);

CREATE INDEX idx_user_sessions_user ON app.user_sessions(user_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX uq_user_session_device
  ON app.user_sessions(user_id, device_id) WHERE revoked_at IS NULL AND device_id IS NOT NULL;

-- No tenant RLS here by design (see header). Access is restricted to the auth
-- service running at admin scope, which always filters by the authenticated
-- user_id. The grant model keeps the least-privilege app role away from it.
REVOKE ALL ON app.user_sessions FROM PUBLIC;
