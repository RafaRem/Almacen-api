import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  FacturaGlobal,
  FacturaGlobalEstado,
} from './entities/factura-global.entity';
import { FacturaGlobalDetalle } from './entities/factura-global-detalle.entity';
import { PeriodoGlobalDto } from './dto/facturacion-global.dto';
import { VentasService } from '../ventas/ventas.service';
import { FacturapiService } from '../facturapi/facturapi.service';
import { ConfiguracionesService } from '../configuraciones/configuraciones.service';
import {
  DATOS_FACTURACION_GLOBAL,
  VARIANTE_GLOBAL_DEFAULT,
} from './constants/datos-facturacion-global';

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class FacturacionGlobalService {
  private readonly logger = new Logger(FacturacionGlobalService.name);

  constructor(
    @InjectRepository(FacturaGlobal)
    private readonly facturaGlobalRepository: Repository<FacturaGlobal>,
    @InjectRepository(FacturaGlobalDetalle)
    private readonly detalleRepository: Repository<FacturaGlobalDetalle>,
    private readonly ventasService: VentasService,
    private readonly facturapiService: FacturapiService,
    private readonly configuracionesService: ConfiguracionesService,
    private readonly dataSource: DataSource,
  ) {}

  private buildPeriodo(dto: PeriodoGlobalDto) {
    const ref = dto.fechaReferencia
      ? new Date(`${dto.fechaReferencia}T12:00:00`)
      : new Date();

    let inicio: Date;
    let fin: Date;

    if (dto.fechaInicio && dto.fechaFin) {
      inicio = new Date(`${dto.fechaInicio}T12:00:00`);
      fin = new Date(`${dto.fechaFin}T12:00:00`);
    } else {
      const y = ref.getFullYear();
      const m = ref.getMonth();
      const d = ref.getDate();

      switch (dto.periodicidad) {
        case '01':
          inicio = new Date(y, m, d);
          fin = new Date(y, m, d);
          break;
        case '02': {
          const dow = ref.getDay();
          const offset = (dow + 6) % 7;
          inicio = new Date(y, m, d - offset);
          fin = new Date(y, m, d - offset + 6);
          break;
        }
        case '03':
          if (d <= 15) {
            inicio = new Date(y, m, 1);
            fin = new Date(y, m, 15);
          } else {
            inicio = new Date(y, m, 16);
            fin = new Date(y, m + 1, 0);
          }
          break;
        case '04':
          inicio = new Date(y, m, 1);
          fin = new Date(y, m + 1, 0);
          break;
        default:
          throw new BadRequestException('Periodicidad inválida');
      }
    }

    const fmt = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const periodicityMap: Record<string, string> = {
      '01': 'day',
      '02': 'week',
      '03': 'fortnight',
      '04': 'month',
    };

    return {
      inicio: fmt(inicio),
      fin: fmt(fin),
      mes: String(fin.getMonth() + 1).padStart(2, '0'),
      anio: fin.getFullYear(),
      periodicity: periodicityMap[dto.periodicidad],
    };
  }

  private async getVentasPendientes(inicio: string, fin: string) {
    const rows = await this.dataSource.query(
      `SELECT v.id
       FROM ventas v
       WHERE v.statusid = 1
         AND v.clienteid IS NULL
         AND v.metodopago <> 'CREDITO'
         AND v.createdat >= $1::date
         AND v.createdat < ($2::date + interval '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM facturas f
           WHERE f.ventaid = v.id AND f."statusId" IN (1, 2)
         )
         AND NOT EXISTS (
           SELECT 1 FROM factura_global_detalle d
           JOIN factura_global g ON g.id = d.factura_global_id
           WHERE d.venta_id = v.id
             AND d.activo = true
             AND g.estado IN ('BORRADOR', 'TIMBRADA')
         )
       ORDER BY v.folio`,
      [inicio, fin],
    );

    const ventas: any[] = [];
    for (const row of rows) {
      ventas.push(await this.ventasService.findOne(row.id));
    }
    return ventas;
  }

  private async resolverTasasIva(detalles: any[]): Promise<Map<string, number>> {
    const tasas = new Map<string, number>();

    const loteIds = [...new Set(detalles.map((d) => d.loteId).filter(Boolean))];
    if (loteIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT DISTINCT ON ("loteId") "loteId",
                COALESCE(iva_personalizado, iva_cfdi, 0) AS tasa
         FROM inventario_almacen
         WHERE "loteId" = ANY($1)
         ORDER BY "loteId", (iva_personalizado IS NULL), id`,
        [loteIds],
      );
      for (const row of rows) {
        tasas.set(`lote:${row.loteId}`, Number(row.tasa) || 0);
      }
    }

    const productoIds = [
      ...new Set(
        detalles
          .filter((d) => !d.loteId)
          .map((d) => d.productoId)
          .filter(Boolean),
      ),
    ];
    if (productoIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT DISTINCT ON ("productoId") "productoId",
                COALESCE(iva_personalizado, iva_cfdi, 0) AS tasa
         FROM inventario_almacen
         WHERE "productoId" = ANY($1)
         ORDER BY "productoId", COALESCE(iva_personalizado, iva_cfdi, 0) DESC`,
        [productoIds],
      );
      for (const row of rows) {
        tasas.set(`prod:${row.productoId}`, Number(row.tasa) || 0);
      }
    }

    return tasas;
  }

  private getTasaProducto(detalle: any, tasas: Map<string, number>): number {
    return detalle.loteId
      ? (tasas.get(`lote:${detalle.loteId}`) ?? 0)
      : (tasas.get(`prod:${detalle.productoId}`) ?? 0);
  }

  getConfig() {
    return {
      default: VARIANTE_GLOBAL_DEFAULT,
      variantes: Object.entries(DATOS_FACTURACION_GLOBAL).map(([id, value]) => ({
        id,
        descripcion: value.descripcion,
        cp: value.cp,
        serie: value.serie,
        receptor: value.receptor,
        periodicidades: value.periodicidades,
      })),
    };
  }

  async getPendientes(dto: PeriodoGlobalDto) {
    const periodo = this.buildPeriodo(dto);
    const ivaGlobal = await this.configuracionesService.getIvaGlobal();
    const ventas = await this.getVentasPendientes(periodo.inicio, periodo.fin);
    const tasas = await this.resolverTasasIva(
      ventas.flatMap((v) => v.detalles || []),
    );

    let base16 = 0;
    let base0 = 0;
    let ivaCalculado = 0;
    let subtotal = 0;

    const ventasResumen = ventas.map((venta) => {
      let vBase16 = 0;
      let vBase0 = 0;
      let vIva = 0;

      for (const detalle of venta.detalles || []) {
        const tasaProducto = this.getTasaProducto(detalle, tasas);
        const tasa = tasaProducto > 0 ? ivaGlobal : 0;
        const base = Number(detalle.subtotal) || 0;

        if (tasa > 0) {
          vBase16 += base;
          vIva += (base * tasa) / 100;
        } else {
          vBase0 += base;
        }
      }

      vBase16 = round2(vBase16);
      vBase0 = round2(vBase0);
      vIva = round2(vIva);
      base16 += vBase16;
      base0 += vBase0;
      ivaCalculado += vIva;
      subtotal += Number(venta.subtotal) || 0;

      return {
        id: venta.id,
        folio: venta.folio,
        fecha: venta.createdAt,
        subtotal: Number(venta.subtotal) || 0,
        iva: Number(venta.iva) || 0,
        total: Number(venta.total) || 0,
        metodoPago: venta.metodoPago,
        base16: vBase16,
        base0: vBase0,
        ivaCalculado: vIva,
      };
    });

    subtotal = round2(subtotal);
    ivaCalculado = round2(ivaCalculado);

    return {
      periodicidad: dto.periodicidad,
      periodicity: periodo.periodicity,
      fechaInicio: periodo.inicio,
      fechaFin: periodo.fin,
      mes: periodo.mes,
      anio: periodo.anio,
      ivaGlobal,
      ventas: ventasResumen,
      resumen: {
        tickets: ventas.length,
        subtotal,
        iva: ivaCalculado,
        total: round2(subtotal + ivaCalculado),
        base16: round2(base16),
        base0: round2(base0),
      },
    };
  }

  private mapMetodoPago(metodo: string): string {
    switch (metodo) {
      case 'TRANSFERENCIA':
        return '03';
      case 'TARJETA':
        return '04';
      default:
        return '01';
    }
  }

  private async nextFolio(): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT nextval('factura_global_folio_seq') AS folio`,
      );
      return Number(result[0].folio);
    } catch {
      const result = await this.dataSource.query(
        `SELECT COALESCE(MAX(folio), 0) + 1 AS folio FROM factura_global`,
      );
      return Number(result[0].folio);
    }
  }

  async generar(dto: PeriodoGlobalDto & { serie?: string }, usuarioId?: string) {
    const periodo = this.buildPeriodo(dto);
    const ivaGlobal = await this.configuracionesService.getIvaGlobal();
    const ventas = await this.getVentasPendientes(periodo.inicio, periodo.fin);

    if (ventas.length === 0) {
      throw new BadRequestException(
        'No hay ventas pendientes de facturación global en el periodo seleccionado.',
      );
    }

    const varianteKey = VARIANTE_GLOBAL_DEFAULT;
    const variante = DATOS_FACTURACION_GLOBAL[varianteKey];
    if (!variante) {
      throw new BadRequestException(
        'No hay una variante de facturación global configurada.',
      );
    }

    const tasas = await this.resolverTasasIva(
      ventas.flatMap((v) => v.detalles || []),
    );

    const items: any[] = [];
    let subtotal = 0;
    let impuestos = 0;

    for (const venta of ventas) {
      for (const detalle of venta.detalles || []) {
        const tasaProducto = this.getTasaProducto(detalle, tasas);
        const tasa = tasaProducto > 0 ? ivaGlobal : 0;
        const price = Number(detalle.precioUnitario) || 0;
        const quantity = Number(detalle.cantidad) || 0;
        const discount = Number(detalle.descuentoLinea) || 0;
        const base = round2(price * quantity - discount);
        const iva = round2((base * tasa) / 100);

        subtotal += base;
        impuestos += iva;

        items.push({
          quantity,
          ...(discount > 0 ? { discount } : {}),
          product: {
            description: `${detalle.producto?.nombre || 'Producto'} (folio ${venta.folio})`,
            product_key: detalle.producto?.claveProdServ || '01010101',
            unit_key: detalle.producto?.claveUnidad || 'ACT',
            price,
            tax_included: false,
            taxes: [{ type: 'IVA', rate: tasa / 100 }],
          },
        });
      }
    }

    subtotal = round2(subtotal);
    impuestos = round2(impuestos);
    const total = round2(subtotal + impuestos);

    const folio = await this.nextFolio();
    const serie = dto.serie || variante.serie || 'G';

    const highest = ventas.reduce(
      (a, b) => (Number(b.total) > Number(a.total) ? b : a),
      ventas[0],
    );
    const paymentForm = this.mapMetodoPago(String(highest.metodoPago));

    const global = this.facturaGlobalRepository.create({
      periodicidad: dto.periodicidad,
      variante: varianteKey,
      serie,
      folio,
      fechaInicio: periodo.inicio,
      fechaFin: periodo.fin,
      mes: periodo.mes,
      anio: periodo.anio,
      subtotal,
      impuestos,
      total,
      estado: FacturaGlobalEstado.BORRADOR,
      usuarioId,
    });
    const saved = await this.facturaGlobalRepository.save(global);

    const detalles = ventas.map((venta) =>
      this.detalleRepository.create({
        facturaGlobalId: saved.id,
        ventaId: venta.id,
        folio: venta.folio,
        subtotal: Number(venta.subtotal) || 0,
        iva: Number(venta.iva) || 0,
        total: Number(venta.total) || 0,
        activo: true,
      }),
    );
    await this.detalleRepository.save(detalles);

    try {
      const payload = {
        customer: {
          legal_name: variante.receptor.nombre,
          tax_id: variante.receptor.rfc,
          tax_system: variante.receptor.regimenFiscal,
          address: { zip: variante.cp },
        },
        items,
        type: 'I',
        payment_form: paymentForm,
        payment_method: 'PUE',
        use: variante.receptor.usoCfdi,
        currency: 'MXN',
        exchange: 1,
        series: serie,
        folio_number: folio,
        global: {
          periodicity: periodo.periodicity,
          months: periodo.mes,
          year: periodo.anio,
        },
        external_id: saved.id,
        idempotency_key: saved.id,
      };

      const invoice = await this.facturapiService.createInvoice(payload);

      if (invoice.status !== 'valid' || !invoice.uuid) {
        await this.detalleRepository.delete({ facturaGlobalId: saved.id });
        await this.facturaGlobalRepository.remove(saved);
        throw new BadRequestException(
          `Facturapi devolvió estado "${invoice.status}". No se pudo timbrar la factura global.`,
        );
      }

      saved.uuid = invoice.uuid;
      saved.facturapiId = invoice.id;
      saved.estado = FacturaGlobalEstado.TIMBRADA;
      saved.fechaTimbrado = new Date();
      await this.facturaGlobalRepository.save(saved);
      await this.downloadInvoiceFiles(saved);

      return this.findOne(saved.id);
    } catch (error) {
      const still = await this.facturaGlobalRepository.findOne({
        where: { id: saved.id },
      });
      if (still && still.estado === FacturaGlobalEstado.BORRADOR) {
        await this.detalleRepository.delete({ facturaGlobalId: saved.id });
        await this.facturaGlobalRepository.remove(still);
      }
      throw error;
    }
  }

  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.facturaGlobalRepository.findAndCount({
      relations: ['detalles'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<FacturaGlobal> {
    const global = await this.facturaGlobalRepository.findOne({
      where: { id },
      relations: ['detalles', 'detalles.venta'],
    });
    if (!global) {
      throw new NotFoundException(`Factura global ${id} no encontrada`);
    }
    return global;
  }

  async cancelar(id: string, motivo = '02'): Promise<FacturaGlobal> {
    const global = await this.findOne(id);

    if (global.estado === FacturaGlobalEstado.CANCELADA) {
      throw new BadRequestException('La factura global ya está cancelada');
    }

    if (
      global.estado === FacturaGlobalEstado.TIMBRADA &&
      global.facturapiId
    ) {
      await this.facturapiService.cancelInvoice(global.facturapiId, motivo);
    }

    global.estado = FacturaGlobalEstado.CANCELADA;
    global.cancelacionMotivo = motivo;
    global.fechaCancelacion = new Date();
    await this.facturaGlobalRepository.save(global);
    await this.detalleRepository.update(
      { facturaGlobalId: id },
      { activo: false },
    );

    return this.findOne(id);
  }

  async corregir(id: string, ventaId: string): Promise<FacturaGlobal> {
    const global = await this.findOne(id);

    if (global.estado === FacturaGlobalEstado.CANCELADA) {
      throw new BadRequestException('La factura global está cancelada');
    }
    if (global.estado === FacturaGlobalEstado.TIMBRADA) {
      throw new BadRequestException(
        'La factura global está timbrada. Cancélala y genera una nueva sin la venta.',
      );
    }

    const detalle = (global.detalles || []).find((d) => d.ventaId === ventaId);
    if (!detalle) {
      throw new NotFoundException(
        'La venta no pertenece a esta factura global',
      );
    }

    await this.detalleRepository.delete({ id: detalle.id });

    const restantes = await this.detalleRepository.find({
      where: { facturaGlobalId: id },
    });

    if (restantes.length === 0) {
      global.estado = FacturaGlobalEstado.CANCELADA;
      global.cancelacionMotivo = '01';
      global.fechaCancelacion = new Date();
    } else {
      global.subtotal = round2(
        restantes.reduce((sum, d) => sum + Number(d.subtotal), 0),
      );
      global.impuestos = round2(
        restantes.reduce((sum, d) => sum + Number(d.iva), 0),
      );
      global.total = round2(
        restantes.reduce((sum, d) => sum + Number(d.total), 0),
      );
    }

    await this.facturaGlobalRepository.save(global);
    return this.findOne(id);
  }

  private async downloadInvoiceFiles(global: FacturaGlobal): Promise<void> {
    if (!global.facturapiId) return;

    const uploadsRoot =
      process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    const dir = join(uploadsRoot, 'facturas-global', global.id);

    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error(
        `No se pudo crear el directorio de facturas globales ${dir}: ${error.message}`,
      );
      return;
    }

    const base = global.uuid || global.id;

    try {
      const xml = await this.facturapiService.downloadInvoiceFile(
        global.facturapiId,
        'xml',
      );
      await writeFile(join(dir, `${base}.xml`), xml);
      global.xmlPath = `/uploads/facturas-global/${global.id}/${base}.xml`;
    } catch (error) {
      this.logger.error(
        `No se pudo descargar el XML de la global ${global.id}: ${error.message}`,
      );
    }

    try {
      const pdf = await this.facturapiService.downloadInvoiceFile(
        global.facturapiId,
        'pdf',
      );
      await writeFile(join(dir, `${base}.pdf`), pdf);
      global.pdfPath = `/uploads/facturas-global/${global.id}/${base}.pdf`;
    } catch (error) {
      this.logger.error(
        `No se pudo descargar el PDF de la global ${global.id}: ${error.message}`,
      );
    }

    if (global.xmlPath || global.pdfPath) {
      await this.facturaGlobalRepository.save(global);
    }
  }
}
