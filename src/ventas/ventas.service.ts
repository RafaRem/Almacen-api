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
import { CreateVentaDto } from './dto/create-venta.dto';
import { ProductosService } from '../productos/productos.service';
import { LotesService } from '../lotes/lotes.service';
import { DescuentosService } from '../descuentos/descuentos.service';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { MovimientosAlmacenService } from '../movimientos-almacen/movimientos-almacen.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import { MetodoPago } from '../common/enums/metodo-pago.enum';
import { FormaPago } from '../common/enums/forma-pago.enum';

@Injectable()
export class VentasService {
  private readonly IVA_RATE = 0.16;

  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepository: Repository<DetalleVenta>,
    @InjectRepository(PagoVenta)
    private pagosRepository: Repository<PagoVenta>,
    private productosService: ProductosService,
    private lotesService: LotesService,
    private descuentosService: DescuentosService,
    private inventarioAlmacenService: InventarioAlmacenService,
    private movimientosAlmacenService: MovimientosAlmacenService,
  ) {}

  private async getNextFolio(): Promise<number> {
    const result = await this.ventasRepository
      .createQueryBuilder('venta')
      .select('MAX(venta.folio)', 'maxFolio')
      .getRawOne();
    return (result?.maxFolio || 0) + 1;
  }

  async create(createVentaDto: CreateVentaDto, usuarioId: string): Promise<Venta> {
    if (!createVentaDto.productos || createVentaDto.productos.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    let subtotal = 0;
    let descuentoTotal = 0;
    const detalles: Partial<DetalleVenta>[] = [];
    const movimientosLotes: { productoId: string; loteId: string; numeroLote: string; cantidad: number }[] = [];

    for (const productoVenta of createVentaDto.productos) {
      const producto = await this.productosService.findOne(productoVenta.productoId);

      if (!producto) {
        throw new BadRequestException(`Producto ${productoVenta.productoId} no encontrado`);
      }

      const stockDisponible = await this.inventarioAlmacenService.getStockTotal(
        productoVenta.productoId,
        AlmacenTipo.VENTAS,
      );

      if (stockDisponible < productoVenta.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}, Solicitado: ${productoVenta.cantidad}`,
        );
      }

      const resultadoFEPU = await this.inventarioAlmacenService.reducirStockFIFO(
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

      const precioUnitario = Number(producto.precio);

      let descuentoLinea = 0;
      try {
        const calculo = await this.descuentosService.calcularMejorDescuento(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          createVentaDto.clienteId,
        );
        if (calculo?.mejorDescuento && calculo.mejorDescuento.tipo !== 'NINGUNO') {
          const mejor = calculo.mejorDescuento;
          if (mejor.monto && mejor.monto > 0) {
            descuentoLinea = mejor.monto;
          } else {
            descuentoLinea = (precioUnitario * productoVenta.cantidad * mejor.porcentaje) / 100;
          }
        }
      } catch {
      }

      const subtotalLinea = precioUnitario * productoVenta.cantidad - descuentoLinea;

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      const primerLoteId = resultadoFEPU.lotsUsed[0]?.loteId || producto.loteId || '';

      detalles.push({
        productoId: productoVenta.productoId,
        loteId: primerLoteId,
        cantidad: productoVenta.cantidad,
        precioUnitario,
        descuentoLinea,
        subtotal: subtotalLinea,
      });
    }

    const iva = (subtotal - descuentoTotal) * this.IVA_RATE;
    const total = subtotal - descuentoTotal + iva;

    if (createVentaDto.descuentoPreview) {
      const diffDescuento = Math.abs(descuentoTotal - createVentaDto.descuentoPreview.descuentoAplicado);
      const diffTotal = Math.abs(total - createVentaDto.descuentoPreview.total);
      if (diffDescuento > 0.10 || diffTotal > 0.10) {
        throw new BadRequestException(
          `Discrepancia en descuentos detectada. Calc: desc=${descuentoTotal.toFixed(2)}, total=${total.toFixed(2)} vs Preview: desc=${createVentaDto.descuentoPreview.descuentoAplicado.toFixed(2)}, total=${createVentaDto.descuentoPreview.total.toFixed(2)}. Posible manipulacion.`,
        );
      }
    }

    let pagosData: { formaPago: FormaPago; monto: number; referencia?: string }[] = [];

    if (createVentaDto.pagos && createVentaDto.pagos.length > 0) {
      const sumaPagos = createVentaDto.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
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
      pagosData = [{
        formaPago: this.convertirMetodoPago(createVentaDto.metodoPago),
        monto: total,
      }];
    } else {
      throw new BadRequestException('Debe especificar método de pago');
    }

    const metodoPagoLegacy = pagosData.length === 1
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

    for (const detalle of detalles) {
      detalle.ventaId = savedVenta.id;
    }
    await this.detallesRepository.save(detalles);

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
    filters?: { fechaFrom?: string; fechaTo?: string; clienteId?: string; statusId?: string; usuarioId?: string },
  ): Promise<{ data: Venta[]; total: number }> {
    const query = this.ventasRepository.createQueryBuilder('venta')
      .leftJoinAndSelect('venta.cliente', 'cliente')
      .leftJoinAndSelect('venta.usuario', 'usuario')
      .orderBy('venta.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (filters?.fechaFrom) {
      query.andWhere('DATE(venta.createdAt) >= :fechaFrom', { fechaFrom: filters.fechaFrom });
    }
    if (filters?.fechaTo) {
      query.andWhere('DATE(venta.createdAt) <= :fechaTo', { fechaTo: filters.fechaTo });
    }
    if (filters?.clienteId) {
      query.andWhere('venta.clienteId = :clienteId', { clienteId: filters.clienteId });
    }
    if (filters?.statusId) {
      query.andWhere('venta.statusId = :statusId', { statusId: parseInt(filters.statusId, 10) });
    }
    if (filters?.usuarioId) {
      query.andWhere('venta.usuarioId = :usuarioId', { usuarioId: filters.usuarioId });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Venta & { detalles: DetalleVenta[]; pagos: any[] }> {
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

    return { ...venta, detalles, pagos };
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
    productos: { productoId: string; cantidad: number }[],
    clienteId?: string,
  ): Promise<{
    subtotal: number;
    descuentoAplicado: number;
    iva: number;
    total: number;
    descuentoPorProducto: {
      productoId: string;
      descuento: number;
      motivo: string;
      mejorDescuento: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string };
      preciosAlternativos: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string }[];
    }[];
  }> {
    let subtotal = 0;
    let descuentoTotal = 0;
    const descuentoPorProducto: {
      productoId: string;
      descuento: number;
      motivo: string;
      mejorDescuento: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string };
      preciosAlternativos: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string }[];
    }[] = [];

    for (const productoVenta of productos) {
      let producto;

      try {
        producto = await this.productosService.findOne(productoVenta.productoId);
        if (!producto) {
          descuentoPorProducto.push({
            productoId: productoVenta.productoId,
            descuento: 0,
            motivo: 'Producto no encontrado',
            mejorDescuento: { tipo: 'NINGUNO', porcentaje: 0, monto: null, precioConDescuento: 0, motivo: 'No encontrado' },
            preciosAlternativos: [],
          });
          continue;
        }
      } catch (error) {
        descuentoPorProducto.push({
          productoId: productoVenta.productoId,
          descuento: 0,
          motivo: 'Producto no encontrado',
          mejorDescuento: { tipo: 'NINGUNO', porcentaje: 0, monto: null, precioConDescuento: 0, motivo: 'No encontrado' },
          preciosAlternativos: [],
        });
        continue;
      }

      const precioUnitario = Number(producto.precio);
      const subtotalLinea = precioUnitario * productoVenta.cantidad;

      let descuentoLinea = 0;
      let mejorDescuentoInfo: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string } = { tipo: 'NINGUNO', porcentaje: 0, monto: null, precioConDescuento: subtotalLinea, motivo: 'Sin descuento' };
      let preciosAlternativos: { tipo: string; porcentaje: number; monto: number | null; precioConDescuento: number; motivo: string }[] = [];

      try {
        const fechaCaducidad = producto.lote?.fechaCaducidad;
        const calculo = await this.descuentosService.calcularMejorDescuento(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          clienteId,
          fechaCaducidad,
          subtotalLinea,
        );

        if (calculo?.mejorDescuento && calculo.mejorDescuento.tipo !== 'NINGUNO') {
          const mejor = calculo.mejorDescuento;
          if (mejor.monto && mejor.monto > 0) {
            descuentoLinea = mejor.monto;
          } else {
            descuentoLinea = (subtotalLinea * mejor.porcentaje) / 100;
          }
          mejorDescuentoInfo = {
            tipo: mejor.tipo,
            porcentaje: mejor.porcentaje,
            monto: mejor.monto,
            precioConDescuento: mejor.precioConDescuento,
            motivo: mejor.motivo,
          };
          preciosAlternativos = calculo.preciosAlternativos;
        }
      } catch {
      }

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      descuentoPorProducto.push({
        productoId: productoVenta.productoId,
        descuento: descuentoLinea,
        motivo: mejorDescuentoInfo.motivo,
        mejorDescuento: mejorDescuentoInfo,
        preciosAlternativos,
      });
    }

    const iva = (subtotal - descuentoTotal) * this.IVA_RATE;
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
