UPDATE productos p
SET
  piezas_por_caja_default = 1,
  empaque_estado = 'FACTOR_ASIGNADO'
WHERE UPPER(TRIM(COALESCE(p."claveUnidad", ''))) IN ('H87', 'PZA')
  AND p.empaque_estado <> 'CONVERTIDO'
  AND (p.piezas_por_caja_default IS NULL OR p.piezas_por_caja_default <= 1)
  AND NOT EXISTS (
    SELECT 1
    FROM producto_presentaciones pp
    WHERE pp.productoid = p.id
      AND pp.tipo = 'CAJA'
      AND pp.statusid = '1'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM inventario_almacen i
    JOIN lotes l ON l.id = i."loteId"
    WHERE i."productoId" = p.id
      AND (
        COALESCE(l.piezas_por_caja, 0) > 1
        OR l.empaque_convertido = true
      )
  );
