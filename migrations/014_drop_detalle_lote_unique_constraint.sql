-- Drop the unique constraint on ("productoId", "loteId") in detalle_lote
-- to allow multiple movements of the same product+lote pair.
-- TypeORM auto-creates constraint name: detalle_lote_productoId_loteId_key
ALTER TABLE detalle_lote DROP CONSTRAINT IF EXISTS detalle_lote_productoId_loteId_key;

-- Add a non-unique index for performance instead
CREATE INDEX IF NOT EXISTS idx_detalle_lote_producto_lote ON detalle_lote ("productoId", "loteId");
