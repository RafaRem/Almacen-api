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
} from '@nestjs/common';
import { FacturasService } from './facturas.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
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
  create(@Body() createFacturaDto: CreateFacturaDto) {
    return this.facturasService.create(createFacturaDto);
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

  @Get('preview')
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

  @Post(':id/marcar-como-timbrada-demo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(UserModule.INVOICES)
  marcarComoTimbradaDemo(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.marcarComoTimbradaDemo(id);
  }

  @Post(':id/cancelar')
  @HttpCode(HttpStatus.OK)
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.cancelar(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturasService.remove(id);
  }
}
