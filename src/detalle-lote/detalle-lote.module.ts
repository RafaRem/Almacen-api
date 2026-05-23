import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleLote } from './entities/detalle-lote.entity';
import { DetalleLoteService } from './detalle-lote.service';
import { DetalleLoteController } from './detalle-lote.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DetalleLote])],
  controllers: [DetalleLoteController],
  providers: [DetalleLoteService],
  exports: [DetalleLoteService],
})
export class DetalleLoteModule {}