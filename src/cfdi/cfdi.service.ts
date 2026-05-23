import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../productos/entities/producto.entity';
import { Lote } from '../lotes/entities/lote.entity';
import { Laboratorio } from '../laboratorios/entities/laboratorio.entity';
import { InventarioAlmacenService } from '../inventario-almacen/inventario-almacen.service';
import { DetalleLoteService } from '../detalle-lote/detalle-lote.service';
import { AlmacenTipo } from '../common/enums/almacen-tipo.enum';
import {
  CfdiPreviewDto,
  RecepcionConfirmadaDto,
  ConceptoDto,
} from './dto/procesar-recepcion.dto';

@Injectable()
export class CfdiService {
  constructor(
    @InjectRepository(Producto)
    private productoRepository: Repository<Producto>,
    @InjectRepository(Lote)
    private loteRepository: Repository<Lote>,
    @InjectRepository(Laboratorio)
    private laboratorioRepository: Repository<Laboratorio>,
    private inventarioAlmacenService: InventarioAlmacenService,
    private detalleLoteService: DetalleLoteService,
  ) {}

  async parseXmlToPreview(xmlContent: string): Promise<CfdiPreviewDto> {
    try {
      const xml = this.removeXmlDeclaration(xmlContent);
      const preview = this.extractCfdiData(xml);
      return preview;
    } catch (error) {
      throw new BadRequestException(
        'XML inválido o estructura CFDI no reconocida: ' + error.message,
      );
    }
  }

  async procesarRecepcion(
    dto: RecepcionConfirmadaDto,
    userId: string,
  ): Promise<{
    laboratorio: { rfc: string; nombre: string; esNuevo: boolean };
    productosCreados: { nombre: string; codigoBarras: string }[];
    productosExistentes: { nombre: string; codigoBarras: string }[];
    mensaje: string;
  }> {
    const xml = this.removeXmlDeclaration(dto.xmlContent);
    const cfdiData = this.extractCfdiData(xml);

    const result = await this.processLaboratorio(cfdiData.emisor);
    const { productosCreados, productosExistentes } =
      await this.processProductos(
        dto.productos,
        cfdiData.conceptos,
        userId,
        result.laboratorioId,
        cfdiData.serie,
        cfdiData.folio,
      );

    const mensaje = this.generarMensaje(
      result.esNuevo,
      cfdiData.emisor.rfc,
      cfdiData.emisor.nombre,
      productosCreados.length,
      productosExistentes.length,
    );

    return {
      laboratorio: {
        rfc: cfdiData.emisor.rfc,
        nombre: cfdiData.emisor.nombre,
        esNuevo: result.esNuevo,
      },
      productosCreados,
      productosExistentes,
      mensaje,
    };
  }

  private removeXmlDeclaration(xml: string): string {
    return xml.replace(/<\?xml[^>]+\?>/g, '').trim();
  }

  private extractCfdiData(xml: string): CfdiPreviewDto {
    const getValue = (pattern: RegExp): string => {
      const match = xml.match(pattern);
      return match ? match[1] : '';
    };

    const serie = getValue(/Serie="([^"]+)"/);
    const folio = getValue(/Folio="([^"]+)"/);
    const fecha = getValue(/Fecha="([^"]+)"/);
    const subtotal = parseFloat(getValue(/SubTotal="([^"]+)"/)) || 0;
    const total = parseFloat(getValue(/Total="([^"]+)"/)) || 0;

    const emisorRfc = getValue(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
    const emisorNombre = getValue(/<cfdi:Emisor[^>]*Nombre="([^"]+)"/);

    const emisor = {
      rfc: emisorRfc,
      nombre: emisorNombre,
    };

    const conceptoMatches =
      xml.match(/<cfdi:Concepto[^>]*>[\s\S]*?<\/cfdi:Concepto>/g) || [];

    const conceptos: ConceptoDto[] = conceptoMatches.map((conceptoXml) => {
      const cantidad =
        parseFloat(this.getXmlValue(conceptoXml, /Cantidad="([^"]+)"/)) || 0;
      const noIdentificacion =
        this.getXmlValue(conceptoXml, /NoIdentificacion="([^"]+)"/) || '';
      const descripcion =
        this.getXmlValue(conceptoXml, /Descripcion="([^"]+)"/) || '';
      const valorUnitario =
        parseFloat(this.getXmlValue(conceptoXml, /ValorUnitario="([^"]+)"/)) ||
        0;
      const claveProdServ =
        this.getXmlValue(conceptoXml, /ClaveProdServ="([^"]+)"/) || '';
      const claveUnidad =
        this.getXmlValue(conceptoXml, /ClaveUnidad="([^"]+)"/) || '';

      const tasaMatch = conceptoXml.match(/TasaOCuota="([^"]+)"/);
      const ivaCfdi = tasaMatch ? parseFloat(tasaMatch[1]) * 100 : null;

      return {
        cantidad,
        noIdentificacion,
        descripcion,
        valorUnitario,
        claveProdServ,
        claveUnidad,
        ivaCfdi,
      };
    });

    return {
      serie,
      folio,
      fecha,
      subtotal,
      total,
      emisor,
      conceptos,
    };
  }

  private getXmlValue(xml: string, pattern: RegExp): string {
    const match = xml.match(pattern);
    return match ? match[1] : '';
  }

  private async processLaboratorio(emisor: {
    rfc: string;
    nombre: string;
  }): Promise<{ laboratorioId: string; esNuevo: boolean }> {
    let laboratorio = await this.laboratorioRepository.findOne({
      where: { rfc: emisor.rfc },
    });

    const esNuevo = !laboratorio;

    if (!laboratorio) {
      const nuevoLaboratorio = this.laboratorioRepository.create({
        nombre: emisor.nombre,
        rfc: emisor.rfc,
        statusId: 1,
      });
      laboratorio = await this.laboratorioRepository.save(nuevoLaboratorio);
    }

    return { laboratorioId: laboratorio.id, esNuevo };
  }

  private async processProductos(
    productosDto: {
      productoId: string;
      esNuevo: boolean;
      cantidad: number;
      numeroLote?: string;
      fechaCaducidad?: string;
      stockMinimo?: number;
      stockMaximo?: number;
    }[],
    conceptos: ConceptoDto[],
    userId: string,
    laboratorioId: string,
    serie: string,
    folio: string,
  ): Promise<{
    productosCreados: { nombre: string; codigoBarras: string }[];
    productosExistentes: { nombre: string; codigoBarras: string }[];
  }> {
    const productosCreados: { nombre: string; codigoBarras: string }[] = [];
    const productosExistentes: { nombre: string; codigoBarras: string }[] = [];

    const numeroLoteUnico = `LOTE-${serie || 'X'}-${folio || '0'}`;
    const fechaCaducidadGeneral = productosDto[0]?.fechaCaducidad;
    const lote = await this.crearOLocalizarLote(
      numeroLoteUnico,
      fechaCaducidadGeneral,
      laboratorioId,
    );

    for (const prodDto of productosDto) {
      const concepto = conceptos.find(
        (c) => c.noIdentificacion === prodDto.productoId,
      );

      let producto: Producto | null = null;

      producto = await this.productoRepository.findOne({
        where: { codigoBarras: prodDto.productoId },
      });

      if (!producto) {
        producto = await this.crearNuevoProducto(
          concepto,
          prodDto,
          laboratorioId,
        );
        productosCreados.push({
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
        });
      } else {
        productosExistentes.push({
          nombre: producto.nombre,
          codigoBarras: producto.codigoBarras,
        });
      }

      await this.inventarioAlmacenService.agregarStock(
        producto.id,
        lote.id,
        AlmacenTipo.RECEPCION,
        prodDto.cantidad,
        concepto?.ivaCfdi,
        concepto?.valorUnitario || 0,
      );

      await this.detalleLoteService.create({
        productoId: producto.id,
        loteId: lote.id,
        cantidad: prodDto.cantidad,
        precioUnitario: concepto?.valorUnitario || 0,
        ivaCfdi: concepto?.ivaCfdi || null,
      });
    }

    return { productosCreados, productosExistentes };
  }

  private async crearNuevoProducto(
    concepto: ConceptoDto | undefined,
    prodDto: any,
    laboratorioId: string,
  ): Promise<Producto> {
    const productoData: Partial<Producto> = {
      nombre: concepto?.descripcion || prodDto.productoId,
      codigoBarras: prodDto.productoId,
      descripcion: concepto?.descripcion || '',
      stockMinimo: prodDto.stockMinimo || 10,
      stockMaximo: prodDto.stockMaximo || 100,
      claveProdServ: concepto?.claveProdServ || undefined,
      claveUnidad: concepto?.claveUnidad || undefined,
      laboratorioId: laboratorioId,
      statusId: 1,
    };
    const producto = this.productoRepository.create(productoData);
    return this.productoRepository.save(producto);
  }

  private async crearOLocalizarLote(
    numeroLote: string,
    fechaCaducidad: string | undefined,
    laboratorioId: string,
  ): Promise<Lote> {
    const loteExistente = await this.loteRepository.findOne({
      where: { numeroLote: numeroLote },
    });

    if (loteExistente) {
      return loteExistente;
    }

    const nuevoLote = this.loteRepository.create({
      numeroLote: numeroLote,
      fechaCaducidad: fechaCaducidad
        ? new Date(fechaCaducidad)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      laboratorioId: laboratorioId,
      statusId: 1,
    });
    return this.loteRepository.save(nuevoLote);
  }

  private generarMensaje(
    esNuevoLaboratorio: boolean,
    laboratorioRfc: string,
    laboratorioNombre: string,
    cantidadProductosCreados: number,
    cantidadProductosExistentes: number,
  ): string {
    let mensaje = `Recepción procesada. `;

    if (esNuevoLaboratorio) {
      mensaje += `Nuevo laboratorio creado: ${laboratorioNombre} (${laboratorioRfc}). `;
    }

    if (cantidadProductosCreados > 0) {
      mensaje += `${cantidadProductosCreados} productos creados. `;
    }

    if (cantidadProductosExistentes > 0) {
      mensaje += `${cantidadProductosExistentes} productos ya existían. `;
    }

    return mensaje.trim();
  }

  async validarXml(
    xmlContent: string,
  ): Promise<{ valido: boolean; errores: string[] }> {
    const errores: string[] = [];

    if (!xmlContent || xmlContent.trim() === '') {
      errores.push('El archivo XML está vacío');
      return { valido: false, errores };
    }

    if (!xmlContent.includes('cfdi:Comprobante')) {
      errores.push('No es un archivo CFDI válido');
    }

    if (!xmlContent.includes('cfdi:Conceptos')) {
      errores.push('El CFDI no contiene conceptos (productos)');
    }

    try {
      const emisorMatch = xmlContent.match(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
      if (!emisorMatch) {
        errores.push('No se encontró el RFC del emisor');
      }
    } catch {
      errores.push('Error al parsear datos del emisor');
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }
}
