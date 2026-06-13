-- 0031_tenant_integration_toggles.sql
-- Strežniška stikala za integracije na ravni najemnika (delavnice).
--
-- Do zdaj sta bili stikali za SMS in Minimax le v lokalnih nastavitvah brskalnika
-- (workshop-settings) in nista vplivali na resnično pošiljanje — pošiljanje je
-- bilo odvisno izključno od env poverilnic (INFOBIP_*, Minimax outbox). Ti dve
-- koloni naredita stikali RESNIČNI: sprožilci jih preverijo in brez privolitve
-- ne uvrstijo sporočila/sinhronizacije v outbox.
--
-- Privzeto TRUE: obstoječe delavnice se vedejo enako kot doslej (brez tihe
-- spremembe vedenja ob migraciji). Delavnica lahko pošiljanje izklopi v
-- Nastavitvah; takrat se dogodek sploh ne uvrsti (ne le "tiho pade na stub").

ALTER TABLE app.tenants
  ADD COLUMN IF NOT EXISTS sms_enabled     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS minimax_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN app.tenants.sms_enabled IS
  'Ali delavnica pošilja operativna SMS obvestila strankam (vehicle_ready, invoice_available, payment_reminder, appointment_reminder). Dejanska dostava še vedno zahteva INFOBIP_* poverilnice; izklop tukaj sporočila sploh ne uvrsti v outbox.';
COMMENT ON COLUMN app.tenants.minimax_enabled IS
  'Ali se izdani računi sinhronizirajo v Minimax. Izklop prepreči uvrstitev minimax.invoice.upsert / partner upsert v outbox.';
