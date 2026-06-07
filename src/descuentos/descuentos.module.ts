import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DescuentosService } from './descuentos.service';
import { DescuentosController } from './descuentos.controller';
import { Descuento } from './entities/descuento.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Descuento, CategoriaCliente]), CommonModule],
  controllers: [DescuentosController],
  providers: [DescuentosService],
  exports: [DescuentosService],
})
export class DescuentosModule {}
