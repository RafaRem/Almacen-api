ALTER TABLE productos
ADD COLUMN proveedor_preferido_id UUID REFERENCES proveedores(id);
