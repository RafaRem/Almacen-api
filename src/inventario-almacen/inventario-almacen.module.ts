import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { InventarioAlmacenController } from './inventario-almacen.controller';
import { Producto } from '../productos/entities/producto.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { PreciosLoteModule } from '../precios-lote/precios-lote.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventarioAlmacen,
      Producto,
      ProductoPresentacion,
      Lote,
      MovimientoAlmacen,
    ]),
    PreciosLoteModule,
  ],
  controllers: [InventarioAlmacenController],
  providers: [InventarioAlmacenService],
  exports: [InventarioAlmacenService],
})
export class InventarioAlmacenModule {}
