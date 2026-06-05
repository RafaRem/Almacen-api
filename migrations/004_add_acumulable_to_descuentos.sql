-- Migration: Add `acumulable` column to `descuentos` table
-- Date: 2026-06-02
-- Purpose: Support accumulated discounts (producto + categoria)
--   - When `acumulable = true`, this discount combines with other product discounts
--   - Default `false` preserves legacy behavior (one best discount per product)

ALTER TABLE descuentos
ADD COLUMN IF NOT EXISTS acumulable BOOLEAN NOT NULL DEFAULT FALSE;

-- Rollback (if needed):
-- ALTER TABLE descuentos DROP COLUMN IF EXISTS acumulable;
