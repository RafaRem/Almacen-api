import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import {
  MovimientoRevertido,
  TipoReversion,
  OrigenOperacion,
} from './entities/movimiento-revertido.entity';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { InventarioAlmacen } from '../inventario-almacen/entities/inventario-almacen.entity';
import { ConfiguracionSistema } from '../configuracion/entities/configuracion-sistema.entity';
import { SYSTEM_USER_ID, TipoMovimiento } from '../common/constants';

@Injectable()
export class MovimientosRevertidosService {
  constructor(
    @InjectRepository(MovimientoRevertido)
    private revertidoRepository: Repository<MovimientoRevertido>,
    @InjectRepository(MovimientoAlmacen)
    private movimientoRepository: Repository<MovimientoAlmacen>,
    @InjectRepository(InventarioAlmacen)
    private inventarioRepository: Repository<InventarioAlmacen>,
    @InjectRepository(ConfiguracionSistema)
    private configuracionRepository: Repository<ConfiguracionSistema>,
    private dataSource: DataSource,
  ) {}

  async registrarFailedAction(dto: {
    movimientoOriginalId?: string;
    productoId: string;
    loteId: string;
    almacenOrigen: number;
    almacenDestino: number;
    cantidad: number;
    errorDetails?: string;
    userIdEjecuto: string;
    metadata?: {
      sucursalId?: string;
      turno?: string;
      caja?: string;
      terminalId?: string;
      sessionId?: string;
      origenOperacion?: OrigenOperacion;
      referenciaExterna?: string;
    };
  }): Promise<MovimientoRevertido> {
    const revertido = this.revertidoRepository.create({
      movimientoOriginalId: dto.movimientoOriginalId,
      productoId: dto.productoId,
      loteId: dto.loteId,
      almacenOrigen: dto.almacenOrigen,
      almacenDestino: dto.almacenDestino,
      cantidad: dto.cantidad,
      tipoReversion: TipoReversion.FAILED_BATCH,
      motivo: 'Falló en proceso batch',
      errorDetails: dto.errorDetails,
      userIdEjecuto: dto.userIdEjecuto,
      reversionAutomatica: true,
      sucursalId: dto.metadata?.sucursalId,
      turno: dto.metadata?.turno,
      caja: dto.metadata?.caja,
      terminalId: dto.metadata?.terminalId,
      sessionId: dto.metadata?.sessionId,
      origenOperacion: dto.metadata?.origenOperacion || OrigenOperacion.SYSTEM,
      referenciaExterna: dto.metadata?.referenciaExterna,
      fechaOperacionOriginal: new Date(),
    });

    return this.revertidoRepository.save(revertido);
  }

  async registrarReversión(dto: {
    movimientoOriginalId: string;
    userIdRevirtio: string;
    motivo: string;
    metadata?: {
      sucursalId?: string;
      turno?: string;
      caja?: string;
      terminalId?: string;
      sessionId?: string;
      origenOperacion?: OrigenOperacion;
    };
  }): Promise<MovimientoRevertido> {
    const movimientoOriginal = await this.movimientoRepository.findOne({
      where: { id: dto.movimientoOriginalId },
    });

    if (!movimientoOriginal) {
      throw new NotFoundException('Movimiento original no encontrado');
    }

    const revertido = this.revertidoRepository.create({
      movimientoOriginalId: dto.movimientoOriginalId,
      productoId: movimientoOriginal.productoId,
      loteId: movimientoOriginal.loteId,
      almacenOrigen: movimientoOriginal.almacenOrigen as number,
      almacenDestino: movimientoOriginal.almacenDestino as number,
      cantidad: Number(movimientoOriginal.cantidad),
      tipoReversion: TipoReversion.MANUAL_REVERSION,
      motivo: dto.motivo,
      userIdEjecuto: movimientoOriginal.userId,
      userIdRevirtio: dto.userIdRevirtio,
      reversionAutomatica: false,
      sucursalId: dto.metadata?.sucursalId,
      turno: dto.metadata?.turno,
      caja: dto.metadata?.caja,
      terminalId: dto.metadata?.terminalId,
      sessionId: dto.metadata?.sessionId,
      origenOperacion: dto.metadata?.origenOperacion || OrigenOperacion.ADMIN,
      fechaOperacionOriginal: movimientoOriginal.fecha,
    });

    return this.revertidoRepository.save(revertido);
  }

  async obtenerHistorialFA(filtros: {
    page?: number;
    limit?: number;
    productoId?: string;
    tipoReversion?: TipoReversion;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }): Promise<{
    data: MovimientoRevertido[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.revertidoRepository
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.producto', 'producto')
      .leftJoinAndSelect('mr.lote', 'lote')
      .where('mr.tipoReversion IN (:...tipos)', {
        tipos: [TipoReversion.FAILED_BATCH, TipoReversion.ROLLBACK],
      });

    if (filtros.productoId) {
      queryBuilder.andWhere('mr.productoId = :productoId', {
        productoId: filtros.productoId,
      });
    }

    if (filtros.fechaDesde) {
      queryBuilder.andWhere('mr.fechaOperacionOriginal >= :fechaDesde', {
        fechaDesde: filtros.fechaDesde,
      });
    }

    if (filtros.fechaHasta) {
      queryBuilder.andWhere('mr.fechaOperacionOriginal <= :fechaHasta', {
        fechaHasta: filtros.fechaHasta,
      });
    }

    queryBuilder.orderBy('mr.fechaOperacionOriginal', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async obtenerHistorialReversiones(filtros: {
    page?: number;
    limit?: number;
    productoId?: string;
    userIdRevirtio?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    tipo?: string;
  }): Promise<{
    data: MovimientoRevertido[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.revertidoRepository
      .createQueryBuilder('mr')
      .leftJoinAndSelect('mr.producto', 'producto')
      .leftJoinAndSelect('mr.lote', 'lote');

    // Si se especifica tipo, filtrar por ese tipo
    if (filtros.tipo) {
      queryBuilder.andWhere('mr.tipoReversion = :tipo', { tipo: filtros.tipo });
    } else {
      // Por defecto, mostrar todos los tipos excepto FAILED_BATCH y ROLLBACK
      queryBuilder.andWhere('mr.tipoReversion NOT IN (:...tipos)', {
        tipos: [TipoReversion.FAILED_BATCH, TipoReversion.ROLLBACK],
      });
    }

    if (filtros.productoId) {
      queryBuilder.andWhere('mr.productoId = :productoId', {
        productoId: filtros.productoId,
      });
    }

    if (filtros.userIdRevirtio) {
      queryBuilder.andWhere('mr.userIdRevirtio = :userId', {
        userId: filtros.userIdRevirtio,
      });
    }

    if (filtros.fechaDesde) {
      queryBuilder.andWhere('mr.fechaReversion >= :fechaDesde', {
        fechaDesde: filtros.fechaDesde,
      });
    }

    if (filtros.fechaHasta) {
      queryBuilder.andWhere('mr.fechaReversion <= :fechaHasta', {
        fechaHasta: filtros.fechaHasta,
      });
    }

    queryBuilder.orderBy('mr.fechaReversion', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFailedActionsPorProducto(
    productoId: string,
  ): Promise<MovimientoRevertido[]> {
    return this.revertidoRepository.find({
      where: {
        productoId,
        tipoReversion: TipoReversion.FAILED_BATCH,
      },
      relations: ['producto', 'lote'],
      order: { fechaOperacionOriginal: 'DESC' },
    });
  }

  async previewReversion(movimientoId: string): Promise<{
    movimientoOriginal: MovimientoAlmacen;
    movimientosSubsecuentes: MovimientoAlmacen[];
    acciones: {
      tipo: 'RESTORE_STOCK' | 'REDUCE_STOCK' | 'MARK_COMPENSATED';
      almacen: number;
      cantidad: number;
      descripcion: string;
    }[];
    stockImpact: {
      almacen: number;
      stockAntes: number;
      stockDespues: number;
    }[];
    puedeRevertir: boolean;
    motivoBloqueo?: string;
  }> {
    const movimientoOriginal = await this.movimientoRepository.findOne({
      where: { id: movimientoId },
      relations: ['producto', 'lote'],
    });

    if (!movimientoOriginal) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    if (movimientoOriginal.revertido) {
      return {
        movimientoOriginal,
        movimientosSubsecuentes: [],
        acciones: [],
        stockImpact: [],
        puedeRevertir: false,
        motivoBloqueo: 'Este movimiento ya fue revertido',
      };
    }

    const movimientosSubsecuentes = await this.movimientoRepository.find({
      where: [
        {
          productoId: movimientoOriginal.productoId,
          fecha: MoreThanOrEqual(movimientoOriginal.fecha),
          revertido: false,
        },
      ],
      order: { fecha: 'ASC' },
      take: 10,
    });

    const stockInventarioOrigen = await this.inventarioRepository.findOne({
      where: {
        productoId: movimientoOriginal.productoId,
        loteId: movimientoOriginal.loteId,
        almacenTipo: movimientoOriginal.almacenOrigen as any,
      },
    });

    const stockInventarioDestino = await this.inventarioRepository.findOne({
      where: {
        productoId: movimientoOriginal.productoId,
        loteId: movimientoOriginal.loteId,
        almacenTipo: movimientoOriginal.almacenDestino as any,
      },
    });

    const acciones: any[] = [];
    const stockImpact: any[] = [];

    if (movimientoOriginal.almacenDestino) {
      const stockOrigenAntes = Number(
        stockInventarioOrigen?.cantidadActual || 0,
      );
      const stockDestinoAntes = Number(
        stockInventarioDestino?.cantidadActual || 0,
      );
      const cantidad = Number(movimientoOriginal.cantidad);

      acciones.push({
        tipo: 'RESTORE_STOCK',
        almacen: movimientoOriginal.almacenOrigen as number,
        cantidad: cantidad,
        descripcion: `Restaurar ${cantidad} unidades al almacén ${movimientoOriginal.almacenOrigen}`,
      });

      acciones.push({
        tipo: 'REDUCE_STOCK',
        almacen: movimientoOriginal.almacenDestino as number,
        cantidad: cantidad,
        descripcion: `Descontar ${cantidad} unidades del almacén ${movimientoOriginal.almacenDestino}`,
      });

      if (movimientosSubsecuentes.length > 0) {
        acciones.push({
          tipo: 'MARK_COMPENSATED',
          almacen: 0,
          cantidad: 0,
          descripcion: `Marcar ${movimientosSubsecuentes.length} movimientos subsecuentes como compensados`,
        });
      }

      stockImpact.push({
        almacen: movimientoOriginal.almacenOrigen as number,
        stockAntes: stockOrigenAntes,
        stockDespues: stockOrigenAntes + Number(movimientoOriginal.cantidad),
      });

      stockImpact.push({
        almacen: movimientoOriginal.almacenDestino as number,
        stockAntes: stockDestinoAntes,
        stockDespues: stockDestinoAntes - Number(movimientoOriginal.cantidad),
      });
    } else {
      const stockOrigenAntes = Number(
        stockInventarioOrigen?.cantidadActual || 0,
      );

      acciones.push({
        tipo: 'RESTORE_STOCK',
        almacen: movimientoOriginal.almacenOrigen as number,
        cantidad: Number(movimientoOriginal.cantidad),
        descripcion: `Restaurar ${movimientoOriginal.cantidad} unidades al almacén ${movimientoOriginal.almacenOrigen}`,
      });

      stockImpact.push({
        almacen: movimientoOriginal.almacenOrigen as number,
        stockAntes: stockOrigenAntes,
        stockDespues: stockOrigenAntes + Number(movimientoOriginal.cantidad),
      });
    }

    return {
      movimientoOriginal,
      movimientosSubsecuentes,
      acciones,
      stockImpact,
      puedeRevertir: true,
    };
  }

  async revertirMovimiento(
    movimientoId: string,
    adminUserId: string,
    motivo: string,
    revertirSubsecuentes: boolean = false,
  ): Promise<{
    success: boolean;
    movimientoInversoId: string;
    movimientosAfectados: string[];
    error?: string;
  }> {
    const configPermitir = await this.getConfig();
    if (!configPermitir.permitirReversiones) {
      throw new ForbiddenException(
        'Las reversiones manuales están deshabilitadas',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const movimientoOriginal = await manager.findOne(MovimientoAlmacen, {
        where: { id: movimientoId },
      });

      if (!movimientoOriginal) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      if (movimientoOriginal.revertido) {
        throw new BadRequestException('Este movimiento ya fue revertido');
      }

      if (revertirSubsecuentes) {
        const subsecuentes = await manager.find(MovimientoAlmacen, {
          where: {
            productoId: movimientoOriginal.productoId,
            revertido: false,
          },
          order: { fecha: 'ASC' },
        });

        const subsecuentesDespues = subsecuentes.filter(
          (m) => m.fecha > movimientoOriginal.fecha && m.id !== movimientoId,
        );

        for (const sub of subsecuentesDespues) {
          sub.compensado = true;
          await manager.save(sub);
        }
      }

      const movimientoInverso = manager.create(MovimientoAlmacen, {
        productoId: movimientoOriginal.productoId,
        loteId: movimientoOriginal.loteId,
        almacenOrigen: movimientoOriginal.almacenDestino || undefined,
        almacenDestino: movimientoOriginal.almacenOrigen || undefined,
        cantidad: movimientoOriginal.cantidad,
        userId: adminUserId,
        observaciones: `Reversión: ${motivo}`,
        tipoMovimiento: TipoMovimiento.ENTRADA_REVERSION,
        origenOperacion: 'ADMIN',
      } as any);

      const savedInverso = await manager.save(movimientoInverso);

      const inventarioOrigen = await manager.findOne(InventarioAlmacen, {
        where: {
          productoId: movimientoOriginal.productoId,
          loteId: movimientoOriginal.loteId,
          almacenTipo: movimientoOriginal.almacenOrigen as any,
        },
      });

      if (inventarioOrigen) {
        inventarioOrigen.cantidadActual =
          Number(inventarioOrigen.cantidadActual) +
          Number(movimientoOriginal.cantidad);
        inventarioOrigen.ultimoMovimientoId = savedInverso.id;
        await manager.save(inventarioOrigen);
      }

      if (movimientoOriginal.almacenDestino) {
        const inventarioDestino = await manager.findOne(InventarioAlmacen, {
          where: {
            productoId: movimientoOriginal.productoId,
            loteId: movimientoOriginal.loteId,
            almacenTipo: movimientoOriginal.almacenDestino as any,
          },
        });

        if (inventarioDestino) {
          inventarioDestino.cantidadActual =
            Number(inventarioDestino.cantidadActual) -
            Number(movimientoOriginal.cantidad);
          inventarioDestino.ultimoMovimientoId = savedInverso.id;
          await manager.save(inventarioDestino);
        }
      }

      movimientoOriginal.revertido = true;
      movimientoOriginal.revertidoPor = adminUserId;
      movimientoOriginal.fechaReversion = new Date();
      await manager.save(movimientoOriginal);

      const revertidoRegistro = manager.create(MovimientoRevertido, {
        movimientoOriginalId: movimientoId,
        productoId: movimientoOriginal.productoId,
        loteId: movimientoOriginal.loteId,
        almacenOrigen: movimientoOriginal.almacenOrigen as number,
        almacenDestino: movimientoOriginal.almacenDestino as number,
        cantidad: Number(movimientoOriginal.cantidad),
        tipoReversion: TipoReversion.MANUAL_REVERSION,
        motivo,
        userIdEjecuto: movimientoOriginal.userId,
        userIdRevirtio: adminUserId,
        reversionAutomatica: false,
        fechaOperacionOriginal: movimientoOriginal.fecha,
      });

      await manager.save(revertidoRegistro);

      return {
        success: true,
        movimientoInversoId: savedInverso.id,
        movimientosAfectados: [movimientoId],
      };
    });
  }

  async getConfig(): Promise<{
    revertirAutomaticoFallos: boolean;
    permitirReversiones: boolean;
    diasRetencionFA: number;
  }> {
    const configs = await this.configuracionRepository.find({
      where: { activo: true },
    });

    const configMap = new Map(configs.map((c) => [c.clave, c.valor]));

    return {
      revertirAutomaticoFallos:
        configMap.get('REVERTIR_AUTOMATICO_FALLOS')?.enabled ?? false,
      permitirReversiones:
        configMap.get('PERMITIR_REVERSIONES')?.enabled ?? true,
      diasRetencionFA: configMap.get('DIAS_RETENCION_FA')?.dias ?? 30,
    };
  }

  async updateConfig(
    config: {
      revertirAutomaticoFallos?: boolean;
      permitirReversiones?: boolean;
      diasRetencionFA?: number;
    },
    userId: string,
  ): Promise<void> {
    if (config.revertirAutomaticoFallos !== undefined) {
      await this.configuracionRepository.upsert(
        {
          clave: 'REVERTIR_AUTOMATICO_FALLOS',
          valor: { enabled: config.revertirAutomaticoFallos } as any,
          descripcion: 'Reversión automática en fallos de batch',
          updatedBy: userId,
        },
        ['clave'],
      );
    }

    if (config.permitirReversiones !== undefined) {
      await this.configuracionRepository.upsert(
        {
          clave: 'PERMITIR_REVERSIONES',
          valor: { enabled: config.permitirReversiones } as any,
          descripcion: 'Permitir reversiones manuales',
          updatedBy: userId,
        },
        ['clave'],
      );
    }

    if (config.diasRetencionFA !== undefined) {
      await this.configuracionRepository.upsert(
        {
          clave: 'DIAS_RETENCION_FA',
          valor: { dias: config.diasRetencionFA } as any,
          descripcion: 'Días de retención para historial FA',
          updatedBy: userId,
        },
        ['clave'],
      );
    }
  }

  async inicializarConfiguraciones(): Promise<void> {
    const configuraciones = [
      {
        clave: 'REVERTIR_AUTOMATICO_FALLOS',
        valor: { enabled: false },
        descripcion: 'Reversión automática en fallos de batch',
      },
      {
        clave: 'USUARIO_SISTEMA_ID',
        valor: { id: SYSTEM_USER_ID },
        descripcion: 'ID del usuario sistema',
      },
      {
        clave: 'DIAS_RETENCION_FA',
        valor: { dias: 30 },
        descripcion: 'Días de retención para historial FA',
      },
      {
        clave: 'PERMITIR_REVERSIONES',
        valor: { enabled: true },
        descripcion: 'Permitir reversiones manuales',
      },
    ];

    for (const config of configuraciones) {
      const exists = await this.configuracionRepository.findOne({
        where: { clave: config.clave },
      });
      if (!exists) {
        await this.configuracionRepository.save({
          ...config,
          activo: true,
        });
      }
    }
  }
}
