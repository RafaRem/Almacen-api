ALTER TABLE detalle_venta_lote
  ADD COLUMN IF NOT EXISTS precio_unitario numeric(12,6) NULL,
  ADD COLUMN IF NOT EXISTS costo_unitario numeric(12,6) NULL,
  ADD COLUMN IF NOT EXISTS factor_unidades integer NULL,
  ADD COLUMN IF NOT EXISTS iva_tasa numeric(5,2) NULL;
