import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DescuentosService } from './descuentos.service';
import { DescuentosController } from './descuentos.controller';
import { Descuento } from './entities/descuento.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Descuento, CategoriaCliente])],
  controllers: [DescuentosController],
  providers: [DescuentosService],
  exports: [DescuentosService],
})
export class DescuentosModule {}
