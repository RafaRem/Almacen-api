import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorteCaja, CorteCajaStatus } from './entities/corte-caja.entity';

@Injectable()
export class CorteCajaScheduler {
  private readonly logger = new Logger(CorteCajaScheduler.name);

  constructor(
    @InjectRepository(CorteCaja)
    private readonly corteCajaRepository: Repository<CorteCaja>,
  ) {}

  @Cron('59 59 23 * * *')
  async autoCloseCajas() {
    this.logger.log('Iniciando cierre automático de cajas...');

    const cajasAbiertas = await this.corteCajaRepository.find({
      where: { status: CorteCajaStatus.ABIERTA },
    });

    if (cajasAbiertas.length === 0) {
      this.logger.log('No hay cajas abiertas para cerrar');
      return;
    }

    let cerradas = 0;
    for (const caja of cajasAbiertas) {
      try {
        caja.fechaCierre = new Date();
        caja.status = CorteCajaStatus.CERRADA;
        await this.corteCajaRepository.save(caja);
        this.logger.log(`Caja ${caja.id} cerrada automáticamente para usuario ${caja.usuarioId}`);
        cerradas++;
      } catch (error) {
        this.logger.error(`Error al cerrar caja ${caja.id}: ${error.message}`);
      }
    }

    this.logger.log(`Cierre automático completado: ${cerradas} cajas cerradas`);
  }
}
