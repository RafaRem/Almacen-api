-- Migración de tipos de usuario a español
-- Ejecutar en la base de datos

UPDATE users SET tipo = 'usuario' WHERE tipo = 'user';
UPDATE users SET tipo = 'caja' WHERE tipo = 'operator';
