import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { InventarioAlmacenService } from './inventario-almacen.service';
import { InventarioAlmacenController } from './inventario-almacen.controller';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventarioAlmacen, Producto, Lote]),
  ],
  controllers: [InventarioAlmacenController],
  providers: [InventarioAlmacenService],
  exports: [InventarioAlmacenService],
})
export class InventarioAlmacenModule {}
