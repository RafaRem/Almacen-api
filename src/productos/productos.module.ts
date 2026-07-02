import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, Lote]),
    InventarioAlmacenModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
