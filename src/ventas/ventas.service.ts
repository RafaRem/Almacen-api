import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { PagoVenta } from './entities/pago-venta.entity';
import { DescuentoVentaDetalle } from '../descuentos/entities/descuento-venta-detalle.entity';
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
import { DescuentoTipo } from '../common/enums/descuento-tipo.enum';

interface CalculoLineaVenta {
  precioUnitario: number;
  precioVenta: number;
  descuentoLinea: number;
  subtotalLinea: number;
  detalleVentaId?: string;
  descuentosAplicados: {
    descuentoId: string;
    tipo: DescuentoTipo;
    porcentaje: number;
    monto: number;
    motivo: string;
    esProducto: boolean;
  }[];
}

@Injectable()
export class VentasService {
  private static readonly TOLERANCIA_PREVIEW = 5.0;

  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepository: Repository<DetalleVenta>,
    @InjectRepository(PagoVenta)
    private pagosRepository: Repository<PagoVenta>,
    @InjectRepository(DescuentoVentaDetalle)
    private descuentosDetalleRepository: Repository<DescuentoVentaDetalle>,
    private productosService: ProductosService,
    private lotesService: LotesService,
    private descuentosService: DescuentosService,
    private inventarioAlmacenService: InventarioAlmacenService,
    private movimientosAlmacenService: MovimientosAlmacenService,
    private configuracionesService: ConfiguracionesService,
    private clientesService: ClientesService,
  ) {}

  private async getIvaRate(): Promise<number> {
    return (await this.configuracionesService.getIvaGlobal()) / 100;
  }

  private async getNextFolio(): Promise<number> {
    const result = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('MAX(venta.folio)', 'maxFolio')
      .getRawOne();
    return (result?.maxFolio || 0) + 1;
  }

  async create(
    createVentaDto: CreateVentaDto,
    usuarioId: string,
  ): Promise<Venta & { detalles: DetalleVenta[]; pagos: any[] }> {
    if (!createVentaDto.productos || createVentaDto.productos.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    let subtotal = 0;
    let descuentoTotal = 0;
    const calculosLinea: CalculoLineaVenta[] = [];
    const detalles: Partial<DetalleVenta>[] = [];
    const movimientosLotes: {
      productoId: string;
      loteId: string;
      numeroLote: string;
      cantidad: number;
    }[] = [];

    let categoriaClienteId: string | undefined;
    if (createVentaDto.clienteId) {
      try {
        const cliente = await this.clientesService.findOne(
          createVentaDto.clienteId,
        );
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {}
    }

    for (const productoVenta of createVentaDto.productos) {
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

      const resultadoFEPU =
        await this.inventarioAlmacenService.reducirStockFIFO(
          productoVenta.productoId,
          productoVenta.cantidad,
          AlmacenTipo.VENTAS,
          usuarioId,
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

      const inventarioProducto =
        await this.inventarioAlmacenService.findByProductoId(
          productoVenta.productoId,
        );
      const precioCostoLote = resultadoFEPU.lotsUsed.length > 0
        ? resultadoFEPU.lotsUsed[0].precio
        : 0;

      const precioVenta =
        Number(productoVenta.precioVenta) ||
        Number(inventarioProducto?.precioVenta) ||
        precioCostoLote;

      if (!precioVenta || precioVenta <= 0) {
        throw new BadRequestException(
          `Precio de venta no disponible para ${producto.nombre}. Verifica el inventario del producto.`,
        );
      }

      const fechaCaducidad = inventarioProducto?.lote?.fechaCaducidad;

      const calculo = await this.descuentosService.calcularDescuentosAcumulables(
        productoVenta.productoId,
        productoVenta.cantidad,
        producto.laboratorioId,
        categoriaClienteId,
        fechaCaducidad,
        precioVenta,
      );

      const subtotalLinea = precioVenta * productoVenta.cantidad;
      const descuentoLinea = calculo.descuentoTotal;

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      const primerLoteId =
        resultadoFEPU.lotsUsed[0]?.loteId || '';

      calculosLinea.push({
        precioUnitario: precioVenta,
        precioVenta,
        descuentoLinea,
        subtotalLinea: subtotalLinea - descuentoLinea,
        descuentosAplicados: calculo.descuentosAplicables,
      });

      detalles.push({
        productoId: productoVenta.productoId,
        loteId: primerLoteId,
        cantidad: productoVenta.cantidad,
        precioUnitario: precioVenta,
        descuentoLinea,
        subtotal: subtotalLinea - descuentoLinea,
      });
    }

    const ivaRate = await this.getIvaRate();
    const iva = (subtotal - descuentoTotal) * ivaRate;
    const total = subtotal - descuentoTotal + iva;

    if (createVentaDto.descuentosPreview) {
      const previewDesc = createVentaDto.descuentosPreview.descuentoAplicado;
      const previewTotal = createVentaDto.descuentosPreview.total;
      const diffDescuento = Math.abs(descuentoTotal - previewDesc);
      const diffTotal = Math.abs(total - previewTotal);
      const tol = VentasService.TOLERANCIA_PREVIEW;
      const prodIds = createVentaDto.productos
        .map(p => p.productoId.slice(0, 8))
        .join(',');

      console.log(`[VALIDATION] productos=[${prodIds}] clienteId=${createVentaDto.clienteId || 'null'}`);
      console.log(`  Calc descuento:  ${descuentoTotal.toFixed(2)} | Preview: ${previewDesc.toFixed(2)} | diff: ${diffDescuento.toFixed(2)} | tol: ${tol}`);
      console.log(`  Calc total:      ${total.toFixed(2)} | Preview: ${previewTotal.toFixed(2)} | diff: ${diffTotal.toFixed(2)} | tol: ${tol}`);

      if (diffDescuento > tol || diffTotal > tol) {
        console.log(`  RESULTADO: 400 Bad Request - discrepancia excede tolerancia`);
        throw new BadRequestException(
          `Discrepancia en descuentos detectada. Calc: desc=${descuentoTotal.toFixed(2)}, total=${total.toFixed(2)} vs Preview: desc=${previewDesc.toFixed(2)}, total=${previewTotal.toFixed(2)}. Posible manipulacion.`,
        );
      }
      console.log(`  RESULTADO: 201 Created - dentro de tolerancia`);
    }

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

    const savedVenta = await this.ventasRepository.save(venta);

    for (let i = 0; i < detalles.length; i++) {
      detalles[i].ventaId = savedVenta.id;
    }
    const savedDetalles = await this.detallesRepository.save(detalles);

    for (let i = 0; i < savedDetalles.length; i++) {
      calculosLinea[i].detalleVentaId = savedDetalles[i].id;
    }

    const descuentosDetalleAInsertar: Partial<DescuentoVentaDetalle>[] = [];
    for (let i = 0; i < savedDetalles.length; i++) {
      const calc = calculosLinea[i];
      const det = savedDetalles[i];
      if (!calc || !det) continue;
      for (const d of calc.descuentosAplicados) {
        descuentosDetalleAInsertar.push({
          detalleVentaId: det.id,
          descuentoId: d.descuentoId,
          productoId: det.productoId,
          tipo: d.tipo,
          porcentaje: d.porcentaje,
          monto: d.monto,
          motivoGenerado: d.motivo,
        });
      }
    }
    if (descuentosDetalleAInsertar.length > 0) {
      await this.descuentosDetalleRepository.save(descuentosDetalleAInsertar);
    }

    for (const pago of pagosData) {
      const pagoVenta = this.pagosRepository.create({
        ventaId: savedVenta.id,
        formaPago: pago.formaPago,
        monto: pago.monto,
        referencia: pago.referencia,
      });
      await this.pagosRepository.save(pagoVenta);
    }

    return this.findOne(savedVenta.id);
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
  ): Promise<Venta & { detalles: DetalleVenta[]; pagos: any[] }> {
    const venta = await this.ventasRepository.findOne({
      where: { id },
      relations: ['cliente', 'usuario'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta with ID ${id} not found`);
    }

    const detalles = await this.detallesRepository.find({
      where: { ventaId: id },
      relations: ['producto', 'lote', 'descuentos', 'descuentos.descuento'],
    });

    const pagos = await this.pagosRepository.find({
      where: { ventaId: id },
    });

    return { ...venta, detalles, pagos };
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

  async cancel(id: string): Promise<Venta> {
    const venta = await this.findOne(id);

    if (venta.statusId === 2) {
      throw new BadRequestException('La venta ya está cancelada');
    }

    venta.statusId = 2;
    return this.ventasRepository.save(venta);
  }

  async previewDescuento(
    productos: { productoId: string; cantidad: number; precioVenta?: number }[],
    clienteId?: string,
  ): Promise<{
    subtotal: number;
    descuentoAplicado: number;
    iva: number;
    total: number;
    descuentoPorProducto: {
      productoId: string;
      descuento: number;
      descuentoProducto: number;
      descuentoCategoria: number;
      motivo: string;
      mejorDescuento: {
        descuentoId: string;
        tipo: string;
        porcentaje: number;
        monto: number;
        precioConDescuento: number;
        motivo: string;
      } | null;
      descuentoCategoriaInfo: {
        descuentoId: string;
        tipo: string;
        porcentaje: number;
        monto: number;
        motivo: string;
      } | null;
    }[];
  }> {
    let subtotal = 0;
    let descuentoTotal = 0;
    const descuentoPorProducto: {
      productoId: string;
      descuento: number;
      descuentoProducto: number;
      descuentoCategoria: number;
      motivo: string;
      mejorDescuento: {
        descuentoId: string;
        tipo: string;
        porcentaje: number;
        monto: number;
        precioConDescuento: number;
        motivo: string;
      } | null;
      descuentoCategoriaInfo: {
        descuentoId: string;
        tipo: string;
        porcentaje: number;
        monto: number;
        motivo: string;
      } | null;
    }[] = [];

    let categoriaClienteId: string | undefined;
    if (clienteId) {
      try {
        const cliente = await this.clientesService.findOne(clienteId);
        categoriaClienteId = cliente?.categoriaClienteId;
      } catch {}
    }

    for (const productoVenta of productos) {
      const producto = await this.productosService.findOne(
        productoVenta.productoId,
      );

      if (!producto) {
        descuentoPorProducto.push({
          productoId: productoVenta.productoId,
          descuento: 0,
          descuentoProducto: 0,
          descuentoCategoria: 0,
          motivo: 'Producto no encontrado',
          mejorDescuento: null,
          descuentoCategoriaInfo: null,
        });
        continue;
      }

      const inventarioProducto =
        await this.inventarioAlmacenService.findByProductoId(
          productoVenta.productoId,
        );
      const precioUnitario =
        Number(productoVenta.precioVenta) ||
        Number(inventarioProducto?.precioVenta) ||
        Number(inventarioProducto?.precioUnitarioLote) ||
        0;
      const fechaCaducidad = inventarioProducto?.lote?.fechaCaducidad;
      const subtotalLinea = precioUnitario * productoVenta.cantidad;

      if (!precioUnitario || precioUnitario <= 0) {
        descuentoPorProducto.push({
          productoId: productoVenta.productoId,
          descuento: 0,
          descuentoProducto: 0,
          descuentoCategoria: 0,
          motivo: 'Sin precio de venta disponible',
          mejorDescuento: null,
          descuentoCategoriaInfo: null,
        });
        continue;
      }

      const calculo = await this.descuentosService.calcularDescuentosAcumulables(
        productoVenta.productoId,
        productoVenta.cantidad,
        producto.laboratorioId,
        categoriaClienteId,
        fechaCaducidad,
        precioUnitario,
      );

      subtotal += subtotalLinea;
      descuentoTotal += calculo.descuentoTotal;

      const motivos: string[] = [];
      if (calculo.descuentoProducto) {
        motivos.push(calculo.descuentoProducto.motivo);
      }
      if (calculo.descuentoCategoria) {
        motivos.push(calculo.descuentoCategoria.motivo);
      }
      const motivo =
        motivos.length > 0
          ? motivos.join(' + ')
          : 'Sin descuento';

      descuentoPorProducto.push({
        productoId: productoVenta.productoId,
        descuento: calculo.descuentoTotal,
        descuentoProducto: calculo.descuentoProducto?.monto || 0,
        descuentoCategoria: calculo.descuentoCategoria?.monto || 0,
        motivo,
        mejorDescuento: calculo.descuentoProducto
          ? {
              descuentoId: calculo.descuentoProducto.descuentoId,
              tipo: calculo.descuentoProducto.tipo,
              porcentaje: calculo.descuentoProducto.porcentaje,
              monto: calculo.descuentoProducto.monto,
              precioConDescuento: calculo.descuentoProducto.precioConDescuento,
              motivo: calculo.descuentoProducto.motivo,
            }
          : null,
        descuentoCategoriaInfo: calculo.descuentoCategoria
          ? {
              descuentoId: calculo.descuentoCategoria.descuentoId,
              tipo: calculo.descuentoCategoria.tipo,
              porcentaje: calculo.descuentoCategoria.porcentaje,
              monto: calculo.descuentoCategoria.monto,
              motivo: calculo.descuentoCategoria.motivo,
            }
          : null,
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
