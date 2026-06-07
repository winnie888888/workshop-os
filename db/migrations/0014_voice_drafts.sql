-- =============================================================================
-- 0014 — Voice work-order drafts (Phase 10): the record of each spoken note
-- =============================================================================
-- Like ocr_extractions (Phase 7) and plate_recognitions (Phase 8), this is a
-- RECORD table, not a driver of state. Each row captures one voice-drafting
-- event: the audio it came from, the transcription interaction (provenance), the
-- transcript text, the inferred intent and completeness, and the full draft
-- payload (resolved customer/vehicle candidates, suggested lines, missing
-- fields). It supports re-review and lets us measure how often a voice draft was
-- confirmed as-is versus corrected.
--
-- It never creates or updates a work order; that happens only through the
-- existing work-orders workflow on human confirmation. Forced tenant RLS as
-- everywhere in the system.
-- =============================================================================

CREATE TABLE app.voice_drafts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  attachment_id   uuid REFERENCES app.attachments(id) ON DELETE SET NULL,
  interaction_id  uuid,
  -- The transcript and what we made of it.
  transcript      text,
  language        text,
  intent          text NOT NULL DEFAULT 'unclear'
                    CHECK (intent IN ('create_new','update_existing','unclear')),
  completeness    numeric,
  needs_review    boolean NOT NULL DEFAULT true,
  draft_payload   jsonb NOT NULL,
  -- Set when the advisor confirmed: the work order created or updated, and which.
  work_order_id   uuid REFERENCES app.work_orders(id) ON DELETE SET NULL,
  outcome         text CHECK (outcome IN ('created','updated','discarded')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_drafts_tenant     ON app.voice_drafts(tenant_id, created_at DESC);
CREATE INDEX idx_voice_drafts_attachment ON app.voice_drafts(tenant_id, attachment_id);
CREATE INDEX idx_voice_drafts_work_order ON app.voice_drafts(tenant_id, work_order_id);

CREATE TRIGGER trg_voice_drafts_touch
  BEFORE UPDATE ON app.voice_drafts
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE app.voice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.voice_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.voice_drafts
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
