-- ============================================================================
-- MIGRATION VERIFICATION SCRIPT
-- Run this against the target database to check which migrations are pending.
-- All statements use IF NOT EXISTS / IF EXISTS for idempotency.
-- ============================================================================

-- ============================================================================
-- PART 1: Check TypeORM migration status
-- ============================================================================
-- Run separately: npm run migration:show  (from almacen-api directory)
-- or: npm run migration:run

-- ============================================================================
-- PART 2: Verify SQL legacy migrations (001-016)
-- ============================================================================

-- 001: precio_venta column + triggers
SELECT '001' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name='inventario_almacen' AND column_name='precio_venta'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 003: unique constraint inventario_almacen
-- (skipping 002 - data migration, ephemeral)
SELECT '003' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE table_name='inventario_almacen' AND constraint_type='UNIQUE'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 004_add_acumulable_to_descuentos
SELECT '004a' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name='descuentos' AND column_name='acumulable'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 004_add_descuentos_venta_detalle / 005
SELECT '005' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name='descuento_venta_detalle'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 006: proveedores + ordenes_compra
SELECT '006' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name='ordenes_compra'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 009: descuentos_productos
SELECT '009' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name='descuentos_productos'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 010: movimientoId in detalle_venta_lote
SELECT '010' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name='detalle_venta_lote' AND column_name='movimientoid'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 013: recepciones table
SELECT '013' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name='recepciones'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 014: detalle_lote unique constraint dropped
SELECT '014' as migration,
       CASE WHEN NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE table_name='detalle_lote'
           AND constraint_name='detalle_lote_productoId_loteId_key'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 016: folio sequences
SELECT '016' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_class WHERE relname = 'ventas_folio_seq'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- 015: indices
SELECT '015' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_indexes
           WHERE tablename='inventario_almacen' AND indexname='idx_inventario_almacen_productoId'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- TypeORM migration: movimientos_credito table
SELECT 'typeorm' as migration,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_name='movimientos_credito'
       ) THEN 'APPLIED' ELSE 'PENDING' END as status;

-- ============================================================================
-- PART 3: Apply pending migrations safely (uncomment to execute)
-- ============================================================================
-- To apply: uncomment each section that shows PENDING and re-run.
--
-- Example:
-- -- 015: indices
-- CREATE INDEX IF NOT EXISTS idx_inventario_almacen_productoId ON inventario_almacen ("productoId");
-- CREATE INDEX IF NOT EXISTS idx_inventario_almacen_producto_almacen ON inventario_almacen ("productoId", "almacenId");
--
-- 016: sequences
-- CREATE SEQUENCE IF NOT EXISTS public.ventas_folio_seq START 1;
-- CREATE SEQUENCE IF NOT EXISTS public.facturas_folio_seq START 1;
