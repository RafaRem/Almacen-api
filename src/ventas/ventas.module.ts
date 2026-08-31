import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { DetalleVentaLote } from './entities/detalle-venta-lote.entity';
import { PagoVenta } from './entities/pago-venta.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
import { ProductosModule } from '../productos/productos.module';
import { LotesModule } from '../lotes/lotes.module';
import { DescuentosModule } from '../descuentos/descuentos.module';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { MovimientosAlmacenModule } from '../movimientos-almacen/movimientos-almacen.module';
import { ConfiguracionesModule } from '../configuraciones/configuraciones.module';
import { ClientesModule } from '../clientes/clientes.module';
import { CuentasCobrarModule } from '../cuentas-cobrar/cuentas-cobrar.module';
import { CreditosModule } from '../creditos/creditos.module';
import { CuentaPorCobrar } from '../cuentas-cobrar/entities/cuenta-cobrar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      DetalleVenta,
      DetalleVentaLote,
      PagoVenta,
      DescuentoVentaDetalle,
      InventarioAlmacen,
      CuentaPorCobrar,
    ]),
    ProductosModule,
    LotesModule,
    DescuentosModule,
    InventarioAlmacenModule,
    MovimientosAlmacenModule,
    ConfiguracionesModule,
    ClientesModule,
    CuentasCobrarModule,
    CreditosModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
