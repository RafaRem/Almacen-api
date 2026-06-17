import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecepcionesController } from './recepciones.controller';
import { RecepcionesService } from './recepciones.service';
import { Recepcion } from './entities/recepcion.entity';
import { ProveedoresModule } from '../proveedores/proveedores.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recepcion]), ProveedoresModule],
  controllers: [RecepcionesController],
  providers: [RecepcionesService],
  exports: [RecepcionesService],
})
export class RecepcionModule {}
