-- =============================================
-- MIGRATION: Add precio_venta column and triggers
-- Description: Add precio_venta to inventario_almacen and create triggers
--              for automatic calculation based on formula:
--              precioVenta = (precioUnitarioLote + (precioUnitarioLote * ivaCfdi / 100)) * (1 + margen / 100)
-- =============================================

-- =============================================
-- STEP 1: Add precio_venta column to inventario_almacen
-- =============================================
ALTER TABLE inventario_almacen
ADD COLUMN IF NOT EXISTS precio_venta decimal(10,2) DEFAULT 0;

-- =============================================
-- STEP 2: Create function to calculate precioVenta
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
        (p_precio_unitario + (p_precio_unitario * v_iva / 100)) * (1 + v_margen / 100)
    , 2)::decimal;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- STEP 3: Create trigger function for inventario_almacen updates
-- =============================================
CREATE OR REPLACE FUNCTION fn_actualizar_precio_venta_inventario()
RETURNS TRIGGER AS $$
DECLARE
    margen_prod decimal;
BEGIN
    -- Get margen_recomendado from producto, default to 20 if null
    SELECT COALESCE(margen_recomendado, 20)
    INTO margen_prod
    FROM productos
    WHERE id = NEW."productoId";

    -- Calculate and set precio_venta
    NEW.precio_venta := fn_calcular_precio_venta(
        NEW.precio_unitario_lote,
        NEW.iva_cfdi,
        margen_prod
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 4: Create trigger on inventario_almacen for UPDATE
-- =============================================
DROP TRIGGER IF EXISTS trg_inventario_precio_change ON inventario_almacen;
CREATE TRIGGER trg_inventario_precio_change
    BEFORE UPDATE OF precio_unitario_lote, iva_cfdi
    ON inventario_almacen
    FOR EACH ROW
    WHEN (
        OLD.precio_unitario_lote IS DISTINCT FROM NEW.precio_unitario_lote OR
        OLD.iva_cfdi IS DISTINCT FROM NEW.iva_cfdi
    )
    EXECUTE FUNCTION fn_actualizar_precio_venta_inventario();

-- =============================================
-- STEP 5: Create trigger on inventario_almacen for INSERT
-- =============================================
DROP TRIGGER IF EXISTS trg_inventario_precio_insert ON inventario_almacen;
CREATE TRIGGER trg_inventario_precio_insert
    BEFORE INSERT ON inventario_almacen
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_precio_venta_inventario();

-- =============================================
-- STEP 6: Create trigger function for productos updates
-- =============================================
CREATE OR REPLACE FUNCTION fn_actualizar_precios_producto()
RETURNS TRIGGER AS $$
DECLARE
    margen numeric;
BEGIN
    margen := COALESCE(NEW.margen_recomendado, 20);

    UPDATE inventario_almacen
    SET precio_venta = fn_calcular_precio_venta(
        precio_unitario_lote,
        iva_cfdi,
        margen
    )
    WHERE "productoId" = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 7: Create trigger on productos for margen_recomendado changes
-- =============================================
DROP TRIGGER IF EXISTS trg_producto_margen_change ON productos;
CREATE TRIGGER trg_producto_margen_change
    AFTER UPDATE OF margen_recomendado
    ON productos
    FOR EACH ROW
    WHEN (OLD.margen_recomendado IS DISTINCT FROM NEW.margen_recomendado)
    EXECUTE FUNCTION fn_actualizar_precios_producto();

-- =============================================
-- STEP 8: Populate existing inventario_almacen records
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
WHERE ia.precio_venta IS NULL OR ia.precio_venta = 0;

-- =============================================
-- VERIFICATION: Check results
-- =============================================
-- SELECT 'Inventario with precio_venta populated:' as info;
-- SELECT COUNT(*) as total_inventario FROM inventario_almacen;
-- SELECT COUNT(*) as populated FROM inventario_almacen WHERE precio_venta > 0;
-- SELECT COUNT(*) as empty FROM inventario_almacen WHERE precio_venta IS NULL OR precio_venta = 0;
