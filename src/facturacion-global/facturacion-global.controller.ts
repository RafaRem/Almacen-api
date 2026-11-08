import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FacturacionGlobalService } from './facturacion-global.service';
import {
  CancelarGlobalDto,
  CorregirGlobalDto,
  GenerarGlobalDto,
  PeriodoGlobalDto,
} from './dto/facturacion-global.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { UserModule } from '../common/enums/user-module.enum';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(UserModule.INVOICES)
@Controller('facturacion-global')
export class FacturacionGlobalController {
  constructor(
    private readonly facturacionGlobalService: FacturacionGlobalService,
  ) {}

  @Get('config')
  getConfig() {
    return this.facturacionGlobalService.getConfig();
  }

  @Get('pendientes')
  getPendientes(
    @Query('periodicidad') periodicidad: string,
    @Query('fechaReferencia') fechaReferencia?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const dto: PeriodoGlobalDto = {
      periodicidad,
      fechaReferencia,
      fechaInicio,
      fechaFin,
    };
    return this.facturacionGlobalService.getPendientes(dto);
  }

  @Get('preview')
  preview(
    @Query('periodicidad') periodicidad: string,
    @Query('fechaReferencia') fechaReferencia?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const dto: PeriodoGlobalDto = {
      periodicidad,
      fechaReferencia,
      fechaInicio,
      fechaFin,
    };
    return this.facturacionGlobalService.getPendientes(dto);
  }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.facturacionGlobalService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post()
  generar(@Body() dto: GenerarGlobalDto, @Request() req: any) {
    return this.facturacionGlobalService.generar(dto, req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facturacionGlobalService.findOne(id);
  }

  @Post(':id/cancelar')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarGlobalDto,
  ) {
    return this.facturacionGlobalService.cancelar(id, dto?.motivo || '02');
  }

  @Post(':id/corregir')
  corregir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorregirGlobalDto,
  ) {
    return this.facturacionGlobalService.corregir(id, dto.ventaId);
  }
}
