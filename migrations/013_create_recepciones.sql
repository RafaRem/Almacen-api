-- Migration: Create recepciones table + add recepcionId to lotes
-- Date: 2026-06-13
-- Purpose: Track CFDI reception metadata and link lots to their reception

CREATE TABLE IF NOT EXISTS "recepciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "serie" varchar(50),
  "folio" varchar(50),
  "uuidCfdi" varchar(100),
  "fecha" timestamp,
  "emisorRfc" varchar(20) NOT NULL,
  "emisorNombre" varchar(255) NOT NULL,
  "subtotal" decimal(12,2),
  "total" decimal(12,2),
  "proveedorId" uuid REFERENCES "proveedores"("id"),
  "xmlContent" text,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "recepcionId" uuid REFERENCES "recepciones"("id");
CREATE INDEX IF NOT EXISTS "idx_lotes_recepcion" ON "lotes" ("recepcionId");

-- Rollback:
-- DROP TABLE IF EXISTS "recepciones";
-- ALTER TABLE "lotes" DROP COLUMN IF EXISTS "recepcionId";
