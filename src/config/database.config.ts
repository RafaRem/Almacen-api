import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Producto } from '../productos/entities/producto.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { Descuento } from '../descuentos/entities/descuento.entity';
import { DescuentoProducto } from '../descuentos/entities/descuento-producto.entity';
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
import { UserPermission } from '../users/entities/user-permission.entity';
import { DatosEmpresa } from '../empresa/entities/datos-empresa.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { Recepcion } from '../recepciones/entities/recepcion.entity';
import { OrdenCompra } from '../ordenes-compra/entities/orden-compra.entity';
import { DetalleOrdenCompra } from '../ordenes-compra/entities/detalle-orden-compra.entity';
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { DetalleVentaLote } from '../ventas/entities/detalle-venta-lote.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const sslEnabled = configService.get<string>('DATABASE_SSL') === 'true'
  const sslRejectUnauthorized = configService.get<string>('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false'

  return {
    type: 'postgres',
    host: configService.get<string>('DATABASE_HOST'),
    port: configService.get<number>('DATABASE_PORT'),
    username: configService.get<string>('DATABASE_USER'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),
    ...(sslEnabled && {
      ssl: { rejectUnauthorized: sslRejectUnauthorized },
      extra: { ssl: { rejectUnauthorized: sslRejectUnauthorized } },
    }),
    timezone: 'America/Mexico_City',
    entities: [
      User,
      UserPermission,
      Laboratorio,
      Lote,
      Producto,
      MovimientoAlmacen,
      CategoriaCliente,
      Descuento,
      DescuentoProducto,
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
      UserPermission,
      DatosEmpresa,
      Proveedor,
      Recepcion,
      OrdenCompra,
      DetalleOrdenCompra,
      DetalleLote,
      DetalleVentaLote,
    ],
    synchronize: false,
    migrationsRun: false,
    migrations: [],
  } as any;
};
