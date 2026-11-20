import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, IsNull } from 'typeorm';
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
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { LotePrecio } from '../precios-lote/entities/lote-precio.entity';
import { Producto } from '../productos/entities/producto.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { PresentacionTipo } from '../common/enums/presentacion-tipo.enum';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { TipoMovimiento, OrigenOperacion } from '../common/constants';

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
    @InjectRepository(ProductoPresentacion)
    private presentacionRepository: Repository<ProductoPresentacion>,
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

  private async resolverPresentacionCompra(
    producto: Producto,
    tipoSolicitado?: string,
  ): Promise<{
    tipo: 'PIEZA' | 'CAJA';
    presentacionId: string | null;
    factorUnidades: number;
  }> {
    const tipo =
      String(tipoSolicitado || 'PIEZA').toUpperCase() === 'CAJA'
        ? 'CAJA'
        : 'PIEZA';

    if (tipo === 'CAJA') {
      const presentacion = await this.presentacionRepository.findOne({
        where: {
          productoId: producto.id,
          tipo: PresentacionTipo.CAJA,
          statusId: 1,
        },
      });
      const factor = Number(
        presentacion?.factorUnidades || producto.piezasPorCajaDefault || 0,
      );
      if (!presentacion || factor < 2) {
        throw new BadRequestException(
          `El producto ${producto.nombre} no tiene caja configurada`,
        );
      }
      return {
        tipo: 'CAJA',
        presentacionId: presentacion.id,
        factorUnidades: factor,
      };
    }

    const presentacion = await this.presentacionRepository.findOne({
      where: {
        productoId: producto.id,
        tipo: PresentacionTipo.PIEZA,
        statusId: 1,
      },
    });
    return {
      tipo: 'PIEZA',
      presentacionId: presentacion?.id || null,
      factorUnidades: 1,
    };
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
      const detalles: DetalleOrdenCompra[] = [];
      for (const detalleDto of createDto.detalles) {
        const producto = await this.productoRepository.findOne({
          where: { id: detalleDto.productoId },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${detalleDto.productoId} no encontrado`,
          );
        }
        const presentacion = await this.resolverPresentacionCompra(
          producto,
          detalleDto.presentacionTipo,
        );
        detalles.push(
          this.detallesRepository.create({
            ordenCompraId: saved.id,
            productoId: detalleDto.productoId,
            cantidad: detalleDto.cantidad * presentacion.factorUnidades,
            presentacionId: presentacion.presentacionId,
            factorUnidades: presentacion.factorUnidades,
          }),
        );
      }
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

  async findVinculables(): Promise<OrdenCompra[]> {
    return this.ordenesRepository.find({
      where: { status: In(['BORRADOR', 'PENDIENTE']) } as any,
      relations: ['proveedor'],
      order: { createdAt: 'DESC' },
    });
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
          const existente = await this.detallesRepository.findOne({
            where: { id: d.id },
          });
          if (!existente) continue;
          const productoId = d.productoId || existente.productoId;
          const producto = await this.productoRepository.findOne({
            where: { id: productoId },
          });
          if (!producto) {
            throw new NotFoundException(`Producto ${productoId} no encontrado`);
          }
          const tipo =
            d.presentacionTipo ||
            (Number(existente.factorUnidades) > 1 ? 'CAJA' : 'PIEZA');
          const presentacion = await this.resolverPresentacionCompra(
            producto,
            tipo,
          );
          const factorAnterior = Number(existente.factorUnidades) || 1;
          const cantidadPresentacion =
            d.cantidad ?? (Number(existente.cantidad) || 1) / factorAnterior;
          await this.detallesRepository.update(d.id, {
            productoId,
            cantidad: cantidadPresentacion * presentacion.factorUnidades,
            presentacionId: presentacion.presentacionId,
            factorUnidades: presentacion.factorUnidades,
          });
        } else if (d.productoId) {
          const producto = await this.productoRepository.findOne({
            where: { id: d.productoId },
          });
          if (!producto) {
            throw new NotFoundException(
              `Producto ${d.productoId} no encontrado`,
            );
          }
          const presentacion = await this.resolverPresentacionCompra(
            producto,
            d.presentacionTipo,
          );
          const detalle = this.detallesRepository.create({
            ordenCompraId: id,
            productoId: d.productoId,
            cantidad: (d.cantidad ?? 1) * presentacion.factorUnidades,
            presentacionId: presentacion.presentacionId,
            factorUnidades: presentacion.factorUnidades,
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
      presentacionTipo?: 'PIEZA' | 'CAJA';
    },
  ): Promise<OrdenCompra> {
    const orden = await this.findOne(ordenId);

    if (orden.status !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo órdenes en BORRADOR pueden modificarse',
      );
    }

    const producto = await this.productoRepository.findOne({
      where: { id: detalleData.productoId },
    });
    if (!producto) {
      throw new NotFoundException(
        `Producto ${detalleData.productoId} no encontrado`,
      );
    }
    const presentacion = await this.resolverPresentacionCompra(
      producto,
      detalleData.presentacionTipo,
    );
    const detalle = this.detallesRepository.create({
      ordenCompraId: ordenId,
      productoId: detalleData.productoId,
      cantidad: detalleData.cantidad * presentacion.factorUnidades,
      presentacionId: presentacion.presentacionId,
      factorUnidades: presentacion.factorUnidades,
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

  private async getOrdenesPendientesSinRecepcion(
    productoId: string,
    proveedorId: string,
  ): Promise<any[]> {
    const detalles = await this.detallesRepository.find({
      where: { productoId },
      relations: [
        'ordenCompra',
        'ordenCompra.proveedor',
        'ordenCompra.detalles',
      ],
    });

    return (detalles || [])
      .filter(
        (detalle) =>
          detalle.ordenCompra &&
          detalle.ordenCompra.status === 'PENDIENTE' &&
          detalle.ordenCompra.proveedorId === proveedorId,
      )
      .filter(
        (detalle) =>
          !(detalle.ordenCompra.detalles || []).some(
            (d) => Number(d.cantidadRecibida) > 0,
          ),
      )
      .map((detalle) => {
        const factor = Number(detalle.factorUnidades) || 1;
        const cantidadPiezas = Number(detalle.cantidad) || 0;
        const recibidaPiezas = Number(detalle.cantidadRecibida) || 0;
        const pendientePiezas = Math.max(0, cantidadPiezas - recibidaPiezas);
        return {
          id: detalle.ordenCompra.id,
          detalleId: detalle.id,
          folio: detalle.ordenCompra.folio,
          proveedorId: detalle.ordenCompra.proveedorId,
          proveedorNombre: detalle.ordenCompra.proveedor?.nombre || null,
          fechaOrden: detalle.ordenCompra.fechaOrden,
          fechaEsperada: detalle.ordenCompra.fechaEsperada,
          tipoPresentacion: factor > 1 ? 'CAJA' : 'PIEZA',
          presentacionId: detalle.presentacionId,
          factorUnidades: factor,
          cantidad: cantidadPiezas / factor,
          cantidadPiezas,
          cantidadRecibida: recibidaPiezas / factor,
          cantidadRecibidaPiezas: recibidaPiezas,
          cantidadPendiente: pendientePiezas / factor,
          cantidadPendientePiezas: pendientePiezas,
        };
      });
  }

  async reabastecer(dto: {
    productoId: string;
    proveedorId?: string;
    cantidad?: number;
    presentacionTipo?: 'PIEZA' | 'CAJA';
    preview?: boolean;
    confirmarPendiente?: boolean;
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
    const presentacionCompra = await this.resolverPresentacionCompra(
      producto,
      dto.presentacionTipo,
    );
    const presentacionCaja = await this.presentacionRepository.findOne({
      where: {
        productoId: producto.id,
        tipo: PresentacionTipo.CAJA,
        statusId: 1,
      },
    });
    const factorCaja = Number(
      presentacionCaja?.factorUnidades || producto.piezasPorCajaDefault || 0,
    );
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
          ordenesPendientes: [],
          requiereConfirmacionPendiente: false,
        };
      }
    }

    const ordenesPendientes = await this.getOrdenesPendientesSinRecepcion(
      dto.productoId,
      proveedor.id,
    );

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

    const suggestedPiezas = Math.max(
      0,
      (producto.stockMaximo || 10) - stockActual,
    );
    const suggestedQuantity =
      presentacionCompra.factorUnidades > 1
        ? Math.ceil(suggestedPiezas / presentacionCompra.factorUnidades)
        : suggestedPiezas;

    // Preview mode — solo retornar información sin crear/modificar OC
    if (dto.preview) {
      return {
        suggestedQuantity,
        suggestedPiezas,
        factorCaja: factorCaja >= 2 ? factorCaja : null,
        tipoPresentacion: presentacionCompra.tipo,
        factorUnidades: presentacionCompra.factorUnidades,
        presentacionId: presentacionCompra.presentacionId,
        stockActual,
        stockMaximo: producto.stockMaximo || 10,
        stockMinimo: producto.stockMinimo,
        producto: { id: producto.id, nombre: producto.nombre },
        ordenesPendientes,
        requiereConfirmacionPendiente: ordenesPendientes.length > 0,
      };
    }

    const cantidad = dto.cantidad ?? suggestedQuantity;
    const cantidadPiezas = cantidad * presentacionCompra.factorUnidades;
    if (cantidad <= 0) {
      this.logger.warn(
        `Stock suficiente: actual=${stockActual}, maximo=${producto.stockMaximo}, sugerida=${suggestedQuantity}`,
      );
      throw new BadRequestException('El producto tiene suficiente stock');
    }
    this.logger.log(
      `Cantidad a reabastecer: ${cantidad} ${presentacionCompra.tipo} (${cantidadPiezas} piezas)`,
    );

    if (ordenesPendientes.length > 0 && !dto.confirmarPendiente) {
      return {
        requiresConfirmacionPendiente: true,
        ordenesPendientes,
        producto: { id: producto.id, nombre: producto.nombre },
      };
    }

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
          presentacionId: presentacionCompra.presentacionId ?? IsNull(),
        },
      });

      if (detalleExistente) {
        detalleExistente.cantidad += cantidadPiezas;
        await this.detallesRepository.save(detalleExistente);
        const orden = await this.findOne(ocExistente.id);
        return {
          orden,
          esNueva: false,
          cantidad,
          cantidadPiezas,
          tipoPresentacion: presentacionCompra.tipo,
          factorUnidades: presentacionCompra.factorUnidades,
          yaExistia: true,
        };
      }

      await this.addDetalle(ocExistente.id, {
        productoId: dto.productoId,
        cantidad,
        presentacionTipo: presentacionCompra.tipo,
      });
      const orden = await this.findOne(ocExistente.id);
      return {
        orden,
        esNueva: false,
        cantidad,
        cantidadPiezas,
        tipoPresentacion: presentacionCompra.tipo,
        factorUnidades: presentacionCompra.factorUnidades,
        yaExistia: false,
      };
    }

    const orden = await this.create({
      proveedorId: proveedor.id,
      detalles: [
        {
          productoId: dto.productoId,
          cantidad,
          presentacionTipo: presentacionCompra.tipo,
        },
      ],
    });
    return {
      orden,
      esNueva: true,
      cantidad,
      cantidadPiezas,
      tipoPresentacion: presentacionCompra.tipo,
      factorUnidades: presentacionCompra.factorUnidades,
      yaExistia: false,
    };
  }

  async cambiarStatus(id: string, status: string): Promise<OrdenCompra> {
    const VALID_STATUSES = [
      'BORRADOR',
      'PENDIENTE',
      'COMPLETADA',
      'CERRADA_PARCIAL',
      'CANCELADA',
    ];
    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestException(`Status inválido: ${status}`);
    }
    const orden = await this.findOne(id);

    if (orden.status === 'CERRADA_PARCIAL' && status !== 'CERRADA_PARCIAL') {
      throw new BadRequestException(
        'Una orden cerrada parcialmente no puede reabrirse',
      );
    }

    orden.status = status;
    await this.ordenesRepository.save(orden);
    return this.findOne(id);
  }

  async cerrarParcial(id: string): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (orden.status !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo las órdenes pendientes pueden cerrarse parcialmente',
      );
    }

    const detalles = orden.detalles || [];
    if (detalles.length === 0) {
      throw new BadRequestException('La orden no tiene detalles');
    }

    const hayRecepcion = detalles.some(
      (detalle) => Number(detalle.cantidadRecibida) > 0,
    );
    if (!hayRecepcion) {
      throw new BadRequestException(
        'La orden no tiene recepción parcial para cerrar',
      );
    }

    const todosCompletos = detalles.every(
      (detalle) => Number(detalle.cantidadRecibida) >= Number(detalle.cantidad),
    );
    if (todosCompletos) {
      throw new BadRequestException('La orden ya está completamente recibida');
    }

    orden.status = 'CERRADA_PARCIAL';
    const nota = 'Cerrada con recepción parcial';
    orden.observaciones = orden.observaciones
      ? orden.observaciones.includes(nota)
        ? orden.observaciones
        : `${orden.observaciones}\n${nota}`
      : nota;

    await this.ordenesRepository.save(orden);
    return this.findOne(id);
  }

  async recibir(
    id: string,
    recibirDto: RecibirOrdenCompraDto,
    userId: string,
  ): Promise<OrdenCompra> {
    const orden = await this.findOne(id);

    if (orden.status === 'COMPLETADA') {
      throw new BadRequestException('La orden ya está completada');
    }
    if (orden.status === 'CERRADA_PARCIAL') {
      throw new BadRequestException(
        'La orden está cerrada con recepción parcial',
      );
    }
    if (orden.status === 'CANCELADA') {
      throw new BadRequestException('No se puede recibir una orden cancelada');
    }

    await this.entityManager.transaction(async (manager) => {
      const ordenBloqueada = await manager.findOne(OrdenCompra, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ordenBloqueada) {
        throw new NotFoundException('Orden de compra no encontrada');
      }

      const detalles = await manager.find(DetalleOrdenCompra, {
        where: { ordenCompraId: id },
        lock: { mode: 'pessimistic_write' },
      });
      const detallesMap = new Map(
        detalles.map((detalle) => [detalle.id, detalle]),
      );

      for (const detalleRecibido of recibirDto.detalles) {
        const detalle = detallesMap.get(detalleRecibido.detalleId);
        if (!detalle) {
          throw new NotFoundException(
            `Detalle ${detalleRecibido.detalleId} no encontrado en la orden`,
          );
        }

        const producto = await manager.findOne(Producto, {
          where: { id: detalle.productoId },
        });
        if (!producto) {
          throw new NotFoundException(
            `Producto ${detalle.productoId} no encontrado`,
          );
        }

        const factorUnidades = Number(detalle.factorUnidades) || 1;
        const cantidadRecibidaBase =
          Number(detalleRecibido.cantidadRecibida) * factorUnidades;
        const nuevaRecibida =
          Number(detalle.cantidadRecibida) + cantidadRecibidaBase;
        if (nuevaRecibida > Number(detalle.cantidad)) {
          throw new BadRequestException(
            `Cantidad recibida (${nuevaRecibida}) excede la cantidad ordenada (${detalle.cantidad}) para el producto ${producto.nombre}`,
          );
        }

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
            piezasPorCaja:
              factorUnidades > 1
                ? factorUnidades
                : producto.piezasPorCajaDefault,
            empaqueConvertido:
              factorUnidades > 1 || producto.empaqueEstado === 'CONVERTIDO',
            statusId: 1,
          });
          lote = await manager.save(Lote, lote);
        }

        const inventarioReferencia = await manager.findOne(InventarioAlmacen, {
          where: { productoId: detalle.productoId },
          order: { updatedAt: 'DESC' },
        });
        const costoRecibido =
          detalleRecibido.precioUnitario != null
            ? Number(detalleRecibido.precioUnitario)
            : null;
        const costoPresentacion =
          (costoRecibido != null && costoRecibido > 0
            ? costoRecibido
            : Number(detalle.precioEstimado)) || 0;
        const costoUnitario =
          (costoPresentacion > 0 ? costoPresentacion / factorUnidades : 0) ||
          Number(inventarioReferencia?.precioUnitarioLote) ||
          0;
        const cantidadBase = cantidadRecibidaBase;

        let inventario = await manager.findOne(InventarioAlmacen, {
          where: {
            productoId: detalle.productoId,
            loteId: lote.id,
            almacenTipo: AlmacenTipo.VENTAS,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (inventario) {
          inventario.cantidadActual =
            Number(inventario.cantidadActual) + cantidadBase;
          if (costoUnitario > 0) {
            inventario.precioUnitarioLote = costoUnitario;
          }
          if (inventario.precioVenta == null) {
            inventario.precioVenta = inventarioReferencia?.precioVenta ?? null;
          }
          if (inventario.precioVentaCaja == null) {
            inventario.precioVentaCaja =
              inventarioReferencia?.precioVentaCaja ?? null;
          }
        } else {
          inventario = manager.create(InventarioAlmacen, {
            productoId: detalle.productoId,
            loteId: lote.id,
            almacenTipo: AlmacenTipo.VENTAS,
            cantidadActual: cantidadBase,
            precioUnitarioLote: costoUnitario,
            precioVenta: inventarioReferencia?.precioVenta ?? null,
            precioVentaCaja: inventarioReferencia?.precioVentaCaja ?? null,
            ivaCfdi: inventarioReferencia?.ivaCfdi ?? null,
            ivaPersonalizado: inventarioReferencia?.ivaPersonalizado ?? null,
          });
        }

        inventario = await manager.save(InventarioAlmacen, inventario);

        const movimiento = manager.create(MovimientoAlmacen, {
          productoId: detalle.productoId,
          loteId: lote.id,
          almacenOrigen: AlmacenTipo.VENTAS,
          almacenDestino: AlmacenTipo.VENTAS,
          cantidad: cantidadBase,
          userId,
          observaciones: `Recepción OC ${orden.folio}`,
          tipoMovimiento: TipoMovimiento.ENTRADA_BODEGA,
          origenOperacion: OrigenOperacion.API,
        });
        const movimientoGuardado = await manager.save(
          MovimientoAlmacen,
          movimiento,
        );

        const detalleLoteRepo = manager.getRepository(DetalleLote);
        await detalleLoteRepo.save(
          detalleLoteRepo.create({
            productoId: detalle.productoId,
            loteId: lote.id,
            cantidad: cantidadBase,
            precioUnitario: costoUnitario,
            ivaCfdi: inventario.ivaCfdi,
            movimientoId: movimientoGuardado.id,
            almacenTipo: AlmacenTipo.VENTAS,
          }),
        );

        inventario.ultimoMovimientoId = movimientoGuardado.id;
        await manager.save(InventarioAlmacen, inventario);

        const preciosOrigen = await manager.getRepository(LotePrecio).find({
          where: { productoId: detalle.productoId, statusId: 1 },
          order: { updatedAt: 'DESC' },
        });
        const precioRepo = manager.getRepository(LotePrecio);
        for (const precioOrigen of preciosOrigen) {
          const existente = await precioRepo.findOne({
            where: {
              loteId: lote.id,
              presentacionId: precioOrigen.presentacionId,
            },
          });
          if (!existente) {
            await precioRepo.save(
              precioRepo.create({
                productoId: detalle.productoId,
                loteId: lote.id,
                presentacionId: precioOrigen.presentacionId,
                precioVenta: precioOrigen.precioVenta,
                statusId: 1,
                createdBy: null,
                updatedBy: null,
              }),
            );
          }
        }

        if (
          costoUnitario > 0 &&
          Number(producto.margenRecomendado) > 0 &&
          inventario.precioVenta == null
        ) {
          inventario.precioVenta =
            Math.round(
              costoUnitario *
                (1 + Number(producto.margenRecomendado) / 100) *
                100,
            ) / 100;
          await manager.save(InventarioAlmacen, inventario);
        }

        detalle.cantidadRecibida = nuevaRecibida;
        await manager.save(DetalleOrdenCompra, detalle);
      }

      const detallesActualizados = await manager.find(DetalleOrdenCompra, {
        where: { ordenCompraId: id },
      });
      const todosCompletados = detallesActualizados.every(
        (detalle) =>
          Number(detalle.cantidadRecibida) >= Number(detalle.cantidad),
      );
      if (todosCompletados) {
        ordenBloqueada.status = 'COMPLETADA';
        await manager.save(OrdenCompra, ordenBloqueada);
      } else if (ordenBloqueada.status === 'BORRADOR') {
        ordenBloqueada.status = 'PENDIENTE';
        await manager.save(OrdenCompra, ordenBloqueada);
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const orden = await this.findOne(id);
    if (orden.status === 'COMPLETADA') {
      throw new BadRequestException(
        'No se puede eliminar una orden completada',
      );
    }
    if (orden.status === 'CERRADA_PARCIAL') {
      throw new BadRequestException(
        'No se puede eliminar una orden cerrada parcialmente',
      );
    }
    orden.status = 'CANCELADA';
    await this.ordenesRepository.save(orden);
  }
}
