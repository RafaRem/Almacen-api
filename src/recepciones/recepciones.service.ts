import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recepcion } from './entities/recepcion.entity';

@Injectable()
export class RecepcionesService {
  constructor(
    @InjectRepository(Recepcion)
    private repo: Repository<Recepcion>,
  ) {}

  async create(data: Partial<Recepcion>): Promise<Recepcion> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll(): Promise<Recepcion[]> {
    return this.repo.find({
      relations: ['proveedor', 'lotes'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Recepcion | null> {
    return this.repo.findOne({ where: { id }, relations: ['proveedor'] });
  }

  async findByIdWithLotes(id: string): Promise<Recepcion | null> {
    return this.repo.findOne({
      where: { id },
      relations: [
        'proveedor',
        'lotes',
        'lotes.laboratorio',
        'lotes.inventarioAlmacen',
        'lotes.inventarioAlmacen.producto',
      ],
    });
  }
}
