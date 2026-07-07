import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesCompraService } from './ordenes-compra.service';
import { OrdenesCompraController } from './ordenes-compra.controller';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrdenCompra,
      DetalleOrdenCompra,
      Lote,
      InventarioAlmacen,
      MovimientoAlmacen,
      Producto,
    ]),
  ],
  controllers: [OrdenesCompraController],
  providers: [OrdenesCompraService],
  exports: [OrdenesCompraService],
})
export class OrdenesCompraModule {}
