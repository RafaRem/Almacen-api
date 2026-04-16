import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { Cliente } from './entities/cliente.entity';
import { TelefonosModule } from '../telefonos/telefonos.module';
import { DomiciliosModule } from '../domicilios/domicilios.module';
import { FacturacionClienteModule } from '../facturacion-cliente/facturacion-cliente.module';
import { CreditosModule } from '../creditos/creditos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente]),
    TelefonosModule,
    DomiciliosModule,
    FacturacionClienteModule,
    CreditosModule,
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}