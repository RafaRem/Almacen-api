ALTER TABLE detalle_venta ADD COLUMN IF NOT EXISTS costounitario numeric(10,2);

UPDATE detalle_venta dv
SET costounitario = ia.precio_unitario_lote
FROM inventario_almacen ia
WHERE dv.productoid = ia."productoId"
  AND dv.loteid = ia."loteId"
  AND dv.costounitario IS NULL
  AND ia.precio_unitario_lote > 0;