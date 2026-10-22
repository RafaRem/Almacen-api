import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorteCajaController } from './corte-caja.controller';
import { CorteCajaService } from './corte-caja.service';
import { CorteCajaScheduler } from './corte-caja.scheduler';
import { CorteCaja } from './entities/corte-caja.entity';
import { CorteCajaVenta } from './entities/corte-caja-venta.entity';
import { Venta } from '../ventas/entities/venta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CorteCaja, CorteCajaVenta, Venta])],
  controllers: [CorteCajaController],
  providers: [CorteCajaService, CorteCajaScheduler],
  exports: [CorteCajaService],
})
export class CorteCajaModule {}
