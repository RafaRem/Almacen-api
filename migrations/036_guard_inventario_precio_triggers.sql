-- Evita que los triggers legacy sobrescriban precios explícitos o pendientes
-- de productos ya convertidos a presentaciones.

CREATE OR REPLACE FUNCTION fn_actualizar_precio_venta_inventario()
RETURNS TRIGGER AS $$
DECLARE
  margen_prod decimal;
  empaque text;
BEGIN
  IF NEW.precio_venta IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(margen_recomendado, 20),
    empaque_estado::text
  INTO margen_prod, empaque
  FROM productos
  WHERE id = NEW."productoId";

  IF empaque = 'CONVERTIDO' THEN
    RETURN NEW;
  END IF;

  NEW.precio_venta := fn_calcular_precio_venta(
    NEW.precio_unitario_lote,
    margen_prod
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_actualizar_precios_producto()
RETURNS TRIGGER AS $$
DECLARE
  margen numeric;
  empaque text;
BEGIN
  margen := COALESCE(NEW.margen_recomendado, 20);
  empaque := NEW.empaque_estado::text;

  IF empaque <> 'CONVERTIDO' THEN
    UPDATE inventario_almacen
    SET precio_venta = fn_calcular_precio_venta(
      precio_unitario_lote,
      margen
    )
    WHERE "productoId" = NEW.id
      AND (precio_venta IS NULL OR precio_venta = 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS trg_inventario_precio_insert ON inventario_almacen;
CREATE TRIGGER trg_inventario_precio_insert
  BEFORE INSERT ON inventario_almacen
  FOR EACH ROW
  EXECUTE FUNCTION fn_actualizar_precio_venta_inventario();

DROP TRIGGER IF EXISTS trg_producto_margen_change ON productos;
CREATE TRIGGER trg_producto_margen_change
  AFTER UPDATE OF margen_recomendado
  ON productos
  FOR EACH ROW
  WHEN (OLD.margen_recomendado IS DISTINCT FROM NEW.margen_recomendado)
  EXECUTE FUNCTION fn_actualizar_precios_producto();
