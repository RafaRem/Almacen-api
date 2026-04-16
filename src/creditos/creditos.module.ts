import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credito } from './entities/credito.entity';
import { CreditosService } from './creditos.service';
import { CreditosController } from './creditos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Credito])],
  controllers: [CreditosController],
  providers: [CreditosService],
  exports: [CreditosService],
})
export class CreditosModule {}