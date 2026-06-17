-- Migration: Add movimientoId FK and almacenTipo to detalle_lote
-- Date: 2026-06-12
-- Purpose: Vincular detalle_lote al movimiento_almacen que originó la entrada.
--   almacenTipo indica en qué almacén quedó registrado el lote.
--   Cierra el gap donde CFDI y transferencias creaban detalle_lote sin FK.

ALTER TABLE "detalle_lote"
  ADD COLUMN IF NOT EXISTS "movimientoid" uuid,
  ADD COLUMN IF NOT EXISTS "almacen_tipo" integer;

ALTER TABLE "detalle_lote"
  ADD CONSTRAINT "fk_detalle_lote_movimiento"
  FOREIGN KEY ("movimientoid")
  REFERENCES "movimientos_almacen"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_dl_movimiento" ON "detalle_lote" ("movimientoid");

-- Rollback:
-- DROP INDEX IF EXISTS "idx_dl_movimiento";
-- ALTER TABLE "detalle_lote" DROP CONSTRAINT IF EXISTS "fk_detalle_lote_movimiento";
-- ALTER TABLE "detalle_lote" DROP COLUMN IF EXISTS "movimientoid";
-- ALTER TABLE "detalle_lote" DROP COLUMN IF EXISTS "almacen_tipo";
