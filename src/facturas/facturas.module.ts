import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { Factura } from './entities/factura.entity';
import { FacturaDetalle } from './entities/factura-detalle.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { FacturacionCliente } from '../facturacion-cliente/entities/facturacion-cliente.entity';
import { DatosEmpresa } from '../empresa/entities/datos-empresa.entity';
import { RegimenFiscal } from '../regimen-fiscal/entities/regimen-fiscal.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      FacturaDetalle,
      Producto,
      Cliente,
      Venta,
      FacturacionCliente,
      DatosEmpresa,
      RegimenFiscal,
    ]),
    CommonModule,
  ],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
