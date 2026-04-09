import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { ProductosModule } from '../productos/productos.module';
import { LotesModule } from '../lotes/lotes.module';
import { DescuentosModule } from '../descuentos/descuentos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta]),
    ProductosModule,
    LotesModule,
    DescuentosModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
