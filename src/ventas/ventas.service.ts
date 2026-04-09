import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CreateVentaDto } from './dto/create-venta.dto';
import { ProductosService } from '../productos/productos.service';
import { LotesService } from '../lotes/lotes.service';
import { DescuentosService } from '../descuentos/descuentos.service';

@Injectable()
export class VentasService {
  private readonly IVA_RATE = 0.16;

  constructor(
    @InjectRepository(Venta)
    private ventasRepository: Repository<Venta>,
    @InjectRepository(DetalleVenta)
    private detallesRepository: Repository<DetalleVenta>,
    private productosService: ProductosService,
    private lotesService: LotesService,
    private descuentosService: DescuentosService,
  ) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: string): Promise<Venta> {
    if (!createVentaDto.productos || createVentaDto.productos.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    let subtotal = 0;
    let descuentoTotal = 0;
    const detalles: Partial<DetalleVenta>[] = [];

    for (const productoVenta of createVentaDto.productos) {
      const producto = await this.productosService.findOne(productoVenta.productoId);

      const loteId = productoVenta.loteId || producto.loteId;
      const lote = await this.lotesService.findOne(loteId);

      if (!producto || !lote) {
        throw new BadRequestException(
          `Producto ${productoVenta.productoId} o Lote ${loteId} no encontrado`,
        );
      }

      if (producto.stock < productoVenta.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${productoVenta.cantidad}`,
        );
      }

      const precioUnitario = Number(lote.precio);

      let descuentoLinea = 0;
      try {
        const calculo = await this.descuentosService.calcularMejorDescuento(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          createVentaDto.clienteId,
        );
        if (calculo?.mejorDescuento) {
          descuentoLinea = (precioUnitario * productoVenta.cantidad * calculo.mejorDescuento) / 100;
        }
      } catch {
        // No discount available
      }

      const subtotalLinea = precioUnitario * productoVenta.cantidad - descuentoLinea;

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      detalles.push({
        productoId: productoVenta.productoId,
        loteId: productoVenta.loteId,
        cantidad: productoVenta.cantidad,
        precioUnitario,
        descuentoLinea,
        subtotal: subtotalLinea,
      });

      await this.productosService.updateStock(
        productoVenta.productoId,
        producto.stock - productoVenta.cantidad,
      );
    }

    const iva = (subtotal - descuentoTotal) * this.IVA_RATE;
    const total = subtotal - descuentoTotal + iva;

    const venta = this.ventasRepository.create({
      clienteId: createVentaDto.clienteId,
      usuarioId,
      subtotal,
      descuentoAplicado: descuentoTotal,
      iva,
      total,
      metodoPago: createVentaDto.metodoPago,
      observaciones: createVentaDto.observaciones,
    });

    const savedVenta = await this.ventasRepository.save(venta);

    for (const detalle of detalles) {
      detalle.ventaId = savedVenta.id;
    }
    await this.detallesRepository.save(detalles);

    return this.findOne(savedVenta.id);
  }

  async findAll(skip = 0, take = 20): Promise<{ data: Venta[]; total: number }> {
    const [data, total] = await this.ventasRepository.findAndCount({
      relations: ['cliente', 'usuario'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Venta & { detalles: DetalleVenta[] }> {
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

    return { ...venta, detalles };
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
  ): Promise<{ subtotal: number; descuentoAplicado: number; iva: number; total: number; descuentoPorProducto: { productoId: string; descuento: number; motivo: string }[] }> {
    let subtotal = 0;
    let descuentoTotal = 0;
    const descuentoPorProducto: { productoId: string; descuento: number; motivo: string }[] = [];

    for (const productoVenta of productos) {
      let producto;
      let lote;

      try {
        producto = await this.productosService.findOne(productoVenta.productoId);
        if (!producto) {
          descuentoPorProducto.push({
            productoId: productoVenta.productoId,
            descuento: 0,
            motivo: 'Producto no encontrado',
          });
          continue;
        }
        lote = await this.lotesService.findOne(producto.loteId);
        if (!lote) {
          descuentoPorProducto.push({
            productoId: productoVenta.productoId,
            descuento: 0,
            motivo: 'Lote no encontrado',
          });
          continue;
        }
      } catch (error) {
        descuentoPorProducto.push({
          productoId: productoVenta.productoId,
          descuento: 0,
          motivo: 'Producto no encontrado',
        });
        continue;
      }

      const precioUnitario = Number(lote.precio);
      const subtotalLinea = precioUnitario * productoVenta.cantidad;

      let descuentoLinea = 0;
      let motivoDescuento = 'Sin descuento';

      try {
        const calculo = await this.descuentosService.calcularMejorDescuento(
          productoVenta.productoId,
          productoVenta.cantidad,
          producto.laboratorioId,
          clienteId,
        );
        if (calculo?.mejorDescuento) {
          descuentoLinea = (subtotalLinea * calculo.mejorDescuento) / 100;
          motivoDescuento = calculo.motivo;
        }
      } catch {
        // No discount available
      }

      subtotal += subtotalLinea;
      descuentoTotal += descuentoLinea;

      descuentoPorProducto.push({
        productoId: productoVenta.productoId,
        descuento: descuentoLinea,
        motivo: motivoDescuento,
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
}
