-- 0030: Telefon stranke (SMS komunikacija, sprint 1).
--
-- Papirnati delovni nalog ima polje GSM/TEL — digitalni doslej ne. Telefon je
-- pogoj za operativna SMS obvestila iz spec (vozilo pripravljeno, račun na
-- voljo, opomnik termina ...). Neobvezen; brez njega se SMS dogodek sploh ne
-- ustvari. Normalizacija v E.164 (+386 ...) teče v aplikaciji ob pošiljanju.
-- Backlog: ekspliciten consent flag (GDPR) — v1 velja vpis telefona kot
-- privolitev v OPERATIVNA obvestila (marketing je s portom itak nemogoč).

ALTER TABLE app.customers
  ADD COLUMN IF NOT EXISTS phone text;
