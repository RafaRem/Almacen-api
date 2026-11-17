ALTER TABLE producto_presentaciones
  ADD COLUMN IF NOT EXISTS alias character varying(80) NULL;
