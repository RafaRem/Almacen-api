import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CfdiController } from './cfdi.controller';
import { CfdiService } from './cfdi.service';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';
import { DetalleLoteModule } from '../detalle-lote/detalle-lote.module';
import { RecepcionModule } from '../recepciones/recepcion.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Lote,
      Laboratorio,
      MovimientoAlmacen,
      InventarioAlmacen,
    ]),
    InventarioAlmacenModule,
    DetalleLoteModule,
    RecepcionModule,
    ProveedoresModule,
  ],
  controllers: [CfdiController],
  providers: [CfdiService],
  exports: [CfdiService],
})
export class CfdiModule {}
