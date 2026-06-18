-- Create sequences for ventas and facturas folios
-- Fallback: servicio usa MAX(folio)+1 si la secuencia no existe
-- Estas secuencias garantizan folios estrictamente secuenciales bajo concurrencia
CREATE SEQUENCE IF NOT EXISTS public.ventas_folio_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.facturas_folio_seq START 1;

-- Sync with existing max folios
SELECT setval('public.ventas_folio_seq', COALESCE((SELECT MAX(folio) FROM ventas), 1));
SELECT setval('public.facturas_folio_seq', COALESCE((SELECT MAX(folio) FROM facturas), 1));
