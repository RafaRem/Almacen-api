import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';

@Module({
  imports: [TypeOrmModule.forFeature([Producto]), InventarioAlmacenModule],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService],
})
export class ProductosModule {}
