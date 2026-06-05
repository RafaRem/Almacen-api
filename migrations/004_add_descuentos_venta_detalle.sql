-- =============================================
-- Migration: 004_add_descuentos_venta_detalle
-- Descripción: Agrega tabla para tracking de descuentos aplicados a ventas
-- y columnas nombre/descripcion a tabla descuentos
-- Fecha: 2026-05-28
-- =============================================

-- Agregar columnas nombre y descripcion a tabla descuentos
ALTER TABLE "descuentos" ADD COLUMN IF NOT EXISTS "nombre" varchar(255);
ALTER TABLE "descuentos" ADD COLUMN IF NOT EXISTS "descripcion" text;

-- Crear tabla para tracking de descuentos aplicados
CREATE TABLE IF NOT EXISTS "descuentos_venta_detalle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "detalleVentaId" uuid NOT NULL REFERENCES "detalle_venta"("id") ON DELETE CASCADE,
  "descuentoId" uuid REFERENCES "descuentos"("id") ON DELETE SET NULL,
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "tipo" "descuentos_tipo_enum" NOT NULL,
  "porcentaje" decimal(5,2) NOT NULL,
  "monto" decimal(10,2) NOT NULL,
  "motivoGenerado" text,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_dvd_detalle ON descuentos_venta_detalle(detalleVentaId);
CREATE INDEX IF NOT EXISTS idx_dvd_descuento ON descuentos_venta_detalle(descuentoId);
CREATE INDEX IF NOT EXISTS idx_dvd_producto ON descuentos_venta_detalle(productoId);
