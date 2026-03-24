import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaboratoriosService } from './laboratorios.service';
import { LaboratoriosController } from './laboratorios.controller';
import { Laboratorio } from './entities/laboratorio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Laboratorio])],
  controllers: [LaboratoriosController],
  providers: [LaboratoriosService],
  exports: [LaboratoriosService],
})
export class LaboratoriosModule {}