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
import { MovimientosAlmacenModule } from '../movimientos-almacen/movimientos-almacen.module';
import { ConfiguracionesModule } from '../configuraciones/configuraciones.module';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      DetalleVenta,
      DetalleVentaLote,
      PagoVenta,
      DescuentoVentaDetalle,
    ]),
    ProductosModule,
    LotesModule,
    DescuentosModule,
    InventarioAlmacenModule,
    MovimientosAlmacenModule,
    ConfiguracionesModule,
    ClientesModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
