-- Backfill costounitario NULL usando el costo actual del producto
-- Toma el precio_unitario_lote del lote más reciente con stock (cantidadActual > 0)
-- Solo actualiza filas sin costo (idempotente)

WITH costo_actual AS (
  SELECT DISTINCT ON (ia."productoId")
         ia."productoId" AS productoid,
         ia.precio_unitario_lote AS costo
  FROM inventario_almacen ia
  WHERE ia."cantidadActual" > 0
    AND ia.precio_unitario_lote > 0
  ORDER BY ia."productoId", ia."updatedAt" DESC, ia."createdAt" DESC
)
UPDATE detalle_venta dv
SET costounitario = ca.costo
FROM costo_actual ca
WHERE dv.productoid = ca.productoid
  AND dv.costounitario IS NULL
  AND ca.costo > 0;