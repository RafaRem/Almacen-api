-- Migration: Backfill detalle_lote with historical data
-- Date: 2026-06-12
-- Purpose: Poblar movimientoId y almacenTipo en registros históricos de detalle_lote
--   y crear detalle_lote faltante para transferencias históricas.

BEGIN;

-- 1. Vincular detalle_lote existentes con su movimiento ENTRADA_BODEGA (CFDI)
UPDATE detalle_lote dl
SET movimientoid = ma.id,
    almacen_tipo = ma."almacenDestino"::text::integer
FROM movimientos_almacen ma
WHERE ma."productoId" = dl."productoId"
  AND ma."loteId" = dl."loteId"
  AND ma.tipo_movimiento = 'ENTRADA_BODEGA'
  AND dl.movimientoid IS NULL;

-- 2. Crear detalle_lote para transferencias históricas que no tienen
INSERT INTO detalle_lote (id, "productoId", "loteId", cantidad, precio_unitario, movimientoid, almacen_tipo, "createdAt")
SELECT
  gen_random_uuid(),
  ma."productoId",
  ma."loteId",
  ma.cantidad,
  COALESCE(
    (SELECT ia.precio_unitario_lote
     FROM inventario_almacen ia
     WHERE ia."productoId" = ma."productoId" AND ia."loteId" = ma."loteId"
     LIMIT 1),
    0
  ),
  ma.id,
  ma."almacenOrigen"::text::integer,
  ma.fecha
FROM movimientos_almacen ma
WHERE ma.tipo_movimiento LIKE 'TRANSFERENCIA_%'
  AND NOT EXISTS (
    SELECT 1 FROM detalle_lote dl WHERE dl.movimientoid = ma.id
  )
ON CONFLICT ("productoId", "loteId") DO NOTHING;

COMMIT;

-- Rollback:
--BEGIN;
--  DELETE FROM detalle_lote WHERE movimientoid IN (
--    SELECT id FROM movimientos_almacen WHERE tipo_movimiento LIKE 'TRANSFERENCIA_%'
--  ) AND created_at < NOW() - INTERVAL '1 minute';
--  UPDATE detalle_lote SET movimientoid = NULL, almacen_tipo = NULL
--    WHERE movimientoid IS NOT NULL AND created_at < NOW() - INTERVAL '1 minute';
--COMMIT;
