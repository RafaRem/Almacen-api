-- Add index on inventario_almacen.productoId for checkExistence() query performance
-- Query: SELECT inv."productoId" FROM inventario_almacen inv WHERE inv."productoId" IN (...) GROUP BY inv."productoId"
CREATE INDEX IF NOT EXISTS idx_inventario_almacen_productoId ON inventario_almacen ("productoId");

-- Composite index for filtered queries by almacen tipo + producto
-- Note: already covered by uq_producto_lote_almacentipo, but kept for standalone
-- productoId + almacenTipo lookups
CREATE INDEX IF NOT EXISTS idx_inventario_almacen_producto_almacen ON inventario_almacen ("productoId", "almacenTipo");
