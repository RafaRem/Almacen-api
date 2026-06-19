-- Add index on inventario_almacen.productoId for checkExistence() query performance
-- Query: SELECT inv."productoId" FROM inventario_almacen inv WHERE inv."productoId" IN (...) GROUP BY inv."productoId"
CREATE INDEX IF NOT EXISTS idx_inventario_almacen_productoId ON inventario_almacen ("productoId");

-- Composite index for filtered queries by almacen + producto
CREATE INDEX IF NOT EXISTS idx_inventario_almacen_producto_almacen ON inventario_almacen ("productoId", "almacenId");
