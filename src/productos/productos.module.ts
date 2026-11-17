import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosService } from './productos.service';
import { PresentacionesService } from './presentaciones.service';
import { ProductosController } from './productos.controller';
import { Producto } from './entities/producto.entity';
import { ProductoPresentacion } from './entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { PreciosLoteModule } from '../precios-lote/precios-lote.module';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, ProductoPresentacion, Lote, InventarioAlmacen]),
    InventarioAlmacenModule,
    PreciosLoteModule,
  ],
  controllers: [ProductosController],
  providers: [ProductosService, PresentacionesService],
  exports: [ProductosService, PresentacionesService],
})
export class ProductosModule {}
