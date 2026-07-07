ALTER TABLE clientes ADD COLUMN codigo VARCHAR(20);

WITH numbered AS (
  SELECT id, 'CLI-' || LPAD(CAST(row_number() OVER (ORDER BY created_at) AS TEXT), 4, '0') AS new_codigo
  FROM clientes
)
UPDATE clientes c SET codigo = n.new_codigo
FROM numbered n WHERE c.id = n.id;

ALTER TABLE clientes ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE clientes ADD CONSTRAINT uq_clientes_codigo UNIQUE (codigo);
