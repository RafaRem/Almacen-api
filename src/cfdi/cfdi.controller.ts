import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CfdiService } from './cfdi.service';
import { CsvService } from '../services/csv.service';
import {
  CfdiPreviewDto,
  RecepcionConfirmadaDto,
} from './dto/procesar-recepcion.dto';

@Controller('cfdi')
export class CfdiController {
  private readonly logger = new Logger(CfdiController.name);

  constructor(
    private readonly cfdiService: CfdiService,
    private readonly csvService: CsvService,
  ) {}

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Body() body: { xmlContent: string }): Promise<CfdiPreviewDto> {
    return this.cfdiService.parseXmlToPreview(body.xmlContent);
  }

  @Post('validar')
  @UseGuards(JwtAuthGuard)
  async validar(@Body() body: { xmlContent: string }) {
    return this.cfdiService.validarXml(body.xmlContent);
  }

  @Post('recepcion/xml')
  @UseGuards(JwtAuthGuard)
  async procesarRecepcionXml(
    @Body() dto: RecepcionConfirmadaDto,
    @Req() req: any,
  ) {
    const userId = req.user.id || req.user.sub || 'system';
    if (!dto.xmlContent) {
      throw new BadRequestException('Contenido XML requerido');
    }
    this.logger.log(`Recepción XML: xmlContent length=${dto.xmlContent.length}, productos=${dto.productos?.length || 0}`);
    return this.cfdiService.procesarRecepcion(dto, userId);
  }

  @Post('recepcion/csv')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async procesarRecepcionCsv(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user.id || req.user.sub || 'system';

    if (!file) {
      throw new BadRequestException('Archivo CSV requerido');
    }

    let productosFrontend: any[] = [];
    try {
      const rawProductos = body?.productos;
      if (rawProductos) {
        productosFrontend = typeof rawProductos === 'string'
          ? JSON.parse(rawProductos)
          : Array.isArray(rawProductos)
            ? rawProductos
            : [];
        this.logger.log(`Productos recibidos del frontend: ${productosFrontend.length}`);
      }
    } catch (e) {
      this.logger.warn('Error parseando productos del frontend, se usará solo CSV', e);
    }

    return this.csvService.procesarCsv(file, userId, productosFrontend);
  }

  @Post('recepcion')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async procesarRecepcionLegacy(
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    const isCsv = file?.originalname?.toLowerCase().endsWith('.csv');
    if (isCsv) {
      return this.procesarRecepcionCsv(file, body, req);
    }
    return this.procesarRecepcionXml(body, req);
  }
}
