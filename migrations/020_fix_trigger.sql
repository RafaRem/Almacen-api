-- =============================================
-- MIGRATION 020: Fix SQL trigger to remove ivaCfdi from precio_venta formula
-- Description: The trigger fn_actualizar_precio_venta_inventario was still calling
-- the OLD 3-parameter fn_calcular_precio_venta(precio, iva, margen) which included IVA.
-- Now uses the 2-parameter version (precio, margen) without IVA.
-- =============================================

-- =============================================
-- STEP 1: Drop old 3-parameter function
-- =============================================
DROP FUNCTION IF EXISTS fn_calcular_precio_venta(decimal, decimal, decimal);

-- =============================================
-- STEP 2: Recreate trigger function without IVA
-- =============================================
CREATE OR REPLACE FUNCTION fn_actualizar_precio_venta_inventario()
RETURNS TRIGGER AS $$
DECLARE
    margen_prod decimal;
BEGIN
    SELECT COALESCE(margen_recomendado, 20) INTO margen_prod
    FROM productos
    WHERE id = NEW."productoId";

    NEW.precio_venta := fn_calcular_precio_venta(
        NEW.precio_unitario_lote,
        margen_prod
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 3: Re-populate ALL inventario_almacen records
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
