import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, MoreThan, Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { ProductoPresentacion } from './entities/producto-presentacion.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { PresentacionTipo } from '../common/enums/presentacion-tipo.enum';
import { EmpaqueEstado } from '../common/enums/empaque-estado.enum';
import { PreciosLoteService } from '../precios-lote/precios-lote.service';
import { StatusId } from '../common/enums/status-id.enum';
import { EmpaqueConvertirDto, EmpaquePreviewDto } from './dto/empaque.dto';

const SYSTEM_USER_ID = 'SYSTEM';

export interface EmpaqueLotePreview {
  loteId: string;
  numeroLote: string;
  fechaCaducidad: Date | string | null;
  cantidadCajas: number;
  cantidadPiezas: number;
  piezasPorCaja: number;
  precioUnitarioCaja: number;
  costoPorPieza: number;
  precioVentaCaja: number;
  precioVentaPieza: number | null;
  precioVentaPiezaSugerido: number;
}

@Injectable()
export class PresentacionesService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(ProductoPresentacion)
    private readonly presentacionRepository: Repository<ProductoPresentacion>,
    @InjectRepository(Lote)
    private readonly loteRepository: Repository<Lote>,
    @InjectRepository(InventarioAlmacen)
    private readonly inventarioRepository: Repository<InventarioAlmacen>,
    private readonly preciosLoteService: PreciosLoteService,
    private readonly dataSource: DataSource,
  ) {}

  async findByProducto(productoId: string): Promise<ProductoPresentacion[]> {
    return this.presentacionRepository.find({
      where: { productoId, statusId: StatusId.ACTIVE },
      order: { factorUnidades: 'ASC' },
    });
  }

  async validarRecepcionCaja(
    producto: Producto,
    factor: number,
    manager: EntityManager,
  ): Promise<void> {
    if (producto.empaqueEstado === EmpaqueEstado.CONVERTIDO) {
      const factorActual = Number(producto.piezasPorCajaDefault) || 0;
      if (factorActual > 0 && factorActual !== Number(factor)) {
        throw new BadRequestException(
          `El producto ya está convertido con ${factorActual} piezas por caja; recibir con ${factor} requiere una conversión explícita`,
        );
      }
      return;
    }

    const stockExistente = await manager
      .getRepository(InventarioAlmacen)
      .count({
        where: {
          productoId: producto.id,
          cantidadActual: MoreThan(0),
        },
      });
    const soloPieza = await this.esProductoSoloPieza(producto, manager);
    if (stockExistente > 0 && !soloPieza) {
      throw new BadRequestException(
        `El producto "${producto.nombre}" tiene stock existente en cajas. Convierte el empaque desde Inventario antes de recibir cajas.`,
      );
    }
    if (soloPieza) {
      await this.marcarLotesExistentesComoPieza(producto.id, manager);
    }
  }

  private async esProductoSoloPieza(
    producto: Producto,
    manager: EntityManager,
  ): Promise<boolean> {
    if (Number(producto.piezasPorCajaDefault) === 1) return true;
    if (!this.esUnidadPieza(producto.claveUnidad)) return false;
    if (Number(producto.piezasPorCajaDefault) > 1) return false;

    const inventarios = await manager.getRepository(InventarioAlmacen).find({
      where: { productoId: producto.id },
      relations: ['lote'],
    });
    const lotes = inventarios
      .map((inventario) => inventario.lote)
      .filter(Boolean) as Lote[];
    const cajas = await manager.getRepository(ProductoPresentacion).count({
      where: {
        productoId: producto.id,
        tipo: PresentacionTipo.CAJA,
        statusId: StatusId.ACTIVE,
      },
    });
    return this.esStockSoloPieza(producto, lotes, cajas > 0);
  }

  private async marcarLotesExistentesComoPieza(
    productoId: string,
    manager: EntityManager,
  ): Promise<void> {
    const inventarios = await manager.getRepository(InventarioAlmacen).find({
      where: { productoId },
    });
    const loteIds = Array.from(
      new Set(inventarios.map((inventario) => inventario.loteId)),
    );
    if (!loteIds.length) return;
    const lotes = await manager.getRepository(Lote).find({
      where: { id: In(loteIds) },
    });
    for (const lote of lotes) {
      if (Number(lote.piezasPorCaja) > 1) continue;
      lote.piezasPorCaja = 1;
      lote.empaqueConvertido = true;
      await manager.save(Lote, lote);
    }
  }

  async updateAliases(
    productoId: string,
    aliases: {
      id: string;
      alias?: string | null;
      codigoBarras?: string | null;
    }[],
  ): Promise<ProductoPresentacion[]> {
    const producto = await this.productoRepository.findOne({
      where: { id: productoId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const ids = aliases.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('No se puede repetir una presentación');
    }

    const presentaciones = ids.length
      ? await this.presentacionRepository.find({
          where: { productoId, id: In(ids) },
        })
      : [];
    if (presentaciones.length !== ids.length) {
      throw new BadRequestException(
        'Una o más presentaciones no pertenecen a este producto',
      );
    }

    for (const item of aliases) {
      const alias = item.alias?.trim() || null;
      if (alias && alias.length > 80) {
        throw new BadRequestException(
          'El alias no puede exceder 80 caracteres',
        );
      }
      const presentacion = presentaciones.find((p) => p.id === item.id);
      if (!presentacion) continue;

      const codigoBarras = item.codigoBarras?.trim() || null;
      if (codigoBarras) {
        const existente = await this.presentacionRepository.findOne({
          where: { codigoBarras },
        });
        if (existente && existente.id !== presentacion.id) {
          throw new BadRequestException(
            `El código de barras ${codigoBarras} ya está asignado a otra presentación`,
          );
        }
      }
      presentacion.alias = alias;
      presentacion.codigoBarras = codigoBarras;
    }

    return this.presentacionRepository.save(presentaciones);
  }

  async findByCodigoBarras(
    codigoBarras: string,
  ): Promise<ProductoPresentacion | null> {
    return this.presentacionRepository.findOne({
      where: { codigoBarras: codigoBarras.trim(), statusId: StatusId.ACTIVE },
      relations: ['producto', 'producto.laboratorio'],
    });
  }

  async findDefault(productoId: string): Promise<ProductoPresentacion | null> {
    const presentaciones = await this.findByProducto(productoId);
    return (
      presentaciones.find((presentacion) => presentacion.esDefault) ||
      presentaciones.find(
        (presentacion) => presentacion.tipo === PresentacionTipo.PIEZA,
      ) ||
      presentaciones[0] ||
      null
    );
  }

  async resolve(
    productoId: string,
    presentacionId?: string | null,
  ): Promise<ProductoPresentacion> {
    if (presentacionId) {
      const presentacion = await this.presentacionRepository.findOne({
        where: { id: presentacionId, productoId, statusId: StatusId.ACTIVE },
      });
      if (!presentacion) {
        throw new NotFoundException(
          'Presentación no encontrada para el producto',
        );
      }
      return presentacion;
    }

    const presentacion = await this.findDefault(productoId);
    if (!presentacion) {
      throw new BadRequestException(
        'El producto no tiene presentación configurada; configura su empaque en Inventario',
      );
    }
    return presentacion;
  }

  async findPendientes(search?: string, estado = 'PENDIENTES'): Promise<any[]> {
    const filtro = String(estado || 'PENDIENTES').toUpperCase();
    const query = this.productoRepository
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.laboratorio', 'laboratorio');

    if (filtro === 'PENDIENTES') {
      query
        .where('producto.empaqueEstado != :convertido', {
          convertido: EmpaqueEstado.CONVERTIDO,
        })
        .andWhere(
          '(producto.piezasPorCajaDefault IS NULL OR producto.piezasPorCajaDefault > 1)',
        );
    } else if (filtro === 'CONFIGURADOS') {
      query.where(
        `(producto.piezasPorCajaDefault IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM producto_presentaciones pp
            WHERE pp.productoid = producto.id AND pp.tipo = 'CAJA'
          ))`,
      );
    } else {
      query.where(
        `(producto.piezasPorCajaDefault IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM producto_presentaciones pp
            WHERE pp.productoid = producto.id AND pp.tipo = 'CAJA'
          )
          OR LOWER(COALESCE(producto.nombre, '')) LIKE :caja
          OR LOWER(COALESCE(producto.descripcion, '')) LIKE :caja)`,
        { caja: '%caja%' },
      );
    }
    query.orderBy('producto.nombre', 'ASC');

    if (search?.trim()) {
      query.andWhere(
        `(LOWER(producto.nombre) LIKE :search
          OR LOWER(COALESCE(producto.codigoBarras, '')) LIKE :search)`,
        { search: `%${search.trim().toLowerCase()}%` },
      );
    }

    const productos = await query.getMany();
    const result: any[] = [];
    for (const producto of productos) {
      const inventarios = await this.inventarioRepository.find({
        where: { productoId: producto.id },
        relations: ['lote'],
        order: { lote: { fechaCaducidad: 'ASC' } },
      });
      const byLote = new Map<string, any>();
      for (const inv of inventarios) {
        const key = inv.loteId;
        const factorSugerido = Number(
          inv.lote?.piezasPorCaja || producto.piezasPorCajaDefault || 0,
        );
        const actual = byLote.get(key) || {
          loteId: inv.loteId,
          numeroLote: inv.lote?.numeroLote || 'N/A',
          fechaCaducidad: inv.lote?.fechaCaducidad || null,
          cantidadCajas: 0,
          precioUnitarioCaja: Number(inv.precioUnitarioLote) || 0,
          precioVentaCaja: Number(inv.precioVentaCaja ?? inv.precioVenta) || 0,
          precioVenta: inv.precioVenta == null ? null : Number(inv.precioVenta),
          precioVentaSugerido:
            inv.precioVentaCaja && factorSugerido > 0
              ? Math.round(
                  (Number(inv.precioVentaCaja) / factorSugerido) * 100,
                ) / 100
              : null,
          piezasPorCaja:
            inv.lote?.piezasPorCaja ||
            producto.piezasPorCajaDefault ||
            this.inferFactor(producto.nombre) ||
            0,
          cantidadActual: 0,
        };
        actual.cantidadActual += Number(inv.cantidadActual) || 0;
        actual.cantidadCajas += Number(inv.cantidadActual) || 0;
        actual.cantidadPiezas =
          producto.empaqueEstado === EmpaqueEstado.CONVERTIDO
            ? actual.cantidadActual
            : actual.cantidadActual * (actual.piezasPorCaja || 1);
        byLote.set(key, actual);
      }

      const lotesProducto = inventarios
        .map((inventario) => inventario.lote)
        .filter(Boolean) as Lote[];
      const factorCaja = Number(producto.piezasPorCajaDefault) > 1;
      const loteConCaja = lotesProducto.some(
        (lote) => Number(lote.piezasPorCaja) > 1,
      );
      let tieneCajaPresentacion = false;
      if (
        this.esUnidadPieza(producto.claveUnidad) &&
        !factorCaja &&
        !loteConCaja
      ) {
        const cajas = await this.presentacionRepository.count({
          where: {
            productoId: producto.id,
            tipo: PresentacionTipo.CAJA,
            statusId: StatusId.ACTIVE,
          },
        });
        tieneCajaPresentacion = cajas > 0;
      }
      const soloPieza = this.esStockSoloPieza(
        producto,
        lotesProducto,
        tieneCajaPresentacion,
      );
      if (
        filtro === 'PENDIENTES' &&
        (soloPieza || this.lotesYaConvertidos(lotesProducto))
      ) {
        continue;
      }

      result.push({
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        claveUnidad: producto.claveUnidad,
        laboratorio: producto.laboratorio?.nombre || 'N/A',
        empaqueEstado: producto.empaqueEstado,
        soloPieza,
        factorSugerido: soloPieza
          ? 1
          : producto.piezasPorCajaDefault || this.inferFactor(producto.nombre),
        stockCajas: inventarios.reduce(
          (sum, inv) => sum + Number(inv.cantidadActual || 0),
          0,
        ),
        stockPiezas:
          producto.empaqueEstado === EmpaqueEstado.CONVERTIDO
            ? inventarios.reduce(
                (sum, inv) => sum + Number(inv.cantidadActual || 0),
                0,
              )
            : inventarios.reduce(
                (sum, inv) =>
                  sum +
                  Number(inv.cantidadActual || 0) *
                    (inv.lote?.piezasPorCaja ||
                      producto.piezasPorCajaDefault ||
                      1),
                0,
              ),
        lotes: Array.from(byLote.values()),
      });
    }
    return result;
  }

  async saveFactor(productoId: string, factor: number): Promise<Producto> {
    const factorNumero = Number(factor);
    if (!Number.isInteger(factorNumero) || factorNumero < 1) {
      throw new BadRequestException(
        'El factor debe ser un entero mayor o igual a 1',
      );
    }
    const producto = await this.productoRepository.findOne({
      where: { id: productoId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    if (
      factorNumero === 1 &&
      producto.empaqueEstado === EmpaqueEstado.CONVERTIDO
    ) {
      throw new BadRequestException(
        'Un producto convertido no puede cambiarse a solo pieza',
      );
    }

    producto.piezasPorCajaDefault = factorNumero;
    if (producto.empaqueEstado !== EmpaqueEstado.CONVERTIDO) {
      producto.empaqueEstado = EmpaqueEstado.FACTOR_ASIGNADO;
    }
    return this.productoRepository.save(producto);
  }

  async updateLoteFactor(
    productoId: string,
    loteId: string,
    factor: number,
    precioVentaCaja?: number,
    precioVentaPieza?: number | null,
  ): Promise<Lote> {
    this.validateFactor(factor);

    return this.dataSource.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, {
        where: { id: productoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');

      const inventarios = await manager.find(InventarioAlmacen, {
        where: { productoId, loteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!inventarios.length) {
        throw new NotFoundException('El lote no pertenece a este producto');
      }

      const lote = await manager.findOne(Lote, {
        where: { id: loteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lote) throw new NotFoundException('Lote no encontrado');

      const presentacionRepo = manager.getRepository(ProductoPresentacion);
      const piezaPresentacion = await presentacionRepo.findOne({
        where: {
          productoId,
          tipo: PresentacionTipo.PIEZA,
          statusId: StatusId.ACTIVE,
        },
      });
      const cajaPresentacion = await presentacionRepo.findOne({
        where: {
          productoId,
          tipo: PresentacionTipo.CAJA,
          statusId: StatusId.ACTIVE,
        },
      });

      lote.piezasPorCaja = factor;
      lote.empaqueConvertido =
        producto.empaqueEstado === EmpaqueEstado.CONVERTIDO;
      await manager.save(Lote, lote);

      if (precioVentaCaja !== undefined) {
        if (cajaPresentacion && precioVentaCaja > 0) {
          await this.preciosLoteService.setPrecio(
            {
              productoId,
              loteId,
              presentacionId: cajaPresentacion.id,
              precio: precioVentaCaja,
              motivo: 'Actualización de precio por lote',
            },
            manager,
          );
        }
        for (const inventario of inventarios) {
          inventario.precioVentaCaja = precioVentaCaja;
          await manager.save(InventarioAlmacen, inventario);
        }
      }

      if (precioVentaPieza !== undefined) {
        if (piezaPresentacion) {
          if (precioVentaPieza == null) {
            await this.preciosLoteService.clearPrecio(
              loteId,
              piezaPresentacion.id,
              undefined,
              'Limpieza de precio individual por lote',
              manager,
            );
          } else {
            await this.preciosLoteService.setPrecio(
              {
                productoId,
                loteId,
                presentacionId: piezaPresentacion.id,
                precio: precioVentaPieza,
                motivo: 'Actualización de precio individual por lote',
              },
              manager,
            );
          }
        }
        for (const inventario of inventarios) {
          inventario.precioVenta = precioVentaPieza;
          await manager.save(InventarioAlmacen, inventario);
        }
      }

      return lote;
    });
  }

  async preview(productoId: string, dto: EmpaquePreviewDto = {}): Promise<any> {
    const producto = await this.productoRepository.findOne({
      where: { id: productoId },
      relations: ['laboratorio'],
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const factorDefault =
      dto.piezasPorCaja ||
      producto.piezasPorCajaDefault ||
      this.inferFactor(producto.nombre);
    const overrides = new Map(
      (dto.lotes || []).map((lote) => [lote.loteId, lote]),
    );
    const inventarios = await this.inventarioRepository.find({
      where: { productoId },
      relations: ['lote'],
      order: { lote: { fechaCaducidad: 'ASC' } },
    });
    const presentaciones = await this.findByProducto(productoId);
    const piezaPresentacion = presentaciones.find(
      (p) => p.tipo === PresentacionTipo.PIEZA,
    );
    const cajaPresentacion = presentaciones.find(
      (p) => p.tipo === PresentacionTipo.CAJA,
    );
    const lotesProducto = inventarios
      .map((inventario) => inventario.lote)
      .filter(Boolean) as Lote[];
    if (this.lotesYaConvertidos(lotesProducto)) {
      throw new BadRequestException(
        'Uno o más lotes de este producto ya están en piezas; no se puede convertir nuevamente',
      );
    }
    if (
      this.esStockSoloPieza(producto, lotesProducto, Boolean(cajaPresentacion))
    ) {
      throw new BadRequestException(
        'El stock de este producto ya está en piezas. No requiere conversión; configúralo como SOLO PIEZA.',
      );
    }

    const lotesMap = new Map<string, EmpaqueLotePreview>();
    for (const inv of inventarios) {
      const override = overrides.get(inv.loteId);
      const factor = Number(override?.piezasPorCaja || factorDefault);
      if (!Number.isInteger(factor) || factor < 2) {
        throw new BadRequestException(
          `Factor inválido para el lote ${inv.lote?.numeroLote || inv.loteId}`,
        );
      }
      const current = lotesMap.get(inv.loteId);
      const cajas = Number(inv.cantidadActual) || 0;
      const precioCajaCanonico = cajaPresentacion
        ? await this.preciosLoteService.getPrecio(
            inv.loteId,
            cajaPresentacion.id,
          )
        : null;
      const precioPiezaCanonico = piezaPresentacion
        ? await this.preciosLoteService.getPrecio(
            inv.loteId,
            piezaPresentacion.id,
          )
        : null;
      const precioCaja =
        override?.precioVentaCaja ??
        precioCajaCanonico ??
        Number(inv.precioVentaCaja ?? inv.precioVenta) ??
        0;
      const precioPiezaSugerido =
        precioCaja > 0 ? this.round6(precioCaja / factor) : 0;
      const precioPieza =
        override?.precioVentaPieza != null
          ? Number(override.precioVentaPieza)
          : (precioPiezaCanonico ??
            (inv.precioVenta != null ? Number(inv.precioVenta) : null));
      if (!current) {
        lotesMap.set(inv.loteId, {
          loteId: inv.loteId,
          numeroLote: inv.lote?.numeroLote || 'N/A',
          fechaCaducidad: inv.lote?.fechaCaducidad || null,
          cantidadCajas: cajas,
          cantidadPiezas: cajas * factor,
          piezasPorCaja: factor,
          precioUnitarioCaja: Number(inv.precioUnitarioLote) || 0,
          costoPorPieza: this.round6(
            (Number(inv.precioUnitarioLote) || 0) / factor,
          ),
          precioVentaCaja: precioCaja,
          precioVentaPieza: precioPieza,
          precioVentaPiezaSugerido: precioPiezaSugerido,
        });
      } else {
        current.cantidadCajas += cajas;
        current.cantidadPiezas += cajas * factor;
      }
    }

    return {
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        laboratorio: producto.laboratorio?.nombre || 'N/A',
      },
      factorDefault,
      lotes: Array.from(lotesMap.values()),
      totalCajas: Array.from(lotesMap.values()).reduce(
        (sum, lote) => sum + lote.cantidadCajas,
        0,
      ),
      totalPiezas: Array.from(lotesMap.values()).reduce(
        (sum, lote) => sum + lote.cantidadPiezas,
        0,
      ),
    };
  }

  async convertir(
    productoId: string,
    dto: EmpaqueConvertirDto,
    userId: string = SYSTEM_USER_ID,
  ): Promise<any> {
    if (!dto?.lotes?.length) {
      throw new BadRequestException('Debes indicar al menos un lote');
    }
    for (const lote of dto.lotes) {
      this.validateFactor(lote.piezasPorCaja);
      if (
        lote.precioVentaPieza != null &&
        (!Number.isFinite(Number(lote.precioVentaPieza)) ||
          Number(lote.precioVentaPieza) < 0)
      ) {
        throw new BadRequestException('Precio de pieza inválido');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, {
        where: { id: productoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (producto.empaqueEstado === EmpaqueEstado.CONVERTIDO) {
        throw new BadRequestException(
          'Este producto ya fue convertido a piezas',
        );
      }
      if (producto.empaqueEstado === EmpaqueEstado.CONVIRTIENDO) {
        throw new BadRequestException(
          'El producto ya tiene una conversión en curso',
        );
      }

      producto.empaqueEstado = EmpaqueEstado.CONVIRTIENDO;
      producto.piezasPorCajaDefault =
        producto.piezasPorCajaDefault || dto.lotes[0].piezasPorCaja;
      await manager.save(Producto, producto);

      try {
        const inventarios = await manager
          .createQueryBuilder(InventarioAlmacen, 'inv')
          .where('inv.productoId = :productoId', { productoId })
          .setLock('pessimistic_write')
          .getMany();
        const lotesInventario = new Set(
          inventarios.map((inventario) => inventario.loteId),
        );
        const lotesInfo = lotesInventario.size
          ? await manager.find(Lote, {
              where: { id: In(Array.from(lotesInventario)) },
            })
          : [];
        const presentacionesExistentes = await manager
          .getRepository(ProductoPresentacion)
          .find({
            where: { productoId, statusId: StatusId.ACTIVE },
          });
        if (this.lotesYaConvertidos(lotesInfo)) {
          throw new BadRequestException(
            'Uno o más lotes de este producto ya están en piezas; no se puede convertir nuevamente',
          );
        }
        if (
          this.esStockSoloPieza(
            producto,
            lotesInfo,
            presentacionesExistentes.some(
              (presentacion) => presentacion.tipo === PresentacionTipo.CAJA,
            ),
          )
        ) {
          throw new BadRequestException(
            'El stock de este producto ya está en piezas. No requiere conversión; configúralo como SOLO PIEZA.',
          );
        }
        const lotesAjenos = dto.lotes.filter(
          (lote) => !lotesInventario.has(lote.loteId),
        );
        if (lotesAjenos.length > 0) {
          throw new BadRequestException(
            `Los lotes ${lotesAjenos
              .map((lote) => lote.loteId)
              .join(', ')} no pertenecen al producto`,
          );
        }
        const overrides = new Map(dto.lotes.map((lote) => [lote.loteId, lote]));
        const factorDefault = Number(dto.lotes[0].piezasPorCaja);
        const lotesActualizados = new Map<
          string,
          { lote: Lote; factor: number }
        >();
        const preciosPorLote = new Map<string, number | null>();

        for (const inv of inventarios) {
          const override = overrides.get(inv.loteId);
          const factor = Number(override?.piezasPorCaja ?? factorDefault);
          if (!Number.isInteger(factor) || factor < 2) {
            throw new BadRequestException(
              `Factor inválido para el lote ${inv.loteId}`,
            );
          }
          const cajas = Number(inv.cantidadActual) || 0;
          const costoActual = Number(inv.precioUnitarioLote) || 0;
          const precioCajaActual =
            Number(inv.precioVentaCaja ?? inv.precioVenta) || 0;
          const precioPieza =
            override?.precioVentaPieza != null &&
            Number(override.precioVentaPieza) > 0
              ? Number(override.precioVentaPieza)
              : null;
          if (!precioCajaActual || precioCajaActual <= 0) {
            throw new BadRequestException(
              `El lote ${inv.loteId} no tiene precio de caja`,
            );
          }

          inv.cantidadActual = cajas * factor;
          inv.precioUnitarioLote = this.round6(costoActual / factor);
          inv.precioVentaCaja =
            Number(override?.precioVentaCaja) || precioCajaActual || null;
          inv.precioVenta =
            precioPieza != null ? this.round2(precioPieza) : null;
          await manager.save(InventarioAlmacen, inv);

          preciosPorLote.set(
            inv.loteId,
            precioPieza != null ? this.round2(precioPieza) : null,
          );

          const deltaPiezas = cajas * (factor - 1);
          if (deltaPiezas > 0) {
            await manager.save(
              MovimientoAlmacen,
              manager.create(MovimientoAlmacen, {
                productoId,
                loteId: inv.loteId,
                almacenOrigen: inv.almacenTipo,
                almacenDestino: inv.almacenTipo,
                cantidad: deltaPiezas,
                userId,
                observaciones: `Migración de empaque: ${cajas} cajas × ${factor} = ${cajas * factor} piezas`,
                tipoMovimiento: 'AJUSTE_MIGRACION_EMPAQUE',
                origenOperacion: 'API',
              }),
            );
          }

          if (!lotesActualizados.has(inv.loteId)) {
            const lote = await manager.findOne(Lote, {
              where: { id: inv.loteId },
            });
            if (!lote) {
              throw new NotFoundException(`Lote ${inv.loteId} no encontrado`);
            }
            lotesActualizados.set(inv.loteId, { lote, factor });
          }
        }

        for (const { lote, factor } of lotesActualizados.values()) {
          lote.piezasPorCaja = factor;
          lote.empaqueConvertido = true;
          await manager.save(Lote, lote);
        }

        const presentacionesCreadas = await this.ensurePresentations(
          productoId,
          factorDefault,
          manager,
        );
        const piezaPresentacion = presentacionesCreadas.find(
          (p) => p.tipo === PresentacionTipo.PIEZA,
        );
        const cajaPresentacion = presentacionesCreadas.find(
          (p) => p.tipo === PresentacionTipo.CAJA,
        );
        for (const override of dto.lotes) {
          const precioCaja = Number(override.precioVentaCaja);
          if (precioCaja > 0 && cajaPresentacion) {
            await this.preciosLoteService.setPrecio(
              {
                productoId,
                loteId: override.loteId,
                presentacionId: cajaPresentacion.id,
                precio: precioCaja,
                motivo: 'Precio asignado durante conversión de empaque',
              },
              manager,
            );
          }
          if (piezaPresentacion) {
            if (override.precioVentaPieza != null) {
              await this.preciosLoteService.setPrecio(
                {
                  productoId,
                  loteId: override.loteId,
                  presentacionId: piezaPresentacion.id,
                  precio: Number(override.precioVentaPieza),
                  motivo:
                    'Precio sugerido/ajustado durante conversión de empaque',
                },
                manager,
              );
            } else {
              await this.preciosLoteService.clearPrecio(
                override.loteId,
                piezaPresentacion.id,
                undefined,
                undefined,
                manager,
              );
            }
          }
        }

        producto.empaqueEstado = EmpaqueEstado.CONVERTIDO;
        producto.piezasPorCajaDefault = factorDefault;
        await manager.save(Producto, producto);

        return {
          success: true,
          productoId,
          lotesConvertidos: lotesActualizados.size,
          piezasTotales: inventarios.reduce(
            (sum, inv) => sum + Number(inv.cantidadActual || 0),
            0,
          ),
          preciosPorLote: Object.fromEntries(preciosPorLote),
        };
      } catch (error) {
        producto.empaqueEstado = EmpaqueEstado.FACTOR_ASIGNADO;
        await manager.save(Producto, producto);
        throw error;
      }
    });
  }

  async ensurePresentations(
    productoId: string,
    factorDefault: number,
    managerArg?: EntityManager,
  ): Promise<ProductoPresentacion[]> {
    const manager = managerArg || this.dataSource.manager;
    const repo = manager.getRepository(ProductoPresentacion);
    const result: ProductoPresentacion[] = [];
    const definitions = [
      {
        tipo: PresentacionTipo.PIEZA,
        nombre: 'Pieza',
        factor: 1,
        esDefault: true,
      },
      ...(Number(factorDefault) > 1
        ? [
            {
              tipo: PresentacionTipo.CAJA,
              nombre: 'Caja',
              factor: factorDefault,
              esDefault: false,
            },
          ]
        : []),
    ];

    for (const definition of definitions) {
      let presentacion = await repo.findOne({
        where: { productoId, tipo: definition.tipo },
      });
      if (!presentacion) {
        presentacion = repo.create({
          productoId,
          nombre: definition.nombre,
          tipo: definition.tipo,
          factorUnidades: definition.factor,
          esDefault: definition.esDefault,
          statusId: StatusId.ACTIVE,
        });
      } else {
        presentacion.nombre = definition.nombre;
        presentacion.factorUnidades = definition.factor;
        presentacion.esDefault = definition.esDefault;
        presentacion.statusId = StatusId.ACTIVE;
      }
      result.push(await repo.save(presentacion));
    }
    return result;
  }

  inferFactor(texto?: string | null): number {
    if (!texto) return 0;
    const matches = [
      texto.match(/\b(\d{1,3})\s*\/\s*\d+/),
      texto.match(/\bC\/\s*(\d{1,3})\b/i),
      texto.match(/\b(\d{1,3})\s*(?:PZ|PZAS|PIEZAS)\b/i),
    ];
    for (const match of matches) {
      const value = Number(match?.[1]);
      if (Number.isInteger(value) && value > 1) return value;
    }
    return 0;
  }

  private esUnidadPieza(claveUnidad?: string | null): boolean {
    const unidad = String(claveUnidad || '')
      .trim()
      .toUpperCase();
    return unidad === 'H87' || unidad === 'PZA';
  }

  private lotesYaConvertidos(lotes: Lote[]): boolean {
    return lotes.some((lote) => lote.empaqueConvertido === true);
  }

  private esStockSoloPieza(
    producto: Producto,
    lotes: Lote[],
    tieneCajaPresentacion: boolean,
  ): boolean {
    if (Number(producto.piezasPorCajaDefault) === 1) return true;
    if (!this.esUnidadPieza(producto.claveUnidad)) return false;
    const factorCaja = Number(producto.piezasPorCajaDefault) > 1;
    const loteCaja = lotes.some((lote) => Number(lote.piezasPorCaja) > 1);
    return !(factorCaja || loteCaja || tieneCajaPresentacion);
  }

  private validateFactor(factor: number): void {
    if (!Number.isInteger(Number(factor)) || Number(factor) < 2) {
      throw new BadRequestException('El factor debe ser un entero mayor a 1');
    }
  }

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private round6(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 1000000) / 1000000;
  }
}
