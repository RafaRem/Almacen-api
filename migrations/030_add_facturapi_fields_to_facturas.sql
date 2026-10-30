-- Add Facturapi fields to facturas (idempotent)
-- Equivalente a la migración TypeORM 1781000000012

ALTER TABLE "facturas"
  ADD COLUMN IF NOT EXISTS "facturapiid" varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS "cancelacionmotivo" varchar(2) NULL,
  ADD COLUMN IF NOT EXISTS "fechacancelacion" TIMESTAMP NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_facturas_facturapiid"
  ON "facturas" ("facturapiid")
  WHERE "facturapiid" IS NOT NULL;
