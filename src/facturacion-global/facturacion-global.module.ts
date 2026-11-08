import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturacionGlobalController } from './facturacion-global.controller';
import { FacturacionGlobalService } from './facturacion-global.service';
import { FacturaGlobal } from './entities/factura-global.entity';
import { FacturaGlobalDetalle } from './entities/factura-global-detalle.entity';
import { FacturapiModule } from '../facturapi/facturapi.module';
import { VentasModule } from '../ventas/ventas.module';
import { ConfiguracionesModule } from '../configuraciones/configuraciones.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FacturaGlobal, FacturaGlobalDetalle]),
    FacturapiModule,
    VentasModule,
    ConfiguracionesModule,
    CommonModule,
  ],
  controllers: [FacturacionGlobalController],
  providers: [FacturacionGlobalService],
  exports: [FacturacionGlobalService],
})
export class FacturacionGlobalModule {}
