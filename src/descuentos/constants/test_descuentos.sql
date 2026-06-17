-- =============================================
-- SCRIPT DE PRUEBA: Descuentos Acumulables
-- Base de datos: almacen_db
-- =============================================

-- 1. Descuento por VOLUMEN (10%): aplica a productos con cantidad >= 5
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "statusId", "prioridad", "acumulable")
VALUES ('VOLUMEN', '{"minCantidad": 5}', 10, 1, 1, false);

-- 2. Descuento por CADUCIDAD (8%): productos próximos a vencer (30 días antes)
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "statusId", "prioridad", "acumulable")
VALUES ('CADUCIDAD', '{"diasPrevios": 30}', 8, 1, 2, false);

-- 3. Descuento por LABORATORIO (5%): laboratorio FEPU TEST LAB COMPO B
-- ID: 3566a1c6-2512-4759-9b3c-286c39793277
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "laboratorioId", "statusId", "prioridad", "acumulable")
VALUES ('LABORATORIO', NULL, 5, '3566a1c6-2512-4759-9b3c-286c39793277', 1, 3, false);

-- 4. Descuento por CATEGORIA (15%): Categoría 5
-- ID: 431d5151-cedb-4856-8dfd-d25868b44b9f
INSERT INTO descuentos ("tipo", "condiciones", "porcentaje", "categoriaClienteId", "statusId", "prioridad", "acumulable")
VALUES ('CATEGORIA', NULL, 15, '431d5151-cedb-4856-8dfd-d25868b44b9f', 1, 4, true);

-- =============================================
-- VERIFICAR
-- =============================================
SELECT id, tipo, porcentaje, prioridad, acumulable,
       CASE
         WHEN tipo = 'VOLUMEN' THEN 'minCantidad: ' || (condiciones->>'minCantidad')
         WHEN tipo = 'CADUCIDAD' THEN 'diasPrevios: ' || (condiciones->>'diasPrevios')
         WHEN tipo = 'LABORATORIO' THEN 'laboratorioId: ' || laboratorioId
         WHEN tipo = 'CATEGORIA' THEN 'categoriaClienteId: ' || categoriaClienteId
       END as detalle
FROM descuentos WHERE statusId = '1';