import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosRevertidosService } from './movimientos-revertidos.service';
import { MovimientosRevertidosController } from './movimientos-revertidos.controller';
import { MovimientoRevertido } from './entities/movimiento-revertido.entity';
import { ConfiguracionSistema } from '../configuracion/entities/configuracion-sistema.entity';
import { MovimientoAlmacen } from './entities/movimiento-almacen.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MovimientoRevertido,
      ConfiguracionSistema,
      MovimientoAlmacen,
      InventarioAlmacen,
    ]),
  ],
  controllers: [MovimientosRevertidosController],
  providers: [MovimientosRevertidosService],
  exports: [MovimientosRevertidosService],
})
export class MovimientosRevertidosModule {}