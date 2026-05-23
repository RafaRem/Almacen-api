import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosAlmacenService } from './movimientos-almacen.service';
import { MovimientosAlmacenController } from './movimientos-almacen.controller';
import { MovimientoAlmacen } from './entities/movimiento-almacen.entity';
import { MovimientosRevertidosModule } from './movimientos-revertidos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoAlmacen]),
    MovimientosRevertidosModule,
  ],
  controllers: [MovimientosAlmacenController],
  providers: [MovimientosAlmacenService],
  exports: [MovimientosAlmacenService, MovimientosRevertidosModule],
})
export class MovimientosAlmacenModule {}
