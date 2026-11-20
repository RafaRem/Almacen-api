import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, MoreThan, In } from 'typeorm';
import { InventarioAlmacen } from './entities/inventario-almacen.entity';
import { Producto } from '../productos/entities/producto.entity';
import { ProductoPresentacion } from '../productos/entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { PresentacionTipo } from '../common/enums/presentacion-tipo.enum';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { DetalleLote } from '../detalle-lote/entities/detalle-lote.entity';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import { LotePrecio } from '../precios-lote/entities/lote-precio.entity';
import {
  SYSTEM_USER_ID,
  TipoMovimiento,
  OrigenOperacion,
} from '../common/constants';

export interface MovimientoMetadata {
  sucursalId?: string;
  turno?: string;
  caja?: string;
  terminalId?: string;
  sessionId?: string;
  origenOperacion?: OrigenOperacion;
  referenciaExterna?: string;
  observaciones?: string;
  factorRequerido?: number | null;
}

@Injectable()
export class InventarioAlmacenService {
  private readonly logger = new Logger(InventarioAlmacenService.name);

  constructor(
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private loteRepository: Repository<Lote>,
    @InjectRepository(ProductoPresentacion)
    private presentacionRepository: Repository<ProductoPresentacion>,
    private preciosLoteService: PreciosLoteService,
    @InjectRepository(MovimientoAlmacen)
    private movimientoRepository: Repository<MovimientoAlmacen>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      relations: ['producto', 'producto.presentaciones', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAlmacen(almacenTipo: AlmacenTipo): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      where: { almacenTipo },
      relations: ['producto', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProducto(productoId: string): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByLote(loteId: string): Promise<InventarioAlmacen[]> {
    return this.inventarioRepository.find({
      where: { loteId },
      relations: ['producto'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStockPorAlmacen(
    almacenTipo: AlmacenTipo,
    soloConStock: boolean = false,
  ): Promise<any[]> {
    const where: any = { almacenTipo };
    if (soloConStock) {
      where.cantidadActual = MoreThan(0);
    }
    const inventarios = await this.inventarioRepository.find({
      where,
      relations: ['producto', 'producto.laboratorio', 'lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    const agrupado = new Map<string, any>();

    for (const inv of inventarios) {
      const key = inv.productoId;
      if (agrupado.has(key)) {
        agrupado.get(key).cantidadActual += Number(inv.cantidadActual);
        if (inv.precioVenta) {
          agrupado.get(key).precioVenta = inv.precioVenta;
        }
        if (inv.precioVentaCaja) {
          agrupado.get(key).precioVentaCaja = inv.precioVentaCaja;
        }
        agrupado.get(key).lotes.push({
          loteId: inv.loteId,
          numeroLote: inv.lote?.numeroLote,
          precio: inv.precioUnitarioLote,
          precioVenta: inv.precioVenta,
          precioVentaCaja: inv.precioVentaCaja,
          piezasPorCaja: inv.lote?.piezasPorCaja,
          fechaCaducidad: inv.lote?.fechaCaducidad,
          cantidad: Number(inv.cantidadActual),
          iva_cfdi: inv.ivaCfdi,
          ivaPersonalizado: inv.ivaPersonalizado,
          statusId: inv.lote?.statusId,
        });
      } else {
        agrupado.set(key, {
          productoId: inv.productoId,
          producto: inv.producto,
          presentaciones: (inv.producto as any)?.presentaciones || [],
          piezasPorCajaDefault:
            (inv.producto as any)?.piezasPorCajaDefault || null,
          empaqueEstado: (inv.producto as any)?.empaqueEstado || null,
          cantidadActual: Number(inv.cantidadActual),
          lote: inv.lote,
          loteId: inv.loteId,
          ivaPersonalizado: inv.ivaPersonalizado,
          ivaCfdi: inv.ivaCfdi,
          precioUnitarioLote: inv.precioUnitarioLote,
          precioVenta: inv.precioVenta,
          precioVentaCaja: inv.precioVentaCaja,
          lotes: [
            {
              loteId: inv.loteId,
              numeroLote: inv.lote?.numeroLote,
              precio: inv.precioUnitarioLote,
              precioVenta: inv.precioVenta,
              precioVentaCaja: inv.precioVentaCaja,
              piezasPorCaja: inv.lote?.piezasPorCaja,
              fechaCaducidad: inv.lote?.fechaCaducidad,
              cantidad: Number(inv.cantidadActual),
              iva_cfdi: inv.ivaCfdi,
              ivaPersonalizado: inv.ivaPersonalizado,
              statusId: inv.lote?.statusId,
            },
          ],
        });
      }
    }

    const resultado = Array.from(agrupado.values());

    for (const item of resultado) {
      if (item.lotes && item.lotes.length > 0) {
        item.lotes.sort((a, b) => {
          const dateA = new Date(a.fechaCaducidad || '9999-12-31');
          const dateB = new Date(b.fechaCaducidad || '9999-12-31');
          return dateA.getTime() - dateB.getTime();
        });
      }
    }

    if (resultado.length > 0) {
      const productoIds = resultado.map((item) => item.productoId);
      const presentaciones = await this.presentacionRepository.find({
        where: { productoId: In(productoIds), statusId: 1 },
        order: { factorUnidades: 'ASC' },
      });
      for (const item of resultado) {
        item.presentaciones = presentaciones.filter(
          (presentacion) => presentacion.productoId === item.productoId,
        );
      }
      const lotIds = resultado.flatMap((item) =>
        (item.lotes || []).map((lote) => lote.loteId),
      );
      const precios = await this.preciosLoteService.findByLotes(lotIds);
      const preciosMap = new Map<string, { pieza?: number; caja?: number }>();
      for (const precio of precios) {
        const actual = preciosMap.get(precio.loteId) || {};
        if (precio.presentacion?.tipo === 'PIEZA') {
          actual.pieza = Number(precio.precioVenta);
        } else if (precio.presentacion?.tipo === 'CAJA') {
          actual.caja = Number(precio.precioVenta);
        }
        preciosMap.set(precio.loteId, actual);
      }
      for (const item of resultado) {
        for (const lote of item.lotes || []) {
          const precio = preciosMap.get(lote.loteId);
          if (precio) {
            if (precio.pieza !== undefined) lote.precioVenta = precio.pieza;
            if (precio.caja !== undefined) lote.precioVentaCaja = precio.caja;
          }
        }
        const primerLote = item.lotes?.[0];
        item.precioVenta =
          item.lotes?.find((lote) => lote.precioVenta != null)?.precioVenta ??
          item.precioVenta ??
          null;
        item.precioVentaCaja =
          item.lotes?.find((lote) => lote.precioVentaCaja != null)
            ?.precioVentaCaja ??
          item.precioVentaCaja ??
          null;
        item.precioVentaSugerido =
          item.precioVentaCaja && item.piezasPorCajaDefault
            ? Math.round(
                (Number(item.precioVentaCaja) /
                  Number(item.piezasPorCajaDefault)) *
                  100,
              ) / 100
            : null;
      }
    }

    for (const item of resultado) {
      const esProductoEmpacado =
        item.empaqueEstado === 'CONVERTIDO' &&
        Number(item.piezasPorCajaDefault) > 1;
      if (esProductoEmpacado) {
        item.precioVentaSugerido =
          item.precioVentaCaja && item.piezasPorCajaDefault
            ? Math.round(
                (Number(item.precioVentaCaja) /
                  Number(item.piezasPorCajaDefault)) *
                  100,
              ) / 100
            : null;
        continue;
      }
      if (item.precioUnitarioLote > 0 && item.precioVenta == null) {
        item.precioVenta = this.calcularPrecioVenta(
          item.precioUnitarioLote,
          item.producto?.margenRecomendado,
        );
      }
    }

    return resultado;
  }

  async agregarStock(
    productoId: string,
    loteId: string,
    almacenTipo: AlmacenTipo,
    cantidad: number,
    ivaCfdi?: number | null,
    precioUnitarioLote?: number | null,
    managerArg?: EntityManager,
    tipoMovimiento?: string,
    userId?: string,
    precioVentaFijo?: number | null,
    observacionMovimiento?: string,
  ): Promise<InventarioAlmacen> {
    const repo = managerArg
      ? managerArg.getRepository(InventarioAlmacen)
      : this.inventarioRepository;
    const movimientoRepo = managerArg
      ? managerArg.getRepository(MovimientoAlmacen)
      : this.movimientoRepository;

    let inventario = await repo.findOne({
      where: { productoId, loteId, almacenTipo },
    });

    if (inventario) {
      inventario.cantidadActual = Number(inventario.cantidadActual) + cantidad;
      if (ivaCfdi !== undefined && ivaCfdi !== null) {
        inventario.ivaCfdi = ivaCfdi;
      }
      if (precioUnitarioLote !== undefined && precioUnitarioLote !== null) {
        inventario.precioUnitarioLote = precioUnitarioLote;
      }
      if (
        precioVentaFijo !== undefined &&
        precioVentaFijo !== null &&
        precioVentaFijo > 0
      ) {
        inventario.precioVenta = precioVentaFijo;
      }
      const saved = await repo.save(inventario);
      if (tipoMovimiento) {
        const movimiento = movimientoRepo.create({
          productoId,
          loteId,
          almacenOrigen: almacenTipo,
          almacenDestino: almacenTipo,
          cantidad,
          userId: userId || SYSTEM_USER_ID,
          observaciones:
            observacionMovimiento || `Entrada por ${tipoMovimiento}`,
          tipoMovimiento,
          origenOperacion: OrigenOperacion.API,
        });
        const savedMov = await movimientoRepo.save(movimiento);
        saved.ultimoMovimientoId = savedMov.id;
        await repo.save(saved);
      }
      return saved;
    } else {
      const precioLote = precioUnitarioLote;
      if (precioLote === undefined || precioLote === null || precioLote === 0) {
        throw new Error('precioUnitarioLote es requerido para agregar stock');
      }
      inventario = repo.create({
        productoId,
        loteId,
        almacenTipo,
        cantidadActual: cantidad,
        ivaCfdi: ivaCfdi ?? null,
        precioUnitarioLote: precioLote,
        precioVenta:
          precioVentaFijo !== undefined &&
          precioVentaFijo !== null &&
          precioVentaFijo > 0
            ? precioVentaFijo
            : null,
      });
    }

    const saved = await repo.save(inventario);

    if (tipoMovimiento) {
      const movimiento = movimientoRepo.create({
        productoId,
        loteId,
        almacenOrigen: almacenTipo,
        almacenDestino: almacenTipo,
        cantidad,
        userId: userId || SYSTEM_USER_ID,
        observaciones: observacionMovimiento || `Entrada por ${tipoMovimiento}`,
        tipoMovimiento,
        origenOperacion: OrigenOperacion.API,
      });
      const savedMov = await movimientoRepo.save(movimiento);
      saved.ultimoMovimientoId = savedMov.id;
      await repo.save(saved);
    }

    return saved;
  }

  calcularPrecioVenta(
    precioUnitario: number,
    margen: number | null,
  ): number | null {
    if (!precioUnitario || precioUnitario <= 0) {
      return null;
    }
    const margenValor = margen ?? 20;

    const precioVenta = precioUnitario * (1 + margenValor / 100);

    return Math.round(precioVenta * 100) / 100;
  }

  async actualizarPrecioVenta(
    inventario: InventarioAlmacen,
  ): Promise<InventarioAlmacen> {
    const producto = await this.productoRepository.findOne({
      where: { id: inventario.productoId },
    });
    if (!producto) {
      return inventario;
    }
    if (
      producto.empaqueEstado === 'CONVERTIDO' &&
      Number(producto.piezasPorCajaDefault) > 1
    ) {
      return inventario;
    }

    inventario.precioVenta = this.calcularPrecioVenta(
      inventario.precioUnitarioLote,
      producto.margenRecomendado,
    );

    return this.inventarioRepository.save(inventario);
  }

  private async queryLotesPorFIFO(
    manager: EntityManager,
    productoId: string,
    cantidad: number,
    almacenTipo: AlmacenTipo,
    factorRequerido?: number | null,
  ): Promise<{
    inventarios: InventarioAlmacen[];
    totalDisponible: number;
    lotsSelected: {
      inventario: InventarioAlmacen;
      cantidad: number;
    }[];
  }> {
    const query = manager
      .createQueryBuilder(InventarioAlmacen, 'inv')
      .innerJoinAndSelect('inv.lote', 'lote')
      .where('inv.productoId = :productoId', { productoId })
      .andWhere('inv.almacenTipo = :almacenTipo', { almacenTipo })
      .andWhere('inv.cantidadActual > 0')
      .andWhere('CAST(lote.statusId AS text) = :loteActivo', {
        loteActivo: '1',
      });
    if (Number(factorRequerido) > 1) {
      query.andWhere('lote.piezasPorCaja = :factorRequerido', {
        factorRequerido: Number(factorRequerido),
      });
    }
    const inventarios = await query
      .orderBy('lote.fechaCaducidad', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    let totalDisponible = 0;
    for (const inv of inventarios) {
      totalDisponible += Number(inv.cantidadActual);
    }

    const lotsSelected: { inventario: InventarioAlmacen; cantidad: number }[] =
      [];
    let restante = cantidad;

    for (const inv of inventarios) {
      if (restante <= 0) break;
      const disponible = Number(inv.cantidadActual);
      const aTransferir = Math.min(disponible, restante);
      lotsSelected.push({ inventario: inv, cantidad: aTransferir });
      restante -= aTransferir;
    }

    return { inventarios, totalDisponible, lotsSelected };
  }

  async reducirStockFIFO(
    productoId: string,
    cantidad: number,
    almacenTipoOrigen: AlmacenTipo,
    userId: string = SYSTEM_USER_ID,
    metadata?: MovimientoMetadata,
    managerArg?: EntityManager,
  ): Promise<{
    success: boolean;
    message: string;
    lotsUsed: {
      loteId: string;
      numeroLote: string;
      cantidad: number;
      precio: number;
      precioVentaCaja?: number | null;
      piezasPorCaja?: number | null;
      costoUnitario: number;
    }[];
    movimientoId?: string;
  }> {
    if (!cantidad || cantidad <= 0) {
      return {
        success: false,
        message: 'Cantidad inválida para reducir stock',
        lotsUsed: [],
      };
    }

    const executeReduce = async (manager: EntityManager) => {
      const { inventarios, totalDisponible, lotsSelected } =
        await this.queryLotesPorFIFO(
          manager,
          productoId,
          cantidad,
          almacenTipoOrigen,
          metadata?.factorRequerido,
        );

      if (totalDisponible < cantidad) {
        return {
          success: false,
          message: `Stock insuficiente. Disponible: ${totalDisponible}, Solicitado: ${cantidad}`,
          lotsUsed: [],
        };
      }

      const lotsUsed: {
        loteId: string;
        numeroLote: string;
        cantidad: number;
        precio: number;
        precioVentaCaja?: number | null;
        piezasPorCaja?: number | null;
        costoUnitario: number;
      }[] = [];

      for (const { inventario, cantidad: cant } of lotsSelected) {
        inventario.cantidadActual -= cant;
        await manager.save(inventario);

        lotsUsed.push({
          loteId: inventario.loteId,
          numeroLote: inventario.lote?.numeroLote || 'N/A',
          cantidad: cant,
          precio: Number(inventario.precioVenta) || 0,
          precioVentaCaja: inventario.precioVentaCaja,
          piezasPorCaja: inventario.lote?.piezasPorCaja,
          costoUnitario: Number(inventario.precioUnitarioLote) || 0,
        });
      }

      const movimiento = manager.create(MovimientoAlmacen, {
        productoId,
        loteId: inventarios[0]?.loteId,
        almacenOrigen: almacenTipoOrigen,
        almacenDestino: AlmacenTipo.CLIENTE,
        cantidad,
        userId,
        observaciones: metadata?.referenciaExterna || 'Venta',
        tipoMovimiento: TipoMovimiento.VENTA,
        origenOperacion: metadata?.origenOperacion || OrigenOperacion.POS,
      });

      const savedMovimiento = await manager.save(movimiento);

      return {
        success: true,
        message: `Vendido ${cantidad} unidades usando FEPU`,
        lotsUsed,
        movimientoId: savedMovimiento.id,
      };
    };

    if (managerArg) {
      return executeReduce(managerArg);
    } else {
      return this.dataSource.transaction(executeReduce);
    }
  }

  async reducirStockLotesSeleccionados(
    productoId: string,
    allocations: { loteId: string; cantidad: number }[],
    almacenTipoOrigen: AlmacenTipo,
    userId: string = SYSTEM_USER_ID,
    metadata?: MovimientoMetadata,
    managerArg?: EntityManager,
  ): Promise<{
    success: boolean;
    message: string;
    lotsUsed: {
      loteId: string;
      numeroLote: string;
      cantidad: number;
      precio: number;
      precioVentaCaja?: number | null;
      piezasPorCaja?: number | null;
      costoUnitario: number;
    }[];
    movimientoId?: string;
  }> {
    const totalSolicitado = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.cantidad || 0),
      0,
    );

    if (!allocations.length || totalSolicitado <= 0) {
      return {
        success: false,
        message: 'Cantidad inválida para reducir stock',
        lotsUsed: [],
      };
    }

    const executeReduce = async (manager: EntityManager) => {
      const loteIds = [
        ...new Set(allocations.map((allocation) => allocation.loteId)),
      ];
      const inventarios = await manager
        .createQueryBuilder(InventarioAlmacen, 'inv')
        .innerJoinAndSelect('inv.lote', 'lote')
        .where('inv.productoId = :productoId', { productoId })
        .andWhere('inv.almacenTipo = :almacenTipo', {
          almacenTipo: almacenTipoOrigen,
        })
        .andWhere('inv.loteId IN (:...loteIds)', { loteIds })
        .setLock('pessimistic_write')
        .getMany();

      const inventarioPorLote = new Map(
        inventarios.map((inventario) => [inventario.loteId, inventario]),
      );
      const factorRequerido = Number(metadata?.factorRequerido);
      if (factorRequerido > 1) {
        for (const inventario of inventarios) {
          const factorLote = Number(inventario.lote?.piezasPorCaja) || 0;
          if (factorLote !== factorRequerido) {
            throw new BadRequestException(
              `El lote ${inventario.lote?.numeroLote || inventario.loteId} tiene ${factorLote} piezas por caja y la línea usa ${factorRequerido}`,
            );
          }
        }
      }

      const lotsUsed: {
        loteId: string;
        numeroLote: string;
        cantidad: number;
        precio: number;
        precioVentaCaja?: number | null;
        piezasPorCaja?: number | null;
        costoUnitario: number;
      }[] = [];

      for (const allocation of allocations) {
        const inventario = inventarioPorLote.get(allocation.loteId);
        if (!inventario) {
          throw new BadRequestException(
            `No se encontró inventario para el lote ${allocation.loteId}`,
          );
        }
        if (Number(inventario.lote?.statusId) !== 1) {
          throw new BadRequestException(
            `El lote ${inventario.lote?.numeroLote || allocation.loteId} no está activo`,
          );
        }
        const cantidad = Number(allocation.cantidad);
        if (cantidad <= 0 || Number(inventario.cantidadActual) < cantidad) {
          throw new BadRequestException(
            `Stock insuficiente en el lote ${inventario.lote?.numeroLote || allocation.loteId}`,
          );
        }
        inventario.cantidadActual =
          Number(inventario.cantidadActual) - cantidad;
        await manager.save(inventario);

        lotsUsed.push({
          loteId: inventario.loteId,
          numeroLote: inventario.lote?.numeroLote || 'N/A',
          cantidad,
          precio: Number(inventario.precioVenta) || 0,
          precioVentaCaja: inventario.precioVentaCaja,
          piezasPorCaja: inventario.lote?.piezasPorCaja,
          costoUnitario: Number(inventario.precioUnitarioLote) || 0,
        });
      }

      const movimiento = manager.create(MovimientoAlmacen, {
        productoId,
        loteId: allocations[0].loteId,
        almacenOrigen: almacenTipoOrigen,
        almacenDestino: AlmacenTipo.CLIENTE,
        cantidad: totalSolicitado,
        userId,
        observaciones: metadata?.referenciaExterna || 'Venta',
        tipoMovimiento: TipoMovimiento.VENTA,
        origenOperacion: metadata?.origenOperacion || OrigenOperacion.POS,
      });
      const savedMovimiento = await manager.save(movimiento);

      return {
        success: true,
        message: `Vendido ${totalSolicitado} unidades usando lotes seleccionados`,
        lotsUsed,
        movimientoId: savedMovimiento.id,
      };
    };

    if (managerArg) {
      return executeReduce(managerArg);
    }
    return this.dataSource.transaction(executeReduce);
  }

  async consultarLotesFIFO(
    productoId: string,
    cantidad: number,
    almacenTipo: AlmacenTipo = AlmacenTipo.VENTAS,
  ): Promise<{
    success: boolean;
    lotsUsed: {
      loteId: string;
      numeroLote: string;
      cantidad: number;
      precio: number;
      costoUnitario: number;
      ivaCfdi: number;
      fechaCaducidad?: Date;
    }[];
    precioPromedio: number;
    precioVentaTotal: number;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const { inventarios, totalDisponible, lotsSelected } =
        await this.queryLotesPorFIFO(
          manager,
          productoId,
          cantidad,
          almacenTipo,
        );

      if (totalDisponible < cantidad) {
        return {
          success: false,
          lotsUsed: [],
          precioPromedio: 0,
          precioVentaTotal: 0,
        };
      }

      const lotsUsed: {
        loteId: string;
        numeroLote: string;
        cantidad: number;
        precio: number;
        costoUnitario: number;
        ivaCfdi: number;
        fechaCaducidad?: Date;
      }[] = [];

      for (const { inventario, cantidad: cant } of lotsSelected) {
        lotsUsed.push({
          loteId: inventario.loteId,
          numeroLote: inventario.lote?.numeroLote || 'N/A',
          cantidad: cant,
          precio: inventario.precioVenta || inventario.precioUnitarioLote,
          costoUnitario: Number(inventario.precioUnitarioLote) || 0,
          ivaCfdi: inventario.ivaCfdi || 0,
          fechaCaducidad: inventario.lote?.fechaCaducidad,
        });
      }

      const totalPrecio = lotsUsed.reduce(
        (sum, l) => sum + l.precio * l.cantidad,
        0,
      );
      const totalCantidad = lotsUsed.reduce((sum, l) => sum + l.cantidad, 0);
      const precioPromedio =
        totalCantidad > 0 ? totalPrecio / totalCantidad : 0;

      return {
        success: true,
        lotsUsed,
        precioPromedio: Math.round(precioPromedio * 100) / 100,
        precioVentaTotal: Math.round(totalPrecio * 100) / 100,
      };
    });
  }

  private determinarTipoMovimiento(
    almacenOrigen: AlmacenTipo,
    almacenDestino: AlmacenTipo | null,
  ): TipoMovimiento {
    if (almacenDestino === null) {
      return TipoMovimiento.VENTA;
    }

    if (
      almacenOrigen === AlmacenTipo.RECEPCION &&
      almacenDestino === AlmacenTipo.VENTAS
    ) {
      return TipoMovimiento.TRANSFERENCIA_BODEGA_VENTAS;
    }
    if (
      almacenOrigen === AlmacenTipo.VENTAS &&
      almacenDestino === AlmacenTipo.RECEPCION
    ) {
      return TipoMovimiento.TRANSFERENCIA_VENTAS_BODEGA;
    }
    if (
      almacenOrigen === AlmacenTipo.VENTAS &&
      almacenDestino === AlmacenTipo.MERMAS
    ) {
      return TipoMovimiento.TRANSFERENCIA_VENTAS_MERMAS;
    }
    if (
      almacenOrigen === AlmacenTipo.VENTAS &&
      almacenDestino === AlmacenTipo.CADUCADOS
    ) {
      return TipoMovimiento.TRANSFERENCIA_VENTAS_CADUCADOS;
    }
    if (
      almacenOrigen === AlmacenTipo.VENTAS &&
      almacenDestino === AlmacenTipo.DONADOS
    ) {
      return TipoMovimiento.TRANSFERENCIA_VENTAS_DONACION;
    }
    if (
      almacenOrigen === AlmacenTipo.VENTAS &&
      almacenDestino === AlmacenTipo.DESTRUCCION
    ) {
      return TipoMovimiento.TRANSFERENCIA_VENTAS_DESTRUCCION;
    }
    if (
      almacenOrigen === AlmacenTipo.RECEPCION &&
      almacenDestino === AlmacenTipo.MERMAS
    ) {
      return TipoMovimiento.TRANSFERENCIA_BODEGA_MERMAS;
    }

    return TipoMovimiento.TRANSFERENCIA_OTRO;
  }

  async moverStock(
    productoId: string,
    loteId: string,
    cantidad: number,
    almacenTipoOrigen: AlmacenTipo,
    almacenTipoDestino: AlmacenTipo,
    userId: string = SYSTEM_USER_ID,
    observaciones?: string,
    metadata?: MovimientoMetadata,
  ): Promise<InventarioAlmacen> {
    return this.dataSource.transaction(async (manager) => {
      const inventarioOrigen = await manager.findOne(InventarioAlmacen, {
        where: { productoId, loteId, almacenTipo: almacenTipoOrigen },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventarioOrigen) {
        throw new BadRequestException(
          'No se encontró inventario en el almacén de origen',
        );
      }

      const stockActual = Number(inventarioOrigen.cantidadActual);

      if (stockActual < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`,
        );
      }

      inventarioOrigen.cantidadActual = stockActual - cantidad;
      await manager.save(inventarioOrigen);

      let inventarioDestino = await manager.findOne(InventarioAlmacen, {
        where: { productoId, loteId, almacenTipo: almacenTipoDestino },
        lock: { mode: 'pessimistic_write' },
      });

      if (inventarioDestino) {
        inventarioDestino.cantidadActual =
          Number(inventarioDestino.cantidadActual) + cantidad;

        // Si el lote es el mismo y origen tiene precioVenta, copiar al destino solo si destino no lo tiene
        if (
          inventarioOrigen.loteId === inventarioDestino.loteId &&
          inventarioOrigen.precioVenta != null &&
          inventarioDestino.precioVenta == null
        ) {
          inventarioDestino.precioVenta = inventarioOrigen.precioVenta;
        }
        if (
          inventarioOrigen.loteId === inventarioDestino.loteId &&
          inventarioOrigen.precioVentaCaja != null &&
          inventarioDestino.precioVentaCaja == null
        ) {
          inventarioDestino.precioVentaCaja = inventarioOrigen.precioVentaCaja;
        }
      } else {
        inventarioDestino = manager.create(InventarioAlmacen, {
          productoId,
          loteId,
          almacenTipo: almacenTipoDestino,
          cantidadActual: cantidad,
          precioUnitarioLote: inventarioOrigen.precioUnitarioLote,
          precioVenta: inventarioOrigen.precioVenta,
          precioVentaCaja: inventarioOrigen.precioVentaCaja,
          ivaCfdi: inventarioOrigen.ivaCfdi,
          ivaPersonalizado: inventarioOrigen.ivaPersonalizado,
        });
      }

      const savedDestino = await manager.save(inventarioDestino);

      const tipoMovimiento = this.determinarTipoMovimiento(
        almacenTipoOrigen,
        almacenTipoDestino,
      );

      const movimiento = manager.create(MovimientoAlmacen, {
        productoId,
        loteId,
        almacenOrigen: almacenTipoOrigen,
        almacenDestino: almacenTipoDestino,
        cantidad,
        userId,
        observaciones,
        tipoMovimiento,
        origenOperacion: metadata?.origenOperacion || OrigenOperacion.ADMIN,
      });

      const savedMovimiento = await manager.save(movimiento);

      const detalleLoteRepo = manager.getRepository(DetalleLote);
      await detalleLoteRepo.save(
        detalleLoteRepo.create({
          productoId,
          loteId,
          cantidad,
          precioUnitario: inventarioOrigen.precioUnitarioLote,
          ivaCfdi: inventarioOrigen.ivaCfdi,
          movimientoId: savedMovimiento.id,
          almacenTipo: almacenTipoOrigen,
        }),
      );

      inventarioOrigen.ultimoMovimientoId = savedMovimiento.id;
      await manager.save(inventarioOrigen);

      if (savedDestino.id) {
        const destinoActualizado = await manager.findOne(InventarioAlmacen, {
          where: { id: savedDestino.id },
        });
        if (destinoActualizado) {
          destinoActualizado.ultimoMovimientoId = savedMovimiento.id;
          await manager.save(destinoActualizado);
        }
      }

      return savedDestino;
    });
  }

  async moverStockBatch(
    items: { productoId: string; loteId: string; cantidad: number }[],
    almacenTipoOrigen: AlmacenTipo,
    almacenTipoDestino: AlmacenTipo,
    userId: string = SYSTEM_USER_ID,
    metadata?: MovimientoMetadata,
  ): Promise<{
    success: boolean;
    moved: number;
    errors: string[];
    failedItems: {
      productoId: string;
      loteId: string;
      cantidad: number;
      error: string;
    }[];
  }> {
    return this.dataSource.transaction(async (manager) => {
      const errors: string[] = [];
      const failedItems: {
        productoId: string;
        loteId: string;
        cantidad: number;
        error: string;
      }[] = [];
      let moved = 0;

      for (const item of items) {
        try {
          const inventarioOrigen = await manager.findOne(InventarioAlmacen, {
            where: {
              productoId: item.productoId,
              loteId: item.loteId,
              almacenTipo: almacenTipoOrigen,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!inventarioOrigen) {
            throw new Error(
              'No se encontró inventario en el almacén de origen',
            );
          }

          const stockActual = Number(inventarioOrigen.cantidadActual);

          if (stockActual < item.cantidad) {
            throw new Error(
              `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${item.cantidad}`,
            );
          }

          inventarioOrigen.cantidadActual = stockActual - item.cantidad;
          await manager.save(inventarioOrigen);

          let inventarioDestino = await manager.findOne(InventarioAlmacen, {
            where: {
              productoId: item.productoId,
              loteId: item.loteId,
              almacenTipo: almacenTipoDestino,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (inventarioDestino) {
            inventarioDestino.cantidadActual =
              Number(inventarioDestino.cantidadActual) + item.cantidad;

            // Si el lote es el mismo y origen tiene precioVenta, copiar al destino solo si destino no lo tiene
            if (
              inventarioOrigen.loteId === inventarioDestino.loteId &&
              inventarioOrigen.precioVenta != null &&
              inventarioDestino.precioVenta == null
            ) {
              inventarioDestino.precioVenta = inventarioOrigen.precioVenta;
            }
            if (
              inventarioOrigen.loteId === inventarioDestino.loteId &&
              inventarioOrigen.precioVentaCaja != null &&
              inventarioDestino.precioVentaCaja == null
            ) {
              inventarioDestino.precioVentaCaja =
                inventarioOrigen.precioVentaCaja;
            }
          } else {
            inventarioDestino = manager.create(InventarioAlmacen, {
              productoId: item.productoId,
              loteId: item.loteId,
              almacenTipo: almacenTipoDestino,
              cantidadActual: item.cantidad,
              precioUnitarioLote: inventarioOrigen.precioUnitarioLote,
              precioVenta: inventarioOrigen.precioVenta,
              precioVentaCaja: inventarioOrigen.precioVentaCaja,
              ivaCfdi: inventarioOrigen.ivaCfdi,
              ivaPersonalizado: inventarioOrigen.ivaPersonalizado,
            });
          }

          const savedDestino = await manager.save(inventarioDestino);

          const tipoMovimiento = this.determinarTipoMovimiento(
            almacenTipoOrigen,
            almacenTipoDestino,
          );

          const movimiento = manager.create(MovimientoAlmacen, {
            productoId: item.productoId,
            loteId: item.loteId,
            almacenOrigen: almacenTipoOrigen,
            almacenDestino: almacenTipoDestino,
            cantidad: item.cantidad,
            userId,
            observaciones:
              metadata?.observaciones ||
              `Transferencia batch ${almacenTipoOrigen} -> ${almacenTipoDestino}`,
            tipoMovimiento,
            origenOperacion: metadata?.origenOperacion || OrigenOperacion.ADMIN,
          });

          const savedMovimiento = await manager.save(movimiento);

          const detalleLoteRepo = manager.getRepository(DetalleLote);
          await detalleLoteRepo.save(
            detalleLoteRepo.create({
              productoId: item.productoId,
              loteId: item.loteId,
              cantidad: item.cantidad,
              precioUnitario: inventarioOrigen.precioUnitarioLote,
              ivaCfdi: inventarioOrigen.ivaCfdi,
              movimientoId: savedMovimiento.id,
              almacenTipo: almacenTipoOrigen,
            }),
          );

          inventarioOrigen.ultimoMovimientoId = savedMovimiento.id;
          await manager.save(inventarioOrigen);

          if (savedDestino.id) {
            const destinoActualizado = await manager.findOne(
              InventarioAlmacen,
              {
                where: { id: savedDestino.id },
              },
            );
            if (destinoActualizado) {
              destinoActualizado.ultimoMovimientoId = savedMovimiento.id;
              await manager.save(destinoActualizado);
            }
          }

          moved++;
        } catch (error) {
          const errorMessage = error.message || 'Error desconocido';
          this.logger.error(
            `Batch item failed — productoId=${item.productoId}, loteId=${item.loteId}, cantidad=${item.cantidad}: ${errorMessage}`,
            error.stack,
          );
          errors.push(
            `Producto ${item.productoId} (Lote ${item.loteId}): ${errorMessage}`,
          );
          failedItems.push({
            productoId: item.productoId,
            loteId: item.loteId,
            cantidad: item.cantidad,
            error: errorMessage,
          });
        }
      }

      if (failedItems.length > 0) {
        throw new Error(`Batch completed with ${failedItems.length} failures`);
      }

      return {
        success: errors.length === 0,
        moved,
        errors,
        failedItems,
      };
    });
  }

  async getStockTotal(
    productoId: string,
    almacenTipo?: AlmacenTipo,
  ): Promise<number> {
    const qb = this.inventarioRepository
      .createQueryBuilder('inv')
      .select('COALESCE(SUM(inv.cantidadActual), 0)', 'total')
      .where('inv.productoId = :productoId', { productoId });

    if (almacenTipo !== undefined) {
      qb.andWhere('inv.almacenTipo = :almacenTipo', { almacenTipo });
    }

    const result = await qb.getRawOne();
    return Number(result?.total || 0);
  }

  async updateIvaPersonalizado(
    id: string,
    ivaPersonalizado: number,
  ): Promise<InventarioAlmacen> {
    const inventario = await this.inventarioRepository.findOne({
      where: { id },
    });
    if (!inventario) {
      throw new NotFoundException('Inventario no encontrado');
    }
    inventario.ivaPersonalizado = ivaPersonalizado;
    return this.inventarioRepository.save(inventario);
  }

  async updatePrecioVenta(
    id: string,
    precioVenta?: number | null,
    precioVentaCaja?: number | null,
  ): Promise<InventarioAlmacen> {
    if (
      precioVenta !== undefined &&
      precioVenta !== null &&
      (!Number.isFinite(Number(precioVenta)) || Number(precioVenta) < 0)
    ) {
      throw new BadRequestException('Precio individual inválido');
    }
    if (
      precioVentaCaja !== undefined &&
      precioVentaCaja !== null &&
      (!Number.isFinite(Number(precioVentaCaja)) || Number(precioVentaCaja) < 0)
    ) {
      throw new BadRequestException('Precio de caja inválido');
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const inventarioRepo = manager.getRepository(InventarioAlmacen);
      const productoRepo = manager.getRepository(Producto);
      const presentacionRepo = manager.getRepository(ProductoPresentacion);

      const inventarioBloqueado = await inventarioRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventarioBloqueado) {
        throw new NotFoundException('Inventario no encontrado');
      }
      const inventario = await inventarioRepo.findOne({
        where: { id },
        relations: ['lote', 'producto'],
      });
      if (!inventario) {
        throw new NotFoundException('Inventario no encontrado');
      }

      const actualizarCanonico = async (
        tipo: PresentacionTipo,
        precio: number | null | undefined,
        motivo: string,
      ) => {
        if (precio === undefined) return;
        const presentacion = await presentacionRepo.findOne({
          where: {
            productoId: inventario.productoId,
            tipo,
            statusId: 1,
          },
        });
        if (!presentacion) return;

        if (precio === null) {
          await this.preciosLoteService.clearPrecio(
            inventario.loteId,
            presentacion.id,
            undefined,
            motivo,
            manager,
          );
          return;
        }

        await this.preciosLoteService.setPrecio(
          {
            productoId: inventario.productoId,
            loteId: inventario.loteId,
            presentacionId: presentacion.id,
            precio: Number(precio),
            motivo,
          },
          manager,
        );
      };

      const precioAnterior = inventario.precioVenta;
      if (precioVenta !== undefined) {
        inventario.precioVenta = precioVenta;
      }
      if (precioVentaCaja !== undefined) {
        inventario.precioVentaCaja = precioVentaCaja;
      }

      await actualizarCanonico(
        PresentacionTipo.PIEZA,
        precioVenta,
        'Actualización manual de precio individual',
      );
      await actualizarCanonico(
        PresentacionTipo.CAJA,
        precioVentaCaja,
        'Actualización manual de precio caja',
      );

      const savedInventario = await inventarioRepo.save(inventario);

      const precioNumerico = Number(precioVenta);
      const costoUnitario = Number(inventario.precioUnitarioLote);
      if (
        precioVenta !== undefined &&
        Number.isFinite(precioNumerico) &&
        Number.isFinite(costoUnitario) &&
        precioNumerico > 0 &&
        costoUnitario > 0
      ) {
        const margen =
          Math.round((precioNumerico / costoUnitario - 1) * 10000) / 100;
        await productoRepo.update(inventario.productoId, {
          margenRecomendado: margen,
        });
      }

      console.log(
        `[DEBUG inventario] PrecioVenta actualizado: id=${id}, anterior=${precioAnterior}, nuevo=${precioVenta}, caja=${precioVentaCaja ?? 'sin cambio'}, producto=${inventario.productoId}, lote=${inventario.lote?.numeroLote}`,
      );

      return savedInventario;
    });

    return saved;
  }

  async findByProductoId(
    productoId: string,
  ): Promise<InventarioAlmacen | null> {
    return this.inventarioRepository.findOne({
      where: { productoId, almacenTipo: AlmacenTipo.VENTAS },
      relations: ['lote'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCapasPorProducto(productoId: string): Promise<any> {
    const inventarios = await this.inventarioRepository.find({
      where: { productoId },
      relations: ['producto', 'lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    if (inventarios.length === 0) {
      throw new NotFoundException(
        'No se encontró inventario para este producto',
      );
    }

    const producto = inventarios[0].producto;
    let totalStock = 0;
    let costoTotal = 0;

    const capas = inventarios.map((inv) => {
      const cantidad = Number(inv.cantidadActual);
      const precio = inv.precioUnitarioLote;
      totalStock += cantidad;
      costoTotal += cantidad * precio;

      return {
        id: inv.id,
        loteId: inv.loteId,
        numeroLote: inv.lote?.numeroLote,
        fechaCaducidad: inv.lote?.fechaCaducidad,
        precio: precio,
        almacenTipo: inv.almacenTipo,
        cantidadActual: cantidad,
        costoTotal: cantidad * precio,
      };
    });

    return {
      productoId,
      producto: {
        id: producto?.id,
        nombre: producto?.nombre,
        codigoBarras: producto?.codigoBarras,
      },
      totalStock,
      costoTotal,
      capas,
    };
  }

  async getProximosAVencer(
    dias: number = 60,
    almacenTipo?: AlmacenTipo,
  ): Promise<any> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const where: any = {};
    if (almacenTipo !== undefined) {
      where.almacenTipo = almacenTipo;
    }

    const inventarios = await this.inventarioRepository.find({
      where,
      relations: ['producto', 'lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });

    const productosFiltrados = inventarios.filter((inv) => {
      if (!inv.lote?.fechaCaducidad) return false;
      const fechaCaducidad = new Date(inv.lote.fechaCaducidad);
      return fechaCaducidad <= fechaLimite && inv.cantidadActual > 0;
    });

    let vencidos = 0;
    let proximos = 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const productos = productosFiltrados.map((inv) => {
      const fechaCaducidad = new Date(inv.lote.fechaCaducidad);
      const diffTime = fechaCaducidad.getTime() - hoy.getTime();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const estado = diasRestantes < 0 ? 'VENCIDO' : 'PROXIMO';
      if (estado === 'VENCIDO') vencidos++;
      else proximos++;

      const almacenTipoMap: Record<number, string> = {
        1: 'BODEGA',
        2: 'VENTAS',
        3: 'MERMAS',
        4: 'CADUCADOS',
        5: 'DONADOS',
        6: 'DESTRUCCION',
      };

      return {
        productoId: inv.productoId,
        nombre: inv.producto?.nombre || 'Sin nombre',
        loteId: inv.loteId,
        numeroLote: inv.lote?.numeroLote || 'N/A',
        fechaCaducidad: inv.lote?.fechaCaducidad,
        diasRestantes,
        cantidadActual: Number(inv.cantidadActual),
        almacenTipo: inv.almacenTipo,
        almacenNombre: almacenTipoMap[inv.almacenTipo] || 'DESCONOCIDO',
        estado,
      };
    });

    return {
      total: productos.length,
      vencidos,
      proximos,
      diasUmbral: dias,
      productos,
    };
  }

  private async validarLoteDestino(
    manager: EntityManager,
    productoId: string,
    loteOrigenId: string,
    loteDestinoId: string,
  ): Promise<void> {
    if (loteDestinoId === loteOrigenId) {
      throw new BadRequestException(
        'El lote destino debe ser distinto al lote de origen',
      );
    }

    const loteDestino = await manager
      .getRepository(Lote)
      .findOne({ where: { id: loteDestinoId } });

    if (!loteDestino) {
      throw new BadRequestException('El lote destino no existe');
    }

    if (Number(loteDestino.statusId) !== 1) {
      throw new BadRequestException('El lote destino no está activo');
    }

    const inventarios = await manager.getRepository(InventarioAlmacen).find({
      where: { loteId: loteDestinoId },
      select: ['productoId'],
    });

    if (inventarios.length > 0) {
      if (!inventarios.some((inv) => inv.productoId === productoId)) {
        throw new BadRequestException(
          'El lote destino no pertenece al producto',
        );
      }
      return;
    }

    const detalles = await manager.getRepository(DetalleLote).find({
      where: { loteId: loteDestinoId },
      select: ['productoId'],
    });

    if (detalles.length > 0) {
      if (!detalles.some((det) => det.productoId === productoId)) {
        throw new BadRequestException(
          'El lote destino no pertenece al producto',
        );
      }
      return;
    }

    throw new BadRequestException(
      'El lote destino no está asociado a un producto',
    );
  }

  async transferirLote(
    productoId: string,
    loteOrigenId: string,
    cantidad: number,
    almacenTipo: AlmacenTipo,
    tipoDestino: string,
    userId: string = SYSTEM_USER_ID,
    loteDestinoId?: string,
    nuevoNumeroLote?: string,
    nuevaFechaCaducidad?: string,
  ): Promise<{ origen: InventarioAlmacen; destino: InventarioAlmacen }> {
    return this.dataSource.transaction(async (manager) => {
      const inventarioOrigen = await manager.findOne(InventarioAlmacen, {
        where: { productoId, loteId: loteOrigenId, almacenTipo },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventarioOrigen) {
        throw new BadRequestException(
          'No se encontró inventario en el lote de origen',
        );
      }

      const stockActual = Number(inventarioOrigen.cantidadActual);
      if (stockActual < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`,
        );
      }

      let loteDestinoIdResolved = loteDestinoId;

      if (tipoDestino === 'nuevo') {
        const numeroNuevo = (nuevoNumeroLote || '').trim();
        if (!numeroNuevo) {
          throw new BadRequestException(
            'Debe proporcionar un número de lote para el nuevo lote',
          );
        }
        const loteRepo = manager.getRepository(Lote);
        const loteOrigen = await loteRepo.findOne({
          where: { id: loteOrigenId },
        });
        if (!loteOrigen) {
          throw new BadRequestException('Lote de origen no encontrado');
        }
        if (!loteOrigen.laboratorioId) {
          throw new BadRequestException(
            'El lote de origen no tiene laboratorio asignado',
          );
        }
        if (
          loteOrigen.numeroLote.trim().toLowerCase() ===
          numeroNuevo.toLowerCase()
        ) {
          throw new BadRequestException(
            'El número de lote debe ser distinto al lote de origen',
          );
        }
        const existente = await loteRepo.findOne({
          where: { numeroLote: numeroNuevo },
        });
        if (existente) {
          throw new BadRequestException(
            `El número de lote "${numeroNuevo}" ya existe`,
          );
        }
        const nuevoLote = loteRepo.create({
          numeroLote: numeroNuevo,
          fechaCaducidad: nuevaFechaCaducidad
            ? new Date(nuevaFechaCaducidad)
            : loteOrigen.fechaCaducidad,
          laboratorioId: loteOrigen.laboratorioId,
          piezasPorCaja: loteOrigen.piezasPorCaja,
          empaqueConvertido: loteOrigen.empaqueConvertido,
          statusId: 1,
        });
        const savedLote = await loteRepo.save(nuevoLote);
        loteDestinoIdResolved = savedLote.id;
      }

      if (!loteDestinoIdResolved) {
        throw new BadRequestException(
          'No se pudo determinar el lote de destino',
        );
      }

      if (tipoDestino === 'existente') {
        await this.validarLoteDestino(
          manager,
          productoId,
          loteOrigenId,
          loteDestinoIdResolved,
        );
      }

      inventarioOrigen.cantidadActual = stockActual - cantidad;
      await manager.save(inventarioOrigen);

      let inventarioDestino = await manager.findOne(InventarioAlmacen, {
        where: { productoId, loteId: loteDestinoIdResolved, almacenTipo },
        lock: { mode: 'pessimistic_write' },
      });

      if (inventarioDestino) {
        inventarioDestino.cantidadActual =
          Number(inventarioDestino.cantidadActual) + cantidad;
        if (
          inventarioDestino.precioVenta == null &&
          inventarioOrigen.precioVenta != null
        ) {
          inventarioDestino.precioVenta = inventarioOrigen.precioVenta;
        }
        if (
          inventarioDestino.precioVentaCaja == null &&
          inventarioOrigen.precioVentaCaja != null
        ) {
          inventarioDestino.precioVentaCaja = inventarioOrigen.precioVentaCaja;
        }
      } else {
        inventarioDestino = manager.create(InventarioAlmacen, {
          productoId,
          loteId: loteDestinoIdResolved,
          almacenTipo,
          cantidadActual: cantidad,
          precioUnitarioLote: inventarioOrigen.precioUnitarioLote,
          precioVenta: inventarioOrigen.precioVenta,
          precioVentaCaja: inventarioOrigen.precioVentaCaja,
          ivaCfdi: inventarioOrigen.ivaCfdi,
          ivaPersonalizado: inventarioOrigen.ivaPersonalizado,
        });
      }

      const savedDestino = await manager.save(inventarioDestino);

      if (tipoDestino === 'nuevo') {
        const preciosOrigen = await manager.getRepository(LotePrecio).find({
          where: {
            productoId,
            loteId: loteOrigenId,
            statusId: 1,
          },
        });
        if (preciosOrigen.length > 0) {
          const preciosDestino = preciosOrigen.map((precio) =>
            manager.getRepository(LotePrecio).create({
              productoId,
              loteId: loteDestinoIdResolved,
              presentacionId: precio.presentacionId,
              precioVenta: precio.precioVenta,
              statusId: 1,
              createdBy: userId,
              updatedBy: userId,
            }),
          );
          await manager.getRepository(LotePrecio).save(preciosDestino);
        }
      }

      const observaciones = JSON.stringify({
        loteDestinoId: loteDestinoIdResolved,
        loteDestinoNumero: (nuevoNumeroLote || '').trim() || 'existente',
      });

      const movimiento = manager.create(MovimientoAlmacen, {
        productoId,
        loteId: loteOrigenId,
        almacenOrigen: almacenTipo,
        almacenDestino: almacenTipo,
        cantidad,
        userId,
        observaciones,
        tipoMovimiento: TipoMovimiento.TRANSFERENCIA_ENTRE_LOTES,
        origenOperacion: OrigenOperacion.ADMIN,
      });

      const savedMovimiento = await manager.save(movimiento);

      const detalleLoteRepo = manager.getRepository(DetalleLote);
      await detalleLoteRepo.save(
        detalleLoteRepo.create({
          productoId,
          loteId: loteOrigenId,
          cantidad,
          precioUnitario: inventarioOrigen.precioUnitarioLote,
          ivaCfdi: inventarioOrigen.ivaCfdi,
          movimientoId: savedMovimiento.id,
          almacenTipo,
        }),
      );

      inventarioOrigen.ultimoMovimientoId = savedMovimiento.id;
      await manager.save(inventarioOrigen);

      if (savedDestino.id) {
        const destinoActualizado = await manager.findOne(InventarioAlmacen, {
          where: { id: savedDestino.id },
        });
        if (destinoActualizado) {
          destinoActualizado.ultimoMovimientoId = savedMovimiento.id;
          await manager.save(destinoActualizado);
        }
      }

      const loteDestinoNumero =
        (nuevoNumeroLote || '').trim() ||
        (
          await manager
            .getRepository(Lote)
            .findOne({ where: { id: loteDestinoIdResolved } })
        )?.numeroLote ||
        'desconocido';

      return {
        origen: inventarioOrigen,
        destino: savedDestino,
        loteDestinoNumero,
      };
    });
  }
}
