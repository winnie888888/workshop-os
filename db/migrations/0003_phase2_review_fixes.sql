-- =====================================================================
-- Migration 0003 — Phase 2 review fixes (stock integrity)
--
-- Purpose: a part line must remember WHERE it reserved stock, so that issuing
-- the part later decrements on_hand and reserved at the SAME location it was
-- reserved at. Without this, a reserve at location A followed by an issue at
-- location B corrupts both balances. We add the reservation location to the
-- line and backfill nothing (no historical part lines exist yet in production).
--
-- This is a corrective migration, not a feature: it closes a data-integrity
-- gap found in the Phase 2 senior review before Phase 3 builds invoicing on top.
-- =====================================================================

BEGIN;

ALTER TABLE app.work_order_lines
  ADD COLUMN IF NOT EXISTS reserved_location_id uuid
    REFERENCES app.locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN app.work_order_lines.reserved_location_id IS
  'Location where this part line reserved stock; issuing must occur at this same location.';

COMMIT;
