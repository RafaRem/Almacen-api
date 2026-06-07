import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { Factura } from './entities/factura.entity';
import { FacturaDetalle } from './entities/factura-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, FacturaDetalle, Producto, Cliente]),
    CommonModule,
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
