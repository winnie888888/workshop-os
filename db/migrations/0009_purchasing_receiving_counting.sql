-- =============================================================================
-- 0009 — Warehouse: purchase orders, goods receipts, stock counts
-- =============================================================================
-- The procurement and stock-operations tables. They orchestrate stock changes
-- but never write stock_levels directly: posting a goods receipt and closing a
-- stock count both go through the existing InventoryService.move() chokepoint,
-- so the immutable ledger and moving-average valuation stay the single source of
-- truth. Goods receipts carry OCR-ready fields (source, attachment, confidence)
-- so the future delivery-note automation drops in without schema change. Every
-- table has tenant_id and inherits forced RLS via the block at the end.
-- =============================================================================

-- --- Purchase orders ---------------------------------------------------------
CREATE TABLE app.purchase_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number             text,                       -- gapless, scope 'purchase_order'
  supplier_id        uuid NOT NULL REFERENCES app.suppliers(id) ON DELETE RESTRICT,
  status             text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','sent','partially_received','received','cancelled')),
  currency           char(3) NOT NULL DEFAULT 'EUR',
  expected_date      date,
  ship_to_location_id uuid REFERENCES app.locations(id) ON DELETE SET NULL,
  total_net_minor    bigint NOT NULL DEFAULT 0,
  total_vat_minor    bigint NOT NULL DEFAULT 0,
  total_gross_minor  bigint NOT NULL DEFAULT 0,
  notes              text,
  minimax_doc_id     text,                        -- reserved (future payables)
  created_by         uuid,
  updated_by         uuid,
  version            int NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_tenant_status ON app.purchase_orders(tenant_id, status);
CREATE INDEX idx_po_tenant_supplier ON app.purchase_orders(tenant_id, supplier_id);

CREATE TABLE app.purchase_order_lines (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  purchase_order_id  uuid NOT NULL REFERENCES app.purchase_orders(id) ON DELETE CASCADE,
  line_no            int NOT NULL,
  item_id            uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE RESTRICT,
  supplier_item_id   uuid REFERENCES app.supplier_items(id) ON DELETE SET NULL,
  description        text NOT NULL,
  qty_ordered        int NOT NULL CHECK (qty_ordered > 0),
  qty_received       int NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost_minor    bigint NOT NULL DEFAULT 0,
  vat_rate_pct       numeric(5,2) NOT NULL DEFAULT 22,
  net_minor          bigint NOT NULL DEFAULT 0,
  vat_minor          bigint NOT NULL DEFAULT 0,
  gross_minor        bigint NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, line_no)
);
CREATE INDEX idx_po_lines_po ON app.purchase_order_lines(tenant_id, purchase_order_id);

-- --- Goods receipts (GRN) ----------------------------------------------------
CREATE TABLE app.goods_receipts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number             text,                       -- gapless, scope 'goods_receipt'
  supplier_id        uuid NOT NULL REFERENCES app.suppliers(id) ON DELETE RESTRICT,
  purchase_order_id  uuid REFERENCES app.purchase_orders(id) ON DELETE SET NULL, -- null = ad-hoc
  received_at        timestamptz NOT NULL DEFAULT now(),
  received_by        uuid,
  delivery_note_ref  text,                        -- supplier's delivery-note number
  source             text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ocr')),
  ocr_attachment_id  uuid REFERENCES app.attachments(id) ON DELETE SET NULL, -- scanned note
  ocr_confidence     numeric,
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_grn_tenant_status ON app.goods_receipts(tenant_id, status);
CREATE INDEX idx_grn_tenant_po ON app.goods_receipts(tenant_id, purchase_order_id);

CREATE TABLE app.goods_receipt_lines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  goods_receipt_id      uuid NOT NULL REFERENCES app.goods_receipts(id) ON DELETE CASCADE,
  line_no               int NOT NULL,
  purchase_order_line_id uuid REFERENCES app.purchase_order_lines(id) ON DELETE SET NULL,
  item_id               uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE RESTRICT,
  location_id           uuid NOT NULL REFERENCES app.locations(id) ON DELETE RESTRICT,
  qty                   int NOT NULL CHECK (qty > 0),
  unit_cost_minor       bigint NOT NULL DEFAULT 0,
  -- OCR provenance per line; null on a manual GRN.
  ocr_raw_text          text,
  ocr_confidence        numeric,
  match_status          text NOT NULL DEFAULT 'matched'
                          CHECK (match_status IN ('matched','unmatched','new_item')),
  -- The receive movement this line posted (set when the GRN is posted).
  movement_id           uuid REFERENCES app.stock_movements(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goods_receipt_id, line_no)
);
CREATE INDEX idx_grn_lines_grn ON app.goods_receipt_lines(tenant_id, goods_receipt_id);

-- --- Stock counts (stocktake) ------------------------------------------------
CREATE TABLE app.stock_counts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  number        text,                            -- gapless, scope 'stock_count'
  scope         text NOT NULL DEFAULT 'location' CHECK (scope IN ('location','item_subset','full')),
  location_id   uuid REFERENCES app.locations(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','counting','review','closed','cancelled')),
  started_by    uuid,
  started_at    timestamptz NOT NULL DEFAULT now(),
  closed_by     uuid,
  closed_at     timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_counts_tenant_status ON app.stock_counts(tenant_id, status);

CREATE TABLE app.stock_count_lines (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  stock_count_id         uuid NOT NULL REFERENCES app.stock_counts(id) ON DELETE CASCADE,
  item_id                uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE RESTRICT,
  location_id            uuid NOT NULL REFERENCES app.locations(id) ON DELETE RESTRICT,
  system_qty             int NOT NULL,            -- snapshot at count time
  counted_qty            int,                     -- null until counted
  -- variance is derived; stored generated for easy review/reporting.
  variance               int GENERATED ALWAYS AS (COALESCE(counted_qty,0) - system_qty) STORED,
  adjustment_movement_id uuid REFERENCES app.stock_movements(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_count_id, item_id, location_id)
);
CREATE INDEX idx_count_lines_count ON app.stock_count_lines(tenant_id, stock_count_id);

-- touch triggers
CREATE TRIGGER trg_po_touch        BEFORE UPDATE ON app.purchase_orders FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_grn_touch       BEFORE UPDATE ON app.goods_receipts  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_counts_touch    BEFORE UPDATE ON app.stock_counts    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Forced tenant RLS on all six new tables.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'purchase_orders','purchase_order_lines',
    'goods_receipts','goods_receipt_lines',
    'stock_counts','stock_count_lines'
  ] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON app.%I
        USING (tenant_id = app.current_tenant_id())
        WITH CHECK (tenant_id = app.current_tenant_id());
    $f$, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA app TO workshop_app;
