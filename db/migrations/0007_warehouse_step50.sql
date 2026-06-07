-- =============================================================================
-- 0007 — Warehouse Step 5.0 enabling changes
-- =============================================================================
-- These are the schema changes the approved Warehouse architecture requires
-- BEFORE the warehouse modules are built. They extend the existing inventory
-- tables; they do not redesign them. All affected tables already have RLS
-- enabled + forced, and these alterations inherit it unchanged.
--
--   R1  transfers      : widen the movement-type vocabulary for transfer pairs
--   R2  valuation      : moving-average cost on items + unit cost on movements
--   (reorder columns staged here too, since they are cheap columns on an
--    existing table and let the later replenishment step stay light)
-- =============================================================================

-- --- R1: transfer movements --------------------------------------------------
-- The original inline CHECK (named stock_movements_type_check by Postgres)
-- allowed only receive/reserve/issue/release/adjust. Widen it to include the
-- two halves of a transfer. The shared reducer is the authority on semantics;
-- this constraint simply keeps the ledger's vocabulary honest at the DB layer.
ALTER TABLE app.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_type_check;
ALTER TABLE app.stock_movements
  ADD CONSTRAINT stock_movements_type_check
  CHECK (type IN ('receive','reserve','issue','release','adjust','transfer_out','transfer_in'));

-- Provenance + valuation columns on the immutable ledger. These are append-time
-- facts (the ledger is never updated), so adding nullable columns is safe.
ALTER TABLE app.stock_movements
  ADD COLUMN IF NOT EXISTS unit_cost_minor bigint,   -- per-unit cost for receive/transfer_in (R2)
  ADD COLUMN IF NOT EXISTS transfer_id     uuid,     -- links the two halves of a transfer (R1)
  ADD COLUMN IF NOT EXISTS source_ref      text;     -- GRN / count / PO id that caused the move

-- The two halves of a transfer share one transfer_id; index it so we can show
-- a transfer as a unit.
CREATE INDEX IF NOT EXISTS idx_stock_moves_transfer ON app.stock_movements(tenant_id, transfer_id)
  WHERE transfer_id IS NOT NULL;

-- --- R2: moving-average valuation -------------------------------------------
-- avg_cost_minor is the moving weighted-average unit cost, recomputed by the
-- tested Valuation.movingAverage function on every costed receipt. cost_minor
-- is kept as the informational "last purchase cost".
ALTER TABLE app.inventory_items
  ADD COLUMN IF NOT EXISTS avg_cost_minor bigint NOT NULL DEFAULT 0;

-- Seed the average from the existing last-cost so pre-5.0 stock has a sane
-- valuation immediately (no historical receipts to replay).
UPDATE app.inventory_items SET avg_cost_minor = cost_minor WHERE avg_cost_minor = 0 AND cost_minor > 0;

-- --- Reorder columns (staged for the replenishment step) ---------------------
ALTER TABLE app.stock_levels
  ADD COLUMN IF NOT EXISTS reorder_qty int NOT NULL DEFAULT 0,  -- target top-up quantity
  ADD COLUMN IF NOT EXISTS max_qty     int,                     -- optional ceiling
  ADD COLUMN IF NOT EXISTS bin         text;                    -- shelf/bin within a site

COMMENT ON COLUMN app.inventory_items.avg_cost_minor IS
  'Moving weighted-average unit cost (minor units), recomputed on each costed receipt. Basis for stock valuation and part cost on issue.';
COMMENT ON COLUMN app.stock_movements.unit_cost_minor IS
  'Per-unit cost captured on receive/transfer_in movements; null for reserve/release/issue/adjust.';
