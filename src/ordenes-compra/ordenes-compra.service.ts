import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { CreateOrdenCompraDto, RecibirOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';

@Injectable()
export class OrdenesCompraService {
  constructor(
    @InjectRepository(OrdenCompra)
    private ordenesRepository: Repository<OrdenCompra>,
    @InjectRepository(DetalleOrdenCompra)
    private detallesRepository: Repository<DetalleOrdenCompra>,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectEntityManager()
    private entityManager: EntityManager,
  ) {}

  private async generarFolio(): Promise<string> {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const prefix = `OC-${yyyy}${mm}${dd}-`;

    const ultimo = await this.ordenesRepository
      .createQueryBuilder('oc')
      .where('oc.folio LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('oc.folio', 'DESC')
      .getOne();

    let next = 1;
    if (ultimo) {
      const sufijo = parseInt(ultimo.folio.replace(prefix, ''), 10);
      if (!isNaN(sufijo)) {
        next = sufijo + 1;
      }
    }
    return `${prefix}${String(next).padStart(3, '0')}`;
  }

  async create(createDto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    const folio = await this.generarFolio();
    const orden = this.ordenesRepository.create({
      folio,
      proveedorId: createDto.proveedorId,
      fechaOrden: createDto.fechaOrden,
      fechaEsperada: createDto.fechaEsperada,
      observaciones: createDto.observaciones,
      status: 'BORRADOR',
    });

    const saved = await this.ordenesRepository.save(orden);

    if (createDto.detalles?.length) {
      const detalles = createDto.detalles.map((d) =>
        this.detallesRepository.create({
          ordenCompraId: saved.id,
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioEstimado: d.precioEstimado,
        }),
      );
      await this.detallesRepository.save(detalles);
    }

    return this.findOne(saved.id);
  }

  async findAll(filters?: { status?: string; proveedorId?: string }): Promise<OrdenCompra[]> {
    const qb = this.ordenesRepository
      .createQueryBuilder('oc')
      .leftJoinAndSelect('oc.proveedor', 'proveedor')
      .leftJoinAndSelect('oc.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .orderBy('oc.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('oc.status = :status', { status: filters.status });
    }
    if (filters?.proveedorId) {
      qb.andWhere('oc.proveedorId = :proveedorId', { proveedorId: filters.proveedorId });
    }

    return qb.getMany();
  }

  async findBorradores(): Promise<OrdenCompra[]> {
    return this.ordenesRepository.find({
      where: { status: 'BORRADOR' } as any,
      relations: ['proveedor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<OrdenCompra> {
    const orden = await this.ordenesRepository.findOne({
      where: { id },
      relations: ['proveedor', 'detalles', 'detalles.producto', 'detalles.producto.laboratorio'],
    });
    if (!orden) {
      throw new NotFoundException(`OrdenCompra with ID ${id} not found`);
    }
    return orden;
  }

  async update(id: string, updateDto: UpdateOrdenCompraDto): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException('Solo órdenes en BORRADOR pueden editarse');
    }

    if (updateDto.proveedorId) orden.proveedorId = updateDto.proveedorId;
    if (updateDto.fechaOrden !== undefined) orden.fechaOrden = updateDto.fechaOrden;
    if (updateDto.fechaEsperada !== undefined) orden.fechaEsperada = updateDto.fechaEsperada;
    if (updateDto.observaciones !== undefined) orden.observaciones = updateDto.observaciones;
    if (updateDto.status) orden.status = updateDto.status;

    await this.ordenesRepository.save(orden);

    if (updateDto.detalles?.length) {
      for (const d of updateDto.detalles) {
        if ((d as any).id) {
          await this.detallesRepository.update((d as any).id, {
            cantidad: d.cantidad,
            precioEstimado: d.precioEstimado,
          });
        }
      }
    }

    return this.findOne(id);
  }

  async addDetalle(ordenId: string, detalleData: { productoId: string; cantidad: number; precioEstimado?: number }): Promise<OrdenCompra> {
    const orden = await this.findOne(ordenId);

    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException('Solo órdenes en BORRADOR pueden modificarse');
    }

    const detalle = this.detallesRepository.create({
      ordenCompraId: ordenId,
      productoId: detalleData.productoId,
      cantidad: detalleData.cantidad,
      precioEstimado: detalleData.precioEstimado,
    });
    await this.detallesRepository.save(detalle);

    return this.findOne(ordenId);
  }

  async removeDetalle(ordenId: string, detalleId: string): Promise<OrdenCompra> {
    const orden = await this.findOne(ordenId);
    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException('Solo órdenes en BORRADOR pueden modificarse');
    }
    await this.detallesRepository.delete(detalleId);
    return this.findOne(ordenId);
  }

  async cambiarStatus(id: string, status: string): Promise<OrdenCompra> {
    const VALID_STATUSES = ['BORRADOR', 'PENDIENTE', 'COMPLETADA', 'CANCELADA'];
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Status inválido: ${status}`);
    }
    const orden = await this.findOne(id);
    orden.status = status;
    await this.ordenesRepository.save(orden);
    return this.findOne(id);
  }

  async recibir(id: string, recibirDto: RecibirOrdenCompraDto): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (orden.status === 'COMPLETADA') {
      throw new BadRequestException('La orden ya está completada');
    }
    if (orden.status === 'CANCELADA') {
      throw new BadRequestException('No se puede recibir una orden cancelada');
    }

    const detallesMap = new Map(orden.detalles.map((d) => [d.id, d]));

    for (const detalleRecibido of recibirDto.detalles) {
      const detalle = detallesMap.get(detalleRecibido.detalleId);
      if (!detalle) {
        throw new NotFoundException(`Detalle ${detalleRecibido.detalleId} no encontrado en la orden`);
      }

      const nuevaRecibida = detalle.cantidadRecibida + detalleRecibido.cantidadRecibida;
      if (nuevaRecibida > detalle.cantidad) {
        throw new BadRequestException(
          `Cantidad recibida (${nuevaRecibida}) excede la cantidad ordenada (${detalle.cantidad}) para el producto ${detalle.producto?.nombre || detalle.productoId}`,
        );
      }

      const producto = await this.productoRepository.findOne({ where: { id: detalle.productoId } });
      if (!producto) {
        throw new NotFoundException(`Producto ${detalle.productoId} no encontrado`);
      }

      await this.entityManager.transaction(async (manager) => {
        let lote = await manager.findOne(Lote, {
          where: { numeroLote: detalleRecibido.numeroLote },
        });

        if (lote) {
          if (lote.laboratorioId !== producto.laboratorioId) {
            throw new BadRequestException(
              `El lote ${detalleRecibido.numeroLote} pertenece a otro laboratorio`,
            );
          }
        } else {
          lote = manager.create(Lote, {
            numeroLote: detalleRecibido.numeroLote,
            fechaCaducidad: new Date(detalleRecibido.fechaCaducidad),
            laboratorioId: producto.laboratorioId,
          });
          lote = await manager.save(Lote, lote);
        }

        let inventario = await manager.findOne(InventarioAlmacen, {
          where: {
            productoId: detalle.productoId,
            loteId: lote.id,
            almacenTipo: AlmacenTipo.VENTAS,
          },
        });

        if (inventario) {
          inventario.cantidadActual =
            Number(inventario.cantidadActual) + detalleRecibido.cantidadRecibida;
        } else {
          inventario = manager.create(InventarioAlmacen, {
            productoId: detalle.productoId,
            loteId: lote.id,
            almacenTipo: AlmacenTipo.VENTAS,
            cantidadActual: detalleRecibido.cantidadRecibida,
            precioUnitarioLote: detalle.precioEstimado || 0,
          });
        }

        inventario = await manager.save(InventarioAlmacen, inventario);

        if (inventario.precioUnitarioLote && inventario.precioUnitarioLote > 0 && producto.margenRecomendado) {
          const iva = inventario.ivaCfdi ?? 16;
          const precioNeto = inventario.precioUnitarioLote * (1 + iva / 100);
          const cantidadMargen = inventario.precioUnitarioLote * (producto.margenRecomendado / 100);
          inventario.precioVenta = Math.round((precioNeto + cantidadMargen) * 100) / 100;
          await manager.save(InventarioAlmacen, inventario);
        }

        detalle.cantidadRecibida = nuevaRecibida;
        await manager.save(DetalleOrdenCompra, detalle);
      });
    }

    const ordenActualizada = await this.findOne(id);
    const todosCompletados = ordenActualizada.detalles.every(
      (d) => d.cantidadRecibida >= d.cantidad,
    );

    if (todosCompletados) {
      ordenActualizada.status = 'COMPLETADA';
      await this.ordenesRepository.save(ordenActualizada);
    } else if (ordenActualizada.status === 'BORRADOR') {
      ordenActualizada.status = 'PENDIENTE';
      await this.ordenesRepository.save(ordenActualizada);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const orden = await this.findOne(id);
    if (orden.status === 'COMPLETADA') {
      throw new BadRequestException('No se puede eliminar una orden completada');
    }
    orden.status = 'CANCELADA';
    await this.ordenesRepository.save(orden);
  }
}
