-- =============================================
-- MIGRATION 018: Fix precio_venta formula (remove compounding effect)
-- Description: The SQL trigger was using a compounded formula:
--   (PU + PU*iva/100) * (1 + margen/100)
-- Instead of the correct non-compounded formula:
--   PU * (1 + iva/100) + PU * (margen/100)
--
-- The compounded formula inflated precio_venta by PU * iva * margen / 10000
-- Example: PU=800, iva=16, margen=20
--   OLD: $1113.60  (compounded)
--   NEW: $1088.00  (correct)
--   Diff:   $25.60
-- =============================================

-- =============================================
-- STEP 1: Recreate function with correct formula
-- =============================================
CREATE OR REPLACE FUNCTION fn_calcular_precio_venta(
    p_precio_unitario decimal,
    p_iva_cfdi decimal,
    p_margen decimal
) RETURNS decimal AS $$
DECLARE
    v_margen numeric;
    v_iva numeric;
BEGIN
    v_margen := COALESCE(p_margen, 20);
    v_iva := COALESCE(p_iva_cfdi, 0);

    IF p_precio_unitario IS NULL OR p_precio_unitario <= 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND(
        p_precio_unitario * (1 + v_iva / 100) + p_precio_unitario * (v_margen / 100)
    , 2)::decimal;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- STEP 2: Re-populate ALL inventario_almacen records
-- =============================================
UPDATE inventario_almacen ia
SET precio_venta = fn_calcular_precio_venta(
    ia.precio_unitario_lote,
    ia.iva_cfdi,
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
-- Compare old vs new for records with iva > 0:
-- SELECT ia.precio_unitario_lote, ia.iva_cfdi,
--   ROUND((ia.precio_unitario_lote + (ia.precio_unitario_lote * ia.iva_cfdi / 100)) * (1 + COALESCE(p.margen_recomendado,20) / 100), 2) as old_formula,
--   ia.precio_venta as new_formula
-- FROM inventario_almacen ia
-- JOIN productos p ON p.id = ia."productoId"
-- WHERE ia.iva_cfdi > 0
-- LIMIT 10;
