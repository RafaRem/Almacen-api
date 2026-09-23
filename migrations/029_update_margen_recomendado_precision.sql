-- Increase margen_recomendado precision from numeric(5,2) to numeric(10,2)
-- This allows margins up to 99,999,999.99% instead of just 999.99%
ALTER TABLE productos
ALTER COLUMN margen_recomendado TYPE numeric(10,2);
