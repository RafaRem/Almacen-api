import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuracion } from './entities/configuracion.entity';
import { ConfiguracionesService } from './configuraciones.service';
import { ConfiguracionesController } from './configuraciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Configuracion])],
  controllers: [ConfiguracionesController],
  providers: [ConfiguracionesService],
  exports: [ConfiguracionesService],
})
export class ConfiguracionesModule {}
