import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Domicilio } from './entities/domicilio.entity';
import { DomiciliosService } from './domicilios.service';
import { DomiciliosController } from './domicilios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Domicilio])],
  controllers: [DomiciliosController],
  providers: [DomiciliosService],
  exports: [DomiciliosService],
})
export class DomiciliosModule {}