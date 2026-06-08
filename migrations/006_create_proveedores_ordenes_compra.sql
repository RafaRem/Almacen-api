-- Migration: Create proveedores, ordenes_compra, detalle_orden_compra tables
-- Date: 2026-06-08
-- Purpose: Sistema de órdenes de compra con proveedores

CREATE TABLE IF NOT EXISTS "proveedores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar(255) NOT NULL,
  "contacto" varchar(255),
  "email" varchar(255),
  "telefono" varchar(50),
  "rfc" varchar(20),
  "calle" varchar(255),
  "numeroExterior" varchar(50),
  "numeroInterior" varchar(50),
  "codigoPostal" varchar(10),
  "colonia" varchar(255),
  "municipio" varchar(255),
  "estado" varchar(255),
  "statusId" int DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ordenes_compra" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "folio" varchar(50) NOT NULL UNIQUE,
  "proveedorId" uuid NOT NULL REFERENCES "proveedores"("id"),
  "status" varchar(20) NOT NULL DEFAULT 'BORRADOR',
  "fechaOrden" date DEFAULT CURRENT_DATE,
  "fechaEsperada" date,
  "observaciones" text,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "detalle_orden_compra" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ordenCompraId" uuid NOT NULL REFERENCES "ordenes_compra"("id") ON DELETE CASCADE,
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "cantidad" int NOT NULL,
  "precioEstimado" decimal(10,2),
  "cantidadRecibida" int DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_oc_proveedor" ON "ordenes_compra" ("proveedorId");
CREATE INDEX IF NOT EXISTS "idx_oc_status" ON "ordenes_compra" ("status");
CREATE INDEX IF NOT EXISTS "idx_doc_orden" ON "detalle_orden_compra" ("ordenCompraId");
CREATE INDEX IF NOT EXISTS "idx_doc_producto" ON "detalle_orden_compra" ("productoId");

-- Rollback:
-- DROP TABLE IF EXISTS "detalle_orden_compra";
-- DROP TABLE IF EXISTS "ordenes_compra";
-- DROP TABLE IF EXISTS "proveedores";
