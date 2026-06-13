import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagoVenta } from './entities/pago-venta.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
import { DetalleVentaLote } from './entities/detalle-venta-lote.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { ProductosService } from '../productos/productos.service';
import { LotesService } from '../lotes/lotes.service';
import { DescuentosService } from '../descuentos/descuentos.service';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { MovimientosAlmacenService } from '../movimientos-almacen/movimientos-almacen.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { MetodoPago } from '../common/enums/metodo-pago.enum';
import { FormaPago } from '../common/enums/forma-pago.enum';
import { ConfiguracionesService } from '../configuraciones/configuraciones.service';
import { ClientesService } from '../clientes/clientes.service';
import { MovimientoAlmacen } from '../movimientos-almacen/entities/movimiento-almacen.entity';
import { TipoMovimiento, OrigenOperacion } from '../common/constants';
import { parseDate } from '../common/utils/date-utils';
import {
  DescuentoInfoEntry,
  PreviewDescuentoResult,
  PreviewProductoDescuento,
} from '../descuentos/types/descuento.types';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepository: Repository<DetalleVenta>,
    @InjectRepository(PagoVenta)
    private pagosRepository: Repository<PagoVenta>,
    @InjectRepository(DescuentoVentaDetalle)
    private descuentosVentaDetalleRepository: Repository<DescuentoVentaDetalle>,
    private productosService: ProductosService,
    private lotesService: LotesService,
    private descuentosService: DescuentosService,
    private inventarioAlmacenService: InventarioAlmacenService,
    private movimientosAlmacenService: MovimientosAlmacenService,
    private configuracionesService: ConfiguracionesService,
    private clientesService: ClientesService,
    private dataSource: DataSource,
  ) {
    this.logger = new Logger(VentasService.name);
  }

  private readonly logger: Logger;

  private async getIvaRate(): Promise<number> {
    return (await this.configuracionesService.getIvaGlobal()) / 100;
  }

  private async getNextFolio(): Promise<number> {
    const result = await this.ventasRepository.query(
      `SELECT nextval('ventas_folio_seq') AS folio`,
    );
    return Number(result[0].folio);
  }

  async create(
    createVentaDto: CreateVentaDto,
    usuarioId: string,
  ): Promise<any> {
    if (!createVentaDto.productos || createVentaDto.productos.length === 0) {
      throw new Error('La venta debe tener al menos un producto');
    }

    const productoIds = createVentaDto.productos.map((p) => p.productoId);
    const uniqueProductoIds = new Set(productoIds);
    if (uniqueProductoIds.size !== productoIds.length) {
      throw new Error('No puede haber productos duplicados en la venta');
    }

    return this.dataSource.transaction(async (manager) => {
    this.logger.log(`Venta create: ${createVentaDto.productos.length} producto(s)`);
    
    const seenProductos = new Set<string>();

    let subtotal = 0;
    let descuentoTotal = 0;
    const detalles: Partial<DetalleVenta>[] = [];
    const movimientosLotes: {
      productoId: string;
      loteId: string;
      numeroLote: string;
      cantidad: number;
    }[] = [];
    const descuentosInfo: DescuentoInfoEntry[] = [];

    let categoriaClienteId: string | undefined;
    if (createVentaDto.clienteId) {
      try {
        const cliente = await this.clientesService.findOne(
          createVentaDto.clienteId,
        );
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {
        this.logger.error('Error fetching cliente en create');
      }
    }

    for (const productoVenta of createVentaDto.productos) {
      if (seenProductos.has(productoVenta.productoId)) {
        throw new BadRequestException(
          `Producto ${productoVenta.productoId} duplicado en la misma venta`,
        );
      }
      seenProductos.add(productoVenta.productoId);

      if (productoVenta.cantidad == null || productoVenta.cantidad <= 0) {
        throw new BadRequestException(
          `Cantidad debe ser mayor a 0 para producto ${productoVenta.productoId}`,
        );
      }

      const producto = await this.productosService.findOne(
        productoVenta.productoId,
      );

      if (!producto) {
        throw new BadRequestException(
          `Producto ${productoVenta.productoId} no encontrado`,
        );
      }

      const stockDisponible = await this.inventarioAlmacenService.getStockTotal(
        productoVenta.productoId,
        AlmacenTipo.VENTAS,
      );

      if (!productoVenta.cantidad || productoVenta.cantidad <= 0) {
        throw new BadRequestException(
          `Cantidad inválida para ${producto.nombre}. Cantidad: ${productoVenta.cantidad}`,
        );
      }

      if (stockDisponible < productoVenta.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${productoVenta.cantidad}`,
        );
      }

      const inventarioProducto = await this.inventarioAlmacenService.findByProductoId(
        productoVenta.productoId,
      );
      if (!inventarioProducto?.precioVenta) {
        throw new BadRequestException(
          `Producto ${producto.nombre} no tiene precio de venta asignado. Configure precioVenta en Inventario.`,
        );
      }

      const resultadoFEPU =
        await this.inventarioAlmacenService.reducirStockFIFO(
          productoVenta.productoId,
          productoVenta.cantidad,
          AlmacenTipo.VENTAS,
          usuarioId,
          undefined,
          manager,
        );

      if (!resultadoFEPU.success) {
        throw new BadRequestException(resultadoFEPU.message);
      }

      for (const loteInfo of resultadoFEPU.lotsUsed) {
        movimientosLotes.push({
          productoId: productoVenta.productoId,
          loteId: loteInfo.loteId,
          numeroLote: loteInfo.numeroLote,
          cantidad: loteInfo.cantidad,
        });
      }

      const totalPrecio = resultadoFEPU.lotsUsed.reduce(
        (sum, l) => sum + l.precio * l.cantidad, 0,
      );
      const totalCantidad = resultadoFEPU.lotsUsed.reduce(
        (sum, l) => sum + l.cantidad, 0,
      );
      const precioUnitario = totalCantidad > 0 ? totalPrecio / totalCantidad : 0;

      const precioVenta = inventarioProducto.precioVenta;

      const fechaCaducidad = parseDate(inventarioProducto?.lote?.fechaCaducidad);

      let descuentoLinea = 0;
      let montoProductoLinea = 0;
      try {
        const calculo = await this.descuentosService.calcularDescuentosAcumulables(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          categoriaClienteId,
          fechaCaducidad,
          precioVenta,
        );

        descuentoLinea = calculo.descuentoTotal;

        if (
          calculo.descuentoProducto
        ) {
          montoProductoLinea = Number((calculo.descuentoProducto.monto || 0).toFixed(2));
          if (calculo.descuentoProducto.descuentoId) {
            descuentosInfo.push({
              productoId: productoVenta.productoId,
              descuentoId: calculo.descuentoProducto.descuentoId,
              tipo: calculo.descuentoProducto.tipo,
              porcentaje: calculo.descuentoProducto.porcentaje,
              monto: montoProductoLinea,
              motivo: calculo.descuentoProducto.motivo,
            });
          }
        }
        if (calculo.descuentoCategoria) {
          const montoCategoria = Number((calculo.descuentoCategoria.monto || 0).toFixed(2));
          descuentosInfo.push({
            productoId: productoVenta.productoId,
            descuentoId: calculo.descuentoCategoria.descuentoId,
            tipo: calculo.descuentoCategoria.tipo,
            porcentaje: calculo.descuentoCategoria.porcentaje,
            monto: montoCategoria,
            motivo: calculo.descuentoCategoria.motivo,
          });
        }
      } catch (e) {
        this.logger.error(`Error calculando descuentos para producto ${productoVenta.productoId}: ${e.message}`);
      }

      if (createVentaDto.descuentosPreview?.descuentoPorProducto) {
        const dp = createVentaDto.descuentosPreview.descuentoPorProducto.find(
          d => d.productoId === productoVenta.productoId,
        );

        if (dp) {
          const tolerancia = 0.01;
          const diferencia = Math.abs(dp.descuento - descuentoLinea);

          if (diferencia > tolerancia) {
            this.logger.warn(
              `Descuento no coincide, se actualiza por mejor descuento: calculado ${descuentoLinea} vs preview ${dp.descuento}`,
            );
          } else {
            // Eliminar entradas existentes para este producto del array (reemplazar con preview)
            const idxToRemove = descuentosInfo.findIndex(d => d.productoId === productoVenta.productoId);
            if (idxToRemove !== -1) {
              descuentosInfo.splice(idxToRemove, 2); // Elimina hasta 2 entradas (producto + categoria)
            }

            if (dp.mejorDescuento?.descuentoId && dp.mejorDescuento.tipo !== 'NINGUNO') {
              descuentosInfo.push({
                productoId: productoVenta.productoId,
                descuentoId: dp.mejorDescuento.descuentoId,
                tipo: dp.mejorDescuento.tipo,
                porcentaje: dp.mejorDescuento.porcentaje,
                monto: dp.descuentoProducto,
                motivo: dp.mejorDescuento.motivo,
              });
            }

            if (dp.descuentoCategoriaInfo) {
              descuentosInfo.push({
                productoId: productoVenta.productoId,
                descuentoId: dp.descuentoCategoriaInfo.descuentoId ?? null,
                tipo: dp.descuentoCategoriaInfo.tipo,
                porcentaje: dp.descuentoCategoriaInfo.porcentaje,
                monto: dp.descuentoCategoria,
                motivo: dp.descuentoCategoriaInfo.motivo,
              });
            }
          }
        }
      }

      const importeBruto = precioVenta * productoVenta.cantidad;
      const subtotalLinea = importeBruto - descuentoLinea;

      subtotal += importeBruto;
      descuentoTotal += descuentoLinea;

      const primerLoteId =
        resultadoFEPU.lotsUsed[0]?.loteId || '';

      detalles.push({
        productoId: productoVenta.productoId,
        loteId: primerLoteId,
        cantidad: productoVenta.cantidad,
        precioUnitario,
        descuentoLinea,
        subtotal: subtotalLinea,
        importeBruto,
      });
    }

    const ivaRate = await this.getIvaRate();
    const iva = (subtotal - descuentoTotal) * ivaRate;
    const total = subtotal - descuentoTotal + iva;

    let pagosData: {
      formaPago: FormaPago;
      monto: number;
      referencia?: string;
    }[] = [];

    if (createVentaDto.pagos && createVentaDto.pagos.length > 0) {
      const sumaPagos = createVentaDto.pagos.reduce(
        (sum, p) => sum + Number(p.monto),
        0,
      );
      if (sumaPagos < total - 0.01) {
        throw new BadRequestException(
          `La suma de pagos (${sumaPagos.toFixed(2)}) es menor al total (${total.toFixed(2)})`,
        );
      }
      pagosData = createVentaDto.pagos.map((p) => ({
        formaPago: p.formaPago,
        monto: Number(p.monto),
        referencia: p.referencia || undefined,
      }));
    } else if (createVentaDto.metodoPago) {
      pagosData = [
        {
          formaPago: this.convertirMetodoPago(createVentaDto.metodoPago),
          monto: total,
        },
      ];
    } else {
      throw new BadRequestException('Debe especificar método de pago');
    }

    const metodoPagoLegacy =
      pagosData.length === 1
        ? this.convertirFormaPagoAMetodoPago(pagosData[0].formaPago)
        : MetodoPago.EFECTIVO;

    const nextFolio = await this.getNextFolio();

    const venta = this.ventasRepository.create({
      folio: nextFolio,
      clienteId: createVentaDto.clienteId,
      usuarioId,
      subtotal,
      descuentoAplicado: descuentoTotal,
      iva,
      total,
      metodoPago: metodoPagoLegacy,
      observaciones: createVentaDto.observaciones,
    });

    const savedVenta = await manager.save(Venta, venta);

    for (const detalle of detalles) {
      detalle.ventaId = savedVenta.id;
    }
    const savedDetalles = await manager.save(DetalleVenta, detalles);

    for (const detalle of savedDetalles) {
      const lotesDeProducto = movimientosLotes.filter(
        (ml) => ml.productoId === detalle.productoId,
      );
      for (const loteInfo of lotesDeProducto) {
        const detalleLote = this.detallesRepository.manager.create(DetalleVentaLote, {
          detalleVentaId: detalle.id,
          loteId: loteInfo.loteId,
          cantidad: loteInfo.cantidad,
        });
        await manager.save(DetalleVentaLote, detalleLote);
      }
    }

    for (const pago of pagosData) {
      const pagoVenta = this.pagosRepository.create({
        ventaId: savedVenta.id,
        formaPago: pago.formaPago,
        monto: pago.monto,
        referencia: pago.referencia,
      });
      await manager.save(PagoVenta, pagoVenta);
    }

    for (const descuentoInfo of descuentosInfo) {
      const detalle = savedDetalles.find(
        (d) => d.productoId === descuentoInfo.productoId,
      );
      if (detalle && (descuentoInfo.descuentoId || descuentoInfo.tipo === 'CATEGORIA')) {
        this.logger.log(`Descuento aplicado por ${descuentoInfo.tipo}: ${descuentoInfo.monto}`);
        const descuentoVentaDetalle = this.descuentosVentaDetalleRepository.create({
          detalleVentaId: detalle.id,
          descuentoId: descuentoInfo.descuentoId,
          productoId: descuentoInfo.productoId,
          tipo: descuentoInfo.tipo as any,
          porcentaje: descuentoInfo.porcentaje,
          monto: descuentoInfo.monto,
          motivoGenerado: descuentoInfo.motivo,
        });
        await manager.save(DescuentoVentaDetalle, descuentoVentaDetalle);
      } else {
        // Sin descuentoId o detalle, se omite
      }
    }

    const detallesConRelaciones = await manager.find(DetalleVenta, {
      where: { ventaId: savedVenta.id },
      relations: ['producto', 'lote'],
    });

    return { ...savedVenta, detalles: detallesConRelaciones, pagos: pagosData, descuentos: descuentosInfo };
    });
  }

  async findAll(
    skip = 0,
    take = 20,
    filters?: {
      fechaFrom?: string;
      fechaTo?: string;
      clienteId?: string;
      statusId?: string;
      usuarioId?: string;
    },
  ): Promise<{ data: Venta[]; total: number }> {
    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .orderBy('venta.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (filters?.fechaFrom) {
      query.andWhere('DATE(venta.createdAt) >= :fechaFrom', {
        fechaFrom: filters.fechaFrom,
      });
    }
    if (filters?.fechaTo) {
      query.andWhere('DATE(venta.createdAt) <= :fechaTo', {
        fechaTo: filters.fechaTo,
      });
    }
    if (filters?.clienteId) {
      query.andWhere('venta.clienteId = :clienteId', {
        clienteId: filters.clienteId,
      });
    }
    if (filters?.statusId) {
      query.andWhere('venta.statusId = :statusId', {
        statusId: parseInt(filters.statusId, 10),
      });
    }
    if (filters?.usuarioId) {
      query.andWhere('venta.usuarioId = :usuarioId', {
        usuarioId: filters.usuarioId,
      });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(
    id: string,
  ): Promise<Venta & { detalles: DetalleVenta[]; pagos: any[]; descuentos: any[] }> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['cliente', 'usuario'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta with ID ${id} not found`);
    }

    const detalles = await this.detallesRepository.find({
      where: { ventaId: id },
      relations: ['producto', 'lote'],
    });

    const pagos = await this.pagosRepository.find({
      where: { ventaId: id },
    });

    const detalleIds = detalles.map(d => d.id);
    let descuentos: any[] = [];
    if (detalleIds.length > 0) {
      descuentos = await this.descuentosVentaDetalleRepository.find({
        where: { detalleVentaId: In(detalleIds) },
      });
    }

    const detallesConvertidos = detalles.map(d => ({
      ...d,
      cantidad: Number(d.cantidad) || 0,
      precioUnitario: Number(d.precioUnitario) || 0,
      descuentoLinea: Number(d.descuentoLinea) || 0,
      subtotal: Number(d.subtotal) || 0,
      importeBruto: Number(d.importeBruto) || 0,
    }))

    const pagosConvertidos = pagos.map(p => ({
      ...p,
      monto: Number(p.monto) || 0,
    }))

    const descuentosConvertidos = descuentos.map(d => ({
      ...d,
      monto: Number(d.monto) || 0,
      porcentaje: Number(d.porcentaje) || 0,
    }))

    return { 
      ...venta, 
      subtotal: Number(venta.subtotal) || 0,
      descuentoAplicado: Number(venta.descuentoAplicado) || 0,
      iva: Number(venta.iva) || 0,
      total: Number(venta.total) || 0,
      detalles: detallesConvertidos, 
      pagos: pagosConvertidos, 
      descuentos: descuentosConvertidos 
    };
  }

  async findByFolio(folio: number): Promise<Venta | null> {
    return this.ventasRepository.findOne({
      where: { folio },
      relations: ['cliente', 'usuario', 'detalles', 'pagos'],
    });
  }

  async findByFolioAndUserId(
    folio: number,
    userId: string,
    fechaFrom?: string,
    fechaTo?: string,
  ): Promise<Venta | null> {
    const query = this.ventasRepository
      .createQueryBuilder('venta')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .leftJoinAndSelect('venta.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('venta.pagos', 'pagos')
      .where('venta.folio = :folio', { folio })
      .andWhere('venta.usuarioId = :userId', { userId });

    if (fechaFrom) {
      query.andWhere('DATE(venta.createdAt) >= :fechaFrom', { fechaFrom });
    }
    if (fechaTo) {
      query.andWhere('DATE(venta.createdAt) <= :fechaTo', { fechaTo });
    }

    return query.getOne();
  }

  async cancel(id: string, usuarioId?: string, motivo?: string): Promise<Venta> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['detalles', 'detalles.lote', 'detalles.producto', 'detalles.lotesUtilizados', 'detalles.lotesUtilizados.lote'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    if (venta.statusId === 2) {
      throw new BadRequestException('La venta ya está cancelada');
    }

    const userId = usuarioId || 'SYSTEM';
    const motivoCancelacion = motivo || 'Cancelación manual';

    return this.dataSource.transaction(async (manager) => {
      for (const detalle of venta.detalles) {
        const lotesUtilizados = detalle.lotesUtilizados?.length
          ? detalle.lotesUtilizados
          : [{ loteId: detalle.loteId, cantidad: detalle.cantidad, lote: detalle.lote }];
        for (const loteUso of lotesUtilizados) {
          const cantidad = Number(loteUso.cantidad);
          if (cantidad <= 0) continue;
          const loteId = loteUso.loteId;
          const productoId = detalle.productoId;

          await this.inventarioAlmacenService.agregarStock(
            productoId,
            loteId,
            AlmacenTipo.VENTAS,
            cantidad,
            undefined,
            undefined,
            manager,
          );

          const movimiento = manager.create(MovimientoAlmacen, {
            productoId,
            loteId,
            almacenOrigen: AlmacenTipo.CLIENTE,
            almacenDestino: AlmacenTipo.VENTAS,
            cantidad,
            userId,
            observaciones: `Cancelación venta folio ${venta.folio}: ${motivoCancelacion}`,
            tipoMovimiento: TipoMovimiento.ENTRADA_REVERSION,
            origenOperacion: OrigenOperacion.POS,
            revertido: false,
          });
          await manager.save(MovimientoAlmacen, movimiento);
        }
      }

      venta.statusId = 2;
      return manager.save(Venta, venta);
    });
  }

  async previewDescuento(
    productos: { productoId: string; cantidad: number }[],
    clienteId?: string,
  ): Promise<PreviewDescuentoResult> {
    let subtotal = 0;
    let descuentoTotal = 0;
    const descuentoPorProducto: PreviewProductoDescuento[] = [];

    let categoriaClienteId: string | undefined;
    if (clienteId) {
      try {
        const cliente = await this.clientesService.findOne(clienteId);
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {
        this.logger.error('Error fetching cliente en previewDescuento');
      }
    }

    for (const productoVenta of productos) {
      let producto;

      try {
        producto = await this.productosService.findOne(
          productoVenta.productoId,
        );
        if (!producto) {
          descuentoPorProducto.push({
            productoId: productoVenta.productoId,
            descuento: 0,
            descuentoProducto: 0,
            descuentoCategoria: 0,
            motivo: 'Producto no encontrado',
            mejorDescuento: {
              descuentoId: '',
              tipo: 'NINGUNO',
              porcentaje: 0,
              monto: 0,
              precioConDescuento: 0,
              motivo: 'No encontrado',
            },
            descuentoCategoriaInfo: null,
            preciosAlternativos: [],
          });
          continue;
        }
      } catch (error) {
        descuentoPorProducto.push({
          productoId: productoVenta.productoId,
          descuento: 0,
          descuentoProducto: 0,
          descuentoCategoria: 0,
          motivo: 'Producto no encontrado',
          mejorDescuento: {
            descuentoId: '',
            tipo: 'NINGUNO',
            porcentaje: 0,
            monto: 0,
            precioConDescuento: 0,
            motivo: 'No encontrado',
          },
          descuentoCategoriaInfo: null,
          preciosAlternativos: [],
        });
        continue;
      }

      const inventarioProducto = await this.inventarioAlmacenService.findByProductoId(productoVenta.productoId);
      const precioVenta = inventarioProducto?.precioVenta || 0;
      const precioUnitario = inventarioProducto?.precioUnitarioLote || 0;
      const subtotalLinea = precioVenta * productoVenta.cantidad;

      let descuentoLinea = 0;
      let descuentoProductoMonto = 0;
      let descuentoCategoriaMonto = 0;
      let mejorDescuentoInfo: {
        descuentoId: string | null;
        tipo: string;
        porcentaje: number;
        monto: number;
        precioConDescuento: number;
        motivo: string;
      } = {
        descuentoId: '',
        tipo: 'NINGUNO',
        porcentaje: 0,
        monto: 0,
        precioConDescuento: subtotalLinea,
        motivo: 'Sin descuento',
      };
      let descuentoCategoriaInfo: {
        descuentoId: string | null;
        tipo: string;
        porcentaje: number;
        monto: number;
        motivo: string;
      } | null = null;
      let preciosAlternativos: {
        tipo: string;
        porcentaje: number;
        monto: number | null;
        precioConDescuento: number;
        motivo: string;
      }[] = [];

      try {
        const fechaCaducidad = parseDate(inventarioProducto?.lote?.fechaCaducidad);
        const calculo = await this.descuentosService.calcularDescuentosAcumulables(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          categoriaClienteId,
          fechaCaducidad,
          precioVenta,
        );

        if (calculo.descuentoProducto) {
          descuentoProductoMonto = Number((calculo.descuentoProducto.monto || 0).toFixed(2));
          mejorDescuentoInfo = { ...calculo.descuentoProducto, monto: descuentoProductoMonto };
        }

        if (calculo.descuentoCategoria) {
          descuentoCategoriaInfo = calculo.descuentoCategoria;
          descuentoCategoriaMonto = Number(calculo.descuentoCategoria.monto.toFixed(2));
          descuentoCategoriaInfo.monto = descuentoCategoriaMonto;
        }

        descuentoLinea = descuentoProductoMonto + descuentoCategoriaMonto;

        preciosAlternativos = [];
      } catch (error) {
        this.logger.error(`Error en descuento acumulable: ${error.message}`);
      }

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      const motivos: string[] = [];
      if (mejorDescuentoInfo.tipo !== 'NINGUNO') {
        motivos.push(mejorDescuentoInfo.motivo);
      }
      if (descuentoCategoriaInfo) {
        motivos.push(descuentoCategoriaInfo.motivo);
      }

      descuentoPorProducto.push({
        productoId: productoVenta.productoId,
        descuento: descuentoLinea,
        descuentoProducto: descuentoProductoMonto,
        descuentoCategoria: descuentoCategoriaMonto,
        motivo: motivos.length > 0 ? motivos.join(' + ') : 'Sin descuento',
        mejorDescuento: mejorDescuentoInfo,
        descuentoCategoriaInfo,
        preciosAlternativos,
      });
    }

    const ivaRate = await this.getIvaRate();
    const iva = (subtotal - descuentoTotal) * ivaRate;
    const total = subtotal - descuentoTotal + iva;

    return {
      subtotal,
      descuentoAplicado: descuentoTotal,
      iva,
      total,
      descuentoPorProducto,
    };
  }

  private convertirMetodoPago(metodo: MetodoPago): FormaPago {
    const mapa: Record<MetodoPago, FormaPago> = {
      [MetodoPago.EFECTIVO]: FormaPago.EFECTIVO,
      [MetodoPago.TARJETA]: FormaPago.TARJETA_CREDITO,
      [MetodoPago.TRANSFERENCIA]: FormaPago.TRANSFERENCIA,
    };
    return mapa[metodo] || FormaPago.EFECTIVO;
  }

  private convertirFormaPagoAMetodoPago(forma: FormaPago): MetodoPago {
    if (forma === FormaPago.EFECTIVO) return MetodoPago.EFECTIVO;
    if (forma === FormaPago.TRANSFERENCIA) return MetodoPago.TRANSFERENCIA;
    return MetodoPago.TARJETA;
  }
}
