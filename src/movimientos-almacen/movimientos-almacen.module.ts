import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosAlmacenService } from './movimientos-almacen.service';
import { MovimientosAlmacenController } from './movimientos-almacen.controller';
import { MovimientoAlmacen } from './entities/movimiento-almacen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoAlmacen])],
  controllers: [MovimientosAlmacenController],
  providers: [MovimientosAlmacenService],
  exports: [MovimientosAlmacenService],
})
export class MovimientosAlmacenModule {}