-- =============================================================================
-- 0011 — OCR extractions (Phase 7): the full record of what was read
-- =============================================================================
-- The goods-receipt header and lines already carry the OCR provenance needed to
-- POST stock (source, attachment, per-line confidence and match_status). What
-- they do NOT keep is the COMPLETE structured extraction — including the lines
-- that were not draftable (no catalogue match, unreadable price) and the field
-- confidences. We store that whole payload here, once per extraction, for two
-- reasons: it is the complete audit record of what the machine read off the
-- photograph, and it lets a reviewer revisit the unresolved lines later without
-- re-running (and re-paying for) extraction.
--
-- This table never drives stock. It is a record, linked to the AI interaction
-- that produced it and (once a draft exists) to the goods receipt. Posting still
-- happens only through the existing goods-receipts workflow, human-confirmed.
-- Forced tenant RLS as everywhere else.
-- =============================================================================

CREATE TABLE app.ocr_extractions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  -- The photographed/uploaded document this extraction came from.
  attachment_id      uuid REFERENCES app.attachments(id) ON DELETE SET NULL,
  -- The AI gateway interaction (provenance: model, residency, cost, latency).
  interaction_id     uuid,
  document_type      text NOT NULL
                       CHECK (document_type IN ('delivery_note','supplier_invoice')),
  -- The draft goods receipt created from this extraction, if any. Null when the
  -- supplier or all lines still need manual resolution before a draft is valid.
  goods_receipt_id   uuid REFERENCES app.goods_receipts(id) ON DELETE SET NULL,
  -- The matched supplier (may be null if no confident match), for quick filters.
  matched_supplier_id uuid REFERENCES app.suppliers(id) ON DELETE SET NULL,
  overall_confidence numeric,
  -- The complete normalized + matched review payload as JSON: supplier/PO
  -- matches, every line with its verdict and review flags. This is what the
  -- review UI re-loads and what an auditor inspects.
  review_payload     jsonb NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocr_extractions_tenant      ON app.ocr_extractions(tenant_id, created_at DESC);
CREATE INDEX idx_ocr_extractions_grn         ON app.ocr_extractions(tenant_id, goods_receipt_id);
CREATE INDEX idx_ocr_extractions_attachment  ON app.ocr_extractions(tenant_id, attachment_id);

CREATE TRIGGER trg_ocr_extractions_touch
  BEFORE UPDATE ON app.ocr_extractions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Forced tenant RLS.
ALTER TABLE app.ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ocr_extractions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.ocr_extractions
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
