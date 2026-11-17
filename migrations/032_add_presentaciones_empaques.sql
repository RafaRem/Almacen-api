-- Presentaciones de producto y soporte de empaques caja/pieza.

DO $$
BEGIN
  CREATE TYPE public.empaque_estado_enum AS ENUM (
    'PENDIENTE_FACTOR',
    'FACTOR_ASIGNADO',
    'CONVIRTIENDO',
    'CONVERTIDO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.producto_presentaciones_tipo_enum AS ENUM ('PIEZA', 'CAJA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.producto_presentaciones_statusid_enum AS ENUM ('1', '2');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS piezas_por_caja_default integer NULL,
  ADD COLUMN IF NOT EXISTS empaque_estado public.empaque_estado_enum NOT NULL DEFAULT 'PENDIENTE_FACTOR';

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS piezas_por_caja integer NULL,
  ADD COLUMN IF NOT EXISTS empaque_convertido boolean NOT NULL DEFAULT false;

ALTER TABLE inventario_almacen
  ADD COLUMN IF NOT EXISTS precio_venta_caja numeric(10,2) NULL;

ALTER TABLE inventario_almacen
  ALTER COLUMN precio_unitario_lote TYPE numeric(12,6)
  USING precio_unitario_lote::numeric(12,6);

ALTER TABLE detalle_venta
  ADD COLUMN IF NOT EXISTS presentacionid uuid NULL,
  ADD COLUMN IF NOT EXISTS factor_unidades integer NULL,
  ADD COLUMN IF NOT EXISTS cantidad_base integer NULL;

ALTER TABLE detalle_venta
  ALTER COLUMN costounitario TYPE numeric(12,6)
  USING costounitario::numeric(12,6);

ALTER TABLE detalle_orden_compra
  ADD COLUMN IF NOT EXISTS presentacionid uuid NULL,
  ADD COLUMN IF NOT EXISTS factor_unidades integer NULL;

ALTER TABLE factura_detalles
  ADD COLUMN IF NOT EXISTS presentacionid uuid NULL;

CREATE TABLE IF NOT EXISTS producto_presentaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  productoid uuid NOT NULL,
  nombre character varying(80) NOT NULL,
  tipo public.producto_presentaciones_tipo_enum NOT NULL,
  factor_unidades integer NOT NULL,
  codigo_barras character varying NULL,
  es_default boolean NOT NULL DEFAULT false,
  statusid public.producto_presentaciones_statusid_enum NOT NULL DEFAULT '1',
  createdat timestamp NOT NULL DEFAULT now(),
  updatedat timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_producto_presentaciones" PRIMARY KEY (id),
  CONSTRAINT "UQ_producto_presentaciones_codigo_barras" UNIQUE (codigo_barras),
  CONSTRAINT "FK_producto_presentaciones_producto"
    FOREIGN KEY (productoid) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_presentacion_producto_tipo
  ON producto_presentaciones (productoid, tipo);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_detalle_venta_presentacion'
  ) THEN
    ALTER TABLE detalle_venta
      ADD CONSTRAINT "FK_detalle_venta_presentacion"
      FOREIGN KEY (presentacionid)
      REFERENCES producto_presentaciones(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_detalle_orden_compra_presentacion'
  ) THEN
    ALTER TABLE detalle_orden_compra
      ADD CONSTRAINT "FK_detalle_orden_compra_presentacion"
      FOREIGN KEY (presentacionid)
      REFERENCES producto_presentaciones(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_factura_detalles_presentacion'
  ) THEN
    ALTER TABLE factura_detalles
      ADD CONSTRAINT "FK_factura_detalles_presentacion"
      FOREIGN KEY (presentacionid)
      REFERENCES producto_presentaciones(id)
      ON DELETE SET NULL;
  END IF;
END $$;
