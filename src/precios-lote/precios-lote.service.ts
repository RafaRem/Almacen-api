import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { LotePrecio } from './entities/lote-precio.entity';
import { LotePrecioHistorial } from './entities/lote-precio-historial.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { PresentacionTipo } from '../common/enums/presentacion-tipo.enum';

@Injectable()
export class PreciosLoteService {
  constructor(
    @InjectRepository(LotePrecio)
    private readonly precioRepository: Repository<LotePrecio>,
    @InjectRepository(ProductoPresentacion)
    private readonly presentacionRepository: Repository<ProductoPresentacion>,
    private readonly dataSource: DataSource,
  ) {}

  async findByLote(loteId: string): Promise<LotePrecio[]> {
    return this.precioRepository.find({
      where: { loteId, statusId: 1 },
      relations: ['presentacion'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByLotes(loteIds: string[]): Promise<LotePrecio[]> {
    if (loteIds.length === 0) return [];
    return this.precioRepository.find({
      where: { loteId: In(loteIds), statusId: 1 },
      relations: ['presentacion'],
    });
  }

  async findPrecio(
    loteId: string,
    presentacionId: string,
  ): Promise<LotePrecio | null> {
    return this.precioRepository.findOne({
      where: { loteId, presentacionId, statusId: 1 },
    });
  }

  async getPrecio(
    loteId: string,
    presentacionId: string,
  ): Promise<number | null> {
    const precio = await this.findPrecio(loteId, presentacionId);
    return precio ? Number(precio.precioVenta) : null;
  }

  async setPrecio(
    params: {
      productoId: string;
      loteId: string;
      presentacionId: string;
      precio: number;
      usuarioId?: string | null;
      motivo?: string | null;
    },
    managerArg?: EntityManager,
  ): Promise<LotePrecio> {
    const precio = Number(params.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new BadRequestException('Precio inválido');
    }

    const execute = async (manager: EntityManager) => {
      const repo = manager.getRepository(LotePrecio);
      const historialRepo = manager.getRepository(LotePrecioHistorial);
      let actual = await repo.findOne({
        where: {
          loteId: params.loteId,
          presentacionId: params.presentacionId,
        },
      });
      const anterior = actual ? Number(actual.precioVenta) : null;

      if (actual) {
        actual.precioVenta = precio;
        actual.updatedBy = params.usuarioId || null;
        actual.statusId = 1;
      } else {
        actual = repo.create({
          productoId: params.productoId,
          loteId: params.loteId,
          presentacionId: params.presentacionId,
          precioVenta: precio,
          statusId: 1,
          createdBy: params.usuarioId || null,
          updatedBy: params.usuarioId || null,
        });
      }
      const saved = await repo.save(actual);

      if (anterior == null || Math.abs(anterior - precio) >= 0.005) {
        await historialRepo.save(
          historialRepo.create({
            lotePrecioId: saved.id,
            precioAnterior: anterior,
            precioNuevo: precio,
            usuarioId: params.usuarioId || null,
            motivo: params.motivo || 'Actualización de precio',
          }),
        );
      }
      return saved;
    };

    return managerArg
      ? execute(managerArg)
      : this.dataSource.transaction(execute);
  }

  async setPrecioPorTipo(
    params: {
      productoId: string;
      loteId: string;
      tipo: PresentacionTipo;
      precio: number;
      usuarioId?: string | null;
      motivo?: string | null;
    },
    managerArg?: EntityManager,
  ): Promise<LotePrecio> {
    const repository = managerArg
      ? managerArg.getRepository(ProductoPresentacion)
      : this.presentacionRepository;
    const presentacion = await repository.findOne({
      where: {
        productoId: params.productoId,
        tipo: params.tipo,
        statusId: 1,
      },
    });
    if (!presentacion) {
      throw new NotFoundException(
        `Presentación ${params.tipo} no configurada para el producto`,
      );
    }
    return this.setPrecio(
      {
        ...params,
        presentacionId: presentacion.id,
      },
      managerArg,
    );
  }

  async clearPrecioPorTipo(
    params: {
      productoId: string;
      loteId: string;
      tipo: PresentacionTipo;
      usuarioId?: string | null;
      motivo?: string | null;
    },
    managerArg?: EntityManager,
  ): Promise<void> {
    const repository = managerArg
      ? managerArg.getRepository(ProductoPresentacion)
      : this.presentacionRepository;
    const presentacion = await repository.findOne({
      where: { productoId: params.productoId, tipo: params.tipo, statusId: 1 },
    });
    if (!presentacion) return;
    await this.clearPrecio(
      params.loteId,
      presentacion.id,
      params.usuarioId,
      params.motivo,
      managerArg,
    );
  }

  async clearPrecio(
    loteId: string,
    presentacionId: string,
    usuarioId?: string | null,
    motivo?: string | null,
    managerArg?: EntityManager,
  ): Promise<void> {
    const execute = async (manager: EntityManager) => {
      const repo = manager.getRepository(LotePrecio);
      const actual = await repo.findOne({
        where: { loteId, presentacionId, statusId: 1 },
      });
      if (!actual) return;
      const historialRepo = manager.getRepository(LotePrecioHistorial);
      await historialRepo.save(
        historialRepo.create({
          lotePrecioId: actual.id,
          precioAnterior: Number(actual.precioVenta),
          precioNuevo: 0,
          usuarioId: usuarioId || null,
          motivo: motivo || 'Precio eliminado',
        }),
      );
      actual.statusId = 2;
      await repo.save(actual);
    };

    return managerArg
      ? execute(managerArg)
      : this.dataSource.transaction(execute);
  }
}
