import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegimenFiscal } from './entities/regimen-fiscal.entity';
import { RegimenFiscalService } from './regimen-fiscal.service';
import { RegimenFiscalController } from './regimen-fiscal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RegimenFiscal])],
  controllers: [RegimenFiscalController],
  providers: [RegimenFiscalService],
  exports: [RegimenFiscalService],
})
export class RegimenFiscalModule {}
