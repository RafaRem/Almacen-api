-- Drop existing functions before recreating (required because parameter names changed)
DROP FUNCTION IF EXISTS fn_calcular_precio_venta(numeric, numeric);
DROP FUNCTION IF EXISTS fn_calcular_precio_venta(numeric, numeric, numeric);

-- fn_calcular_precio_venta with 2 arguments (precio, margen)
-- Used by: trg_inventario_precio_insert, trg_inventario_precio_change
CREATE FUNCTION fn_calcular_precio_venta(
  p_precio numeric,
  p_margen numeric
) RETURNS numeric AS $$
DECLARE
    margen numeric;
BEGIN
    margen := COALESCE(p_margen, 20);
    IF p_precio IS NULL OR p_precio <= 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND(p_precio * (1 + margen / 100), 2)::decimal;
END;
$$ LANGUAGE plpgsql;

-- fn_calcular_precio_venta with 3 arguments (precio, iva, margen)
-- Used by: trg_producto_margen_change
CREATE FUNCTION fn_calcular_precio_venta(
  p_precio numeric,
  p_iva numeric,
  p_margen numeric
) RETURNS numeric AS $$
DECLARE
    margen numeric;
BEGIN
    margen := COALESCE(p_margen, 20);
    IF p_precio IS NULL OR p_precio <= 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND(p_precio * (1 + COALESCE(p_iva, 0) / 100) * (1 + margen / 100), 2)::decimal;
END;
$$ LANGUAGE plpgsql;
