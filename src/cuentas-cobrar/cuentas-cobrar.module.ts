import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentasCobrarService } from './cuentas-cobrar.service';
import { CuentasCobrarController } from './cuentas-cobrar.controller';
import { CuentaPorCobrar } from './entities/cuenta-cobrar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CuentaPorCobrar])],
  controllers: [CuentasCobrarController],
  providers: [CuentasCobrarService],
  exports: [CuentasCobrarService],
})
export class CuentasCobrarModule {}
