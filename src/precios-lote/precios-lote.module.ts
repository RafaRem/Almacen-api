import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreciosLoteService } from './precios-lote.service';
import { LotePrecio } from './entities/lote-precio.entity';
import { LotePrecioHistorial } from './entities/lote-precio-historial.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LotePrecio,
      LotePrecioHistorial,
      ProductoPresentacion,
    ]),
  ],
  providers: [PreciosLoteService],
  exports: [PreciosLoteService],
})
export class PreciosLoteModule {}
