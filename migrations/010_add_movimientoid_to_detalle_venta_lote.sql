-- Migration: Add movimientoId FK to detalle_venta_lote
-- Date: 2026-06-12
-- Purpose: Vincular cada detalle_venta_lote al movimiento_almacen que generó la salida.
--   Permite navegar desde un movimiento_almacen a TODOS los lotes que realmente se consumieron
--   (soporta multi-lote FEPU donde un solo movimiento puede consumir de varios lotes).

ALTER TABLE "detalle_venta_lote"
  ADD COLUMN IF NOT EXISTS "movimientoid" uuid;

ALTER TABLE "detalle_venta_lote"
  ADD CONSTRAINT "fk_detalle_venta_lote_movimiento"
  FOREIGN KEY ("movimientoid")
  REFERENCES "movimientos_almacen"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_dvl_movimiento" ON "detalle_venta_lote" ("movimientoid");

-- Rollback:
-- DROP INDEX IF EXISTS "idx_dvl_movimiento";
-- ALTER TABLE "detalle_venta_lote" DROP CONSTRAINT IF EXISTS "fk_detalle_venta_lote_movimiento";
-- ALTER TABLE "detalle_venta_lote" DROP COLUMN IF EXISTS "movimientoid";
