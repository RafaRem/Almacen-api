-- Increase margen_recomendado precision from numeric(5,2) to numeric(10,2)
-- This allows margins up to 99,999,999.99% instead of just 999.99%

-- Drop trigger first (it depends on the column we're altering)
DROP TRIGGER IF EXISTS trg_producto_margen_change ON productos;

-- Alter the column type
ALTER TABLE productos
ALTER COLUMN margen_recomendado TYPE numeric(10,2);

-- Recreate trigger
-- Note: The trigger function fn_actualizar_precios_producto() already exists
-- and will work correctly with the new column type
