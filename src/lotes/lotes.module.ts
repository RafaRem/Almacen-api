import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { Lote } from './entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lote, InventarioAlmacen])],
  controllers: [LotesController],
  providers: [LotesService],
  exports: [LotesService],
})
export class LotesModule {}
