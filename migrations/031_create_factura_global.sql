-- Facturación global (público en general) — CFDI 4.0
-- Idempotente

CREATE SEQUENCE IF NOT EXISTS factura_global_folio_seq START 1;

CREATE TABLE IF NOT EXISTS factura_global (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  periodicidad varchar(2) NOT NULL,
  variante varchar(50) NOT NULL DEFAULT 'publicoGeneral',
  serie varchar(10),
  folio int,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  mes varchar(2) NOT NULL,
  anio int NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  impuestos numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  uuid varchar(36),
  facturapi_id varchar(64),
  xml_path varchar(500),
  pdf_path varchar(500),
  estado varchar(20) NOT NULL DEFAULT 'BORRADOR',
  fecha_timbrado timestamp,
  cancelacion_motivo varchar(2),
  fecha_cancelacion timestamp,
  usuario_id uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factura_global_detalle (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_global_id uuid NOT NULL REFERENCES factura_global(id) ON DELETE CASCADE,
  venta_id uuid NOT NULL REFERENCES ventas(id),
  folio int NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  iva numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fg_detalle_venta_activa
  ON factura_global_detalle (venta_id) WHERE activo;

CREATE INDEX IF NOT EXISTS idx_fg_detalle_factura
  ON factura_global_detalle (factura_global_id);

CREATE INDEX IF NOT EXISTS idx_fg_fechas
  ON factura_global (fecha_inicio, fecha_fin);
