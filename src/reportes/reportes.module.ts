import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      Lote,
      DocumentoCliente,
      Venta,
      DetalleVenta,
      Cliente,
      InventarioAlmacen,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
