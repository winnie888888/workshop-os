-- =============================================================================
-- 0008 — Warehouse 5.1: suppliers, supplier↔item cross-reference, categories
-- =============================================================================
-- The first Warehouse domain tables. Suppliers are the source of stock; the
-- supplier_items cross-reference is the data that later powers goods-receipt
-- matching and suggested purchase orders (it answers "who do we buy this part
-- from, under what part number, at what price, with what lead time?"). Parts
-- categories give the catalogue a shallow browse tree. Every table carries
-- tenant_id and inherits forced RLS via the registration block at the end,
-- exactly like the existing domain tables — nothing here redesigns inventory.
-- =============================================================================

CREATE TABLE app.suppliers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  code                  text,                       -- optional short code for the clerk
  name                  text NOT NULL,
  country               char(2) NOT NULL DEFAULT 'SI',
  vat_id                text,
  currency              char(3) NOT NULL DEFAULT 'EUR',
  payment_terms_days    int NOT NULL DEFAULT 30,
  default_lead_time_days int NOT NULL DEFAULT 3,
  email                 text,
  phone                 text,
  address               text,
  notes                 text,
  -- Reserved for the future payables direction (Minimax received invoices). We
  -- do NOT sync suppliers now; this column just gives a later sync somewhere to
  -- record the link, exactly as inventory_items carries minimax_article_id.
  minimax_partner_id    text,
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by            uuid,
  updated_by            uuid,
  version               int NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_tenant_name ON app.suppliers(tenant_id, lower(name));
CREATE UNIQUE INDEX uq_suppliers_tenant_code ON app.suppliers(tenant_id, code) WHERE code IS NOT NULL;

-- Parts categories: a shallow self-referencing tree (e.g. Brakes > Pads). Kept
-- deliberately simple; a workshop store is not a deep taxonomy.
CREATE TABLE app.parts_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  parent_id   uuid REFERENCES app.parts_categories(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parts_categories_tenant ON app.parts_categories(tenant_id, parent_id);

-- Supplier ↔ catalogue-item cross reference. One item can be bought from several
-- suppliers, each with their own part number, price and lead time; at most one
-- is marked preferred (enforced by a partial unique index per item).
CREATE TABLE app.supplier_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  supplier_id       uuid NOT NULL REFERENCES app.suppliers(id) ON DELETE CASCADE,
  item_id           uuid NOT NULL REFERENCES app.inventory_items(id) ON DELETE CASCADE,
  supplier_sku      text,                       -- the supplier's own part number
  supplier_name     text,                       -- the supplier's name for the part
  pack_size         int NOT NULL DEFAULT 1 CHECK (pack_size >= 1),
  last_price_minor  bigint NOT NULL DEFAULT 0,
  currency          char(3) NOT NULL DEFAULT 'EUR',
  lead_time_days    int,
  preferred         boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, supplier_id, item_id)
);
CREATE INDEX idx_supplier_items_item ON app.supplier_items(tenant_id, item_id);
CREATE INDEX idx_supplier_items_supplier ON app.supplier_items(tenant_id, supplier_id);
-- At most one preferred supplier per item.
CREATE UNIQUE INDEX uq_supplier_items_preferred ON app.supplier_items(tenant_id, item_id)
  WHERE preferred = true;

-- Now that suppliers exist, add the catalogue enrichment columns (this is the
-- catalogue half of step 5.1) and link the supplier/category pointers. 0007
-- added only valuation + reorder columns; the catalogue columns belong here.
ALTER TABLE app.inventory_items
  ADD COLUMN IF NOT EXISTS category_id          uuid,
  ADD COLUMN IF NOT EXISTS barcode              text,   -- scannable EAN/UPC
  ADD COLUMN IF NOT EXISTS superseded_by_id     uuid,   -- supersession chain
  ADD COLUMN IF NOT EXISTS preferred_supplier_id uuid;  -- default source for reorder

CREATE INDEX IF NOT EXISTS idx_inv_items_barcode ON app.inventory_items(tenant_id, barcode)
  WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inv_items_category ON app.inventory_items(tenant_id, category_id)
  WHERE category_id IS NOT NULL;

ALTER TABLE app.inventory_items
  ADD CONSTRAINT fk_inv_items_preferred_supplier
  FOREIGN KEY (preferred_supplier_id) REFERENCES app.suppliers(id) ON DELETE SET NULL;
ALTER TABLE app.inventory_items
  ADD CONSTRAINT fk_inv_items_category
  FOREIGN KEY (category_id) REFERENCES app.parts_categories(id) ON DELETE SET NULL;
ALTER TABLE app.inventory_items
  ADD CONSTRAINT fk_inv_items_superseded_by
  FOREIGN KEY (superseded_by_id) REFERENCES app.inventory_items(id) ON DELETE SET NULL;

-- touch_updated_at triggers (same helper used across the schema).
CREATE TRIGGER trg_suppliers_touch       BEFORE UPDATE ON app.suppliers       FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_supplier_items_touch  BEFORE UPDATE ON app.supplier_items  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_parts_categories_touch BEFORE UPDATE ON app.parts_categories FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Forced tenant RLS on all three new tables (same block shape as 0002).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suppliers','supplier_items','parts_categories'] LOOP
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
