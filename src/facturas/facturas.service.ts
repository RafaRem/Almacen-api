import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { Factura } from './entities/factura.entity';
import { FacturaDetalle } from './entities/factura-detalle.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { CreateFacturaDesdeVentaDto } from './dto/create-desde-venta.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { Producto } from '../productos/entities/producto.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { FacturacionCliente } from '../facturacion-cliente/entities/facturacion-cliente.entity';
import { DatosEmpresa } from '../empresa/entities/datos-empresa.entity';
import { RegimenFiscal } from '../regimen-fiscal/entities/regimen-fiscal.entity';
import { FacturaStatus } from './entities/factura.entity';
import { MetodoPagoSat } from '../common/enums/metodo-pago-sat.enum';
import { TipoComprobante } from '../common/enums/tipo-comprobante.enum';
import { DEFAULT_TASA } from '../common/enums/impuesto.enum';
import { TimbradoService } from '../timbrado/timbrado.service';

interface ImpuestosLinea {
  base: number;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: number;
  importe: number;
}

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura)
    private readonly facturaRepository: Repository<Factura>,
    @InjectRepository(FacturaDetalle)
    private readonly facturaDetalleRepository: Repository<FacturaDetalle>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(FacturacionCliente)
    private readonly facturacionClienteRepository: Repository<FacturacionCliente>,
    @InjectRepository(DatosEmpresa)
    private readonly empresaRepository: Repository<DatosEmpresa>,
    @InjectRepository(RegimenFiscal)
    private readonly regimenFiscalRepository: Repository<RegimenFiscal>,
    private readonly timbradoService: TimbradoService,
  ) {}

  async create(createFacturaDto: CreateFacturaDto, usuarioId?: string): Promise<Factura> {
    const {
      clienteId,
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
      usuarioId,
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

  async crearDesdeVenta(
    ventaId: string,
    dto?: CreateFacturaDesdeVentaDto,
    usuarioId?: string,
  ): Promise<Factura> {
    const venta = await this.ventaRepository.findOne({
      where: { id: ventaId },
      relations: ['detalles', 'detalles.producto', 'pagos', 'cliente'],
    })

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${ventaId} no encontrada`)
    }

    if (venta.statusId !== 1) {
      throw new BadRequestException('Solo se pueden facturar ventas activas')
    }

    const exists = await this.facturaRepository.findOne({
      where: { ventaId },
    })
    if (exists) {
      throw new BadRequestException('Esta venta ya tiene una factura asociada')
    }

    const fc = venta.clienteId
      ? await this.facturacionClienteRepository.findOne({
          where: { clienteId: venta.clienteId },
          relations: ['regimenFiscal'],
        })
      : null

    const empresa = await this.empresaRepository.findOne({
      where: { activo: true },
    })

    let nuevoFolio: number
    try {
      const result = await this.facturaRepository.query(
        `SELECT nextval('facturas_folio_seq') AS folio`,
      )
      nuevoFolio = Number(result[0].folio)
    } catch {
      const result = await this.facturaRepository.query(
        `SELECT COALESCE(MAX(folio), 0) + 1 AS folio FROM facturas`,
      )
      nuevoFolio = Number(result[0].folio)
    }

    const detallesData: Partial<FacturaDetalle>[] = []
    for (const det of venta.detalles) {
      const producto = det.producto
      const precioUnitario = Number(det.precioUnitario)
      const cantidad = det.cantidad
      const descuento = Number(det.descuentoLinea)
      const importeBruto = precioUnitario * cantidad
      const importe = importeBruto - descuento

      const tasaImpuesto = DEFAULT_TASA
      const impuestos: ImpuestosLinea[] = []
      if (tasaImpuesto > 0) {
        const base = importe
        const impImporte = base * (tasaImpuesto / 100)
        impuestos.push({
          base,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: tasaImpuesto / 100,
          importe: Math.round(impImporte * 100) / 100,
        })
      }

      detallesData.push({
        productoId: det.productoId,
        loteId: det.loteId || '',
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
      })
    }

    const subtotal = detallesData.reduce(
      (sum, d) => sum + Number(d.importeBruto),
      0,
    )
    const descuentoTotal = detallesData.reduce(
      (sum, d) => sum + Number(d.descuento),
      0,
    )
    const totalImpuestos = detallesData.reduce((sum, d) => {
      if (d.impuestos) {
        return (
          sum +
          (d.impuestos as ImpuestosLinea[]).reduce(
            (impSum, imp) => impSum + Number(imp.importe),
            0,
          )
        )
      }
      return sum
    }, 0)
    const total = subtotal - descuentoTotal + totalImpuestos

    let formaPago = '01'
    if (venta.pagos && venta.pagos.length > 0) {
      formaPago = venta.pagos[0].formaPago
    }

    const receptorRfc = fc?.rfc || 'XAXX010101000'
    const receptorNombre = fc?.razonSocial || venta.cliente?.nombre || 'Público en General'
    let regimenFiscalCodigo = empresa?.regimenFiscal || '601'
    if (fc?.regimenFiscal) {
      regimenFiscalCodigo = fc.regimenFiscal.code
    }

    const facturaData: Partial<Factura> = {
      ventaId,
      serie: dto?.serie || undefined,
      folio: nuevoFolio,
      tipoComprobante: TipoComprobante.INGRESO,
      lugarExpedicion: dto?.lugarExpedicion || empresa?.cp || undefined,
      formaPago,
      metodoPago: dto?.metodoPago || MetodoPagoSat.PUE,
      usoCfdi: dto?.usoCfdi || fc?.usoCfdi || 'G03',
      moneda: 'MXN',
      tipoCambio: 1,
      subtotal: Math.round(subtotal * 100) / 100,
      descuentoTotal: Math.round(descuentoTotal * 100) / 100,
      totalImpuestosTrasladados: Math.round(totalImpuestos * 100) / 100,
      totalImpuestosRetenidos: 0,
      total: Math.round(total * 100) / 100,
      observaciones: dto?.observaciones || undefined,
      statusId: FacturaStatus.BORRADOR,
      clienteId: venta.clienteId,
      usuarioId,
      emisorNombre: empresa?.nombre || undefined,
      emisorRfc: empresa?.rfc || undefined,
      emisorRegimenFiscal: regimenFiscalCodigo,
    }

    const factura = this.facturaRepository.create(facturaData)
    await this.facturaRepository.save(factura)

    for (const det of detallesData) {
      const detalle = this.facturaDetalleRepository.create({
        ...det,
        facturaId: factura.id,
      } as Partial<FacturaDetalle>)
      await this.facturaDetalleRepository.save(detalle)
    }

    return this.findOne(factura.id)
  }

  async crearYTimbrarDesdeVenta(
    ventaId: string,
    dto?: CreateFacturaDesdeVentaDto,
    usuarioId?: string,
  ): Promise<Factura> {
    const factura = await this.crearDesdeVenta(ventaId, dto, usuarioId);

    const result = await this.timbradoService.timbrar(factura);

    factura.facturapiId = result.facturapiId;
    factura.uuid = result.uuid;
    factura.xmlPath = result.xmlPath;
    factura.pdfPath = result.pdfPath;
    factura.statusId = FacturaStatus.TIMBRADA;
    if (usuarioId) factura.usuarioId = usuarioId;

    return this.facturaRepository.save(factura);
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
      const importeBruto = precioUnitario * cantidad;
      const importe = importeBruto - descuento;

      const tasaImpuesto = prod.tasaImpuesto || DEFAULT_TASA;

      const impuestos: ImpuestosLinea[] = [];
      if (tasaImpuesto > 0) {
        const base = importe;
        const impImporte = base * (tasaImpuesto / 100);
        impuestos.push({
          base,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: tasaImpuesto / 100,
          importe: Math.round(impImporte * 100) / 100,
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
        impuestos,
      });
    }

    return detalles;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: Factura[]; total: number }> {
    const [data, total] = await this.facturaRepository.findAndCount({
      relations: ['cliente', 'detalles', 'detalles.producto'],
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
        'usuario',
        'detalles',
        'detalles.producto',
        'detalles.lote',
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
      const importeBruto = precioUnitario * cantidad;
      const importe = importeBruto - descuento;

      const tasaImpuesto = prod.tasaImpuesto || DEFAULT_TASA;
      const impuestos: ImpuestosLinea[] = [];
      if (tasaImpuesto > 0) {
        const base = importe;
        const impImporte = base * (tasaImpuesto / 100);
        impuestos.push({
          base,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: tasaImpuesto / 100,
          importe: Math.round(impImporte * 100) / 100,
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

  async timbrar(id: string, usuarioId?: string): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.BORRADOR) {
      throw new BadRequestException(
        'Solo se pueden timbrar facturas en estado borrador',
      );
    }

    const result = await this.timbradoService.timbrar(factura);

    factura.facturapiId = result.facturapiId;
    factura.uuid = result.uuid;
    factura.xmlPath = result.xmlPath;
    factura.pdfPath = result.pdfPath;
    factura.statusId = FacturaStatus.TIMBRADA;
    if (usuarioId) factura.usuarioId = usuarioId;

    return this.facturaRepository.save(factura);
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

  async cancelar(id: string, usuarioId?: string): Promise<Factura> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.TIMBRADA) {
      throw new BadRequestException(
        'Solo se pueden cancelar facturas timbradas',
      );
    }

    if (factura.facturapiId) {
      await this.timbradoService.cancelar(factura.facturapiId);
    }

    factura.statusId = FacturaStatus.CANCELADA;
    if (usuarioId) factura.usuarioId = usuarioId;

    return this.facturaRepository.save(factura);
  }

  async getXmlStream(id: string): Promise<StreamableFile> {
    const factura = await this.findOne(id);

    if (!factura.xmlPath) {
      throw new NotFoundException('No hay archivo XML disponible para esta factura');
    }

    const fullPath = path.join(process.cwd(), factura.xmlPath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Archivo XML no encontrado en el servidor');
    }

    const file = fs.createReadStream(fullPath);
    return new StreamableFile(file, {
      type: 'application/xml',
      disposition: `attachment; filename="${factura.uuid}.xml"`,
    });
  }

  async getPdfStream(id: string): Promise<StreamableFile> {
    const factura = await this.findOne(id);

    if (!factura.pdfPath) {
      throw new NotFoundException('No hay archivo PDF disponible para esta factura');
    }

    const fullPath = path.join(process.cwd(), factura.pdfPath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Archivo PDF no encontrado en el servidor');
    }

    const file = fs.createReadStream(fullPath);
    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: `attachment; filename="${factura.uuid}.pdf"`,
    });
  }

  async previewPdf(id: string): Promise<StreamableFile> {
    const factura = await this.findOne(id);

    if (factura.statusId !== FacturaStatus.BORRADOR) {
      throw new BadRequestException(
        'Solo se puede previsualizar facturas en estado borrador',
      );
    }

    const payload = this.buildTimbradoPayload(factura);
    const pdfStream = await this.timbradoService.previewPdf(payload) as Readable;

    return new StreamableFile(pdfStream, {
      type: 'application/pdf',
      disposition: `inline; filename="preview-${factura.serie || 'N'}-${factura.folio || '0'}.pdf"`,
    });
  }

  async enviarEmail(id: string): Promise<void> {
    const factura = await this.findOne(id);

    if (!factura.facturapiId) {
      throw new BadRequestException(
        'La factura no tiene un ID de Facturapi asociado',
      );
    }

    if (!factura.cliente?.facturacionCliente?.correo) {
      throw new BadRequestException(
        'El cliente no tiene un correo electrónico registrado en datos de facturación',
      );
    }

    await this.timbradoService.sendByEmail(
      factura.facturapiId,
      factura.cliente.facturacionCliente.correo,
    );
  }

  private buildTimbradoPayload(factura: Factura): Record<string, unknown> {
    const cliente = (factura as any).cliente || null;
    const fc = cliente?.facturacionCliente || null;

    const items = ((factura as any).detalles || []).map((det: FacturaDetalle) => {
      const impuestos = (det.impuestos || []).map((imp) => ({
        type: imp.impuesto === '002' ? 'IVA' : imp.impuesto,
        rate: imp.tasaOCuota,
      }));

      return {
        quantity: det.cantidad,
        product: {
          description: det.descripcion,
          product_key: det.claveProdServ || '01010101',
          price: det.valorUnitario,
          tax_included: false,
          unit_key: det.claveUnidad || 'H87',
          taxes: impuestos.length > 0 ? impuestos : [{ type: 'IVA', rate: 0.16 }],
        },
      };
    });

    const paymentFormMap: Record<string, string> = {
      '01': '01', '02': '02', '03': '03', '04': '04', '05': '05',
      '06': '06', '08': '08', '12': '12', '13': '13', '14': '14',
      '15': '15', '17': '17', '23': '23', '24': '24', '25': '25',
      '26': '26', '27': '27', '28': '28', '29': '29', '30': '30',
      '31': '31', '99': '99',
    };
    const paymentForm = paymentFormMap[factura.formaPago] || '99';

    const payload: Record<string, unknown> = {
      type: factura.tipoComprobante || 'I',
      payment_form: paymentForm,
      payment_method: factura.metodoPago || 'PUE',
      use: factura.usoCfdi || 'G03',
      currency: factura.moneda || 'MXN',
      exchange: Number(factura.tipoCambio) || 1,
      items,
      customer: {
        legal_name: fc?.razonSocial || cliente?.nombre || 'Público en General',
        tax_id: fc?.rfc || 'XAXX010101000',
        tax_system: fc?.regimenFiscal?.code || '616',
        address: {
          zip: (cliente as any)?.domicilio?.cp || '00000',
        },
      },
    };

    if (factura.serie) {
      payload.series = factura.serie;
    }

    if (factura.observaciones) {
      payload.conditions = factura.observaciones;
    }

    return payload;
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

    const subtotal = detalles.reduce((sum, d) => sum + Number(d.importe), 0);
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
