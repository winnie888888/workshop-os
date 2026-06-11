-- 0029: Zbirni račun — izvor naloga na vrsticah računa.
--
-- Spec zahteva, da zbirni račun pokaže vsote PO NALOGU in skupno. Namesto
-- umetnih "subtotal" vrstic (ki bi onesnažile DDV matematiko in Minimax
-- izvoz) vsaka vrstica računa nosi izvorni work_order_id; UI in PDF iz tega
-- grupirata in seštevata. Obstoječi računi imajo NULL — prikaz brez grup.
-- Vrstice so insert-only, zato immutability ni ogrožena.

ALTER TABLE app.invoice_lines
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES app.work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_lines_wo ON app.invoice_lines (work_order_id) WHERE work_order_id IS NOT NULL;
