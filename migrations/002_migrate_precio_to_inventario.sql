-- =============================================
-- MIGRATION: Migrate productos.precio to inventario_almacen.precioUnitarioLote
-- Description: Copy precio from productos table to inventario_almacen.precioUnitarioLote
--              for all existing inventory records
-- =============================================

-- STEP 1: Update inventario_almacen with productos.precio
-- This assumes each product has its precio in productos table
UPDATE inventario_almacen ia
SET precio_unitario_lote = p.precio
FROM productos p
WHERE p.id = ia."productoId"
  AND (ia.precio_unitario_lote IS NULL OR ia.precio_unitario_lote = 0);

-- STEP 2: Set iva_cfdi default if not set (commonly 16 for medicamentos)
-- Adjust this value based on your business rules
-- UPDATE inventario_almacen
-- SET iva_cfdi = 16
-- WHERE iva_cfdi IS NULL;

-- STEP 3: Calculate precio_venta for all records after populating precioUnitarioLote
-- First ensure the function exists (from previous migration)
-- If function doesn't exist yet, the next UPDATE will fail and should be run after 001_add_precio_venta_trigger.sql

UPDATE inventario_almacen ia
SET precio_venta = (
    SELECT fn_calcular_precio_venta(
        ia.precio_unitario_lote,
        COALESCE(ia.iva_cfdi, 0),
        COALESCE(
            (SELECT margen_recomendado FROM productos WHERE id = ia."productoId"),
            20
        )
    )
)
WHERE ia.precio_unitario_lote > 0
  AND (ia.precio_venta IS NULL OR ia.precio_venta = 0);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check products without inventario_almacen entries
-- SELECT p.id, p.nombre, p.precio
-- FROM productos p
-- LEFT JOIN inventario_almacen ia ON p.id = ia."productoId"
-- WHERE ia.id IS NULL;

-- Check inventario_almacen before update
-- SELECT ia.id, ia.producto_id, ia.precio_unitario_lote, p.precio as producto_precio
-- FROM inventario_almacen ia
-- JOIN productos p ON p.id = ia."productoId"
-- WHERE ia.precio_unitario_lote != p.precio;

-- Final check - verify migration results
-- SELECT 'inventario_almacen records updated:' as info;
-- SELECT COUNT(*) as total,
--        COUNT(CASE WHEN precio_unitario_lote > 0 THEN 1 END) as con_precio_unitario,
--        COUNT(CASE WHEN precio_venta > 0 THEN 1 END) as con_precio_venta
-- FROM inventario_almacen;
