import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Raw, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Factura } from './entities/factura.entity';
import { FacturaDetalle } from './entities/factura-detalle.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { FacturaStatus } from './entities/factura.entity';
import { FacturapiService } from '../facturapi/facturapi.service';

interface ImpuestosLinea {
  base: number;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: number;
  importe: number;
}

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

@Injectable()
export class FacturasService {
  private readonly logger = new Logger(FacturasService.name);

  constructor(
    @InjectRepository(Factura)
    private readonly facturaRepository: Repository<Factura>,
    @InjectRepository(FacturaDetalle)
    private readonly facturaDetalleRepository: Repository<FacturaDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    private readonly facturapiService: FacturapiService,
  ) {}

  async create(createFacturaDto: CreateFacturaDto): Promise<Factura> {
    const {
      clienteId,
      ventaId,
      productos,
      tipoComprobante,
      metodoPago,
      formaPago,
      usoCfdi,
      lugarExpedicion,
      moneda,
      tipoCambio,
      observaciones,
      serie,
      emisorNombre,
      emisorRfc,
      emisorRegimenFiscal,
    } = createFacturaDto;

    let cliente: Cliente | null = null;
    if (clienteId) {
      cliente = await this.clienteRepository.findOne({
        where: { id: clienteId },
      });
      if (!cliente) {
        throw new NotFoundException(
          `Cliente con ID ${clienteId} no encontrado`,
        );
      }
    }

    if (ventaId) {
      const existing = await this.facturaRepository.findOne({
        where: { ventaId },
      });
      if (existing) {
        throw new BadRequestException(
          `La venta ${ventaId} ya tiene una factura asociada`,
        );
      }
    }

    let nuevoFolio: number;
    try {
      const result = await this.facturaRepository.query(
        `SELECT nextval('facturas_folio_seq') AS folio`,
      );
      nuevoFolio = Number(result[0].folio);
    } catch {
      const result = await this.facturaRepository.query(
        `SELECT COALESCE(MAX(folio), 0) + 1 AS folio FROM facturas`,
      );
      nuevoFolio = Number(result[0].folio);
    }

    const detallesData = await this.calcularDetalles(productos);

    const subtotal = detallesData.reduce(
      (sum, d) => sum + Number(d.importeBruto),
      0,
    );
    const descuentoTotal = detallesData.reduce(
      (sum, d) => sum + Number(d.descuento),
      0,
    );

    const totalImpuestos = detallesData.reduce((sum, d) => {
      if (d.impuestos) {
        return (
          sum +
          d.impuestos.reduce(
            (impSum: number, imp: ImpuestosLinea) =>
              impSum + Number(imp.importe),
            0,
          )
        );
      }
      return sum;
    }, 0);

    const total = subtotal - descuentoTotal + totalImpuestos;

    const facturaData = {
      serie,
      folio: nuevoFolio,
      tipoComprobante,
      lugarExpedicion,
      formaPago,
      metodoPago,
      usoCfdi,
      moneda: moneda || 'MXN',
      tipoCambio: tipoCambio || 1,
      subtotal,
      descuentoTotal,
      totalImpuestosTrasladados: totalImpuestos,
      totalImpuestosRetenidos: 0,
      total,
      observaciones,
      statusId: FacturaStatus.BORRADOR,
      clienteId,
      ventaId,
      emisorNombre,
      emisorRfc,
      emisorRegimenFiscal,
    };

    const factura = this.facturaRepository.create(facturaData);
    await this.facturaRepository.save(factura);

    for (const det of detallesData) {
      const detalle = this.facturaDetalleRepository.create({
        ...det,
        facturaId: factura.id,
      } as Partial<FacturaDetalle>);
      await this.facturaDetalleRepository.save(detalle);
    }

    return this.findOne(factura.id);
  }

  private async calcularDetalles(
    productos: CreateFacturaDto['productos'],
  ): Promise<Partial<FacturaDetalle>[]> {
    const detalles: Partial<FacturaDetalle>[] = [];

    for (const prod of productos) {
      const producto = await this.productoRepository.findOne({
        where: { id: prod.productoId },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${prod.productoId} no encontrado`,
        );
      }

      const precioUnitario = prod.precioUnitario || 0;

      const cantidad = prod.cantidad;
      const descuento = prod.descuento || 0;
      const importeBruto = round2(precioUnitario * cantidad);
      const importe = round2(importeBruto - descuento);

      const tasaImpuesto = await this.resolverTasaImpuesto(prod);

      const impuestos: ImpuestosLinea[] = [];
      if (tasaImpuesto > 0) {
        const base = importe;
        const impImporte = round2(base * (tasaImpuesto / 100));
        impuestos.push({
          base,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: tasaImpuesto / 100,
          importe: impImporte,
        });
      }

      detalles.push({
        productoId: prod.productoId,
        loteId: prod.loteId || undefined,
        claveProdServ: producto.claveProdServ || '01010101',
        claveUnidad: producto.claveUnidad || 'ACT',
        descripcion: producto.nombre,
        cantidad,
        unidad: 'Actividad',
        valorUnitario: precioUnitario,
        descuento,
        importe,
        importeBruto,
        impuestos,
      });
    }

    return detalles;
  }

  private async resolverTasaImpuesto(
    prod: { productoId?: string; loteId?: string; tasaImpuesto?: number },
  ): Promise<number> {
    if (prod.tasaImpuesto !== undefined && prod.tasaImpuesto !== null) {
      const tasa = Number(prod.tasaImpuesto);
      if (!Number.isNaN(tasa)) return tasa;
    }

    const manager = this.facturaRepository.manager;

    if (prod.loteId) {
      const porLote = await manager.query(
        `SELECT COALESCE(iva_personalizado, iva_cfdi, 0) AS tasa
         FROM inventario_almacen
         WHERE "loteId" = $1
         ORDER BY (iva_personalizado IS NULL), id
         LIMIT 1`,
        [prod.loteId],
      );
      if (porLote.length > 0) {
        return Number(porLote[0].tasa) || 0;
      }
    }

    if (prod.productoId) {
      const porProducto = await manager.query(
        `SELECT COALESCE(iva_personalizado, iva_cfdi, 0) AS tasa
         FROM inventario_almacen
         WHERE "productoId" = $1
         ORDER BY COALESCE(iva_personalizado, iva_cfdi, 0) DESC
         LIMIT 1`,
        [prod.productoId],
      );
      if (porProducto.length > 0) {
        return Number(porProducto[0].tasa) || 0;
      }
    }

    return 0;
  }

  async findAll(
    page = 1,
    limit = 10,
    filters?: {
      clienteId?: string;
      folio?: string;
      serie?: string;
      fechaFrom?: string;
      fechaTo?: string;
      statusId?: string;
    },
  ): Promise<{ data: Factura[]; total: number }> {
    const where: any = {};

    if (filters?.clienteId) {
      where.clienteId = filters.clienteId;
    }
    if (filters?.statusId) {
      const status = Number(filters.statusId);
      if (!Number.isNaN(status)) where.statusId = status;
    }
    if (filters?.serie && filters.serie.trim()) {
      where.serie = ILike(`%${filters.serie.trim()}%`);
    }
    if (filters?.folio) {
      const folio = Number(filters.folio);
      if (!Number.isNaN(folio)) where.venta = { folio };
    }
    if (filters?.fechaFrom && filters?.fechaTo) {
      where.createdAt = Raw(
        (alias) => `DATE(${alias}) BETWEEN :fechaFrom AND :fechaTo`,
        { fechaFrom: filters.fechaFrom, fechaTo: filters.fechaTo },
      );
    } else if (filters?.fechaFrom) {
      where.createdAt = Raw((alias) => `DATE(${alias}) >= :fechaFrom`, {
        fechaFrom: filters.fechaFrom,
      });
    } else if (filters?.fechaTo) {
      where.createdAt = Raw((alias) => `DATE(${alias}) <= :fechaTo`, {
        fechaTo: filters.fechaTo,
      });
    }

    const [data, total] = await this.facturaRepository.findAndCount({
      where,
      relations: ['cliente', 'detalles', 'detalles.producto', 'venta'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findOne(id: string): Promise<Factura> {
    const factura = await this.facturaRepository.findOne({
      where: { id },
      relations: [
        'cliente',
        'cliente.facturacionCliente',
        'cliente.facturacionCliente.regimenFiscal',
        'cliente.domicilio',
        'cliente.telefonos',
        'usuario',
        'detalles',
        'detalles.producto',
        'detalles.lote',
        'venta',
      ],
    });

    if (!factura) {
      throw new NotFoundException(`Factura con ID ${id} no encontrada`);
    }

    return factura;
  }

  async update(
    id: string,
    updateFacturaDto: UpdateFacturaDto,
  ): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden editar facturas en estado borrador',
      );
    }

    const { productos, ...datosCabecera } = updateFacturaDto;

    Object.assign(factura, datosCabecera);

    if (productos && productos.length > 0) {
      await this.facturaDetalleRepository.delete({ facturaId: id });

      const detallesData = await this.calcularDetallesFromUpdate(productos);

      for (const det of detallesData) {
        const detalle = this.facturaDetalleRepository.create({
          ...det,
          facturaId: factura.id,
        } as Partial<FacturaDetalle>);
        await this.facturaDetalleRepository.save(detalle);
      }

      const detalles = await this.facturaDetalleRepository.find({
        where: { facturaId: id },
      });

      const subtotal = detalles.reduce(
        (sum, d) => sum + Number(d.importeBruto),
        0,
      );
      const descuentoTotal = detalles.reduce(
        (sum, d) => sum + Number(d.descuento),
        0,
      );
      const totalImpuestos = detalles.reduce((sum, d) => {
        if (d.impuestos) {
          return (
            sum +
            (d.impuestos as ImpuestosLinea[]).reduce(
              (impSum: number, imp: ImpuestosLinea) =>
                impSum + Number(imp.importe),
              0,
            )
          );
        }
        return sum;
      }, 0);

      factura.subtotal = subtotal;
      factura.descuentoTotal = descuentoTotal;
      factura.totalImpuestosTrasladados = totalImpuestos;
      factura.total = subtotal - descuentoTotal + totalImpuestos;
    }

    return this.facturaRepository.save(factura);
  }

  private async calcularDetallesFromUpdate(
    productos: UpdateFacturaDto['productos'],
  ): Promise<Partial<FacturaDetalle>[]> {
    const detalles: Partial<FacturaDetalle>[] = [];

    for (const prod of productos!) {
      const producto = await this.productoRepository.findOne({
        where: { id: prod.productoId! },
      });

      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${prod.productoId} no encontrado`,
        );
      }

      const precioUnitario = prod.precioUnitario || 0;

      const cantidad = prod.cantidad!;
      const descuento = prod.descuento || 0;
      const importeBruto = round2(precioUnitario * cantidad);
      const importe = round2(importeBruto - descuento);

      const tasaImpuesto = await this.resolverTasaImpuesto(prod);
      const impuestos: ImpuestosLinea[] = [];
      if (tasaImpuesto > 0) {
        const base = importe;
        const impImporte = round2(base * (tasaImpuesto / 100));
        impuestos.push({
          base,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: tasaImpuesto / 100,
          importe: impImporte,
        });
      }

      detalles.push({
        productoId: prod.productoId,
        loteId: prod.loteId || undefined,
        claveProdServ: producto.claveProdServ || '01010101',
        claveUnidad: producto.claveUnidad || 'ACT',
        descripcion: producto.nombre,
        cantidad,
        unidad: 'Actividad',
        valorUnitario: precioUnitario,
        descuento,
        importe,
        importeBruto,
        impuestos,
      });
    }

    return detalles;
  }

  async marcarComoTimbradaDemo(id: string): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId === FacturaStatus.CANCELADA) {
      throw new BadRequestException('La factura ya ha sido cancelada');
    }

    factura.uuid = uuidv4();
    factura.statusId = FacturaStatus.TIMBRADA;
    factura.xmlPath = `/facturas/${factura.id}/${factura.uuid}.xml`;

    return this.facturaRepository.save(factura);
  }

  async timbrar(id: string): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId === FacturaStatus.CANCELADA) {
      throw new BadRequestException('La factura está cancelada');
    }
    if (factura.statusId === FacturaStatus.TIMBRADA) {
      throw new BadRequestException('La factura ya está timbrada');
    }
    if (factura.facturapiId) {
      throw new BadRequestException(
        'La factura ya tiene un timbrado registrado en Facturapi',
      );
    }

    const payload = await this.buildFacturapiPayload(factura);
    const invoice = await this.facturapiService.createInvoice(payload);

    factura.facturapiId = invoice.id;

    if (invoice.status === 'valid' && invoice.uuid) {
      factura.uuid = invoice.uuid;
      factura.statusId = FacturaStatus.TIMBRADA;
      await this.facturaRepository.save(factura);
      await this.downloadInvoiceFiles(factura);
      return this.findOne(factura.id);
    }

    if (invoice.status === 'draft') {
      await this.facturaRepository.save(factura);
      throw new BadRequestException(
        'Facturapi generó un borrador (sin timbrar). Verifica que el CSD esté cargado en el dashboard de Facturapi.',
      );
    }

    await this.facturaRepository.save(factura);
    throw new BadRequestException(
      `Facturapi devolvió estado "${invoice.status}". No se pudo timbrar todavía.`,
    );
  }

  async cancelar(id: string, motivo = '02'): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.TIMBRADA) {
      throw new BadRequestException(
        'Solo se pueden cancelar facturas timbradas',
      );
    }

    if (factura.facturapiId) {
      await this.facturapiService.cancelInvoice(factura.facturapiId, motivo);
    }

    factura.statusId = FacturaStatus.CANCELADA;
    factura.cancelacionMotivo = motivo;
    factura.fechaCancelacion = new Date();

    return this.facturaRepository.save(factura);
  }

  private async buildFacturapiPayload(
    factura: Factura,
  ): Promise<Record<string, any>> {
    if (!factura.cliente) {
      throw new BadRequestException(
        'La factura no tiene cliente asignado; se requieren datos fiscales',
      );
    }

    const receptor = await this.getReceptorFiscal(factura.cliente);

    const items = (factura.detalles || []).map((detalle) => {
      const tasa = this.getTasaFromDetalle(detalle);
      const price = Number(detalle.valorUnitario) || 0;
      const quantity = Number(detalle.cantidad) || 0;
      const discount = Number(detalle.descuento) || 0;

      return {
        quantity,
        ...(discount > 0 ? { discount } : {}),
        product: {
          description: detalle.descripcion,
          product_key: detalle.claveProdServ || '01010101',
          unit_key: detalle.claveUnidad || 'ACT',
          price,
          tax_included: false,
          taxes: [{ type: 'IVA', rate: tasa / 100 }],
        },
      };
    });

    if (items.length === 0) {
      throw new BadRequestException(
        'La factura no tiene conceptos para timbrar',
      );
    }

    return {
      customer: {
        legal_name: receptor.razonSocial,
        tax_id: receptor.rfc,
        tax_system: receptor.regimenCode,
        address: { zip: receptor.codigoPostal },
        ...(receptor.correo ? { email: receptor.correo } : {}),
        ...(factura.usoCfdi ? { default_invoice_use: factura.usoCfdi } : {}),
      },
      items,
      type: 'I',
      payment_form: factura.formaPago || '01',
      payment_method: factura.metodoPago || 'PUE',
      use: factura.usoCfdi || 'G03',
      currency: factura.moneda || 'MXN',
      exchange: Number(factura.tipoCambio) || 1,
      ...(factura.serie ? { series: factura.serie } : {}),
      ...(factura.folio ? { folio_number: factura.folio } : {}),
      ...(factura.observaciones
        ? { conditions: factura.observaciones.slice(0, 1000) }
        : {}),
      external_id: factura.id,
      idempotency_key: factura.id,
    };
  }

  private getTasaFromDetalle(detalle: FacturaDetalle): number {
    const impuestos = (detalle.impuestos || []) as ImpuestosLinea[];
    const iva = impuestos.find((imp) => imp.impuesto === '002');
    if (!iva) return 0;
    const tasa = Number(iva.tasaOCuota);
    return Number.isNaN(tasa) ? 0 : round2(tasa * 100);
  }

  private resolverNombreFiscal(
    cliente: Cliente,
    rfc: string,
    razonSocial?: string,
  ): string {
    const fiscal = (razonSocial || '').trim();
    const nombreCompleto = [
      cliente.nombre,
      cliente.apellidoPaterno,
      cliente.apellidoMaterno,
    ]
      .filter((parte) => !!parte && String(parte).trim().length > 0)
      .map((parte) => String(parte).trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    const empresa = (cliente.empresa || '').trim();

    const rfcLimpio = (rfc || '').trim();
    const tipo: 'fisica' | 'moral' =
      rfcLimpio.length === 12
        ? 'moral'
        : rfcLimpio.length === 13
          ? 'fisica'
          : cliente.tipoPersona === 'moral'
            ? 'moral'
            : 'fisica';

    if (tipo === 'moral') {
      return fiscal || empresa || nombreCompleto || cliente.nombre;
    }

    return nombreCompleto || fiscal || empresa || cliente.nombre;
  }

  private async getReceptorFiscal(cliente: Cliente): Promise<{
    rfc: string;
    razonSocial: string;
    regimenCode: string;
    codigoPostal: string;
    correo?: string;
  }> {
    const rows = await this.facturaRepository.manager.query(
      `SELECT fc.rfc,
              fc.razon_social AS "razonSocial",
              rf.code AS "regimenCode",
              fc.correo,
              d.codigo_postal AS "codigoPostal"
       FROM facturacion_cliente fc
       LEFT JOIN regimen_fiscal rf ON rf.id = fc.regimen_fiscal_id
       LEFT JOIN domicilios d ON d.cliente_id = fc.cliente_id
       WHERE fc.cliente_id = $1
       LIMIT 1`,
      [cliente.id],
    );

    if (rows.length === 0) {
      throw new BadRequestException(
        'El cliente no tiene datos fiscales (RFC, razón social y régimen). Captúralos antes de timbrar.',
      );
    }

    const row = rows[0];
    const razonSocial = this.resolverNombreFiscal(
      cliente,
      row.rfc,
      row.razonSocial,
    );

    const faltantes: string[] = [];
    if (!row.rfc) faltantes.push('RFC');
    if (!razonSocial) faltantes.push('nombre fiscal');
    if (!row.regimenCode) faltantes.push('régimen fiscal');
    if (!row.codigoPostal) faltantes.push('código postal (domicilio)');

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Datos fiscales incompletos del cliente: falta ${faltantes.join(', ')}`,
      );
    }

    return {
      rfc: row.rfc,
      razonSocial,
      regimenCode: row.regimenCode,
      codigoPostal: row.codigoPostal,
      correo: row.correo || undefined,
    };
  }

  private async downloadInvoiceFiles(factura: Factura): Promise<void> {
    if (!factura.facturapiId) return;

    const uploadsRoot =
      process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
    const dir = join(uploadsRoot, 'facturas', factura.id);
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error(
        `No se pudo crear el directorio de facturas ${dir}: ${error.message}`,
      );
      return;
    }

    const baseName = factura.uuid || factura.id;
    const xmlName = `${baseName}.xml`;
    const pdfName = `${baseName}.pdf`;

    try {
      const xml = await this.downloadWithRetry(factura.facturapiId, 'xml');
      await writeFile(join(dir, xmlName), xml);
      factura.xmlPath = `/uploads/facturas/${factura.id}/${xmlName}`;
    } catch (error) {
      this.logger.error(
        `No se pudo descargar el XML de Facturapi para ${factura.id}: ${error.message}`,
      );
    }

    try {
      const pdf = await this.downloadWithRetry(factura.facturapiId, 'pdf');
      await writeFile(join(dir, pdfName), pdf);
      factura.pdfPath = `/uploads/facturas/${factura.id}/${pdfName}`;
    } catch (error) {
      this.logger.error(
        `No se pudo descargar el PDF de Facturapi para ${factura.id}: ${error.message}`,
      );
    }

    if (factura.xmlPath || factura.pdfPath) {
      await this.facturaRepository.save(factura);
    }
  }

  private async downloadWithRetry(
    invoiceId: string,
    format: 'xml' | 'pdf',
    attempts = 3,
  ): Promise<Buffer> {
    let lastError: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await this.facturapiService.downloadInvoiceFile(
          invoiceId,
          format,
        );
      } catch (error) {
        lastError = error;
        if (i < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * i));
        }
      }
    }
    throw lastError;
  }

  async remove(id: string): Promise<void> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden eliminar facturas en estado borrador',
      );
    }

    await this.facturaDetalleRepository.delete({ facturaId: id });
    await this.facturaRepository.remove(factura);
  }

  async preview(
    productos: CreateFacturaDto['productos'],
    clienteId?: string,
  ): Promise<{
    subtotal: number;
    descuentoTotal: number;
    impuestos: { tasa: number; importe: number }[];
    totalImpuestos: number;
    total: number;
  }> {
    const detalles = await this.calcularDetalles(productos);

    const subtotal = detalles.reduce((sum, d) => sum + Number(d.importeBruto), 0);
    const descuentoTotal = detalles.reduce(
      (sum, d) => sum + Number(d.descuento),
      0,
    );

    const impuestosMap = new Map<number, number>();
    detalles.forEach((d) => {
      if (d.impuestos) {
        (d.impuestos as ImpuestosLinea[]).forEach((imp) => {
          const tasa = imp.tasaOCuota * 100;
          const actual = impuestosMap.get(tasa) || 0;
          impuestosMap.set(tasa, actual + imp.importe);
        });
      }
    });

    const impuestos = Array.from(impuestosMap.entries()).map(
      ([tasa, importe]) => ({
        tasa,
        importe: Math.round(importe * 100) / 100,
      }),
    );

    const totalImpuestos = impuestos.reduce((sum, i) => sum + i.importe, 0);
    const total = subtotal - descuentoTotal + totalImpuestos;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      descuentoTotal: Math.round(descuentoTotal * 100) / 100,
      impuestos,
      totalImpuestos: Math.round(totalImpuestos * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}
