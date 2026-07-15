-- =============================================
-- MIGRATION 019: Remove ivaCfdi from precio_venta formula
-- Description: ivaCfdi no longer participates in precio_venta calculation.
-- New formula: precioUnitario * (1 + margen/100)
-- =============================================

-- =============================================
-- STEP 1: Recreate function without IVA
-- =============================================
CREATE OR REPLACE FUNCTION fn_calcular_precio_venta(
    p_precio_unitario decimal,
    p_margen decimal
) RETURNS decimal AS $$
DECLARE
    v_margen numeric;
BEGIN
    v_margen := COALESCE(p_margen, 20);

    IF p_precio_unitario IS NULL OR p_precio_unitario <= 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND(p_precio_unitario * (1 + v_margen / 100), 2)::decimal;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- STEP 2: Re-populate ALL inventario_almacen records
-- =============================================
UPDATE inventario_almacen ia
SET precio_venta = fn_calcular_precio_venta(
    ia.precio_unitario_lote,
    COALESCE(
        (SELECT margen_recomendado FROM productos p WHERE p.id = ia."productoId"),
        20
    )
)
WHERE ia.precio_unitario_lote IS NOT NULL AND ia.precio_unitario_lote > 0;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check affected count:
-- SELECT COUNT(*) as total_corregidos FROM inventario_almacen WHERE precio_venta > 0;
--
-- Compare old formula (with IVA) vs new (without IVA):
-- SELECT ia.precio_unitario_lote, ia.iva_cfdi,
--   ROUND(ia.precio_unitario_lote * (1 + COALESCE(p.margen_recomendado,20)/100), 2) as new_formula,
--   ia.precio_venta as stored_value
-- FROM inventario_almacen ia
-- JOIN productos p ON p.id = ia."productoId"
-- LIMIT 10;
