-- Migration: Create descuentos_productos junction table
-- Date: 2026-06-08
-- Purpose: Many-to-many assignment of descuentos to specific productos.
--   When a descuento has entries here, it only applies to those productos.
--   When it has no entries, it applies globally (current behavior).

CREATE TABLE IF NOT EXISTS "descuentos_productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "descuentoId" uuid NOT NULL REFERENCES "descuentos"("id") ON DELETE CASCADE,
  "productoId" uuid NOT NULL REFERENCES "productos"("id") ON DELETE CASCADE,
  "statusId" integer NOT NULL DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("descuentoId", "productoId")
);

CREATE INDEX IF NOT EXISTS "idx_dp_descuento" ON "descuentos_productos" ("descuentoId");
CREATE INDEX IF NOT EXISTS "idx_dp_producto" ON "descuentos_productos" ("productoId");

-- Rollback:
-- DROP TABLE IF EXISTS "descuentos_productos";
