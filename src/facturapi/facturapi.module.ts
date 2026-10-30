import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FacturapiService } from './facturapi.service';

@Module({
  imports: [HttpModule],
  providers: [FacturapiService],
  exports: [FacturapiService],
})
export class FacturapiModule {}
