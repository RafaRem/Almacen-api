import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TimbradoService } from './timbrado.service';

@Module({
  imports: [ConfigModule],
  providers: [TimbradoService],
  exports: [TimbradoService],
})
export class TimbradoModule {}
