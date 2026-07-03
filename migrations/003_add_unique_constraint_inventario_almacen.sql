-- Migration: Add unique constraint to inventario_almacen
-- Date: 2026-05-13
-- Purpose: Ensure (productoId, loteId, almacenTipo) uniqueness for data integrity and scalability

-- ============================================
-- STEP 1: Check for existing duplicates
-- ============================================
-- Run this query to see if there are any duplicate combinations
-- If the result is empty, you can proceed to STEP 2
-- If there are results, you need to clean them up before adding the constraint

SELECT
    producto_id,
    lote_id,
    almacen_tipo,
    COUNT(*) as duplicate_count
FROM inventario_almacen
GROUP BY producto_id, lote_id, almacen_tipo
HAVING COUNT(*) > 1;

-- ============================================
-- STEP 2: Clean up duplicates (IF NEEDED)
-- ============================================
-- Only run this section if STEP 1 returned results
-- This keeps the oldest record (by id) and deletes newer duplicates

-- DELETE FROM inventario_almacen WHERE id IN (
--     SELECT id FROM (
--         SELECT id, ROW_NUMBER() OVER (
--             PARTITION BY producto_id, lote_id, almacen_tipo
--             ORDER BY created_at ASC
--         ) as rn
--         FROM inventario_almacen
--     ) t
--     WHERE rn > 1
-- );

-- ============================================
-- STEP 3: Add unique constraint
-- ============================================

ALTER TABLE inventario_almacen
ADD CONSTRAINT uq_producto_lote_almacentipo
UNIQUE ("productoId", "loteId", "almacenTipo");

SELECT conname, conindid::regclass as index_name
FROM pg_constraint
WHERE conname = 'uq_producto_lote_almacentipo';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- ALTER TABLE inventario_almacen
-- DROP CONSTRAINT IF EXISTS uq_producto_lote_almacentipo;
