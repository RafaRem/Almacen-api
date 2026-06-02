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
-- User Permissions
-- =============================================
CREATE TABLE "user_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module" varchar(50) NOT NULL,
  "can_view" boolean DEFAULT true,
  UNIQUE("user_id", "module")
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
  "stockMaximo" integer DEFAULT 100,
  "precio" decimal(10,2) DEFAULT 0,
  "margen_recomendado" decimal(5,2),
  "claveProdServ" varchar,
  "claveUnidad" varchar,
  "statusId" integer DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Inventario Almacen
-- =============================================
CREATE TABLE "inventario_almacen" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "loteId" uuid NOT NULL REFERENCES "lotes"("id"),
  "almacenTipo" varchar(50) NOT NULL,
  "cantidadActual" decimal(10,2) DEFAULT 0,
  "ivaPersonalizado" decimal(5,2),
  "ivaCfdi" decimal(5,2),
  "precioUnitarioLote" decimal(10,2) DEFAULT 0,
  "precioVenta" decimal(10,2) DEFAULT 0,
  "ultimoMovimientoId" uuid,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("productoId", "loteId", "almacenTipo")
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
  "nombre" varchar(255),
  "descripcion" text,
  "tipo" "descuento_tipo" NOT NULL,
  "condiciones" jsonb,
  "porcentaje" decimal(5,2) NOT NULL,
  "monto" decimal(10,2),
  "laboratorioId" uuid,
  "categoriaClienteId" uuid,
  "fechaInicio" date,
  "fechaFin" date,
  "statusId" integer DEFAULT 1,
  "prioridad" integer DEFAULT 0,
  "acumulable" boolean NOT NULL DEFAULT FALSE,
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
  "folio" serial UNIQUE,
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
-- Configuraciones Sistema
-- =============================================
CREATE TABLE "configuraciones_sistema" (
  "id" SERIAL PRIMARY KEY,
  "clave" varchar UNIQUE NOT NULL,
  "valor" jsonb DEFAULT '{}',
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Detalle Lote (para análisis de reportes de entradas)
-- Mantiene datos detallados del lote al momento de la recepción
-- =============================================
CREATE TABLE "detalle_lote" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "loteId" uuid NOT NULL REFERENCES "lotes"("id"),
  "cantidad" decimal(10,2) DEFAULT 0,
  "precioUnitario" decimal(10,2) DEFAULT 0,
  "ivaCfdi" decimal(5,2),
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("productoId", "loteId")
);

-- =============================================
-- Descuentos Venta Detalle
-- Tracking de descuentos aplicados a cada línea de venta
-- =============================================
CREATE TABLE "descuentos_venta_detalle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "detalleVentaId" uuid NOT NULL REFERENCES "detalle_venta"("id") ON DELETE CASCADE,
  "descuentoId" uuid REFERENCES "descuentos"("id") ON DELETE SET NULL,
  "productoId" uuid NOT NULL REFERENCES "productos"("id"),
  "tipo" "descuento_tipo" NOT NULL,
  "porcentaje" decimal(5,2) NOT NULL,
  "monto" decimal(10,2) NOT NULL,
  "motivoGenerado" text,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dvd_detalle ON descuentos_venta_detalle(detalleVentaId);
CREATE INDEX idx_dvd_descuento ON descuentos_venta_detalle(descuentoId);
CREATE INDEX idx_dvd_producto ON descuentos_venta_detalle(productoId);


INSERT INTO configuraciones_sistema ("clave", "valor") VALUES
  ('empresa', '{"nombre": "Distribuidora", "direccion": "", "rfc": "", "telefono": "", "email": ""}');

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
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "monto", "categoriaClienteId", "laboratorioId", "statusId", "prioridad")
SELECT 'CATEGORIA', '{"minCantidad": 10}', 5.00, NULL, id, NULL, 1, 1 FROM categorias_cliente WHERE nombre = 'Categoría 1'
UNION ALL
SELECT 'VOLUMEN', '{"minCantidad": 5}', 3.00, NULL, NULL, NULL, 1, 2
UNION ALL
SELECT 'LABORATORIO', '{"minCantidad": 1}', 10.00, NULL, NULL, (SELECT id FROM laboratorios WHERE nombre = 'Pfizer'), 1, 3
UNION ALL
SELECT 'CADUCIDAD', '{"diasPrevios": 30}', 15.00, NULL, NULL, NULL, 1, 0
UNION ALL
SELECT 'CATEGORIA', '{"minCantidad": 1}', 8.00, NULL, (SELECT id FROM categorias_cliente WHERE nombre = 'Categoría 3'), NULL, 1, 1;

-- =============================================
-- FUNCTIONS AND TRIGGERS FOR PRECIO VENTA CALCULATION
-- Formula: precioVenta = (precioUnitarioLote + (precioUnitarioLote * ivaCfdi / 100)) * (1 + margen / 100)
-- =============================================

-- Function to calculate precioVenta
CREATE OR REPLACE FUNCTION fn_calcular_precio_venta(
    p_precio_unitario decimal,
    p_iva_cfdi decimal,
    p_margen decimal
) RETURNS decimal AS $$
DECLARE
    v_margen numeric;
    v_iva numeric;
BEGIN
    v_margen := COALESCE(p_margen, 20);
    v_iva := COALESCE(p_iva_cfdi, 0);

    IF p_precio_unitario IS NULL OR p_precio_unitario <= 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND(
        (p_precio_unitario + (p_precio_unitario * v_iva / 100)) * (1 + v_margen / 100)
    , 2)::decimal;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function for inventario_almacen updates/inserts
CREATE OR REPLACE FUNCTION fn_actualizar_precio_venta_inventario()
RETURNS TRIGGER AS $$
DECLARE
    margen_prod decimal;
BEGIN
    SELECT COALESCE(margen_recomendado, 20)
    INTO margen_prod
    FROM productos
    WHERE id = NEW.producto_id;

    NEW.precio_venta := fn_calcular_precio_venta(
        NEW.precio_unitario_lote,
        NEW.iva_cfdi,
        margen_prod
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on inventario_almacen for UPDATE
DROP TRIGGER IF EXISTS trg_inventario_precio_change ON inventario_almacen;
CREATE TRIGGER trg_inventario_precio_change
    BEFORE UPDATE OF precio_unitario_lote, iva_cfdi
    ON inventario_almacen
    FOR EACH ROW
    WHEN (
        OLD.precio_unitario_lote IS DISTINCT FROM NEW.precio_unitario_lote OR
        OLD.iva_cfdi IS DISTINCT FROM NEW.iva_cfdi
    )
    EXECUTE FUNCTION fn_actualizar_precio_venta_inventario();

-- Trigger on inventario_almacen for INSERT
DROP TRIGGER IF EXISTS trg_inventario_precio_insert ON inventario_almacen;
CREATE TRIGGER trg_inventario_precio_insert
    BEFORE INSERT ON inventario_almacen
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_precio_venta_inventario();

-- Trigger function for productos margen_recomendado updates
CREATE OR REPLACE FUNCTION fn_actualizar_precios_producto()
RETURNS TRIGGER AS $$
DECLARE
    margen numeric;
BEGIN
    margen := COALESCE(NEW.margen_recomendado, 20);

    UPDATE inventario_almacen
    SET precio_venta = fn_calcular_precio_venta(
        precio_unitario_lote,
        iva_cfdi,
        margen
    )
    WHERE producto_id = NEW.id;


$$ LANGUAGE plpgsql;

-- Trigger on productos for margen_recomendado changes
DROP TRIGGER IF EXISTS trg_producto_margen_change ON productos;
CREATE TRIGGER trg_producto_margen_change
    AFTER UPDATE OF margen_recomendado
    ON productos
    FOR EACH ROW
    WHEN (OLD.margen_recomendado IS DISTINCT FROM NEW.margen_recomendado)
    EXECUTE FUNCTION fn_actualizar_precios_producto();
