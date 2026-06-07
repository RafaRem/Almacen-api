import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { UserPermission } from '../users/entities/user-permission.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Producto } from '../productos/entities/producto.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { Descuento } from '../descuentos/entities/descuento.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { PagoVenta } from '../ventas/entities/pago-venta.entity';
import { RegimenFiscal } from '../regimen-fiscal/entities/regimen-fiscal.entity';
import { Telefono } from '../telefonos/entities/telefono.entity';
import { Domicilio } from '../domicilios/entities/domicilio.entity';
import { FacturacionCliente } from '../facturacion-cliente/entities/facturacion-cliente.entity';
import { Credito } from '../creditos/entities/credito.entity';
import { MovimientoCredito } from '../creditos/entities/movimiento-credito.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { Configuracion } from '../configuraciones/entities/configuracion.entity';
import { ConfiguracionSistema } from '../configuracion/entities/configuracion-sistema.entity';
import { MovimientoRevertido } from '../movimientos-almacen/entities/movimiento-revertido.entity';
import { DatosEmpresa } from '../empresa/entities/datos-empresa.entity';
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { DetalleVentaLote } from '../ventas/entities/detalle-venta-lote.entity';

config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'almacen_db',
  entities: [
    User,
    UserPermission,
    Laboratorio,
    Lote,
    Producto,
    MovimientoAlmacen,
    CategoriaCliente,
    Descuento,
    DescuentoVentaDetalle,
    DocumentoCliente,
    Cliente,
    Venta,
    DetalleVenta,
    PagoVenta,
    RegimenFiscal,
    Telefono,
    Domicilio,
    FacturacionCliente,
    Credito,
    MovimientoCredito,
    InventarioAlmacen,
    Configuracion,
    ConfiguracionSistema,
    MovimientoRevertido,
    DatosEmpresa,
    DetalleLote,
    DetalleVentaLote,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
