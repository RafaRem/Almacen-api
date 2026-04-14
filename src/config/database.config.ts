import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Producto } from '../productos/entities/producto.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { Descuento } from '../descuentos/entities/descuento.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { RegimenFiscal } from '../regimen-fiscal/entities/regimen-fiscal.entity';
import { Telefono } from '../telefonos/entities/telefono.entity';
import { Domicilio } from '../domicilios/entities/domicilio.entity';
import { FacturacionCliente } from '../facturacion-cliente/entities/facturacion-cliente.entity';
import { Credito } from '../creditos/entities/credito.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { Configuracion } from '../configuraciones/entities/configuracion.entity';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST'),
  port: configService.get<number>('DATABASE_PORT'),
  username: configService.get<string>('DATABASE_USER'),
  password: configService.get<string>('DATABASE_PASSWORD'),
  database: configService.get<string>('DATABASE_NAME'),
  entities: [
    User,
    Laboratorio,
    Lote,
    Producto,
    MovimientoAlmacen,
    CategoriaCliente,
    Descuento,
    DocumentoCliente,
    Cliente,
    Venta,
    DetalleVenta,
    RegimenFiscal,
    Telefono,
    Domicilio,
    FacturacionCliente,
    Credito,
    InventarioAlmacen,
    Configuracion,
  ],
  synchronize: false,
});