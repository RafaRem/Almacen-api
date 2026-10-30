-- Seed data for regimen_fiscal table
-- Catálogo SAT (c_RegimenFiscal) — subconjunto habilitado

INSERT INTO regimen_fiscal (code, name, type) VALUES
('601', 'General de Ley Personas Morales', 'moral'),
('603', 'Personas Morales con Fines no Lucrativos', 'moral'),
('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'fisica'),
('606', 'Arrendamiento', 'fisica'),
('612', 'Personas Físicas con Actividades Empresariales y Profesionales', 'fisica'),
('616', 'Sin obligaciones fiscales', 'fisica'),
('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 'fisica'),
('626', 'Régimen Simplificado de Confianza', 'ambos')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type;
