import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { DocumentoCliente } from '../uploads/entities/documento-cliente.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Producto)
    private productosRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    @InjectRepository(DocumentoCliente)
    private documentosRepository: Repository<DocumentoCliente>,
  ) {}

  async getProductosProximosCaducar(meses: number = 6): Promise<Producto[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setMonth(hoy.getMonth() + meses);

    const lotes = await this.lotesRepository.find({
      where: {
        fechaCaducidad: Between(hoy, fechaLimite),
        statusId: 1,
      },
      relations: ['laboratorio'],
    });

    if (lotes.length === 0) {
      return [];
    }

    const loteIds = lotes.map((l) => l.id);
    return this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.lote', 'lote')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where('producto.loteId IN (:...loteIds)', { loteIds })
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .orderBy('lote.fechaCaducidad', 'ASC')
      .getMany();
  }

  async getAlertasVigencia(dias: number = 30): Promise<DocumentoCliente[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + dias);

    return this.documentosRepository.find({
      where: {
        vigencia: Between(hoy, fechaLimite),
        statusId: 1,
      },
      order: { vigencia: 'ASC' },
    });
  }

  async getStockMinimo(): Promise<Producto[]> {
    return this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .leftJoinAndSelect('producto.lote', 'lote')
      .where('producto.stock <= producto.stockMinimo')
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .orderBy('producto.stock', 'ASC')
      .getMany();
  }

  async getProductosCaducados(): Promise<Producto[]> {
    const hoy = new Date();

    const lotes = await this.lotesRepository.find({
      where: {
        fechaCaducidad: LessThanOrEqual(hoy),
        statusId: 1,
      },
    });

    if (lotes.length === 0) {
      return [];
    }

    const loteIds = lotes.map((l) => l.id);
    return this.productosRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.lote', 'lote')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio')
      .where('producto.loteId IN (:...loteIds)', { loteIds })
      .andWhere('producto.statusId = :statusId', { statusId: 1 })
      .orderBy('lote.fechaCaducidad', 'ASC')
      .getMany();
  }
}
