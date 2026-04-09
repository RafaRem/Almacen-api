import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Telefono } from './entities/telefono.entity';
import { TelefonosService } from './telefonos.service';
import { TelefonosController } from './telefonos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Telefono])],
  controllers: [TelefonosController],
  providers: [TelefonosService],
  exports: [TelefonosService],
})
export class TelefonosModule {}