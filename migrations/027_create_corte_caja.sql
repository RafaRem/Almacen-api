-- Create CorteCaja and CorteCajaVenta tables for session management

BEGIN;

CREATE TABLE IF NOT EXISTS corte_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    fecha_apertura TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ABIERTA',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corte_caja_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corte_caja_id UUID NOT NULL REFERENCES corte_caja(id) ON DELETE CASCADE,
    venta_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_corte_caja_usuario_status ON corte_caja(usuario_id, status);
CREATE INDEX IF NOT EXISTS idx_corte_caja_venta_corte ON corte_caja_venta(corte_caja_id);
CREATE INDEX IF NOT EXISTS idx_corte_caja_venta_venta ON corte_caja_venta(venta_id);

COMMIT;
