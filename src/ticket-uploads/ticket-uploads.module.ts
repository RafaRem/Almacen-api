import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketUploadsController } from './ticket-uploads.controller';
import { TicketUploadsService } from './ticket-uploads.service';
import { ConfiguracionSistema } from '../configuracion/entities/configuracion-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionSistema])],
  controllers: [TicketUploadsController],
  providers: [TicketUploadsService],
  exports: [TicketUploadsService],
})
export class TicketUploadsModule {}