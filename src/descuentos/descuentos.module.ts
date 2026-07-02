import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DescuentosService } from './descuentos.service';
import { DescuentosController } from './descuentos.controller';
import { Descuento } from './entities/descuento.entity';
import { DescuentoProducto } from './entities/descuento-producto.entity';
import { CategoriaCliente } from '../categorias-cliente/entities/categoria-cliente.entity';
import { CommonModule } from '../common/common.module';
import { ClientesModule } from '../clientes/clientes.module';
import { InventarioAlmacenModule } from '../inventario-almacen/inventario-almacen.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Descuento, DescuentoProducto, CategoriaCliente]),
    CommonModule,
    ClientesModule,
    InventarioAlmacenModule,
  ],
  controllers: [DescuentosController],
  providers: [DescuentosService],
  exports: [DescuentosService],
})
export class DescuentosModule {}
