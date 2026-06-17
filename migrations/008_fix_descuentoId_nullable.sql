-- Migration: Fix descuento_venta_detalle.descuentoId to allow NULL
-- Date: 2026-06-08
-- Purpose: CATEGORIA discounts from categorias_cliente table have no descuentoId.
--   The original migration 005 incorrectly set NOT NULL.

ALTER TABLE "descuentos_venta_detalle" ALTER COLUMN "descuentoId" DROP NOT NULL;
