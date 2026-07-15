import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import {
  CreateOrdenCompraDto,
  RecibirOrdenCompraDto,
} from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import {
  TipoMovimiento,
  OrigenOperacion,
  SYSTEM_USER_ID,
} from '../common/constants';

@Injectable()
export class OrdenesCompraService {
  private readonly logger = new Logger(OrdenesCompraService.name);

  constructor(
    @InjectRepository(OrdenCompra)
    private ordenesRepository: Repository<OrdenCompra>,
    @InjectRepository(DetalleOrdenCompra)
    private detallesRepository: Repository<DetalleOrdenCompra>,
    @InjectRepository(Lote)
    private lotesRepository: Repository<Lote>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
    @InjectRepository(MovimientoAlmacen)
    private movimientoRepository: Repository<MovimientoAlmacen>,
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
        }),
      );
      await this.detallesRepository.save(detalles);
    }

    return this.findOne(saved.id);
  }

  async findAll(filters?: {
    status?: string;
    proveedorId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: OrdenCompra[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 15;
    const skip = (page - 1) * limit;

    const qb = this.ordenesRepository
      .createQueryBuilder('oc')
      .leftJoinAndSelect('oc.proveedor', 'proveedor')
      .leftJoinAndSelect('oc.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .orderBy('oc.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters?.status) {
      qb.andWhere('oc.status = :status', { status: filters.status });
    }
    if (filters?.proveedorId) {
      qb.andWhere('oc.proveedorId = :proveedorId', {
        proveedorId: filters.proveedorId,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
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
      relations: [
        'proveedor',
        'detalles',
        'detalles.producto',
        'detalles.producto.laboratorio',
      ],
    });
    if (!orden) {
      throw new NotFoundException(`OrdenCompra with ID ${id} not found`);
    }
    return orden;
  }

  async update(
    id: string,
    updateDto: UpdateOrdenCompraDto,
  ): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException('Solo órdenes en BORRADOR pueden editarse');
    }

    if (updateDto.proveedorId) orden.proveedorId = updateDto.proveedorId;
    if (updateDto.fechaOrden !== undefined)
      orden.fechaOrden = updateDto.fechaOrden;
    if (updateDto.fechaEsperada !== undefined)
      orden.fechaEsperada = updateDto.fechaEsperada;
    if (updateDto.observaciones !== undefined)
      orden.observaciones = updateDto.observaciones;
    if (updateDto.status) orden.status = updateDto.status;

    await this.ordenesRepository.save(orden);

    if (updateDto.detalles) {
      const existingIds = orden.detalles.filter((d) => d.id).map((d) => d.id);
      const incomingIds = updateDto.detalles
        .filter((d) => d.id)
        .map((d) => d.id);

      const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
      if (toDelete.length) {
        await this.detallesRepository.delete(toDelete);
      }

      for (const d of updateDto.detalles) {
        if (d.id) {
          await this.detallesRepository.update(d.id, {
            cantidad: d.cantidad,
          });
        } else if (d.productoId) {
          const detalle = this.detallesRepository.create({
            ordenCompraId: id,
            productoId: d.productoId,
            cantidad: d.cantidad ?? 1,
          });
          await this.detallesRepository.save(detalle);
        }
      }
    }

    return this.findOne(id);
  }

  async addDetalle(
    ordenId: string,
    detalleData: {
      productoId: string;
      cantidad: number;
    },
  ): Promise<OrdenCompra> {
    const orden = await this.findOne(ordenId);

    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo órdenes en BORRADOR pueden modificarse',
      );
    }

    const detalle = this.detallesRepository.create({
      ordenCompraId: ordenId,
      productoId: detalleData.productoId,
      cantidad: detalleData.cantidad,
    });
    await this.detallesRepository.save(detalle);

    return this.findOne(ordenId);
  }

  async removeDetalle(
    ordenId: string,
    detalleId: string,
  ): Promise<OrdenCompra> {
    const orden = await this.findOne(ordenId);
    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo órdenes en BORRADOR pueden modificarse',
      );
    }
    await this.detallesRepository.delete(detalleId);
    return this.findOne(ordenId);
  }

  async reabastecer(dto: {
    productoId: string;
    proveedorId?: string;
    cantidad?: number;
    preview?: boolean;
  }): Promise<any> {
    this.logger.log(
      `reabastecer llamado con productoId=${dto.productoId}, proveedorId=${dto.proveedorId || 'ninguno'}, cantidad=${dto.cantidad}, preview=${dto.preview}`,
    );

    const producto = await this.productoRepository.findOne({
      where: { id: dto.productoId },
      relations: ['proveedorPreferido'],
    });
    if (!producto) {
      this.logger.warn(`Producto ${dto.productoId} no encontrado`);
      throw new NotFoundException('Producto no encontrado');
    }
    this.logger.log(
      `Producto encontrado: ${producto.nombre}, proveedorPreferido: ${producto.proveedorPreferido?.id || 'NINGUNO'}`,
    );

    let proveedor = producto.proveedorPreferido;

    // Si se pasa proveedorId explícito, usarlo y auto-asignar al producto
    if (dto.proveedorId) {
      const proveedorEncontrado = await this.entityManager.findOne(Proveedor, {
        where: { id: dto.proveedorId },
      });
      if (!proveedorEncontrado) {
        throw new BadRequestException('Proveedor no encontrado');
      }
      proveedor = proveedorEncontrado;
      if (producto.proveedorPreferidoId !== dto.proveedorId) {
        await this.productoRepository.update(producto.id, {
          proveedorPreferidoId: dto.proveedorId,
        });
        this.logger.log(`Proveedor preferido actualizado a ${dto.proveedorId}`);
      }
    }

    // Sin proveedor explícito ni preferido → intentar fallback
    if (!proveedor) {
      this.logger.warn(
        `Producto ${producto.nombre} sin proveedor preferido, buscando fallback por recepción`,
      );

      const fallbackRecepcion = await this.inventarioRepository
        .createQueryBuilder('inv')
        .leftJoin('inv.lote', 'lote')
        .leftJoin('lote.recepcion', 'rec')
        .where('inv.productoId = :productoId', {
          productoId: dto.productoId,
        })
        .andWhere('inv.almacenTipo = :almacenTipo', {
          almacenTipo: AlmacenTipo.VENTAS,
        })
        .andWhere('rec.proveedorId IS NOT NULL')
        .select('rec.proveedorId', 'proveedorId')
        .orderBy('rec.createdAt', 'DESC')
        .getRawOne<{ proveedorId: string }>();

      if (fallbackRecepcion) {
        const proveedorFallback = await this.entityManager.findOne(Proveedor, {
          where: { id: fallbackRecepcion.proveedorId },
        });
        if (proveedorFallback) {
          proveedor = proveedorFallback;
        }
      }

      // No hay proveedor disponible → pedir al usuario que seleccione uno
      if (!proveedor) {
        this.logger.warn(
          `No hay proveedor para ${producto.nombre}, solicitando selección`,
        );
        const proveedores = await this.entityManager.find(Proveedor, {
          order: { nombre: 'ASC' },
        });
        return {
          requiresProveedor: true,
          proveedores,
          producto: { id: producto.id, nombre: producto.nombre },
        };
      }
    }

    // Calcular stock
    const stockResult = await this.inventarioRepository
      .createQueryBuilder('inv')
      .select('SUM(inv.cantidadActual)', 'total')
      .where('inv.productoId = :productoId', {
        productoId: dto.productoId,
      })
      .andWhere('inv.almacenTipo = :almacenTipo', {
        almacenTipo: AlmacenTipo.VENTAS,
      })
      .getRawOne();
    const stockActual = Number(stockResult?.total || 0);
    this.logger.log(
      `Stock actual: ${stockActual}, stockMaximo: ${producto.stockMaximo}`,
    );

    const suggestedQuantity = Math.max(
      0,
      (producto.stockMaximo || 10) - stockActual,
    );

    // Preview mode — solo retornar información sin crear/modificar OC
    if (dto.preview) {
      return {
        suggestedQuantity,
        stockActual,
        stockMaximo: producto.stockMaximo || 10,
        stockMinimo: producto.stockMinimo,
        producto: { id: producto.id, nombre: producto.nombre },
      };
    }

    const cantidad = dto.cantidad ?? suggestedQuantity;
    if (cantidad <= 0) {
      this.logger.warn(
        `Stock suficiente: actual=${stockActual}, maximo=${producto.stockMaximo}, sugerida=${suggestedQuantity}`,
      );
      throw new BadRequestException('El producto tiene suficiente stock');
    }
    this.logger.log(`Cantidad a reabastecer: ${cantidad}`);

    // Buscar OC BORRADOR del proveedor
    const ocExistente = await this.ordenesRepository.findOne({
      where: {
        proveedorId: proveedor.id,
        status: 'BORRADOR' as any,
      },
    });

    if (ocExistente) {
      // Verificar si el producto ya existe en los detalles
      const detalleExistente = await this.detallesRepository.findOne({
        where: {
          ordenCompraId: ocExistente.id,
          productoId: dto.productoId,
        },
      });

      if (detalleExistente) {
        detalleExistente.cantidad += cantidad;
        await this.detallesRepository.save(detalleExistente);
        const orden = await this.findOne(ocExistente.id);
        return { orden, esNueva: false, cantidad, yaExistia: true };
      }

      await this.addDetalle(ocExistente.id, {
        productoId: dto.productoId,
        cantidad,
      });
      const orden = await this.findOne(ocExistente.id);
      return { orden, esNueva: false, cantidad, yaExistia: false };
    }

    const orden = await this.create({
      proveedorId: proveedor.id,
      detalles: [{ productoId: dto.productoId, cantidad }],
    });
    return { orden, esNueva: true, cantidad, yaExistia: false };
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

  async recibir(
    id: string,
    recibirDto: RecibirOrdenCompraDto,
  ): Promise<OrdenCompra> {
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
        throw new NotFoundException(
          `Detalle ${detalleRecibido.detalleId} no encontrado en la orden`,
        );
      }

      const nuevaRecibida =
        detalle.cantidadRecibida + detalleRecibido.cantidadRecibida;
      if (nuevaRecibida > detalle.cantidad) {
        throw new BadRequestException(
          `Cantidad recibida (${nuevaRecibida}) excede la cantidad ordenada (${detalle.cantidad}) para el producto ${detalle.producto?.nombre || detalle.productoId}`,
        );
      }

      const producto = await this.productoRepository.findOne({
        where: { id: detalle.productoId },
      });
      if (!producto) {
        throw new NotFoundException(
          `Producto ${detalle.productoId} no encontrado`,
        );
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
          if (detalleRecibido.fechaCaducidad) {
            lote.fechaCaducidad = new Date(detalleRecibido.fechaCaducidad);
            lote = await manager.save(Lote, lote);
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
            Number(inventario.cantidadActual) +
            detalleRecibido.cantidadRecibida;
        } else {
          inventario = manager.create(InventarioAlmacen, {
            productoId: detalle.productoId,
            loteId: lote.id,
            almacenTipo: AlmacenTipo.VENTAS,
            cantidadActual: detalleRecibido.cantidadRecibida,
            precioUnitarioLote: 0,
          });
        }

        inventario = await manager.save(InventarioAlmacen, inventario);

        const movimiento = manager.create(MovimientoAlmacen, {
          productoId: detalle.productoId,
          loteId: lote.id,
          almacenOrigen: AlmacenTipo.VENTAS,
          almacenDestino: AlmacenTipo.VENTAS,
          cantidad: detalleRecibido.cantidadRecibida,
          userId: SYSTEM_USER_ID,
          observaciones: `Recepción OC ${orden.folio}`,
          tipoMovimiento: TipoMovimiento.ENTRADA_BODEGA,
          origenOperacion: OrigenOperacion.API,
        });
        await manager.save(MovimientoAlmacen, movimiento);

        if (
          inventario.precioUnitarioLote &&
          inventario.precioUnitarioLote > 0 &&
          producto.margenRecomendado
        ) {
          const margen = producto.margenRecomendado ?? 20;
          inventario.precioVenta =
            Math.round(inventario.precioUnitarioLote * (1 + margen / 100) * 100) / 100;
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
      throw new BadRequestException(
        'No se puede eliminar una orden completada',
      );
    }
    orden.status = 'CANCELADA';
    await this.ordenesRepository.save(orden);
  }
}
