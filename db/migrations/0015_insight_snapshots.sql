-- =============================================================================
-- 0015 — Insight snapshots (Phase 11): the history of AI Manager analyses
-- =============================================================================
-- Like the record tables in earlier phases, this stores the OUTPUT of a read-only
-- analysis; it never drives any official state. Each row is one run of the AI
-- Workshop Manager over a window: the period, the counts by severity and
-- category, and the full prioritised payload. It exists so an owner can review
-- what the manager flagged historically and so every recommendation is auditable
-- back to the numbers that produced it.
--
-- The AI Manager is ADVISORY ONLY: it reads, computes, and records insights here.
-- It writes to NO official table — not invoices, not attendance, not stock.
-- Forced tenant RLS as everywhere.
-- =============================================================================

CREATE TABLE app.insight_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  period_label  text NOT NULL,
  window_days   int NOT NULL,
  total         int NOT NULL DEFAULT 0,
  by_severity   jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_category   jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_snapshots_tenant ON app.insight_snapshots(tenant_id, created_at DESC);

ALTER TABLE app.insight_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.insight_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.insight_snapshots
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA app TO workshop_app;
