-- Migration: Backfill detalle_lote with historical data
-- Date: 2026-06-12
-- Purpose: Poblar movimientoId y almacenTipo en registros históricos de detalle_lote
--   y crear detalle_lote faltante para transferencias históricas.

BEGIN;

-- 1. Vincular detalle_lote existentes con su movimiento ENTRADA_BODEGA (CFDI)
UPDATE detalle_lote dl
SET movimientoid = ma.id,
    almacen_tipo = ma.almacen_destino
FROM movimientos_almacen ma
WHERE ma.productoid = dl.productoid
  AND ma.loteid = dl.loteid
  AND ma.tipo_movimiento = 'ENTRADA_BODEGA'
  AND dl.movimientoid IS NULL;

-- 2. Crear detalle_lote para transferencias históricas que no tienen
INSERT INTO detalle_lote (id, productoid, loteid, cantidad, precio_unitario, movimientoid, almacen_tipo, created_at)
SELECT
  gen_random_uuid(),
  ma.productoid,
  ma.loteid,
  ma.cantidad,
  COALESCE(
    (SELECT ia.precio_unitario_lote
     FROM inventario_almacen ia
     WHERE ia.productoid = ma.productoid AND ia.loteid = ma.loteid
     LIMIT 1),
    0
  ),
  ma.id,
  ma.almacen_origen,
  ma.fecha
FROM movimientos_almacen ma
WHERE ma.tipo_movimiento LIKE 'TRANSFERENCIA_%'
  AND NOT EXISTS (
    SELECT 1 FROM detalle_lote dl WHERE dl.movimientoid = ma.id
  );

COMMIT;

-- Rollback:
--BEGIN;
--  DELETE FROM detalle_lote WHERE movimientoid IN (
--    SELECT id FROM movimientos_almacen WHERE tipo_movimiento LIKE 'TRANSFERENCIA_%'
--  ) AND created_at < NOW() - INTERVAL '1 minute';
--  UPDATE detalle_lote SET movimientoid = NULL, almacen_tipo = NULL
--    WHERE movimientoid IS NOT NULL AND created_at < NOW() - INTERVAL '1 minute';
--COMMIT;
