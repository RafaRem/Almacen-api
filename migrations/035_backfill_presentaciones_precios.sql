-- Backfill de presentaciones y precios canónicos desde inventario legacy.

INSERT INTO producto_presentaciones (
  productoid,
  nombre,
  tipo,
  factor_unidades,
  es_default,
  statusid
)
SELECT
  p.id,
  'Pieza',
  'PIEZA',
  1,
  true,
  '1'
FROM productos p
WHERE p."statusId" = '1'
ON CONFLICT (productoid, tipo) DO NOTHING;

INSERT INTO producto_presentaciones (
  productoid,
  nombre,
  tipo,
  factor_unidades,
  es_default,
  statusid
)
SELECT
  p.id,
  'Caja',
  'CAJA',
  p.piezas_por_caja_default,
  false,
  '1'
FROM productos p
WHERE p."statusId" = '1'
  AND p.piezas_por_caja_default IS NOT NULL
  AND p.piezas_por_caja_default > 1
ON CONFLICT (productoid, tipo) DO NOTHING;

INSERT INTO lote_precios (
  productoid,
  loteid,
  presentacionid,
  precio_venta,
  status_id,
  created_at,
  updated_at
)
SELECT
  ia."productoId",
  ia."loteId",
  pp.id,
  ia.precio_venta,
  1,
  now(),
  now()
FROM inventario_almacen ia
JOIN producto_presentaciones pp
  ON pp.productoid = ia."productoId"
  AND pp.tipo = 'PIEZA'
  AND pp.statusid = '1'
WHERE ia.precio_venta IS NOT NULL
  AND ia.precio_venta > 0
ON CONFLICT (loteid, presentacionid) DO NOTHING;

INSERT INTO lote_precios (
  productoid,
  loteid,
  presentacionid,
  precio_venta,
  status_id,
  created_at,
  updated_at
)
SELECT
  ia."productoId",
  ia."loteId",
  pc.id,
  ia.precio_venta_caja,
  1,
  now(),
  now()
FROM inventario_almacen ia
JOIN producto_presentaciones pc
  ON pc.productoid = ia."productoId"
  AND pc.tipo = 'CAJA'
  AND pc.statusid = '1'
WHERE ia.precio_venta_caja IS NOT NULL
  AND ia.precio_venta_caja > 0
  AND pc.factor_unidades > 1
ON CONFLICT (loteid, presentacionid) DO NOTHING;
