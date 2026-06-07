-- Migration: Create `descuentos_venta_detalle` table
-- Date: 2026-06-02
-- Purpose: Trazabilidad de descuentos aplicados por línea de venta.
--   Cada fila guarda el desglose por tipo (VOLUMEN, LABORATORIO, CADUCIDAD, CATEGORIA)
--   para auditoría. Una línea de venta con un descuento producto + un descuento
--   categoría genera 2 filas aquí.

CREATE TABLE IF NOT EXISTS "descuentos_venta_detalle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "detalleVentaId" uuid NOT NULL REFERENCES "detalle_venta"("id") ON DELETE CASCADE,
  "descuentoId" uuid NOT NULL REFERENCES "descuentos"("id"),
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "tipo" "descuento_tipo" NOT NULL,
  "porcentaje" decimal(5,2) NOT NULL,
  "monto" decimal(10,2) NOT NULL,
  "motivoGenerado" varchar(255),
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_dvd_detalle" ON "descuentos_venta_detalle" ("detalleVentaId");
CREATE INDEX IF NOT EXISTS "idx_dvd_descuento" ON "descuentos_venta_detalle" ("descuentoId");

-- Rollback (if needed):
-- DROP TABLE IF EXISTS "descuentos_venta_detalle";
