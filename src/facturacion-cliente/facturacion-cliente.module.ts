import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturacionCliente } from './entities/facturacion-cliente.entity';
import { FacturacionClienteService } from './facturacion-cliente.service';
import { FacturacionClienteController } from './facturacion-cliente.controller';
import { RegimenFiscalModule } from '../regimen-fiscal/regimen-fiscal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FacturacionCliente]),
    RegimenFiscalModule,
  ],
  controllers: [FacturacionClienteController],
  providers: [FacturacionClienteService],
  exports: [FacturacionClienteService],
})
export class FacturacionClienteModule {}