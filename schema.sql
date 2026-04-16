-- =============================================
-- SCRIPT SQL PARA CREAR TABLAS
-- Base de datos: almacen-api (PostgreSQL)
-- =============================================

-- Enums para valores STRING
CREATE TYPE "user_tipo" AS ENUM ('admin', 'user', 'operator');
CREATE TYPE "descuento_tipo" AS ENUM ('CADUCIDAD', 'VOLUMEN', 'CATEGORIA', 'LABORATORIO');
CREATE TYPE "tipo_documento" AS ENUM ('AVISO_FUNCIONAMIENTO', 'LICENCIA_SANITARIA');
CREATE TYPE "metodo_pago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA');

-- =============================================
-- Users
-- =============================================
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar NOT NULL,
  "email" varchar UNIQUE NOT NULL,
  "username" varchar UNIQUE NOT NULL,
  "password" varchar NOT NULL,
  "provisionalPassword" varchar,
  "tipo" "user_tipo" DEFAULT 'user',
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Laboratorios
-- =============================================
CREATE TABLE "laboratorios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar NOT NULL,
  "descripcion" varchar,
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Lotes
-- =============================================
CREATE TABLE "lotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "numeroLote" varchar UNIQUE NOT NULL,
  "precio" decimal(10,2) NOT NULL,
  "fechaCaducidad" date NOT NULL,
  "laboratorioId" uuid REFERENCES "laboratorios"("id"),
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Productos
-- =============================================
CREATE TABLE "productos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar NOT NULL,
  "descripcion" varchar,
  "codigoBarras" varchar UNIQUE NOT NULL,
  "laboratorioId" uuid REFERENCES "laboratorios"("id"),
  "loteId" uuid REFERENCES "lotes"("id"),
  "stock" integer DEFAULT 0,
  "stockMinimo" integer DEFAULT 10,
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Movimientos Almacen
-- =============================================
CREATE TABLE "movimientos_almacen" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productoId" uuid REFERENCES "productos"("id"),
  "loteId" uuid REFERENCES "lotes"("id"),
  "almacenOrigen" integer NOT NULL,
  "almacenDestino" integer NOT NULL,
  "cantidad" integer NOT NULL,
  "fecha" timestamp DEFAULT CURRENT_TIMESTAMP,
  "userId" uuid REFERENCES "users"("id"),
  "observaciones" varchar
);

-- =============================================
-- Categorias Cliente
-- =============================================
CREATE TABLE "categorias_cliente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar NOT NULL,
  "descuento" decimal(5,2) NOT NULL,
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Clientes (NUEVO)
-- =============================================
CREATE TABLE "clientes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nombre" varchar(255) NOT NULL,
  "apellidoPaterno" varchar(255),
  "apellidoMaterno" varchar(255),
  "email" varchar(255) UNIQUE NOT NULL,
  "telefono" varchar(20),
  "direccion" text,
  "rfc" varchar(20) UNIQUE,
  "usoCfdi" varchar(3),
  "regimenFiscal" varchar(10),
  "codigoPostal" varchar(5),
  "categoriaclienteid" uuid REFERENCES "categorias_cliente"("id"),
  "statusid" integer DEFAULT 1,
  "createdat" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedat" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Descuentos
-- =============================================
CREATE TABLE "descuentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tipo" "descuento_tipo" NOT NULL,
  "condiciones" jsonb,
  "porcentaje" decimal(5,2) NOT NULL,
  "laboratorioId" uuid,
  "categoriaClienteId" uuid,
  "fechaInicio" date,
  "fechaFin" date,
  "statusId" integer DEFAULT 1,
  "prioridad" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Documentos Cliente
-- =============================================
CREATE TABLE "documentos_cliente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clienteId" uuid NOT NULL,
  "tipoDocumento" "tipo_documento" NOT NULL,
  "nombreArchivo" varchar NOT NULL,
  "rutaArchivo" varchar NOT NULL,
  "mimeType" varchar NOT NULL,
  "tamano" integer NOT NULL,
  "fechaSubida" timestamp DEFAULT CURRENT_TIMESTAMP,
  "vigencia" date,
  "statusId" integer DEFAULT 1
);

-- =============================================
-- Ventas (NUEVO)
-- =============================================
CREATE TABLE "ventas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clienteid" uuid REFERENCES "clientes"("id"),
  "usuarioid" uuid NOT NULL REFERENCES "users"("id"),
  "subtotal" decimal(10,2) DEFAULT 0,
  "descuentoaplicado" decimal(10,2) DEFAULT 0,
  "iva" decimal(10,2) DEFAULT 0,
  "total" decimal(10,2) DEFAULT 0,
  "metodopago" "metodo_pago" DEFAULT 'EFECTIVO',
  "observaciones" text,
  "statusid" integer DEFAULT 1,
  "createdat" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedat" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Detalle Venta (NUEVO)
-- =============================================
CREATE TABLE "detalle_venta" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ventaid" uuid NOT NULL REFERENCES "ventas"("id") ON DELETE CASCADE,
  "productoid" uuid NOT NULL REFERENCES "productos"("id"),
  "loteid" uuid NOT NULL REFERENCES "lotes"("id"),
  "cantidad" integer NOT NULL,
  "preciounitario" decimal(10,2) NOT NULL,
  "descuentolinea" decimal(10,2) DEFAULT 0,
  "subtotal" decimal(10,2) NOT NULL
);

-- =============================================
-- DATOS DE PRUEBA
-- =============================================

-- Usuario admin por defecto (password: admin123)
INSERT INTO users ("name", "email", "username", "password", "tipo", "statusId") VALUES
  ('Administrador', 'admin@almacen.com', 'admin', '$2b$10$Tct.Yag4r8jRGmbndOushOAnvNjQuTgEvBECXSgUQ/2MNQIddBq1q', 'admin', 1);

-- Segundo usuario (password: user123)
INSERT INTO users ("name", "email", "username", "password", "tipo", "statusId") VALUES
  ('Operador', 'operador@almacen.com', 'operador', '$2b$10$rqJDAcGGDPQYQf3rVzVVBu7LWkfBJ4jTXMTRqvfFz8YqYvN7lLqOq', 'operator', 1);

-- Categorías de cliente (0% - 10%)
INSERT INTO categorias_cliente ("nombre", "descuento", "statusId") VALUES
  ('Sin Categoría', 0, 1),
  ('Categoría 1', 2, 1),
  ('Categoría 2', 4, 1),
  ('Categoría 3', 6, 1),
  ('Categoría 4', 8, 1),
  ('Categoría 5', 10, 1);

-- Laboratorios
INSERT INTO laboratorios ("nombre", "descripcion", "statusId") VALUES
  ('Pfizer', 'Laboratorio Pfizer', 1),
  ('Bayer', 'Laboratorio Bayer', 1),
  ('Genomma', 'Laboratorio Genomma', 1);

-- Lotes (con precios y fechas de caducidad)
INSERT INTO lotes ("numeroLote", "precio", "fechaCaducidad", "laboratorioId", "statusId") 
SELECT 'LOTE-001', 150.00, '2027-12-31', id, 1 FROM laboratorios WHERE nombre = 'Pfizer'
UNION ALL
SELECT 'LOTE-002', 85.50, '2026-06-15', id, 1 FROM laboratorios WHERE nombre = 'Bayer'
UNION ALL
SELECT 'LOTE-003', 45.00, '2026-12-01', id, 1 FROM laboratorios WHERE nombre = 'Genomma'
UNION ALL
SELECT 'LOTE-004', 200.00, '2028-03-20', id, 1 FROM laboratorios WHERE nombre = 'Pfizer';

-- Productos
INSERT INTO productos ("nombre", "descripcion", "codigoBarras", "laboratorioId", "loteId", "stock", "stockMinimo", "statusId")
SELECT 'Paracetamol 500mg', 'Analgésico', '7501234567890', l.id, l.id, 100, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-001'
UNION ALL
SELECT 'Ibuprofeno 400mg', 'Antiinflamatorio', '7501234567891', l.id, l.id, 50, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-002'
UNION ALL
SELECT 'Vitamina C 500mg', 'Suplemento vitamínico', '7501234567892', l.id, l.id, 75, 15, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-003'
UNION ALL
SELECT 'Amoxicilina 500mg', 'Antibiótico', '7501234567893', l.id, l.id, 30, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-001'
UNION ALL
SELECT 'Aspirina 500mg', 'Analgésico y antipirético', '7501234567894', l.id, l.id, 60, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-002'
UNION ALL
SELECT 'Omeprazol 20mg', 'Antiácido', '7501234567895', l.id, l.id, 45, 12, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-003'
UNION ALL
SELECT 'Loratadina 10mg', 'Antihistamínico', '7501234567896', l.id, l.id, 40, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-004'
UNION ALL
SELECT 'Metformina 850mg', 'Antidiabético', '7501234567897', l.id, l.id, 55, 15, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-002'
UNION ALL
SELECT 'Enalapril 10mg', 'Antihipertensivo', '7501234567898', l.id, l.id, 35, 10, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-004'
UNION ALL
SELECT 'Vitamina B12', 'Suplemento vitamínico', '7501234567899', l.id, l.id, 80, 20, 1
FROM lotes l WHERE l."numeroLote" = 'LOTE-003';

-- Clientes de prueba
INSERT INTO clientes ("nombre", "email", "telefono", "direccion", "rfc", "categoriaclienteid") VALUES
  ('Juan Pérez', 'juan@example.com', '555-123-4567', 'Av. Principal 123, CDMX', 'PEPJ800110ABC', NULL),
  ('María López', 'maria@example.com', '555-234-5678', 'Calle Secundaria 456, Guadalajara', 'MLOP750220DEF', NULL),
  ('Carlos García', 'carlos@example.com', '555-345-6789', 'Blvd. Central 789, Monterrey', 'CGAR820405GHI', NULL),
  ('Ana Martínez', 'ana@example.com', '555-456-7890', 'Av. Libertad 321, Puebla', 'AMMU901115JKL', NULL),
  ('Roberto Sánchez', 'roberto@example.com', '555-567-8901', 'Calle Nogal 654, León', 'RSHZ760330MNO', NULL);

-- Descuentos de prueba
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "categoriaClienteId", "laboratorioId", "statusId", "prioridad") 
SELECT 'CATEGORIA', '{"minCantidad": 10}', 5.00, id, NULL, 1, 1 FROM categorias_cliente WHERE nombre = 'Categoría 1'
UNION ALL
SELECT 'VOLUMEN', '{"minCantidad": 5}', 3.00, NULL, NULL, 1, 2
UNION ALL
SELECT 'LABORATORIO', '{"minCantidad": 1}', 10.00, NULL, (SELECT id FROM laboratorios WHERE nombre = 'Pfizer'), 1, 3
UNION ALL
SELECT 'CADUCIDAD', '{"diasPrevios": 30}', 15.00, NULL, NULL, 1, 0
UNION ALL
SELECT 'CATEGORIA', '{"minCantidad": 1}', 8.00, (SELECT id FROM categorias_cliente WHERE nombre = 'Categoría 3'), NULL, 1, 1;
