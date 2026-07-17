import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Header,
} from '@nestjs/common';
import { FacturasService } from './facturas.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { CreateFacturaDesdeVentaDto } from './dto/create-desde-venta.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UserModule } from '../common/enums/user-module.enum';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(UserModule.INVOICES)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @Post()
  create(@Body() createFacturaDto: CreateFacturaDto, @Request() req: any) {
    return this.facturasService.create(createFacturaDto, req.user?.id);
  }

  @Post('desde-venta/:ventaId')
  crearDesdeVenta(
    @Param('ventaId', ParseUUIDPipe) ventaId: string,
    @Body() dto?: CreateFacturaDesdeVentaDto,
    @Request() req?: any,
  ) {
    return this.facturasService.crearDesdeVenta(ventaId, dto, req?.user?.id);
  }

  @Post('desde-venta/:ventaId/crear-y-timbrar')
  @HttpCode(HttpStatus.OK)
  crearYTimbrarDesdeVenta(
    @Param('ventaId', ParseUUIDPipe) ventaId: string,
    @Body() dto?: CreateFacturaDesdeVentaDto,
    @Request() req?: any,
  ) {
    return this.facturasService.crearYTimbrarDesdeVenta(ventaId, dto, req?.user?.id);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.facturasService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Body('productos') productos: CreateFacturaDto['productos'],
    @Body('clienteId') clienteId?: string,
  ) {
    return this.facturasService.preview(productos, clienteId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFacturaDto: UpdateFacturaDto,
  ) {
    return this.facturasService.update(id, updateFacturaDto);
  }

  @Post(':id/timbrar')
  @HttpCode(HttpStatus.OK)
  timbrar(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.facturasService.timbrar(id, req.user?.id);
  }

  @Post(':id/marcar-como-timbrada-demo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(UserModule.INVOICES)
  marcarComoTimbradaDemo(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.marcarComoTimbradaDemo(id);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.facturasService.cancelar(id, req.user?.id);
  }

  @Get(':id/xml')
  @Header('Content-Type', 'application/xml')
  getXml(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.getXmlStream(id);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  getPdf(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.getPdfStream(id);
  }

  @Post(':id/preview-pdf')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/pdf')
  previewPdf(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.previewPdf(id);
  }

  @Post(':id/enviar-email')
  @HttpCode(HttpStatus.OK)
  enviarEmail(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.enviarEmail(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.cancelar(id);
  }
}
