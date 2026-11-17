-- Snapshot fiscal de presentación e IVA para venta, factura y tickets.

ALTER TABLE detalle_venta
  ADD COLUMN IF NOT EXISTS presentacion_alias character varying(80) NULL,
  ADD COLUMN IF NOT EXISTS tipo_presentacion character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS clave_unidad character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS unidad character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS iva_tasa numeric(5,2) NULL,
  ADD COLUMN IF NOT EXISTS iva_importe numeric(12,2) NULL;

ALTER TABLE factura_detalles
  ADD COLUMN IF NOT EXISTS factor_unidades integer NULL,
  ADD COLUMN IF NOT EXISTS cantidad_base integer NULL,
  ADD COLUMN IF NOT EXISTS tipo_presentacion character varying(20) NULL,
  ADD COLUMN IF NOT EXISTS presentacion_alias character varying(80) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_factura_venta_activa
  ON facturas ("ventaid")
  WHERE "ventaid" IS NOT NULL
    AND "statusId" IN (1, 2);
