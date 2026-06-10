-- Migration: Drop zombie columns from clientes table
-- Date: 2026-06-08
-- Purpose: Remove usoCfdi, regimenFiscal, codigoPostal from clientes
--   These columns are duplicated in facturacion_cliente and domicilio tables
--   and were never exposed via DTOs, so they're always null.

ALTER TABLE "clientes" DROP COLUMN IF EXISTS "usoCfdi";
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "regimenFiscal";
ALTER TABLE "clientes" DROP COLUMN IF EXISTS "codigoPostal";

-- Rollback:
-- ALTER TABLE "clientes" ADD COLUMN "usoCfdi" varchar(3) DEFAULT NULL;
-- ALTER TABLE "clientes" ADD COLUMN "regimenFiscal" varchar(10) DEFAULT NULL;
-- ALTER TABLE "clientes" ADD COLUMN "codigoPostal" varchar(5) DEFAULT NULL;
